"""Camera enumeration and source selection."""
import cv2


def is_virtual_camera(index, backend):
    """Detect virtual/placeholder cameras by checking if frames are completely static."""
    cap = cv2.VideoCapture(index, backend)
    if not cap.isOpened():
        cap.release()
        return False

    frames = []
    for _ in range(5):
        ok, frame = cap.read()
        if ok:
            frames.append(frame)
    cap.release()

    if len(frames) < 2:
        return False

    diff = cv2.absdiff(frames[0], frames[-1])
    return diff.max() == 0


def list_local_cameras(max_index=4):
    """Return list of (index, backend_name, backend_const) for working real cameras."""
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
                if is_virtual_camera(index, backend):
                    print(f"⚠️  Skipping camera index={index} ({name}) — static/virtual camera detected.")
                    seen_indices.add(index)
                    continue
                found.append((index, name, backend))
                seen_indices.add(index)
                break
    return found


def open_local_camera(start=0):
    """Open first working non-virtual camera at or after `start`. Returns (cap, info) or (None, None)."""
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
    index, name, backend = cams[0]
    cap = cv2.VideoCapture(index, backend)
    if cap.isOpened():
        print(f"✅ Opened local camera index={index} backend={name} (wrapped)")
        return cap, {"index": index, "backend_name": name, "backend": backend, "all": cams}
    return None, None


def open_first_local_camera(start=0, max_index=4):
    """Probe indices `start..start+max_index-1` and stop at the first working
    non-virtual camera. Faster than `open_local_camera` because it does NOT
    enumerate every backend/index combo — it returns as soon as one works.

    Returns (cap, info) where info has keys: index, backend_name, backend.
    """
    backends = [
        ("CAP_MSMF", cv2.CAP_MSMF),
        ("CAP_DSHOW", cv2.CAP_DSHOW),
        ("CAP_ANY", cv2.CAP_ANY),
    ]
    for index in range(start, start + max_index):
        for name, backend in backends:
            cap = cv2.VideoCapture(index, backend)
            if not cap.isOpened():
                cap.release()
                continue

            # Detect virtual cameras inline using the already-open cap.
            frames = []
            for _ in range(5):
                ok, frame = cap.read()
                if ok:
                    frames.append(frame)

            if len(frames) < 2:
                cap.release()
                continue

            if cv2.absdiff(frames[0], frames[-1]).max() == 0:
                print(f"⚠️  Skipping camera index={index} ({name}) — static/virtual camera detected.")
                cap.release()
                break  # don't try other backends on the same dead/virtual index

            print(f"✅ Opened local camera index={index} backend={name}")
            return cap, {"index": index, "backend_name": name, "backend": backend}
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
