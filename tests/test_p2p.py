import unittest
import asyncio
import logging
import base64
import nacl.utils
from server.main import SignalingServer
from client.network.signaling import SignalingClient
from client.network.connection import P2PConnection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestP2PConnection(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Start TCP/UDP signaling server on test port 50006
        self.server_port = 50006
        self.server = SignalingServer(host="127.0.0.1", port=self.server_port)
        self.server_task = asyncio.create_task(self.server.run())
        # Let the server bind and start listening
        await asyncio.sleep(0.2)

    async def asyncTearDown(self):
        self.server_task.cancel()
        try:
            await self.server_task
        except asyncio.CancelledError:
            pass

    async def test_udp_hole_punch_and_secure_data(self):
        print("\n--- Testing UDP Hole Punching and Encrypted P2P Data Transmission ---")
        
        # Futures for signalling rendezvous
        endpoints_a_received = asyncio.get_running_loop().create_future()
        endpoints_b_received = asyncio.get_running_loop().create_future()
        
        async def on_b_invite(peer_id, endpoints):
            logger.info(f"Client B received invitation from {peer_id} with endpoints {endpoints}")
            endpoints_a_received.set_result(endpoints)
            
        async def on_a_info(peer_id, endpoints):
            logger.info(f"Client A received peer info for {peer_id} with endpoints {endpoints}")
            endpoints_b_received.set_result(endpoints)

        # 1. Connect signaling clients A and B to the server
        client_a_sig = SignalingClient(
            server_host="127.0.0.1",
            server_port=self.server_port,
            on_peer_info=on_a_info
        )
        client_b_sig = SignalingClient(
            server_host="127.0.0.1",
            server_port=self.server_port,
            on_peer_invite=on_b_invite
        )

        a_sig_ok = await client_a_sig.connect()
        b_sig_ok = await client_b_sig.connect()
        
        self.assertTrue(a_sig_ok)
        self.assertTrue(b_sig_ok)
        
        client_a_id = client_a_sig.assigned_id
        client_b_id = client_b_sig.assigned_id

        # Future to capture decrypted data on Client B
        decrypted_data_received = asyncio.get_running_loop().create_future()

        def on_b_data_received(data):
            logger.info(f"Client B decrypted P2P packet: {data}")
            decrypted_data_received.set_result(data)

        # 2. Start P2PConnection controllers on Client A and B
        conn_a = P2PConnection(client_a_id, "127.0.0.1", self.server_port)
        conn_b = P2PConnection(client_b_id, "127.0.0.1", self.server_port, on_data_received=on_b_data_received)

        # Register UDP sockets with signaling server
        a_p2p_ok = await conn_a.start()
        b_p2p_ok = await conn_b.start()
        
        self.assertTrue(a_p2p_ok)
        self.assertTrue(b_p2p_ok)

        # Ensure both UDP public ports are registered on the server database
        await asyncio.sleep(0.1)

        # Generate a random 32-byte shared session key (symmetric key)
        raw_key = nacl.utils.random(32)
        b64_key = base64.b64encode(raw_key).decode('utf-8')
        
        # Load keys into A and B
        conn_a.set_shared_key(b64_key)
        conn_b.set_shared_key(b64_key)

        try:
            # 3. Request connection rendezvous from A to B via TCP
            await client_a_sig.connect_to_peer(client_b_id)
            
            # Wait for endpoint information swap
            eps_of_a = await asyncio.wait_for(endpoints_a_received, timeout=2.0)
            eps_of_b = await asyncio.wait_for(endpoints_b_received, timeout=2.0)
            
            # 4. Trigger hole punching concurrently
            # Client A punches towards B
            punch_task_a = asyncio.create_task(conn_a.initiate_hole_punch(client_b_id, eps_of_b))
            # Client B punches towards A
            punch_task_b = asyncio.create_task(conn_b.initiate_hole_punch(client_a_id, eps_of_a))
            
            # Both must succeed
            success_a = await asyncio.wait_for(punch_task_a, timeout=5.0)
            success_b = await asyncio.wait_for(punch_task_b, timeout=5.0)
            
            self.assertTrue(success_a)
            self.assertTrue(success_b)
            self.assertTrue(conn_a.is_connected)
            self.assertTrue(conn_b.is_connected)
            
            # 5. Send secure encrypted message from A to B over the P2P connection
            test_message = b"Secured direct communication!"
            conn_a.send_secure(test_message)
            
            # B must receive and decrypt
            received_message = await asyncio.wait_for(decrypted_data_received, timeout=2.0)
            self.assertEqual(received_message, test_message)
            print("Direct P2P UDP packet encryption, transmission, and decryption verified successfully.")

        finally:
            conn_a.close()
            conn_b.close()
            await client_a_sig.disconnect()
            await client_b_sig.disconnect()

if __name__ == "__main__":
    unittest.main()
