import unittest
import asyncio
import logging
import base64
import nacl.utils
from server.relay import RelayServer
from client.network.relay_client import RelayConnection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestRelayConnection(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Start TCP Relay Server on testing port 50007
        self.relay_port = 50007
        self.server = RelayServer(host="127.0.0.1", port=self.relay_port)
        self.server_task = asyncio.create_task(self.server.run())
        # Let the server bind and start listening
        await asyncio.sleep(0.2)

    async def asyncTearDown(self):
        self.server_task.cancel()
        try:
            await self.server_task
        except asyncio.CancelledError:
            pass

    async def test_relayed_secure_data_transfer(self):
        print("\n--- Testing Relayed TCP Fallback Secure Data Transmission ---")
        
        session_id = "test-session-fallback-999"
        
        # Future to capture decrypted data on Client B
        decrypted_data_received = asyncio.get_running_loop().create_future()

        def on_b_data_received(data):
            logger.info(f"Client B decrypted relayed packet: {data}")
            decrypted_data_received.set_result(data)

        # 1. Initialize Relay clients A and B
        conn_a = RelayConnection("client-A-id", "127.0.0.1", self.relay_port)
        conn_b = RelayConnection("client-B-id", "127.0.0.1", self.relay_port, on_data_received=on_b_data_received)

        # Generate a shared base64 session key
        raw_key = nacl.utils.random(32)
        b64_key = base64.b64encode(raw_key).decode('utf-8')
        
        conn_a.set_shared_key(b64_key)
        conn_b.set_shared_key(b64_key)

        try:
            # 2. Establish connections to the Relay Server
            a_connected = await conn_a.connect(session_id)
            self.assertTrue(a_connected, "Client A failed to connect to relay")
            
            b_connected = await conn_b.connect(session_id)
            self.assertTrue(b_connected, "Client B failed to connect to relay")
            
            # Let the tunnel initialize fully
            await asyncio.sleep(0.1)

            # 3. Transmit secure packet from A to B
            test_message = b"Relayed fallback message content!"
            conn_a.send_secure(test_message)

            # 4. Wait for B to receive and decrypt with 2.0s timeout
            received_message = await asyncio.wait_for(decrypted_data_received, timeout=2.0)
            self.assertEqual(received_message, test_message)
            print("Relayed TCP fallback tunnel data transfer verified successfully.")

        finally:
            conn_a.close()
            conn_b.close()

if __name__ == "__main__":
    unittest.main()
