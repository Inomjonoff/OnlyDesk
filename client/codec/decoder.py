import av
import logging

logger = logging.getLogger(__name__)

class VideoDecoder:
    def __init__(self, codec_name='vp8'):
        self.codec_name = codec_name
        self.context = None
        self._init_codec()

    def _init_codec(self):
        try:
            codec = av.Codec(self.codec_name, 'r')
            self.context = av.CodecContext.create(codec)
            self.context.open()
            logger.info(f"Initialized PyAV VideoDecoder with codec: {self.codec_name}")
        except Exception as e:
            logger.error(f"Failed to initialize decoder {self.codec_name}: {e}")
            if self.codec_name != 'mjpeg':
                logger.warning("Attempting fallback to mjpeg decoder...")
                self.codec_name = 'mjpeg'
                self._init_codec()
            else:
                raise e

    def decode(self, packet_bytes):
        """
        Decodes a single packet's bytes.
        Returns:
            list of np.ndarray: Decoded RGB frames
        """
        if self.context is None:
            return []
            
        try:
            # Create PyAV Packet from raw bytes
            packet = av.Packet(packet_bytes)
            # Decode packet
            frames = self.context.decode(packet)
            decoded_frames = []
            for frame in frames:
                frame_np = frame.to_ndarray(format='rgb24')
                decoded_frames.append(frame_np)
            return decoded_frames
        except Exception as e:
            logger.error(f"Decoding failed: {e}")
            return []
