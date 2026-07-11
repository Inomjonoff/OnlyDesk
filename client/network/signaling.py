import socket
import asyncio
import json
import logging
from typing import Callable, Optional, List, Dict, Any
import client.config as config
from server import protocol

logger = logging.getLogger(__name__)

def get_local_endpoints(p2p_port: int = config.DEFAULT_P2P_PORT) -> List[str]:
    """
    Scans and returns the local network interface IP endpoints on the host machine.
    """
    endpoints = []
    # Primary interface resolver (UDP socket connection test)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        endpoints.append(f"{ip}:{p2p_port}")
    except Exception:
        pass
    
    # Fallback to getaddrinfo hostname resolver
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None):
            ip = info[4][0]
            if "." in ip and not ip.startswith("127."):
                ep = f"{ip}:{p2p_port}"
                if ep not in endpoints:
                    endpoints.append(ep)
    except Exception:
        pass
        
    return list(set(endpoints))

class SignalingClient:
    def __init__(
        self, 
        server_host: str = config.DEFAULT_SIGNAL_SERVER, 
        server_port: int = config.DEFAULT_SIGNAL_PORT,
        on_peer_invite: Optional[Callable[[str, Dict[str, Any]], Any]] = None,
        on_peer_info: Optional[Callable[[str, Dict[str, Any]], Any]] = None,
        on_error: Optional[Callable[[str], Any]] = None
    ):
        self.server_host = server_host
        self.server_port = server_port
        self.on_peer_invite = on_peer_invite
        self.on_peer_info = on_peer_info
        self.on_error = on_error
        
        self.assigned_id: Optional[str] = None
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        
        self.connected = False
        self._read_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self.keepalive_interval = 30
        
        # Future to signal successful registration back to connect caller
        self._reg_future: Optional[asyncio.Future] = None

    async def connect(self) -> bool:
        """
        Connects and registers client with the signaling server.
        """
        logger.info(f"Connecting to Signaling Server at {self.server_host}:{self.server_port}...")
        try:
            self.reader, self.writer = await asyncio.open_connection(self.server_host, self.server_port)
            self.connected = True
            
            # Start background message reader task
            self._read_task = asyncio.create_task(self._read_loop())
            
            # Gather local LAN endpoints to share with peers
            local_eps = get_local_endpoints()
            logger.info(f"Discovered local network interfaces: {local_eps}")
            
            self._reg_future = asyncio.get_running_loop().create_future()
            
            register_msg = json.dumps({
                "type": protocol.MSG_REGISTER,
                "client_version": "0.1.0",
                "local_endpoints": local_eps
            }) + "\n"
            
            await self._send_raw(register_msg)
            
            # Wait for REGISTER_ACK packet
            await self._reg_future
            
            # Start background heartbeat loop
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to signaling server: {e}")
            await self.disconnect()
            return False

    async def _send_raw(self, message: str):
        if not self.writer:
            return
        try:
            self.writer.write(message.encode('utf-8'))
            await self.writer.drain()
        except Exception as e:
            logger.warning(f"Failed to send data to signaling server: {e}")
            self.connected = False

    async def connect_to_peer(self, target_id: str):
        """
        Sends request to rendezvous with a peer.
        """
        logger.info(f"Requesting connection to target peer {target_id}...")
        connect_msg = json.dumps({
            "type": protocol.MSG_CONNECT_TO,
            "target_id": target_id
        }) + "\n"
        await self._send_raw(connect_msg)

    async def _read_loop(self):
        try:
            while self.connected and self.reader:
                data = await self.reader.readline()
                if not data:
                    logger.warning("Signaling TCP channel closed by server.")
                    break
                    
                line = data.decode('utf-8')
                msg_type, payload = protocol.parse_message(line)
                
                if not msg_type:
                    continue
                    
                if msg_type == protocol.MSG_REGISTER_ACK:
                    self.assigned_id = payload.get("assigned_id")
                    self.keepalive_interval = payload.get("keepalive_interval", 30)
                    logger.info(f"Registered on Signaling Server. ID: {self.assigned_id}")
                    if self._reg_future and not self._reg_future.done():
                        self._reg_future.set_result(True)
                        
                elif msg_type == protocol.MSG_HEARTBEAT_ACK:
                    logger.debug("Received Heartbeat ACK")
                    
                elif msg_type == protocol.MSG_PEER_INVITE:
                    peer_id = payload.get("peer_id")
                    peer_endpoints = payload.get("peer_endpoints", {})
                    logger.info(f"Received connection invitation from remote peer: {peer_id}")
                    if self.on_peer_invite:
                        if asyncio.iscoroutinefunction(self.on_peer_invite):
                            asyncio.create_task(self.on_peer_invite(peer_id, peer_endpoints))
                        else:
                            self.on_peer_invite(peer_id, peer_endpoints)
                            
                elif msg_type == protocol.MSG_PEER_INFO:
                    peer_id = payload.get("peer_id")
                    peer_endpoints = payload.get("peer_endpoints", {})
                    logger.info(f"Received peer info for remote peer: {peer_id}")
                    if self.on_peer_info:
                        if asyncio.iscoroutinefunction(self.on_peer_info):
                            asyncio.create_task(self.on_peer_info(peer_id, peer_endpoints))
                        else:
                            self.on_peer_info(peer_id, peer_endpoints)
                            
                elif msg_type == protocol.MSG_ERROR:
                    err_msg = payload.get('message', 'Noma\'lum xato')
                    logger.error(f"Signaling Server Error: {err_msg}")
                    if self.on_error:
                        self.on_error(err_msg)
                    
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in client signaling read loop: {e}")
        finally:
            self.connected = False
            if self._reg_future and not self._reg_future.done():
                self._reg_future.set_exception(ConnectionError("Signaling client disconnected"))

    async def _heartbeat_loop(self):
        try:
            while self.connected:
                await asyncio.sleep(self.keepalive_interval)
                logger.debug("Sending heartbeat...")
                heartbeat_msg = json.dumps({"type": protocol.MSG_HEARTBEAT}) + "\n"
                await self._send_raw(heartbeat_msg)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in signaling client heartbeat loop: {e}")

    async def disconnect(self):
        self.connected = False
        if self._read_task:
            self._read_task.cancel()
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            
        if self.writer:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except:
                pass
            self.writer = None
        self.reader = None
        logger.info("Disconnected from Signaling Server.")
