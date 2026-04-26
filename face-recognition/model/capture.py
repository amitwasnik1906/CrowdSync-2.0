"""Quality-gated auto-capture loop and the take_photo orchestrator."""
import os
import time
import cv2

from .face_utils import detector
from .camera import open_local_camera, open_url_camera


def _sharpness(frame, box):
    """Variance of Laplacian on the face crop — higher = sharper."""
    x, y, w, h = box
    x, y = max(0, x), max(0, y)
    crop = frame[y:y + h, x:x + w]
    if crop.size == 0:
        return 0.0
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def capture_from_stream(cap, filename, window_title,
                        hint="Auto-capture on stable face — Q = cancel",
                        detect_every=5,
                        min_confidence=0.95,
                        min_face_size=120,
                        stable_seconds=5.0):
    """Show preview and auto-capture after a `stable_seconds` stable-face window.

    Once a face passes `min_confidence` and `min_face_size`, a collection window
    opens and the SHARPEST frame seen during it is kept. Capture fires when the
    window expires. Losing the face mid-window resets the timer.

    Returns ('saved', filename), ('cancel', None) on Q/ESC, or ('next', None) on N.
    """
    frame_idx = 0
    window_start = None
    best = None
    status = "Looking for face..."
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                raise RuntimeError("Failed to read frame from camera/stream.")

            preview = frame.copy()
            cv2.putText(preview, hint, (10, 25), cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, (255, 255, 255), 2)
            cv2.putText(preview, status, (10, 55), cv2.FONT_HERSHEY_SIMPLEX,
                        0.6, (0, 255, 0) if window_start else (0, 200, 255), 2)
            cv2.imshow(window_title, preview)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27):
                return ("cancel", None)
            if key == ord('n'):
                return ("next", None)

            frame_idx += 1
            if frame_idx % detect_every != 0:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            faces = detector.detect_faces(rgb)
            good = [f for f in faces if f.get('confidence', 0) >= min_confidence]
            face = max(good, key=lambda f: f['box'][2] * f['box'][3], default=None)

            if face is None:
                window_start = None
                best = None
                status = "Looking for face..."
                continue

            x, y, w, h = face['box']
            if min(w, h) < min_face_size:
                window_start = None
                best = None
                status = f"Move closer ({min(w, h)}px < {min_face_size}px)"
                continue

            sharp = _sharpness(frame, face['box'])
            if window_start is None:
                window_start = time.monotonic()
                best = (sharp, frame.copy())
            elif sharp > best[0]:
                best = (sharp, frame.copy())

            elapsed = time.monotonic() - window_start
            remaining = max(0.0, stable_seconds - elapsed)
            status = f"Hold still {remaining:0.1f}s (sharp={sharp:.0f})"

            if elapsed >= stable_seconds:
                cv2.imwrite(filename, best[1])
                return ("saved", filename)
    finally:
        cv2.destroyWindow(window_title)


def take_photo(source, filename='live_capture.jpg'):
    """Dispatch to the right capture flow based on source type from choose_source()."""
    mode, value = source

    if mode == "file":
        path = input("Enter image path (or drag the file into terminal): ").strip().strip('"').strip("'")
        if not path:
            return None
        if not os.path.isfile(path):
            raise RuntimeError(f"File not found: {path}")
        img = cv2.imread(path)
        if img is None:
            raise RuntimeError(f"OpenCV could not decode: {path}")
        cv2.imwrite(filename, img)
        return filename

    if mode == "url":
        cap = open_url_camera(value)
        if cap is None:
            raise RuntimeError(
                f"Could not open stream {value}. Check that the phone and PC are on the same WiFi, "
                f"the URL is correct, and the IP Webcam server is running."
            )
        try:
            action, val = capture_from_stream(cap, filename, "IP Webcam — auto-capture on face, Q cancel")
            return val if action == "saved" else None
        finally:
            cap.release()

    # mode == "local"
    start_index = 0
    while True:
        cap, info = open_local_camera(start=start_index)
        if cap is None:
            raise RuntimeError(
                "No working local camera found. Try mode 2 (IP Webcam) or 3 (image file) instead."
            )
        cams = info["all"]
        title = (
            f"Webcam idx={info['index']} ({info['backend_name']}) — "
            f"auto-capture on face, N next cam ({len(cams)} found), Q cancel"
        )
        try:
            action, val = capture_from_stream(cap, filename, title,
                                              hint="Auto-capture on face — N = next cam, Q = cancel")
        finally:
            cap.release()

        if action == "saved":
            return val
        if action == "cancel":
            return None
        next_indices = [i for (i, _, _) in cams if i > info["index"]]
        if not next_indices:
            print("No more cameras to cycle to — wrapping to first.")
            start_index = 0
        else:
            start_index = next_indices[0]
