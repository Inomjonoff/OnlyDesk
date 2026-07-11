import unittest
from client.input.injection import InputInjector

class TestInputInjection(unittest.TestCase):
    def test_injector_events(self):
        """
        Verify that the input injector processes events without raising exceptions.
        """
        print("\n--- Testing Input Injector Event Handling ---")
        injector = InputInjector()
        
        # Test mouse movement
        try:
            injector.inject({"type": "mouse_move", "x_pct": 0.5, "y_pct": 0.5})
            print("Injected mouse movement successfully.")
        except Exception as e:
            self.fail(f"Mouse move injection failed with error: {e}")

        # Test mouse scroll
        try:
            injector.inject({"type": "mouse_scroll", "dx": 0, "dy": 1})
            print("Injected mouse scroll successfully.")
        except Exception as e:
            self.fail(f"Mouse scroll injection failed with error: {e}")

        # Test mouse down/up (safe button click - left click)
        # Note: In loopback mode, this will actually click on the user's screen at 50%, 50%.
        # To avoid actual clicking causing issues during automated test runs, we can test it 
        # but keep it fast. If we are running in tests, let's run them.
        try:
            injector.inject({"type": "mouse_down", "button": "left", "x_pct": 0.5, "y_pct": 0.5})
            injector.inject({"type": "mouse_up", "button": "left", "x_pct": 0.5, "y_pct": 0.5})
            print("Injected mouse click successfully.")
        except Exception as e:
            self.fail(f"Mouse click injection failed with error: {e}")

        # Test key down/up (using scancode for Shift key: 0x2A or 42)
        try:
            injector.inject({"type": "key_down", "scancode": 42})
            injector.inject({"type": "key_up", "scancode": 42})
            print("Injected keyboard events successfully.")
        except Exception as e:
            self.fail(f"Keyboard event injection failed with error: {e}")

if __name__ == "__main__":
    unittest.main()
