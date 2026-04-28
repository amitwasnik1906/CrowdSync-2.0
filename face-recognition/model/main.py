"""Attendance loop entry point. Run with `python -m model.main` or via `run.py`."""
import os
from pathlib import Path

from .face_utils import color
from .database import build_database, find_match
from .camera import open_first_local_camera
from .capture import capture_from_stream
from .attendance_api import AttendanceClient


DATASET_PATH = Path(__file__).resolve().parent.parent / "dataset"
CAPTURED_IMAGE = "live_capture.jpg"
RECOGNITION_THRESHOLD = 0.5


def _build_face_database():
    """Pick the dataset source. If DRIVE_PARENT_FOLDER_ID is set, stream from
    Google Drive; otherwise fall back to the local `dataset/` folder."""
    drive_parent = os.environ.get("DRIVE_PARENT_FOLDER_ID")
    if drive_parent:
        from .drive_source import iter_dataset_from_drive
        print(f"⏳ Building database from Drive (parent {drive_parent})...")
        return build_database(iter_dataset_from_drive(drive_parent))
    print(f"⏳ Building database from local folder ({DATASET_PATH})...")
    return build_database(str(DATASET_PATH))


def _prompt_mode():
    """Ask the operator at the terminal whether this match is entry or exit."""
    while True:
        choice = input("Mark [E]ntry / e[X]it / [S]kip ? ").strip().lower()
        if choice in ("e", "entry", ""):
            return "entry"
        if choice in ("x", "exit"):
            return "exit"
        if choice in ("s", "skip"):
            return None
        print("  Please type E, X, or S.")


def _recognize(filename, face_database, attendance):
    print('Image captured successfully!')
    print("\nPerforming face detection and recognition...")
    result = find_match(filename, face_database, threshold=RECOGNITION_THRESHOLD)

    if isinstance(result, tuple):
        predicted_name, distance = result
        if predicted_name != 'Unknown':
            print(f"Face detected! Matched with: {color.GREEN}{predicted_name}{color.END} "
                  f"(Cosine Distance: {distance:.3f})")

            mode = _prompt_mode()
            if mode is None:
                print("⏭️  Skipped.")
                return

            if not attendance.configured():
                print(f"{color.RED}Backend not configured — skipping attendance.{color.END}")
                return

            # Backend is the source of truth: it returns 409 if a student tries
            # to board while already on the bus, or 404 if exit is sent without
            # an open entry. Multiple round-trips per day are allowed.
            ok, message = attendance.mark(predicted_name, mode)
            if ok:
                print(f"✅ {message}")
            else:
                print(f"{color.RED}❌ {message}{color.END}")
        else:
            print(f"Face detected, but no match found in database. Closest distance: "
                  f"{distance:.3f}. (Result: {color.RED}Unknown{color.END})")
    elif "No face detected" in result:
        print(f"{color.RED}No face detected in the captured image. Please try again.{color.END}")
    else:
        print(f"{color.RED}An error occurred during face recognition: {result}{color.END}")


def main():
    face_database = _build_face_database()
    print(f"✅ Database ready ({len(face_database)} people).")

    attendance = AttendanceClient()
    if attendance.configured():
        print(f"✅ Backend attendance API: {attendance.base_url}")
    else:
        print(f"{color.RED}⚠️  BACKEND_API_URL / BACKEND_API_KEY not set — "
              f"matches will be logged only.{color.END}")

    start_index = 0

    try:
        while True:
            cap, info = open_first_local_camera(start=start_index)
            if cap is None:
                print(f"{color.RED}No working local camera found.{color.END}")
                break

            title = (f"Webcam idx={info['index']} ({info['backend_name']}) — "
                     f"auto-capture on face, N next cam, Q cancel")

            try:
                while True:
                    action, val = capture_from_stream(
                        cap, CAPTURED_IMAGE, title,
                        hint="Auto-capture on face — N = next cam, Q = cancel",
                    )
                    if action == "saved":
                        _recognize(val, face_database, attendance)
                        print("\nStarting next capture...\n")
                        continue
                    if action == "next":
                        start_index = info["index"] + 1
                        break  # release & reopen at the next index
                    return  # cancel
            finally:
                cap.release()
    finally:
        print("\nSession complete.")


if __name__ == "__main__":
    main()
