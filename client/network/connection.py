import socket
import asyncio
import json
import logging
import base64
from typing import Callable, Optional, Dict, Any
from nacl.secret import SecretBox
import client.config as config
from client.network.relay_client import RelayConnection

logger = logging.getLogger(__name__)

class P2PConnectionProtocol(asyncio.DatagramProtocol):
    def __init__(self, connection_manager):
        self.manager = connection_manager

    def connection_made(self, transport):
        self.manager.transport = transport

    def datagram_received(self, data, addr):
        self.manager.handle_datagram(data, addr)


class P2PConnection:
    def __init__(
        self,
        client_id: str,
        server_host: str,
        server_port: int,
        on_data_received: Optional[Callable[[bytes], Any]] = None
    ):
        self.client_id = client_id
        self.server_host = server_host
        self.server_port = server_port
        self.on_data_received = on_data_received

        self.transport = None
        self.sock = None
        
        self.public_udp_host = None
        self.public_udp_port = None
        
        self.peer_id = None
        self.peer_host = None
        self.peer_port = None
        self.peer_endpoints = {}
        
        self.is_connected = False
        self.shared_key = None
        self.secret_box = None
        
        self._reg_event = asyncio.Event()
        self._hole_punch_event = asyncio.Event()
        self._heartbeat_task = None
        self._hole_punch_ping_task = None

    async def start(self) -> bool:
        """
        Binds a local UDP socket on a random OS-assigned port and registers with the signaling server.
        """
        loop = asyncio.get_running_loop()
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.sock.bind(("0.0.0.0", 0))  # Bind to OS-allocated port
            self.sock.setblocking(False)
            
            await loop.create_datagram_endpoint(
                lambda: P2PConnectionProtocol(self),
                sock=self.sock
            )
            
            local_port = self.sock.getsockname()[1]
            logger.info(f"Local UDP socket bound on port {local_port}")
            
            self._reg_event.clear()
            await self._send_udp_register()
            
            # Wait for registration ACK from server (5s timeout)
            try:
                await asyncio.wait_for(self._reg_event.wait(), timeout=5.0)
                self._heartbeat_task = asyncio.create_task(self._udp_heartbeat_loop())
                return True
            except asyncio.TimeoutError:
                logger.error("UDP registration with signaling server timed out.")
                return False
        except Exception as e:
            logger.error(f"Failed to start P2P connection socket: {e}")
            return False

    async def _send_udp_register(self):
        payload = json.dumps({
            "type": "UDP_REGISTER",
            "client_id": self.client_id
        })
        # Prefix 0x00 for unencrypted control packets
        data = b"\x00" + payload.encode('utf-8')
        if self.transport:
            self.transport.sendto(data, (self.server_host, self.server_port))

    async def _udp_heartbeat_loop(self):
        try:
            while not self.is_connected:
                # Keep NAT mapping alive by sending pings
                await self._send_udp_register()
                await asyncio.sleep(15)
        except asyncio.CancelledError:
            pass

    def set_shared_key(self, base64_key: str):
        """
        Initializes the PyNaCl symmetric encryption SecretBox with the negotiated session key.
        """
        self.shared_key = base64.b64decode(base64_key.encode('utf-8'))
        self.secret_box = SecretBox(self.shared_key)
        logger.info("Initialized secure channel session key encryption.")

    async def initiate_hole_punch(self, peer_id: str, peer_endpoints: Dict[str, Any]) -> bool:
        """
        Initiates the hole punching sequence by concurrently blasting ping packets to target endpoints.
        """
        self.peer_id = peer_id
        self.peer_endpoints = peer_endpoints
        self.is_connected = False
        self._hole_punch_event.clear()
        
        logger.info(f"Starting UDP hole punching loop towards peer {peer_id}...")
        self._hole_punch_ping_task = asyncio.create_task(self._hole_punch_ping_loop())
        
        try:
            # Wait up to 10 seconds for a successful connection handshake
            await asyncio.wait_for(self._hole_punch_event.wait(), timeout=10.0)
            logger.info(f"P2P channel successfully established with peer {peer_id} at {self.peer_host}:{self.peer_port}")
            self.stop_heartbeats()
            return True
        except asyncio.TimeoutError:
            logger.error("Hole punching sequence timed out.")
            self.stop_hole_punch()
            return False

    async def _hole_punch_ping_loop(self):
        local_eps = self.peer_endpoints.get("local", [])
        public_ep = self.peer_endpoints.get("public")
        
        targets = []
        if public_ep:
            parts = public_ep.split(":")
            if len(parts) == 2:
                targets.append((parts[0], int(parts[1])))
                
        for ep in local_eps:
            parts = ep.split(":")
            if len(parts) == 2:
                targets.append((parts[0], int(parts[1])))
                
        logger.info(f"Target hole punch candidates: {targets}")
        
        # Ping packet payload (prefixed with 0x00)
        ping_payload = b"\x00" + json.dumps({
            "type": "HOLE_PUNCH_PING",
            "client_id": self.client_id
        }).encode('utf-8')
        
        try:
            while not self.is_connected:
                for target in targets:
                    logger.debug(f"Blasting hole punch ping to target: {target}")
                    self.transport.sendto(ping_payload, target)
                # Send every 100ms
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass

    def handle_datagram(self, data: bytes, addr: tuple):
        if not data or len(data) < 2:
            return
            
        prefix = data[0]
        payload = data[1:]
        
        # 1. Control Protocol (Prefix 0x00)
        if prefix == 0x00:
            try:
                text = payload.decode('utf-8')
                msg = json.loads(text)
                msg_type = msg.get("type")
                
                if msg_type == "UDP_REGISTER_ACK":
                    self.public_udp_host = msg.get("public_host")
                    self.public_udp_port = msg.get("public_port")
                    self._reg_event.set()
                    
                elif msg_type == "HOLE_PUNCH_PING":
                    # Respond with pong back to sender (prefixed with 0x00)
                    pong_payload = b"\x00" + json.dumps({
                        "type": "HOLE_PUNCH_PONG",
                        "client_id": self.client_id
                    }).encode('utf-8')
                    self.transport.sendto(pong_payload, addr)
                    
                    if not self.is_connected:
                        self.peer_host, self.peer_port = addr
                        
                elif msg_type == "HOLE_PUNCH_PONG":
                    if not self.is_connected:
                        self.peer_host, self.peer_port = addr
                        self.is_connected = True
                        self._hole_punch_event.set()
                        self.stop_hole_punch()
            except Exception as e:
                logger.warning(f"Error parsing control datagram from {addr}: {e}")
                
        # 2. Encrypted Data Protocol (Prefix 0x01)
        elif prefix == 0x01:
            if not self.secret_box:
                logger.warning("Dropped encrypted packet: SecretBox not initialized.")
                return
            try:
                decrypted = self.secret_box.decrypt(payload)
                if self.on_data_received:
                    self.on_data_received(decrypted)
            except Exception as e:
                logger.error(f"Symmetric decryption failed for packet from {addr}: {e}")

    def send_secure(self, data: bytes):
        """
        Encrypts payload using SecretBox and transmits it to the peer.
        """
        if not self.is_connected or not self.peer_host or not self.peer_port:
            return
        if not self.secret_box:
            logger.error("SecretBox not configured. Cannot encrypt payload.")
            return
            
        try:
            encrypted = self.secret_box.encrypt(data)
            # Prefix 0x01 for encrypted packets
            packet = b"\x01" + encrypted
            self.transport.sendto(packet, (self.peer_host, self.peer_port))
        except Exception as e:
            logger.error(f"Failed to send secure datagram: {e}")

    def stop_hole_punch(self):
        if self._hole_punch_ping_task:
            self._hole_punch_ping_task.cancel()
            self._hole_punch_ping_task = None

    def stop_heartbeats(self):
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            self._heartbeat_task = None

    def close(self):
        self.is_connected = False
        self.stop_hole_punch()
        self.stop_heartbeats()
        if self.transport:
            self.transport.close()
            self.transport = None
        logger.info("UDP P2P Connection instance closed.")


class ConnectionManager:
    def __init__(self, client_id: str, server_host: str, server_port: int, on_data_received: Optional[Callable[[bytes], Any]] = None):
        self.client_id = client_id
        self.server_host = server_host
        self.server_port = server_port
        self.on_data_received = on_data_received
        
        self.active_connection = None
        self.is_p2p = False

    async def establish_connection(self, peer_id: str, peer_endpoints: Dict[str, Any], base64_key: str) -> bool:
        """
        Attempts direct P2P connection first. If it fails, falls back to TCP Relay server.
        """
        logger.info(f"Attempting to establish connection with peer {peer_id}...")
        
        # 1. P2P Hole Punching Attempt
        p2p = P2PConnection(self.client_id, self.server_host, self.server_port, self.on_data_received)
        p2p.set_shared_key(base64_key)
        
        started = await p2p.start()
        if started:
            # Try to pierce firewalls
            success = await p2p.initiate_hole_punch(peer_id, peer_endpoints)
            if success:
                self.active_connection = p2p
                self.is_p2p = True
                logger.info("Successfully established direct P2P socket connection.")
                return True
            else:
                p2p.close()
                logger.warning("P2P hole punching failed. Attempting TCP relay fallback...")
        else:
            logger.warning("Failed to start local P2P socket. Attempting TCP relay fallback...")

        # 2. TCP Relay Fallback Attempt
        # Session ID is deterministic for both ends (sorted IDs joined by a dash)
        session_id = "-".join(sorted([self.client_id, peer_id]))
        
        relay = RelayConnection(
            client_id=self.client_id,
            relay_host=self.server_host,
            relay_port=config.DEFAULT_RELAY_PORT,
            on_data_received=self.on_data_received
        )
        relay.set_shared_key(base64_key)
        
        success = await relay.connect(session_id)
        if success:
            self.active_connection = relay
            self.is_p2p = False
            logger.info("Successfully established relayed fallback TCP connection.")
            return True

        logger.error("Failed to connect to peer using both P2P and Relay Fallback.")
        return False

    def send_secure(self, data: bytes):
        if self.active_connection:
            self.active_connection.send_secure(data)

    def close(self):
        if self.active_connection:
            self.active_connection.close()
            self.active_connection = None
        self.is_p2p = False
