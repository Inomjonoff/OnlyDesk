import asyncio
import argparse
import logging
import sys
from client.capture.capturer import ScreenCapturer
from client.codec.encoder import VideoEncoder
from client.codec.decoder import VideoDecoder
from client.display.viewer import RemoteViewer
from client.input.capture import translate_pygame_event, GlobalPanicListener
from client.input.injection import InputInjector
import client.config as config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("onlydesk.client")

class OnlyDeskClient:
    def __init__(self, codec=config.DEFAULT_CODEC, fps=config.DEFAULT_FPS, inject=False):
        self.codec = codec
        self.fps = fps
        self.inject = inject
        
        self.capturer = None
        self.encoder = None
        self.decoder = None
        self.viewer = None
        self.injector = None
        self.panic_listener = None
        self.loop = None
        
        # Performance Statistics
        self.frame_count = 0
        self.last_stat_time = 0
        self.capture_times = []
        self.encode_times = []
        self.decode_times = []
        self.render_times = []

    def handle_viewer_event(self, event):
        """
        Callback triggered whenever there is a user event in the Pygame window.
        """
        if not self.viewer:
            return
            
        event_dict = translate_pygame_event(event, self.viewer.width, self.viewer.height)
        if event_dict:
            if self.inject:
                logger.debug(f"Injecting input event: {event_dict}")
                self.injector.inject(event_dict)
            else:
                logger.info(f"Captured input event (dry-run): {event_dict}")

    def trigger_panic(self):
        """
        Panic callback to shut down the client loop immediately.
        """
        logger.warning("Panic button triggered! Stopping remote control.")
        if self.viewer:
            self.viewer.running = False

    async def run_loopback(self):
        logger.info("Starting OnlyDesk Client in loopback mode (Phase A)")
        
        # 1. Initialize screen capturer
        self.capturer = ScreenCapturer(target_fps=self.fps)
        width, height = self.capturer.width, self.capturer.height
        
        # 2. Initialize video codec components
        self.encoder = VideoEncoder(width, height, fps=self.fps, codec_name=self.codec)
        # Match decoder codec with whatever encoder initialized (handles mjpeg fallback automatically)
        self.decoder = VideoDecoder(codec_name=self.encoder.codec_name)
        
        # 3. Initialize input components
        self.injector = InputInjector()
        
        # 4. Initialize display window
        self.viewer = RemoteViewer(
            width=800, height=600, # Start with smaller size to make loopback usable
            title=f"OnlyDesk Loopback Viewer - Codec: {self.encoder.codec_name}",
            event_callback=self.handle_viewer_event
        )
        self.viewer.start()
        
        # Start global panic listener if we are injecting inputs
        if self.inject:
            self.panic_listener = GlobalPanicListener(on_panic_callback=self.trigger_panic)
            self.panic_listener.start()

        # Target frame sleep interval
        interval = 1.0 / self.fps
        self.last_stat_time = asyncio.get_event_loop().time()
        
        try:
            while self.viewer.running:
                start_time = asyncio.get_event_loop().time()
                
                # A. Grab desktop frame
                cap_start = asyncio.get_event_loop().time()
                frame = self.capturer.grab()
                self.capture_times.append(asyncio.get_event_loop().time() - cap_start)
                
                if frame is not None:
                    # B. Encode frame to raw packets
                    enc_start = asyncio.get_event_loop().time()
                    packets = self.encoder.encode(frame)
                    self.encode_times.append(asyncio.get_event_loop().time() - enc_start)
                    
                    # C. Decode packets back to raw frame (simulating network loopback)
                    dec_start = asyncio.get_event_loop().time()
                    decoded_frames = []
                    for packet in packets:
                        decoded_frames.extend(self.decoder.decode(packet))
                    self.decode_times.append(asyncio.get_event_loop().time() - dec_start)
                    
                    # D. Render the decoded frame
                    rend_start = asyncio.get_event_loop().time()
                    for df in decoded_frames:
                        self.viewer.render_frame(df)
                    if decoded_frames:
                        self.render_times.append(asyncio.get_event_loop().time() - rend_start)
                
                # E. Poll UI events (processes window close, resizing, keyboard, and mouse)
                if not self.viewer.poll_events():
                    break
                
                # Report statistics every 150 frames
                self.frame_count += 1
                if self.frame_count % 150 == 0:
                    import numpy as np
                    now = asyncio.get_event_loop().time()
                    elapsed = now - self.last_stat_time
                    current_fps = 150 / elapsed if elapsed > 0 else 0
                    self.last_stat_time = now
                    
                    avg_cap = np.mean(self.capture_times) * 1000 if self.capture_times else 0
                    avg_enc = np.mean(self.encode_times) * 1000 if self.encode_times else 0
                    avg_dec = np.mean(self.decode_times) * 1000 if self.decode_times else 0
                    avg_rend = np.mean(self.render_times) * 1000 if self.render_times else 0
                    
                    logger.info(
                        f"[STATS] FPS: {current_fps:.2f} | "
                        f"Capture: {avg_cap:.2f}ms | "
                        f"Encode: {avg_enc:.2f}ms | "
                        f"Decode: {avg_dec:.2f}ms | "
                        f"Render: {avg_rend:.2f}ms"
                    )
                    
                    self.capture_times.clear()
                    self.encode_times.clear()
                    self.decode_times.clear()
                    self.render_times.clear()
                
                # Throttle frame rate dynamically
                elapsed = asyncio.get_event_loop().time() - start_time
                sleep_time = max(0.001, interval - elapsed)
                await asyncio.sleep(sleep_time)
                
        except asyncio.CancelledError:
            logger.info("Loopback session cancelled.")
        except Exception as e:
            logger.critical(f"Unexpected error in client loop: {e}", exc_info=True)
        finally:
            self.cleanup()

    def cleanup(self):
        logger.info("Cleaning up OnlyDesk resources...")
        if self.panic_listener:
            self.panic_listener.stop()
        if self.viewer:
            self.viewer.stop()
        if self.capturer:
            self.capturer.close()
        logger.info("Cleanup completed. Exiting.")

def main():
    parser = argparse.ArgumentParser(description="OnlyDesk Remote Desktop Client")
    parser.add_argument("--loopback", action="store_true", default=True,
                        help="Run in local loopback screen sharing mode (Phase A)")
    parser.add_argument("--codec", type=str, default=config.DEFAULT_CODEC,
                        choices=['vp8', 'h264', 'mjpeg'],
                        help="Video codec to use for screen sharing")
    parser.add_argument("--fps", type=int, default=config.DEFAULT_FPS,
                        help="Target frames per second")
    parser.add_argument("--inject", action="store_true", default=False,
                        help="Enable remote input injection into the local OS (WARNING: can cause loops)")
    
    args = parser.parse_args()
    
    client = OnlyDeskClient(codec=args.codec, fps=args.fps, inject=args.inject)
    try:
        asyncio.run(client.run_loopback())
    except KeyboardInterrupt:
        logger.info("Program terminated by user.")

if __name__ == "__main__":
    main()
