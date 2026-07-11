import asyncio
import json
import logging
import base64
from typing import Callable, Optional, Any
from nacl.secret import SecretBox
import client.config as config

logger = logging.getLogger(__name__)

class RelayConnection:
    def __init__(
        self,
        client_id: str,
        relay_host: str = config.DEFAULT_SIGNAL_SERVER,
        relay_port: int = config.DEFAULT_RELAY_PORT,
        on_data_received: Optional[Callable[[bytes], Any]] = None
    ):
        self.client_id = client_id
        self.relay_host = relay_host
        self.relay_port = relay_port
        self.on_data_received = on_data_received

        self.reader = None
        self.writer = None
        
        self.is_connected = False
        self.shared_key = None
        self.secret_box = None
        
        self._read_task = None

    async def connect(self, session_id: str) -> bool:
        """
        Connects to the TCP Relay Server and registers the tunnel session.
        """
        logger.info(f"Connecting to Relay Server at {self.relay_host}:{self.relay_port}...")
        try:
            self.reader, self.writer = await asyncio.open_connection(self.relay_host, self.relay_port)
            
            # Send session registration details as first line (NDJSON)
            reg_payload = json.dumps({
                "session_id": session_id,
                "client_id": self.client_id
            }) + "\n"
            self.writer.write(reg_payload.encode('utf-8'))
            await self.writer.drain()
            
            self.is_connected = True
            self._read_task = asyncio.create_task(self._read_loop())
            logger.info(f"Relay tunnel registered for session {session_id}.")
            return True
        except Exception as e:
            logger.error(f"Failed to establish relay connection: {e}")
            self.close()
            return False

    def set_shared_key(self, base64_key: str):
        """
        Loads the symmetric key for session encryption.
        """
        self.shared_key = base64.b64decode(base64_key.encode('utf-8'))
        self.secret_box = SecretBox(self.shared_key)
        logger.info("Initialized secure relay channel encryption.")

    async def _read_loop(self):
        try:
            while self.is_connected and self.reader:
                # 1. Read 4-byte big-endian packet length header
                length_bytes = await self.reader.readexactly(4)
                length = int.from_bytes(length_bytes, byteorder='big')
                
                # 2. Read exact packet payload
                payload = await self.reader.readexactly(length)
                if not payload or len(payload) < 2:
                    continue
                    
                prefix = payload[0]
                encrypted_data = payload[1:]
                
                if prefix == 0x01:
                    if not self.secret_box:
                        logger.warning("Dropped encrypted relay packet: SecretBox not configured.")
                        continue
                    try:
                        decrypted = self.secret_box.decrypt(encrypted_data)
                        if self.on_data_received:
                            self.on_data_received(decrypted)
                    except Exception as e:
                        logger.error(f"Failed to decrypt secured relay packet: {e}")
                        
        except asyncio.IncompleteReadError:
            logger.info("Relay TCP stream closed by peer or server.")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in relay connection read loop: {e}")
        finally:
            self.is_connected = False

    def send_secure(self, data: bytes):
        """
        Encrypts payload and sends it over TCP using length-prefixed framing.
        """
        if not self.is_connected or not self.writer:
            return
        if not self.secret_box:
            logger.error("SecretBox not configured. Cannot encrypt relay payload.")
            return
            
        try:
            encrypted = self.secret_box.encrypt(data)
            # Prefix 0x01 for encrypted packets
            payload = b"\x01" + encrypted
            
            # Prefix payload with 4-byte big-endian length
            length_header = len(payload).to_bytes(4, byteorder='big')
            
            self.writer.write(length_header + payload)
            # We wrap the drain in a task to prevent blocking the caller thread
            asyncio.create_task(self._drain_writer())
        except Exception as e:
            logger.error(f"Failed to write secure data to relay: {e}")

    async def _drain_writer(self):
        try:
            if self.writer:
                await self.writer.drain()
        except Exception:
            pass

    def close(self):
        self.is_connected = False
        if self._read_task:
            self._read_task.cancel()
            self._read_task = None
        if self.writer:
            try:
                self.writer.close()
            except:
                pass
            self.writer = None
        self.reader = None
        logger.info("Relay connection closed.")
