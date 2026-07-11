import av
import logging

logger = logging.getLogger(__name__)

class VideoEncoder:
    def __init__(self, width, height, fps=30, codec_name='vp8'):
        self.width = width
        self.height = height
        self.fps = fps
        self.codec_name = codec_name
        self.context = None
        self._init_codec()

    def _init_codec(self):
        try:
            codec = av.Codec(self.codec_name, 'w')
            self.context = av.CodecContext.create(codec)
            self.context.width = self.width
            self.context.height = self.height
            
            if self.codec_name == 'mjpeg':
                self.context.pix_fmt = 'yuvj420p'
            else:
                self.context.pix_fmt = 'yuv420p'
                
            from fractions import Fraction
            self.context.time_base = Fraction(1, self.fps)
            
            # Realtime parameters to minimize latency
            if self.codec_name == 'h264':
                self.context.options = {
                    'preset': 'ultrafast',
                    'tune': 'zerolatency',
                    'g': '30',  # Intra-frame keyframe period
                }
            elif self.codec_name == 'vp8':
                self.context.options = {
                    'deadline': 'realtime',
                    'cpu-used': '4',
                    'g': '30',
                }
                
            self.context.open()
            logger.info(f"Initialized PyAV VideoEncoder with codec: {self.codec_name} ({self.width}x{self.height} @ {self.fps}fps)")
        except Exception as e:
            logger.error(f"Failed to initialize encoder {self.codec_name}: {e}")
            if self.codec_name != 'mjpeg':
                logger.warning("Attempting fallback to mjpeg encoder...")
                self.codec_name = 'mjpeg'
                self._init_codec()
            else:
                raise e

    def encode(self, frame_np, force_keyframe: bool = False):
        """
        Encodes an RGB numpy frame.
        Returns:
            list of bytes: Encoded packet payload data
        """
        if self.context is None:
            return []
            
        try:
            # Create video frame from RGB numpy array
            frame = av.VideoFrame.from_ndarray(frame_np, format='rgb24')
            # Reformat to context format (e.g. yuv420p)
            frame = frame.reformat(self.width, self.height, self.context.pix_fmt)
            
            if force_keyframe:
                frame.pict_type = 1
                logger.debug("Forcing keyframe (I-frame) in video encoder.")
            
            # Encode frame
            packets = self.context.encode(frame)
            encoded_bytes = []
            for packet in packets:
                if packet.is_corrupt:
                    continue
                encoded_bytes.append(bytes(packet))
            return encoded_bytes
        except Exception as e:
            logger.error(f"Encoding failed: {e}")
            return []
            
    def flush(self):
        """
        Flushes the encoder.
        Returns:
            list of bytes: Flushed packet payload data
        """
        if self.context is None:
            return []
        try:
            packets = self.context.encode(None)
            return [bytes(p) for p in packets if not p.is_corrupt]
        except Exception as e:
            logger.error(f"Flushing encoder failed: {e}")
            return []

    def set_bitrate(self, bitrate_bps: int):
        """
        Updates target encoder bitrate dynamically.
        """
        if self.context:
            try:
                self.context.bit_rate = bitrate_bps
                # Update tolerance to match
                self.context.bit_rate_tolerance = bitrate_bps // self.fps
                logger.info(f"Target encoder bitrate updated to {bitrate_bps} bps")
            except Exception as e:
                logger.warning(f"Dynamic bitrate adjustment not supported: {e}")

    def set_crf(self, crf: int):
        """
        Updates Constant Rate Factor (CRF) quality.
        """
        if self.context:
            try:
                if self.codec_name == 'h264':
                    self.context.options['crf'] = str(crf)
                    logger.info(f"Target H.264 CRF updated to {crf}")
            except Exception as e:
                logger.warning(f"CRF adjustment error: {e}")
