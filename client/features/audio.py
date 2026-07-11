import logging
import math
import struct
import time

logger = logging.getLogger(__name__)

# Try to import pyaudio
PYAUDIO_AVAILABLE = False
try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    logger.warning("pyaudio is not installed. Audio module will run in Simulated/Dummy mode.")

# Audio parameters
FORMAT = 8        # 16-bit PCM (pyaudio.paInt16)
CHANNELS = 1      # Mono
RATE = 16000      # 16kHz sampling rate
CHUNK_SIZE = 1024 # 1024 frames per chunk

class AudioStreamer:
    """
    Captures system/microphone audio and streams PCM chunks.
    Falls back to generating a 440Hz sine wave if pyaudio is missing or fails.
    """
    def __init__(self):
        self.p = None
        self.stream = None
        self.running = False
        self._sim_time = 0.0

    def start(self):
        self.running = True
        if PYAUDIO_AVAILABLE:
            try:
                self.p = pyaudio.PyAudio()
                self.stream = self.p.open(
                    format=pyaudio.paInt16,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK_SIZE
                )
                logger.info("Started hardware audio recording stream.")
            except Exception as e:
                logger.error(f"Failed to open hardware audio stream: {e}. Falling back to simulation.")
                self.stream = None
        else:
            logger.info("Started simulated audio stream.")

    def read_chunk(self) -> bytes:
        """
        Reads a single chunk of PCM data.
        In simulated mode, generates a pure sine wave chunk (440Hz).
        """
        if not self.running:
            return b""

        if PYAUDIO_AVAILABLE and self.stream:
            try:
                return self.stream.read(CHUNK_SIZE, exception_on_overflow=False)
            except Exception as e:
                logger.warning(f"Error reading hardware audio: {e}")
                
        # Simulated Fallback: generate a 440Hz sine wave chunk
        # Duration of one chunk is CHUNK_SIZE / RATE = 1024 / 16000 = 0.064 seconds
        duration = CHUNK_SIZE / RATE
        frequency = 440.0
        amplitude = 10000  # Max value for 16-bit signed PCM is 32767
        
        pcm_data = bytearray()
        for i in range(CHUNK_SIZE):
            t = self._sim_time + (i / RATE)
            val = int(amplitude * math.sin(2 * math.pi * frequency * t))
            pcm_data.extend(struct.pack("<h", val))
            
        self._sim_time += duration
        # Simulate real-time delay (sleep 64ms)
        time.sleep(duration)
        return bytes(pcm_data)

    def stop(self):
        self.running = False
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except:
                pass
            self.stream = None
        if self.p:
            try:
                self.p.terminate()
            except:
                pass
            self.p = None
        logger.info("Stopped audio recording stream.")


class AudioPlayer:
    """
    Plays received PCM audio chunks.
    """
    def __init__(self):
        self.p = None
        self.stream = None
        self.running = False

    def start(self):
        self.running = True
        if PYAUDIO_AVAILABLE:
            try:
                self.p = pyaudio.PyAudio()
                self.stream = self.p.open(
                    format=pyaudio.paInt16,
                    channels=CHANNELS,
                    rate=RATE,
                    output=True,
                    frames_per_buffer=CHUNK_SIZE
                )
                logger.info("Started hardware audio playback stream.")
            except Exception as e:
                logger.error(f"Failed to open hardware audio playback: {e}. Falling back to simulation.")
                self.stream = None
        else:
            logger.info("Started simulated audio playback.")

    def play_chunk(self, data: bytes):
        if not self.running:
            return
            
        if PYAUDIO_AVAILABLE and self.stream:
            try:
                self.stream.write(data)
            except Exception as e:
                logger.warning(f"Error playing hardware audio: {e}")
        else:
            # Simulated playback: just consume the bytes
            logger.debug(f"[Simulate] Playing audio chunk ({len(data)} bytes)")

    def stop(self):
        self.running = False
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except:
                pass
            self.stream = None
        if self.p:
            try:
                self.p.terminate()
            except:
                pass
            self.p = None
        logger.info("Stopped audio playback stream.")
