import logging
import numpy as np
import time

logger = logging.getLogger(__name__)

class ScreenCapturer:
    def __init__(self, target_fps=30):
        self.target_fps = target_fps
        self.dxcam_instance = None
        self.mss_instance = None
        self.width = 0
        self.height = 0
        self._dummy_warning_logged = False
        
        # Try to initialize dxcam
        try:
            import dxcam
            self.dxcam_instance = dxcam.create(max_buffer_len=5, output_color="RGB")
            if self.dxcam_instance:
                frame = self.dxcam_instance.grab()
                if frame is not None:
                    self.height, self.width, _ = frame.shape
                    logger.info(f"Initialized dxcam screen capture. Resolution: {self.width}x{self.height}")
                else:
                    logger.warning("dxcam created but grab() returned None. Falling back to mss.")
                    self.dxcam_instance = None
        except Exception as e:
            logger.warning(f"Failed to initialize dxcam: {e}. Falling back to mss.")
            self.dxcam_instance = None
            
        # Fallback to mss if dxcam failed or is not available
        if not self.dxcam_instance:
            try:
                import mss
                self.mss_instance = mss.MSS()
                monitor = self.mss_instance.monitors[1]
                self.width = monitor["width"]
                self.height = monitor["height"]
                logger.info(f"Initialized mss screen capture. Resolution: {self.width}x{self.height}")
            except Exception as e:
                logger.warning(f"Failed to initialize mss capture: {e}. Using dummy frame generator fallback.")
                self.mss_instance = None
                self.width = 1280
                self.height = 720

    def grab(self):
        """
        Grabs a single frame from the screen.
        Returns:
            np.ndarray: An RGB frame of shape (height, width, 3), or None if there is no screen update.
        """
        if self.dxcam_instance:
            try:
                # dxcam.grab() returns None if there is no screen update.
                return self.dxcam_instance.grab()
            except Exception as e:
                logger.warning(f"dxcam grab failed: {e}. Switching to mss fallback.")
                self.dxcam_instance = None
                try:
                    import mss
                    self.mss_instance = mss.MSS()
                except Exception as ex:
                    logger.error(f"Failed to fallback-initialize mss: {ex}")
        
        if self.mss_instance:
            try:
                monitor = self.mss_instance.monitors[1]
                sct_img = self.mss_instance.grab(monitor)
                img_np = np.array(sct_img)
                return img_np[:, :, [2, 1, 0]]  # BGRA to RGB
            except Exception as e:
                # If grab fails, it's usually because of Session 0 or locked display
                if not self._dummy_warning_logged:
                    logger.warning(f"mss grab failed: {e}. Switching to dummy frame generator.")
                    self._dummy_warning_logged = True
                return self._generate_dummy_frame()
        
        return self._generate_dummy_frame()

    def _generate_dummy_frame(self):
        """
        Generates a dynamic placeholder frame for headless or locked environments.
        """
        if not self._dummy_warning_logged:
            logger.warning("Using simulated desktop frame (headless/locked environment)")
            self._dummy_warning_logged = True

        # H x W x 3
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Simple dynamic gradient pattern
        t = int(time.time() * 20) % 256
        for y in range(self.height):
            # Gradient values
            r = int((y / self.height) * 128)
            g = int((t / 256.0) * 128)
            b = 128 - r
            frame[y, :, :] = [r, g, b]
            
        # Draw a moving square to show activity
        sq_size = 100
        cx = int((self.width - sq_size) * (0.5 + 0.3 * np.sin(time.time())))
        cy = int((self.height - sq_size) * (0.5 + 0.3 * np.cos(time.time())))
        frame[cy:cy+sq_size, cx:cx+sq_size] = [0, 255, 128] # Cyan-green block
        
        return frame

    def close(self):
        if self.dxcam_instance:
            try:
                self.dxcam_instance.stop()
            except:
                pass
        if self.mss_instance:
            try:
                self.mss_instance.close()
            except:
                pass
