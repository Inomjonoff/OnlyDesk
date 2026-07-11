import asyncio
import logging
import sys
import argparse
from server.db import SessionDatabase
from server import protocol

# Configure Server Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("onlydesk.server")

import json

class SignalingUdpProtocol(asyncio.DatagramProtocol):
    def __init__(self, db):
        self.db = db
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data, addr):
        try:
            if not data or data[0] != 0:
                return
            payload_data = data[1:]
            text = payload_data.decode('utf-8')
            msg_type, payload = protocol.parse_message(text)
            if msg_type == protocol.MSG_UDP_REGISTER:
                client_id = payload.get("client_id")
                session = self.db.get_session(client_id)
                if session:
                    session.public_udp_host = addr[0]
                    session.public_udp_port = addr[1]
                    logger.info(f"Registered UDP endpoint for {client_id} -> {addr[0]}:{addr[1]}")
                    
                    # Respond with registration ack containing public endpoint (prefixed with 0x00)
                    ack_msg = protocol.make_udp_register_ack(addr[0], addr[1])
                    ack_data = b"\x00" + ack_msg.encode('utf-8')
                    self.transport.sendto(ack_data, addr)
                else:
                    logger.warning(f"UDP registration rejected: Client ID '{client_id}' not found.")
        except Exception as e:
            logger.warning(f"Error handling UDP datagram from {addr}: {e}")

class SignalingServer:
    def __init__(self, host="0.0.0.0", port=50000):
        self.host = host
        self.port = port
        self.db = SessionDatabase()

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        peername = writer.get_extra_info('peername')
        if not peername:
            writer.close()
            return
            
        client_ip, client_port = peername[0], peername[1]
        logger.info(f"New connection established from public endpoint {client_ip}:{client_port}")
        
        assigned_id = None
        
        try:
            while True:
                # Read incoming NDJSON message line-by-line
                data = await reader.readline()
                if not data:
                    break
                
                line = data.decode('utf-8')
                msg_type, payload = protocol.parse_message(line)
                
                if not msg_type:
                    continue
                
                if msg_type == protocol.MSG_REGISTER:
                    local_endpoints = payload.get("local_endpoints", [])
                    assigned_id = self.db.register(client_ip, client_port, writer, local_endpoints)
                    response = protocol.make_register_ack(assigned_id)
                    await self.send_raw(writer, response)
                    
                elif msg_type == protocol.MSG_HEARTBEAT:
                    response = protocol.make_heartbeat_ack()
                    await self.send_raw(writer, response)
                    
                elif msg_type == protocol.MSG_CONNECT_TO:
                    target_id = payload.get("target_id")
                    if not assigned_id:
                        await self.send_raw(writer, protocol.make_error("Client must REGISTER before requesting CONNECT_TO"))
                        continue
                    
                    target_session = self.db.get_session(target_id)
                    if not target_session:
                        await self.send_raw(writer, protocol.make_error(f"Target ID '{target_id}' not found"))
                        logger.warning(f"Client {assigned_id} requested connect to offline target ID {target_id}")
                        continue
                    
                    caller_session = self.db.get_session(assigned_id)
                    if not caller_session:
                        await self.send_raw(writer, protocol.make_error("Caller session lost"))
                        continue
                    
                    logger.info(f"Rendezvous initiated: {assigned_id} -> {target_id}")
                    
                    # 1. Send PEER_INVITE to B (Target) containing A's endpoints (prefer UDP public port)
                    invite_msg = protocol.make_peer_invite(
                        peer_id=assigned_id,
                        local_endpoints=caller_session.local_endpoints,
                        public_host=caller_session.public_udp_host or caller_session.public_host,
                        public_port=caller_session.public_udp_port or caller_session.public_port
                    )
                    await self.send_raw(target_session.writer, invite_msg)
                    
                    # 2. Send PEER_INFO to A (Caller) containing B's endpoints (prefer UDP public port)
                    info_msg = protocol.make_peer_info(
                        peer_id=target_id,
                        local_endpoints=target_session.local_endpoints,
                        public_host=target_session.public_udp_host or target_session.public_host,
                        public_port=target_session.public_udp_port or target_session.public_port
                    )
                    await self.send_raw(writer, info_msg)
                    
        except asyncio.IncompleteReadError:
            pass
        except ConnectionResetError:
            pass
        except Exception as e:
            logger.error(f"Error handling client session {client_ip}:{client_port}: {e}", exc_info=True)
        finally:
            # Cleanup on disconnect
            self.db.deregister_by_socket(client_ip, client_port)
            try:
                writer.close()
                await writer.wait_closed()
            except:
                pass
            logger.info(f"Connection from {client_ip}:{client_port} closed")

    async def send_raw(self, writer: asyncio.StreamWriter, message: str):
        """
        Sends raw UTF-8 NDJSON message string to a client.
        """
        try:
            writer.write(message.encode('utf-8'))
            await writer.drain()
        except Exception as e:
            logger.warning(f"Failed to send data to socket: {e}")

    async def run(self):
        # Start TCP server
        server = await asyncio.start_server(self.handle_client, self.host, self.port)
        addr = server.sockets[0].getsockname()
        logger.info(f"Signaling Server TCP started on {addr[0]}:{addr[1]}")
        
        # Start UDP server on same port
        loop = asyncio.get_running_loop()
        self.udp_transport, self.udp_protocol = await loop.create_datagram_endpoint(
            lambda: SignalingUdpProtocol(self.db),
            local_addr=(self.host, self.port)
        )
        logger.info(f"Signaling Server UDP started on {self.host}:{self.port}")
        
        async with server:
            await server.serve_forever()

def main():
    parser = argparse.ArgumentParser(description="OnlyDesk Signaling Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Binding host interface")
    parser.add_argument("--port", type=int, default=50000, help="TCP port to bind")
    args = parser.parse_args()
    
    server_instance = SignalingServer(host=args.host, port=args.port)
    try:
        asyncio.run(server_instance.run())
    except KeyboardInterrupt:
        logger.info("Signaling Server stopped.")

if __name__ == "__main__":
    main()
