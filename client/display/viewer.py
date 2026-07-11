import pygame
import logging

logger = logging.getLogger(__name__)

class RemoteViewer:
    def __init__(self, width, height, title="OnlyDesk Remote Viewer", event_callback=None):
        self.width = width
        self.height = height
        self.title = title
        self.event_callback = event_callback
        self.screen = None
        self.clock = None
        self.running = False
        
    def start(self):
        pygame.init()
        self.screen = pygame.display.set_mode((self.width, self.height), pygame.RESIZABLE)
        pygame.display.set_caption(self.title)
        self.clock = pygame.time.Clock()
        self.running = True
        logger.info(f"Initialized Pygame Viewer window ({self.width}x{self.height})")

    def render_frame(self, frame_np):
        """
        Renders an RGB frame (shape: H x W x 3) onto the Pygame screen.
        Scales the frame to fit the current window size.
        """
        if not self.running or self.screen is None:
            return
            
        try:
            fh, fw, _ = frame_np.shape
            
            # Create a Pygame surface directly from RGB buffer (highly performant)
            surface = pygame.image.frombuffer(frame_np.tobytes(), (fw, fh), 'RGB')
            
            # Scale the surface if it differs from the window size
            win_w, win_h = self.screen.get_size()
            if fw != win_w or fh != win_h:
                surface = pygame.transform.scale(surface, (win_w, win_h))
                
            self.screen.blit(surface, (0, 0))
            pygame.display.flip()
        except Exception as e:
            logger.error(f"Failed to render frame: {e}")

    def poll_events(self):
        """
        Polls and processes Pygame window events.
        Forwards keyboard/mouse events to the callback function.
        Returns:
            bool: True if running, False if window is closed.
        """
        if not self.running:
            return False
            
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                return False
            elif event.type == pygame.VIDEORESIZE:
                self.width, self.height = event.size
                self.screen = pygame.display.set_mode((self.width, self.height), pygame.RESIZABLE)
            
            # Forward user interaction events to the keyboard/mouse capturer
            if self.event_callback:
                try:
                    self.event_callback(event)
                except Exception as e:
                    logger.error(f"Error in viewer event callback: {e}")
                    
        return True

    def stop(self):
        self.running = False
        pygame.quit()
        logger.info("Closed Pygame Viewer")
