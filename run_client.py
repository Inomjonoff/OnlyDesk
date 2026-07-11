import os
import sys

# Ensure the root directory of OnlyDesk is in Python's module search path
root_dir = os.path.abspath(os.path.dirname(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

if __name__ == "__main__":
    from client.gui import main
    main()
