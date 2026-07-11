import sys
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Check if we are running on Windows
IS_WINDOWS = sys.platform.startswith('win')

if IS_WINDOWS:
    import ctypes
    from ctypes import wintypes
    
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    
    # Setup types for safety
    user32.OpenClipboard.argtypes = [wintypes.HWND]
    user32.OpenClipboard.restype = wintypes.BOOL
    
    user32.CloseClipboard.argtypes = []
    user32.CloseClipboard.restype = wintypes.BOOL
    
    user32.EmptyClipboard.argtypes = []
    user32.EmptyClipboard.restype = wintypes.BOOL
    
    user32.GetClipboardData.argtypes = [wintypes.UINT]
    user32.GetClipboardData.restype = wintypes.HANDLE
    
    user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
    user32.SetClipboardData.restype = wintypes.HANDLE
    
    kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
    kernel32.GlobalAlloc.restype = wintypes.HGLOBAL
    
    kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
    kernel32.GlobalLock.restype = ctypes.c_void_p
    
    kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
    kernel32.GlobalUnlock.restype = wintypes.BOOL
    
    kernel32.GlobalFree.argtypes = [wintypes.HGLOBAL]
    kernel32.GlobalFree.restype = wintypes.HGLOBAL
    
    CF_UNICODETEXT = 13
    GMEM_MOVEABLE = 0x0002


class ClipboardManager:
    def __init__(self):
        self.last_text = ""
        if IS_WINDOWS:
            logger.info("Initialized Win32 ClipboardManager")
        else:
            logger.info("Initialized Simulated ClipboardManager")

    def get_text(self) -> str:
        """
        Retrieves Unicode text from the system clipboard.
        """
        if not IS_WINDOWS:
            return self.last_text
            
        if not user32.OpenClipboard(None):
            return ""
            
        try:
            handle = user32.GetClipboardData(CF_UNICODETEXT)
            if not handle:
                return ""
                
            ptr = kernel32.GlobalLock(handle)
            if not ptr:
                return ""
                
            try:
                # CF_UNICODETEXT is UTF-16, so decode using wide string pointer value
                text = ctypes.c_wchar_p(ptr).value
                return text if text else ""
            finally:
                kernel32.GlobalUnlock(handle)
        except Exception as e:
            logger.error(f"Failed to read from Win32 clipboard: {e}")
            return ""
        finally:
            user32.CloseClipboard()

    def set_text(self, text: str) -> bool:
        """
        Writes Unicode text to the system clipboard.
        """
        self.last_text = text
        if not IS_WINDOWS:
            logger.debug(f"[Simulate] Set clipboard text: {text!r}")
            return True
            
        if not user32.OpenClipboard(None):
            return False
            
        try:
            user32.EmptyClipboard()
            # Encode string as null-terminated UTF-16
            text_bytes = (text + "\0").encode('utf-16-le')
            size = len(text_bytes)
            
            h_mem = kernel32.GlobalAlloc(GMEM_MOVEABLE, size)
            if not h_mem:
                return False
                
            ptr = kernel32.GlobalLock(h_mem)
            if not ptr:
                kernel32.GlobalFree(h_mem)
                return False
                
            try:
                ctypes.memmove(ptr, text_bytes, size)
            finally:
                kernel32.GlobalUnlock(h_mem)
                
            if not user32.SetClipboardData(CF_UNICODETEXT, h_mem):
                kernel32.GlobalFree(h_mem)
                return False
                
            return True
        except Exception as e:
            logger.error(f"Failed to write to Win32 clipboard: {e}")
            return False
        finally:
            user32.CloseClipboard()
            
    def check_for_changes(self) -> Optional[str]:
        """
        Checks if system clipboard has changed since the last fetch.
        Returns the new text string if changed, otherwise returns None.
        """
        current_text = self.get_text()
        if current_text != self.last_text:
            self.last_text = current_text
            return current_text
        return None
