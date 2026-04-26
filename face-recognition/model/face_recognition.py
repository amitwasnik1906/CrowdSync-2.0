import os
import time
import cv2
import numpy as np
from mtcnn import MTCNN
from keras_facenet import FaceNet
from scipy.spatial.distance import cosine

# Enable ANSI colors on Windows terminals
try:
    import colorama
    colorama.just_fix_windows_console()
except Exception:
    pass

class color:
    GREEN = "\033[92m"
    RED = "\033[91m"
    END = "\033[0m"

# ==============================
# Load Models (ONLY ONCE)
# ==============================
detector = MTCNN()
embedder = FaceNet()

# ==============================
# Face Extraction
# ==============================
def extract_face(image):
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    faces = detector.detect_faces(rgb)

    if len(faces) == 0:
        return None

    x, y, w, h = faces[0]['box']
    x, y = abs(x), abs(y)

    face = rgb[y:y+h, x:x+w]
    face = cv2.resize(face, (160, 160))

    return face

# ==============================
# Get Embedding
# ==============================
def get_embedding(face):
    face = face.astype('float32')
    face = np.expand_dims(face, axis=0)

    emb = embedder.embeddings(face)[0]
    emb = emb / np.linalg.norm(emb)

    return emb

def get_face_embedding(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return None
    face = extract_face(img)
    if face is None:
        return None
    return get_embedding(face)

# ==============================
# Build Database
# ==============================
def build_database(dataset_path):
    database = {}

    for person in os.listdir(dataset_path):
        person_path = os.path.join(dataset_path, person)
        if not os.path.isdir(person_path):
            continue

        embeddings = []

        for img_name in os.listdir(person_path):
            img_path = os.path.join(person_path, img_name)

            img = cv2.imread(img_path)
            if img is None:
                continue

            face = extract_face(img)
            if face is None:
                continue

            embeddings.append(get_embedding(face))

        if embeddings:
            database[person] = embeddings

    return database

# ==============================
# Matching
# ==============================
def find_match(image_path, database, threshold=0.5):
    img = cv2.imread(image_path)
    if img is None:
        return f"Error: could not read image at {image_path}"

    face = extract_face(img)
    if face is None:
        return "No face detected"

    emb = get_embedding(face)

    best_match = "Unknown"
    min_dist = float('inf')
    for person, embeddings in database.items():
        for db_emb in embeddings:
            dist = cosine(emb, db_emb)
            if dist < min_dist:
                min_dist = dist
                best_match = person

    if min_dist > threshold:
        return "Unknown", min_dist
    return best_match, min_dist

# ==============================
# Camera helpers
# ==============================
def is_virtual_camera(index, backend):
    """Detect virtual/placeholder cameras by checking if frames are completely static."""
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        cap.release()
        return False

    frames = []
    for _ in range(5):  # Read 5 frames
        ok, frame = cap.read()
        if ok:
            frames.append(frame)
    cap.release()

    if len(frames) < 2:
        return False

    # If first and last frame are pixel-perfect identical → frozen/virtual cam (e.g. DroidCam idle)
    diff = cv2.absdiff(frames[0], frames[-1])
    if diff.max() == 0:
        return True

    return False


def list_local_cameras(max_index=4):
    """Return list of (index, backend_name, backend_const) that open, read a frame, and are NOT virtual."""
    backends = [
        ("CAP_MSMF", cv2.CAP_MSMF),
        ("CAP_DSHOW", cv2.CAP_DSHOW),
        ("CAP_ANY", cv2.CAP_ANY),
    ]
    found = []
    seen_indices = set()
    for index in range(max_index):
        for name, backend in backends:
            cap = cv2.VideoCapture(index, backend)
            opened = cap.isOpened()
            ok = False
            if opened:
                ok, _ = cap.read()
            cap.release()
            if opened and ok and index not in seen_indices:
                # Skip virtual/placeholder cameras (DroidCam idle, OBS, etc.)
                if is_virtual_camera(index, backend):
                    print(f"⚠️  Skipping camera index={index} ({name}) — static/virtual camera detected.")
                    seen_indices.add(index)
                    continue
                found.append((index, name, backend))
                seen_indices.add(index)
                break
    return found


def open_local_camera(start=0):
    """Open first working non-virtual camera at or after `start`. Returns (cap, info_dict) or (None, None)."""
    cams = list_local_cameras()
    if not cams:
        return None, None
    for index, name, backend in cams:
        if index < start:
            continue
        cap = cv2.VideoCapture(index, backend)
        if cap.isOpened():
            ok, _ = cap.read()
            if ok:
                print(f"✅ Opened local camera index={index} backend={name}")
                return cap, {"index": index, "backend_name": name, "backend": backend, "all": cams}
            cap.release()
    # Wrap to first available camera
    index, name, backend = cams[0]
    cap = cv2.VideoCapture(index, backend)
    if cap.isOpened():
        print(f"✅ Opened local camera index={index} backend={name} (wrapped)")
        return cap, {"index": index, "backend_name": name, "backend": backend, "all": cams}
    return None, None


def open_url_camera(url):
    """Open an HTTP/RTSP stream (e.g. Android 'IP Webcam' app)."""
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        return None
    ok, _ = cap.read()
    if not ok:
        cap.release()
        return None
    print(f"✅ Opened stream: {url}")
    return cap


def choose_source():
    print("\nChoose image source:")
    print("  1. Built-in / local webcam")
    print("  2. IP Webcam over HTTP  (Android app 'IP Webcam' — recommended)")
    print("  3. Pick an image file from disk (no camera needed)")
    choice = input("Select [1/2/3] (default 1): ").strip() or "1"

    if choice == "1":
        return ("local", None)
    if choice == "3":
        return ("file", None)

    # Mode 2: IP Webcam
    print("\nOn your phone, install 'IP Webcam' from Play Store and tap 'Start server'.")
    print("It will display a URL like http://192.168.1.5:8080")
    raw = input("Enter the URL shown on your phone (or just the IP): ").strip()
    if not raw:
        print("No URL given — falling back to local webcam.")
        return ("local", None)

    if not raw.startswith("http"):
        raw = "http://" + raw
    raw = raw.rstrip("/")
    if not raw.endswith("/video"):
        raw = raw + "/video"
    return ("url", raw)


def _sharpness(frame, box):
    """Variance of Laplacian on the face crop — higher = sharper."""
    x, y, w, h = box
    x, y = max(0, x), max(0, y)
    crop = frame[y:y+h, x:x+w]
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
    """Show preview and auto-capture after a 5-second stable-face window.

    Once a face passes `min_confidence` and `min_face_size`, we open a
    `stable_seconds` collection window and keep the SHARPEST frame seen during
    it. The capture fires when the window expires. Losing the face mid-window
    resets the timer.

    Returns ('saved', filename), ('cancel', None) on Q/ESC, or ('next', None) on N.
    """
    frame_idx = 0
    window_start = None  # time.monotonic() when the current good streak began
    best = None  # (sharpness, frame) from the current window
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

            # Pick the largest detected face that clears confidence
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
    """source is the (mode, value) tuple returned by choose_source()."""
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

    # mode == "local" — cycle through cameras with N if needed
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
            action, val = capture_from_stream(cap, filename, title, hint="Auto-capture on face — N = next cam, Q = cancel")
        finally:
            cap.release()

        if action == "saved":
            return val
        if action == "cancel":
            return None
        # action == "next" → try next camera in the list
        next_indices = [i for (i, _, _) in cams if i > info["index"]]
        if not next_indices:
            print("No more cameras to cycle to — wrapping to first.")
            start_index = 0
        else:
            start_index = next_indices[0]


# ==============================
# MAIN
# ==============================
if __name__ == "__main__":
    dataset_path = r"E:\PROJECTS\CrowdSync 2.0\face-recognition\dataset"

    print("⏳ Building database...")
    face_database = build_database(dataset_path)
    print(f"✅ Database ready ({len(face_database)} people).")

    captured_image_path = 'live_capture.jpg'
    marked = set()
    source = ("local", None)  # Automatically uses real webcam, skips DroidCam

    while True:
        try:
            print(f"\nCapturing image... ({captured_image_path})")
            filename = take_photo(source, filename=captured_image_path)

            if filename is None:
                print("Capture cancelled. Exiting.")
                break

            print('Image captured successfully!')

            print("\nPerforming face detection and recognition...")
            recognition_result = find_match(captured_image_path, face_database, threshold=0.5)

            if isinstance(recognition_result, tuple):
                predicted_name, distance = recognition_result
                if predicted_name != 'Unknown':
                    print(f"Face detected! Matched with: {color.GREEN}{predicted_name}{color.END} (Cosine Distance: {distance:.3f})")
                    if predicted_name not in marked:
                        marked.add(predicted_name)
                        print(f"✅ {predicted_name} marked present.")
                    else:
                        print(f"ℹ️  {predicted_name} already marked.")
                else:
                    print(f"Face detected, but no match found in database. Closest distance: {distance:.3f}. (Result: {color.RED}Unknown{color.END})")

            elif "No face detected" in recognition_result:
                print(f"{color.RED}No face detected in the captured image. Please try again.{color.END}")
            else:
                print(f"{color.RED}An error occurred during face recognition: {recognition_result}{color.END}")

        except Exception as err:
            print(f"{color.RED}An error occurred during image capture: {err}. Please ensure you grant camera permissions.{color.END}")
            break

        print("\nStarting next capture...\n")

    print(f"\nSession complete. Marked present: {sorted(marked) if marked else 'none'}")