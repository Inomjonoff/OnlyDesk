import unittest
import asyncio
import logging
from server.main import SignalingServer
from client.network.signaling import SignalingClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestSignalingSystem(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Spin up TCP signaling server on a testing port (50005)
        self.server_port = 50005
        self.server = SignalingServer(host="127.0.0.1", port=self.server_port)
        self.server_task = asyncio.create_task(self.server.run())
        # Yield to let the server start listening
        await asyncio.sleep(0.1)

    async def asyncTearDown(self):
        # Shut down the signaling server
        self.server_task.cancel()
        try:
            await self.server_task
        except asyncio.CancelledError:
            pass

    async def test_registration_and_rendezvous(self):
        """
        Verifies that clients can register, get unique 9-digit IDs,
        and request connections to swap public/local endpoints.
        """
        print("\n--- Testing Signaling Registration and Rendezvous ---")
        
        # Futures to capture asynchronous callbacks
        peer_invite_received = asyncio.get_running_loop().create_future()
        peer_info_received = asyncio.get_running_loop().create_future()
        
        async def on_invite(peer_id, endpoints):
            logger.info(f"Test Callback (on_invite): peer_id={peer_id}, endpoints={endpoints}")
            if not peer_invite_received.done():
                peer_invite_received.set_result((peer_id, endpoints))
            
        async def on_info(peer_id, endpoints):
            logger.info(f"Test Callback (on_info): peer_id={peer_id}, endpoints={endpoints}")
            if not peer_info_received.done():
                peer_info_received.set_result((peer_id, endpoints))

        # Initialize clients A and B
        client_a = SignalingClient(
            server_host="127.0.0.1", 
            server_port=self.server_port,
            on_peer_info=on_info
        )
        client_b = SignalingClient(
            server_host="127.0.0.1", 
            server_port=self.server_port,
            on_peer_invite=on_invite
        )

        try:
            # 1. Connect and Register Client A
            a_connected = await client_a.connect()
            self.assertTrue(a_connected, "Client A failed to connect")
            self.assertIsNotNone(client_a.assigned_id)
            self.assertEqual(len(client_a.assigned_id), 11)  # Length of XXX-XXX-XXX is 11
            print(f"Client A registered with ID: {client_a.assigned_id}")

            # 2. Connect and Register Client B
            b_connected = await client_b.connect()
            self.assertTrue(b_connected, "Client B failed to connect")
            self.assertIsNotNone(client_b.assigned_id)
            self.assertEqual(len(client_b.assigned_id), 11)
            print(f"Client B registered with ID: {client_b.assigned_id}")

            # 3. Verify IDs are unique
            self.assertNotEqual(client_a.assigned_id, client_b.assigned_id)

            # 4. Trigger rendezvous request from Client A to Client B
            await client_a.connect_to_peer(client_b.assigned_id)

            # 5. Wait for endpoint swap packets to arrive with a 2-second timeout
            invite_peer, invite_eps = await asyncio.wait_for(peer_invite_received, timeout=2.0)
            info_peer, info_eps = await asyncio.wait_for(peer_info_received, timeout=2.0)

            # Assert Client B received invitation containing Client A's ID and public/local endpoints
            self.assertEqual(invite_peer, client_a.assigned_id)
            self.assertIn("public", invite_eps)
            self.assertIn("local", invite_eps)

            # Assert Client A received discovery info containing Client B's ID and public/local endpoints
            self.assertEqual(info_peer, client_b.assigned_id)
            self.assertIn("public", info_eps)
            self.assertIn("local", info_eps)
            
            print("Rendezvous endpoint exchange verified successfully.")

        finally:
            await client_a.disconnect()
            await client_b.disconnect()

if __name__ == "__main__":
    unittest.main()
