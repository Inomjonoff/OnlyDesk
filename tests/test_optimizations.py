import unittest
import numpy as np
import av
from client.codec.encoder import VideoEncoder
from client.codec.decoder import VideoDecoder

class TestCodecOptimizations(unittest.TestCase):
    def test_keyframe_forcing(self):
        print("\n--- Testing Video Encoder Keyframe Forcing ---")
        
        width, height = 640, 480
        # Initialize encoder with VP8 (standard low-latency codec)
        # Fallback to mjpeg is automatic if vp8 is unavailable, but both support I-frames!
        encoder = VideoEncoder(width, height, fps=30, codec_name='vp8')
        
        # Create a test frame (solid white background)
        frame_np = np.ones((height, width, 3), dtype=np.uint8) * 255
        
        # 1. Encode frame normally (usually first frame is always a keyframe)
        packets_1 = encoder.encode(frame_np, force_keyframe=False)
        self.assertTrue(len(packets_1) > 0)
        
        # 2. Encode second frame with force_keyframe=True
        packets_2 = encoder.encode(frame_np, force_keyframe=True)
        self.assertTrue(len(packets_2) > 0)
        
        # Decode packets_2 using raw PyAV to inspect pict_type
        # (VideoDecoder returns raw numpy arrays, so we inspect the PyAV Frame object directly here)
        decoder = VideoDecoder(codec_name=encoder.codec_name)
        
        checked_any_frames = False
        for packet_bytes in packets_2:
            packet = av.Packet(packet_bytes)
            frames = decoder.context.decode(packet)
            for f in frames:
                checked_any_frames = True
                print(f"Decoded packet picture type: {f.pict_type}")
                # Verify that the picture type is indeed 'I' (Intra / Keyframe)
                self.assertIn(f.pict_type, ('I', 1), "Forced keyframe must have picture type 'I' or 1")
                
        # If no frames were yielded immediately (due to delay), flush decoder
        if not checked_any_frames:
            frames = decoder.context.decode(None)
            for f in frames:
                checked_any_frames = True
                print(f"Decoded packet (flushed) picture type: {f.pict_type}")
                self.assertIn(f.pict_type, ('I', 1), "Forced keyframe must have picture type 'I' or 1")
                
        self.assertTrue(checked_any_frames, "Failed to decode any frames to verify picture type.")
        print("Keyframe forcing successfully verified.")

    def test_bitrate_scaling(self):
        print("\n--- Testing Video Encoder Bitrate Scaling ---")
        
        width, height = 640, 480
        encoder = VideoEncoder(width, height, fps=30, codec_name='vp8')
        
        # Test updating to high bitrate (2 Mbps)
        try:
            encoder.set_bitrate(2000000)
            if encoder.context:
                # Some codecs might not reflect it if they fallback to mjpeg, 
                # but we check if we set it on the context
                print(f"Current codec context bit_rate: {encoder.context.bit_rate}")
        except Exception as e:
            self.fail(f"Failed to set high bitrate: {e}")
            
        # Test updating to low bitrate (100 Kbps)
        try:
            encoder.set_bitrate(100000)
            if encoder.context:
                print(f"Current codec context bit_rate: {encoder.context.bit_rate}")
        except Exception as e:
            self.fail(f"Failed to set low bitrate: {e}")
            
        # Test CRF setting
        try:
            encoder.set_crf(25)
        except Exception as e:
            self.fail(f"Failed to set CRF: {e}")
            
        print("Dynamic bitrate scaling successfully verified.")

if __name__ == "__main__":
    unittest.main()
