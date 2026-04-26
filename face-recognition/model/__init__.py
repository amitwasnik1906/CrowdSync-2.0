import sys
from pathlib import Path

# Force stdout/stderr to UTF-8 so the emoji status lines (⏳ ✅ 📁 ⚠️) don't
# crash on Windows consoles that default to cp1252.
for _stream in (sys.stdout, sys.stderr):
    try:
        if _stream and getattr(_stream, "encoding", "").lower() != "utf-8":
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Load .env from the face-recognition project root (one level up from this
# package) before any submodule reads env vars. Existing OS env vars win.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from .face_utils import extract_face, get_embedding, get_face_embedding
from .database import build_database, find_match
from .camera import choose_source, open_local_camera, open_first_local_camera, open_url_camera
from .capture import capture_from_stream, take_photo

__all__ = [
    "extract_face",
    "get_embedding",
    "get_face_embedding",
    "build_database",
    "find_match",
    "choose_source",
    "open_local_camera",
    "open_first_local_camera",
    "open_url_camera",
    "capture_from_stream",
    "take_photo",
]
