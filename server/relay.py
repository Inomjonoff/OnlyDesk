import asyncio
import json
import logging
import sys
import argparse

# Configure Relay Server Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("onlydesk.relay")

class RelayServer:
    def __init__(self, host="0.0.0.0", port=50002):
        self.host = host
        self.port = port
        # Maps session_id -> { "client_a": (reader, writer), "client_b": (reader, writer), "a_id": str }
        self._active_sessions = {}
        self._lock = asyncio.Lock()

    async def handle_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        peername = writer.get_extra_info('peername')
        logger.info(f"Incoming connection to relay from {peername}")
        
        try:
            # Read first line containing session registration details (NDJSON)
            header_line = await reader.readline()
            if not header_line:
                writer.close()
                return
                
            reg_info = json.loads(header_line.decode('utf-8').strip())
            session_id = reg_info.get("session_id")
            client_id = reg_info.get("client_id")
            
            if not session_id or not client_id:
                logger.warning(f"Registration rejected: missing session_id or client_id in {reg_info}")
                writer.close()
                return

            async with self._lock:
                if session_id not in self._active_sessions:
                    # Client A connecting first
                    self._active_sessions[session_id] = {
                        "client_a": (reader, writer),
                        "client_b": None,
                        "a_id": client_id
                    }
                    logger.info(f"Session {session_id}: Registered Client A ({client_id}). Waiting for Client B...")
                    # We leave this connection open and return (keeping it in suspended state)
                    return
                else:
                    session = self._active_sessions[session_id]
                    if session["client_b"] is not None:
                        logger.warning(f"Session {session_id}: Connection rejected. Session already full.")
                        writer.close()
                        return
                    # Client B connecting second
                    session["client_b"] = (reader, writer)
                    session["b_id"] = client_id
                    logger.info(f"Session {session_id}: Registered Client B ({client_id}). Matching complete, starting tunnel...")
            
            # Start bidirectional forwarding
            reader_a, writer_a = session["client_a"]
            reader_b, writer_b = session["client_b"]
            
            await self._run_tunnel(session_id, reader_a, writer_a, reader_b, writer_b)
            
        except Exception as e:
            logger.error(f"Error in relay connection handler: {e}")
            writer.close()

    async def _run_tunnel(self, session_id, reader_a, writer_a, reader_b, writer_b):
        """
        Runs concurrent bidirectional byte-forwarding tasks between A and B.
        """
        async def forward(src_reader: asyncio.StreamReader, dst_writer: asyncio.StreamWriter):
            try:
                while True:
                    data = await src_reader.read(65536)  # Read in 64KB chunks
                    if not data:
                        break
                    dst_writer.write(data)
                    await dst_writer.drain()
            except Exception:
                pass
            finally:
                try:
                    dst_writer.close()
                    await dst_writer.wait_closed()
                except:
                    pass

        # Spawn concurrent proxy tasks
        task_a_to_b = asyncio.create_task(forward(reader_a, writer_b))
        task_b_to_a = asyncio.create_task(forward(reader_b, writer_a))
        
        try:
            # Wait until either connection closes
            await asyncio.wait(
                [task_a_to_b, task_b_to_a],
                return_when=asyncio.FIRST_COMPLETED
            )
        finally:
            # Cancel outstanding task and close everything
            task_a_to_b.cancel()
            task_b_to_a.cancel()
            
            async with self._lock:
                self._active_sessions.pop(session_id, None)
                
            try:
                writer_a.close()
                await writer_a.wait_closed()
            except:
                pass
            try:
                writer_b.close()
                await writer_b.wait_closed()
            except:
                pass
                
            logger.info(f"Session {session_id}: Tunnel completed and resources cleared.")

    async def run(self):
        server = await asyncio.start_server(self.handle_connection, self.host, self.port)
        addr = server.sockets[0].getsockname()
        logger.info(f"Relay Server running on {addr[0]}:{addr[1]}")
        async with server:
            await server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description="OnlyDesk Relay Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Binding interface")
    parser.add_argument("--port", type=int, default=50002, help="TCP port to bind")
    args = parser.parse_args()
    
    relay = RelayServer(host=args.host, port=args.port)
    try:
        asyncio.run(relay.run())
    except KeyboardInterrupt:
        logger.info("Relay Server stopped.")

if __name__ == "__main__":
    main()
