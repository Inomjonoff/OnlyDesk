import logging
import pygame
from pynput import keyboard

logger = logging.getLogger(__name__)

def translate_pygame_event(event, window_width, window_height):
    """
    Translates a Pygame GUI event into a normalized remote desktop input event.
    Coordinates are normalized as percentages (0.0 to 1.0) to be resolution-independent.
    """
    if window_width <= 0 or window_height <= 0:
        return None

    # Mouse motion
    if event.type == pygame.MOUSEMOTION:
        x, y = event.pos
        return {
            "type": "mouse_move",
            "x_pct": max(0.0, min(1.0, x / window_width)),
            "y_pct": max(0.0, min(1.0, y / window_height))
        }

    # Mouse buttons
    elif event.type in (pygame.MOUSEBUTTONDOWN, pygame.MOUSEBUTTONUP):
        x, y = event.pos
        btn = event.button
        
        # Pygame buttons: 1=left, 2=middle, 3=right, 4=scroll_up, 5=scroll_down
        button_map = {1: "left", 2: "middle", 3: "right"}
        
        # Handle scroll wheel
        if btn in (4, 5):
            if event.type == pygame.MOUSEBUTTONDOWN:
                dy = 1 if btn == 4 else -1
                return {
                    "type": "mouse_scroll",
                    "dx": 0,
                    "dy": dy
                }
            return None

        if btn in button_map:
            action = "mouse_down" if event.type == pygame.MOUSEBUTTONDOWN else "mouse_up"
            return {
                "type": action,
                "button": button_map[btn],
                "x_pct": max(0.0, min(1.0, x / window_width)),
                "y_pct": max(0.0, min(1.0, y / window_height))
            }

    # Keyboard inputs
    elif event.type in (pygame.KEYDOWN, pygame.KEYUP):
        action = "key_down" if event.type == pygame.KEYDOWN else "key_up"
        key_name = pygame.key.name(event.key)
        scancode = event.scancode
        
        return {
            "type": action,
            "key": key_name,
            "scancode": scancode
        }

    return None

class GlobalPanicListener:
    """
    A global keyboard listener on the sharer client side.
    Listens for a panic hotkey (e.g. Esc or Ctrl+Alt+Esc) to immediately abort remote control.
    """
    def __init__(self, on_panic_callback):
        self.on_panic_callback = on_panic_callback
        self.listener = None

    def _on_press(self, key):
        try:
            # Trigger panic if Esc key is pressed globally on the host machine
            if key == keyboard.Key.esc:
                logger.warning("Global panic hotkey (ESC) detected! Terminating session.")
                if self.on_panic_callback:
                    self.on_panic_callback()
        except Exception as e:
            logger.error(f"Error in global keyboard listener callback: {e}")

    def start(self):
        self.listener = keyboard.Listener(on_press=self._on_press)
        self.listener.start()
        logger.info("Started global keyboard panic listener (Press ESC globally to disconnect)")

    def stop(self):
        if self.listener:
            self.listener.stop()
            self.listener = None
            logger.info("Stopped global keyboard panic listener")
