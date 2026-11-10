"""Shared paths and addresses for the dev tests and media scripts.

The server treats requests from this computer (127.0.0.1) as the DM. Player
devices must come from another address, so the scripts open player pages on this
computer's LAN address (PL). Override it with RK_LAN if the guess is wrong.
"""
import os, socket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "dev", ".work")          # ignored by git
OUT = os.path.join(WORK, "out")                     # screenshots and logs from tests
SRV = os.path.join(WORK, "srv")                     # the test server's folder
MEDIA = os.path.join(WORK, "media")                 # media script output
PRIV = os.environ.get("RK_PRIVATE", os.path.join(WORK, "private"))  # non-free fixtures, never committed
FIVE = os.environ.get("RK_5ETOOLS", "")             # a 5e.tools data folder, never committed
for d in (OUT, SRV, MEDIA):
    os.makedirs(d, exist_ok=True)

def _lan():
    if os.environ.get("RK_LAN"):
        return os.environ["RK_LAN"]
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()

LAN = _lan()
DM = "http://127.0.0.1:8765"      # the DM's view
PL = f"http://{LAN}:8765"         # a player's / the tablet's view

def font(name, size):
    """A PIL font from the app's own fonts folder: 'cinzel', 'sans' or 'sansbold'."""
    from PIL import ImageFont
    src = {"cinzel": "cinzel-latin-700-normal.woff2", "sans": "alegreya-sans-latin-400-normal.woff2",
           "sansbold": "alegreya-sans-latin-700-normal.woff2"}[name]
    ttf = os.path.join(WORK, "fonts", name + ".ttf")
    if not os.path.exists(ttf):
        from fontTools.ttLib import TTFont
        os.makedirs(os.path.dirname(ttf), exist_ok=True)
        f = TTFont(os.path.join(ROOT, "fonts", src)); f.flavor = None; f.save(ttf)
    return ImageFont.truetype(ttf, size)
