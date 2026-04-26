"""Attendance loop entry point. Run with `python -m model.main` or via `run.py`."""
from pathlib import Path

from .face_utils import color
from .database import build_database, find_match
from .capture import take_photo


DATASET_PATH = Path(__file__).resolve().parent.parent / "dataset"
CAPTURED_IMAGE = "live_capture.jpg"
RECOGNITION_THRESHOLD = 0.5


def main():
    print("⏳ Building database...")
    face_database = build_database(str(DATASET_PATH))
    print(f"✅ Database ready ({len(face_database)} people).")

    marked = set()
    source = ("local", None)  # default: real webcam, skip virtual ones

    while True:
        try:
            print(f"\nCapturing image... ({CAPTURED_IMAGE})")
            filename = take_photo(source, filename=CAPTURED_IMAGE)

            if filename is None:
                print("Capture cancelled. Exiting.")
                break

            print('Image captured successfully!')
            print("\nPerforming face detection and recognition...")
            result = find_match(filename, face_database, threshold=RECOGNITION_THRESHOLD)

            if isinstance(result, tuple):
                predicted_name, distance = result
                if predicted_name != 'Unknown':
                    print(f"Face detected! Matched with: {color.GREEN}{predicted_name}{color.END} "
                          f"(Cosine Distance: {distance:.3f})")
                    if predicted_name not in marked:
                        marked.add(predicted_name)
                        print(f"✅ {predicted_name} marked present.")
                    else:
                        print(f"ℹ️  {predicted_name} already marked.")
                else:
                    print(f"Face detected, but no match found in database. Closest distance: "
                          f"{distance:.3f}. (Result: {color.RED}Unknown{color.END})")
            elif "No face detected" in result:
                print(f"{color.RED}No face detected in the captured image. Please try again.{color.END}")
            else:
                print(f"{color.RED}An error occurred during face recognition: {result}{color.END}")

        except Exception as err:
            print(f"{color.RED}An error occurred during image capture: {err}. "
                  f"Please ensure you grant camera permissions.{color.END}")
            break

        print("\nStarting next capture...\n")

    print(f"\nSession complete. Marked present: {sorted(marked) if marked else 'none'}")


if __name__ == "__main__":
    main()
