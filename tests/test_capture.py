import unittest
import numpy as np
import time
from client.capture.capturer import ScreenCapturer
from client.codec.encoder import VideoEncoder
from client.codec.decoder import VideoDecoder

class TestScreenAndCodec(unittest.TestCase):
    def test_capture_and_codec_pipeline(self):
        """
        Tests that we can capture a frame, encode it, decode it,
        and get back a valid numpy array with the matching dimensions.
        """
        print("\n--- Testing Screen Capture and Codec Pipeline ---")
        
        # 1. Capture
        capturer = ScreenCapturer()
        self.assertIsNotNone(capturer)
        self.assertTrue(capturer.width > 0)
        self.assertTrue(capturer.height > 0)
        
        frame = capturer.grab()
        self.assertIsNotNone(frame, "Failed to grab initial frame")
        self.assertEqual(len(frame.shape), 3, "Frame must be 3D array (H, W, C)")
        self.assertEqual(frame.shape[2], 3, "Frame must have 3 color channels (RGB)")
        self.assertEqual(frame.shape[0], capturer.height)
        self.assertEqual(frame.shape[1], capturer.width)
        print(f"Captured test frame successfully. Resolution: {capturer.width}x{capturer.height}")

        # 2. Encode
        # Using mjpeg to guarantee compatibility across all environments during testing
        encoder = VideoEncoder(capturer.width, capturer.height, fps=30, codec_name='mjpeg')
        packets = encoder.encode(frame)
        self.assertTrue(len(packets) > 0, "Encoder failed to produce packets")
        print(f"Encoded frame into {len(packets)} packets. Total bytes: {sum(len(p) for p in packets)}")

        # 3. Decode
        decoder = VideoDecoder(codec_name=encoder.codec_name)
        decoded_frames = []
        for packet in packets:
            decoded_frames.extend(decoder.decode(packet))
            
        self.assertTrue(len(decoded_frames) > 0, "Decoder failed to decode any frames")
        
        # Check decoded frame dimensions match
        decoded_frame = decoded_frames[0]
        self.assertEqual(decoded_frame.shape, frame.shape, "Decoded frame shape does not match captured frame shape")
        print("Decoded frame verified successfully.")

        capturer.close()

    def test_codec_performance(self):
        """
        Measures the performance of the capturer + encoder + decoder loop.
        """
        print("\n--- Testing Pipeline Performance (Running 10 frames) ---")
        capturer = ScreenCapturer()
        encoder = VideoEncoder(capturer.width, capturer.height, fps=30, codec_name='mjpeg')
        decoder = VideoDecoder(codec_name=encoder.codec_name)
        
        frame_times = []
        for i in range(10):
            start = time.perf_counter()
            frame = capturer.grab()
            if frame is not None:
                packets = encoder.encode(frame)
                for p in packets:
                    decoder.decode(p)
            elapsed = time.perf_counter() - start
            frame_times.append(elapsed)
            
        avg_time_ms = np.mean(frame_times) * 1000
        fps = 1.0 / np.mean(frame_times)
        print(f"Average frame cycle time: {avg_time_ms:.2f} ms (~{fps:.1f} FPS)")
        
        capturer.close()
        
        # We target less than 50ms per frame cycle (capturer + codec) on loopback
        self.assertTrue(avg_time_ms < 100, f"Average cycle time is too high: {avg_time_ms:.2f}ms")

if __name__ == "__main__":
    unittest.main()
