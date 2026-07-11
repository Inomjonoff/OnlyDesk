import unittest
import os
import shutil
import hashlib
from client.features.clipboard import ClipboardManager
from client.features.file_transfer import FileTransferSender, FileTransferReceiver
from client.features.audio import AudioStreamer, AudioPlayer

class TestExtraFeatures(unittest.TestCase):
    def setUp(self):
        self.test_dir = "./downloads_test"
        os.makedirs(self.test_dir, exist_ok=True)

    def tearDown(self):
        # Clean up testing folders
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
        if os.path.exists("test_source.bin"):
            os.remove("test_source.bin")

    def test_clipboard_synchronization(self):
        print("\n--- Testing Clipboard Synchronization ---")
        cb = ClipboardManager()
        
        test_str = "Hello OnlyDesk Clipboard Sync!"
        
        # Test write
        success = cb.set_text(test_str)
        self.assertTrue(success)
        
        # Test read
        retrieved = cb.get_text()
        self.assertEqual(retrieved, test_str)
        
        # Test change detector (simulating an external change by altering the cached text)
        new_str = "Different Clipboard Content!"
        cb.set_text(new_str)
        cb.last_text = "some_old_value"
        change = cb.check_for_changes()
        self.assertEqual(change, new_str)
        
        # If we check again without changing, it should return None
        self.assertIsNone(cb.check_for_changes())
        print("Clipboard synchronization verified successfully.")

    def test_file_transfer_protocol(self):
        print("\n--- Testing Chunked File Transfer Protocol ---")
        
        # 1. Create a 100KB dummy binary file
        src_file = "test_source.bin"
        src_data = os.urandom(102400) # 100 KB
        with open(src_file, "wb") as f:
            f.write(src_data)
            
        src_hash = hashlib.md5(src_data).hexdigest()
        
        # 2. Start FileTransferSender and Receiver
        sender = FileTransferSender(src_file, chunk_size=16384) # 16KB chunks
        receiver = FileTransferReceiver(download_dir=self.test_dir)
        
        # 3. Stream all generated packets into the receiver
        completed = False
        for packet in sender.generate_packets():
            res = receiver.handle_packet(packet)
            if res:
                completed = True
                
        self.assertTrue(completed, "File transfer failed to signal completion.")
        
        # 4. Verify received file hash matches original source file
        dest_file = os.path.join(self.test_dir, "test_source.bin")
        self.assertTrue(os.path.exists(dest_file), "Destination file was not created.")
        
        with open(dest_file, "rb") as f:
            dest_data = f.read()
            
        dest_hash = hashlib.md5(dest_data).hexdigest()
        
        self.assertEqual(dest_hash, src_hash, "Transferred file is corrupt. Hashes do not match!")
        print("Chunked File Transfer integrity verified successfully.")

    def test_audio_streaming(self):
        print("\n--- Testing Audio Streaming Loop ---")
        streamer = AudioStreamer()
        player = AudioPlayer()
        
        streamer.start()
        player.start()
        
        try:
            # Capture 3 chunks of audio
            for i in range(3):
                chunk = streamer.read_chunk()
                self.assertIsNotNone(chunk)
                # 1024 frames of 16-bit (2 bytes) signed mono PCM is 2048 bytes
                self.assertEqual(len(chunk), 2048, "Audio chunk must be exactly 2048 bytes")
                
                # Stream it to player
                player.play_chunk(chunk)
            print("Audio recording and playback streaming verified successfully.")
        finally:
            streamer.stop()
            player.stop()

if __name__ == "__main__":
    unittest.main()
