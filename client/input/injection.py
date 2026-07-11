import sys
import logging

logger = logging.getLogger(__name__)

# Check if we are running on Windows
IS_WINDOWS = sys.platform.startswith('win')

if IS_WINDOWS:
    import ctypes
    from ctypes import wintypes

    # Input types
    INPUT_MOUSE = 0
    INPUT_KEYBOARD = 1

    # Mouse flags
    MOUSEEVENTF_MOVE = 0x0001
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_RIGHTDOWN = 0x0008
    MOUSEEVENTF_RIGHTUP = 0x0010
    MOUSEEVENTF_MIDDLEDOWN = 0x0020
    MOUSEEVENTF_MIDDLEUP = 0x0040
    MOUSEEVENTF_WHEEL = 0x0800
    MOUSEEVENTF_ABSOLUTE = 0x8000

    # Keyboard flags
    KEYEVENTF_EXTENDEDKEY = 0x0001
    KEYEVENTF_KEYUP = 0x0002
    KEYEVENTF_SCANCODE = 0x0008
    KEYEVENTF_UNICODE = 0x0004

    # Ctypes Structures
    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [
            ("dx", ctypes.c_long),
            ("dy", ctypes.c_long),
            ("mouseData", ctypes.c_ulong),
            ("dwFlags", ctypes.c_ulong),
            ("time", ctypes.c_ulong),
            ("dwExtraInfo", ctypes.c_void_p),
        ]

    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [
            ("wVk", ctypes.c_ushort),
            ("wScan", ctypes.c_ushort),
            ("dwFlags", ctypes.c_ulong),
            ("time", ctypes.c_ulong),
            ("dwExtraInfo", ctypes.c_void_p),
        ]

    class HARDWAREINPUT(ctypes.Structure):
        _fields_ = [
            ("uMsg", ctypes.c_ulong),
            ("wParamL", ctypes.c_ushort),
            ("wParamH", ctypes.c_ushort),
        ]

    class INPUT_UNION(ctypes.Union):
        _fields_ = [
            ("mi", MOUSEINPUT),
            ("ki", KEYBDINPUT),
            ("hi", HARDWAREINPUT),
        ]

    class INPUT(ctypes.Structure):
        _fields_ = [
            ("type", ctypes.c_ulong),
            ("u", INPUT_UNION),
        ]
else:
    logger.warning("Input injection module loaded on a non-Windows platform. Events will be simulated.")


class InputInjector:
    def __init__(self):
        if IS_WINDOWS:
            logger.info("Initialized Win32 InputInjector")
        else:
            logger.info("Initialized Simulated InputInjector")

    def inject(self, event_dict):
        """
        Receives an event dictionary and injects it into the OS.
        """
        if not event_dict:
            return

        event_type = event_dict.get("type")
        
        try:
            if event_type == "mouse_move":
                self.mouse_move(event_dict["x_pct"], event_dict["y_pct"])
            elif event_type == "mouse_down":
                self.mouse_button("down", event_dict["button"], event_dict["x_pct"], event_dict["y_pct"])
            elif event_type == "mouse_up":
                self.mouse_button("up", event_dict["button"], event_dict["x_pct"], event_dict["y_pct"])
            elif event_type == "mouse_scroll":
                self.mouse_scroll(event_dict["dy"])
            elif event_type in ("key_down", "key_up"):
                self.keyboard_key(event_type, event_dict["scancode"])
        except Exception as e:
            logger.error(f"Failed to inject event {event_dict}: {e}")

    def mouse_move(self, x_pct, y_pct):
        if not IS_WINDOWS:
            logger.debug(f"[Simulate] Mouse move: {x_pct:.4f}, {y_pct:.4f}")
            return

        # Translate 0.0-1.0 percentage to 0-65535 range for virtual screen absolute coordinates
        x = int(x_pct * 65535)
        y = int(y_pct * 65535)
        
        extra = ctypes.c_void_p(0)
        union = INPUT_UNION()
        union.mi = MOUSEINPUT(x, y, 0, MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE, 0, extra)
        cmd = INPUT(INPUT_MOUSE, union)
        ctypes.windll.user32.SendInput(1, ctypes.byref(cmd), ctypes.sizeof(cmd))

    def mouse_button(self, action, button, x_pct, y_pct):
        if not IS_WINDOWS:
            logger.debug(f"[Simulate] Mouse click: {action} {button} at {x_pct:.4f}, {y_pct:.4f}")
            return

        x = int(x_pct * 65535)
        y = int(y_pct * 65535)
        
        flags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE
        
        if button == "left":
            flags |= MOUSEEVENTF_LEFTDOWN if action == "down" else MOUSEEVENTF_LEFTUP
        elif button == "right":
            flags |= MOUSEEVENTF_RIGHTDOWN if action == "down" else MOUSEEVENTF_RIGHTUP
        elif button == "middle":
            flags |= MOUSEEVENTF_MIDDLEDOWN if action == "down" else MOUSEEVENTF_MIDDLEUP

        extra = ctypes.c_void_p(0)
        union = INPUT_UNION()
        union.mi = MOUSEINPUT(x, y, 0, flags, 0, extra)
        cmd = INPUT(INPUT_MOUSE, union)
        ctypes.windll.user32.SendInput(1, ctypes.byref(cmd), ctypes.sizeof(cmd))

    def mouse_scroll(self, dy):
        if not IS_WINDOWS:
            logger.debug(f"[Simulate] Mouse scroll: dy={dy}")
            return

        # 120 represents one scroll wheel notch in Windows API
        wheel_delta = int(dy * 120)
        
        extra = ctypes.c_void_p(0)
        union = INPUT_UNION()
        union.mi = MOUSEINPUT(0, 0, wheel_delta, MOUSEEVENTF_WHEEL, 0, extra)
        cmd = INPUT(INPUT_MOUSE, union)
        ctypes.windll.user32.SendInput(1, ctypes.byref(cmd), ctypes.sizeof(cmd))

    def keyboard_key(self, action, scancode):
        if not IS_WINDOWS:
            logger.debug(f"[Simulate] Keyboard: {action} scancode={scancode}")
            return

        flags = KEYEVENTF_SCANCODE
        if action == "key_up":
            flags |= KEYEVENTF_KEYUP

        # OEM Scancodes are 16-bit
        wscan = scancode & 0xFFFF
        
        # Check if the scan code is an extended key in Windows
        extended_keys = {
            0x48, 0x50, 0x4B, 0x4D,  # Arrow Up, Down, Left, Right
            0x49, 0x51, 0x47, 0x4F,  # PgUp, PgDn, Home, End
            0x52, 0x53,              # Insert, Delete
            0x11C,                   # Numpad Enter (usually)
            0x11D,                   # R-Control
            0x138,                   # R-Alt
        }
        
        # Check standard 8-bit scan code component to determine if it is extended
        if (wscan & 0xFF) in extended_keys or wscan > 0xFF:
            flags |= KEYEVENTF_EXTENDEDKEY

        extra = ctypes.c_void_p(0)
        union = INPUT_UNION()
        union.ki = KEYBDINPUT(0, wscan, flags, 0, extra)
        cmd = INPUT(INPUT_KEYBOARD, union)
        ctypes.windll.user32.SendInput(1, ctypes.byref(cmd), ctypes.sizeof(cmd))
