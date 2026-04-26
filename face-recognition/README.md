# Face Recognition Attendance

A small webcam-based attendance tool. It opens your camera, watches the preview for a stable, in-focus face, auto-captures the sharpest frame, and matches it against a folder of known people using FaceNet embeddings.

## How it works

1. **Build database** — at startup, every image under `dataset/<person>/` is cropped to a face (MTCNN) and embedded (FaceNet, 512-d vectors).
2. **Auto-capture** — the live preview runs face detection every few frames. When a face passes the confidence + size gate, a 5-second window opens and the script keeps the **sharpest** frame seen during that window (Laplacian-of-Gaussian variance). The timer resets if you leave frame.
3. **Recognize** — the captured frame is embedded and matched against the database by cosine distance. The closest match below the threshold is marked present once per session.

## Project layout

```
face-recognition/
├── dataset/              # One folder per person — folder name is the label
│   ├── Akshay/
│   ├── ben_afflek/
│   └── ...
├── model/                # Importable package
│   ├── __init__.py       # Re-exports the public API
│   ├── face_utils.py     # MTCNN + FaceNet, extract/embed primitives
│   ├── database.py       # build_database, find_match
│   ├── camera.py         # Camera enumeration & source selection
│   ├── capture.py        # Quality-gated auto-capture loop, take_photo
│   └── main.py           # Attendance loop entry point
├── run.py                # Convenience launcher → calls model.main:main
├── requirements.txt
└── README.md
```

## Setup

Python 3.9–3.11 is recommended (TensorFlow wheel availability).

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## Adding people to the database

Create `dataset/<Name>/` and drop a few clear face photos (3–10 is plenty). Folder name becomes the displayed label. Re-run the script to rebuild.

## Run

```bash
python run.py
# or, equivalently:
python -m model.main
```

> `DATASET_PATH` is resolved relative to the package (`model/main.py`), so it works no matter where you've cloned the repo. Override it in `model/main.py` if your dataset lives elsewhere.

You'll be prompted for an image source:

| Choice | Source                                                                 |
| ------ | ---------------------------------------------------------------------- |
| 1      | Built-in / local webcam (auto-detects, skips static virtual cameras)   |
| 2      | Android **IP Webcam** app over HTTP — enter the URL it shows           |
| 3      | A single image file from disk (no camera)                              |

In the preview window:

- **Face detected** → status shows `Hold still 4.3s (sharp=…)` counting down. Stay roughly centered.
- **Face too small** → status shows `Move closer (NNpx < 120px)`.
- **Q / Esc** → cancel current capture and exit.
- **N** (local webcam mode only) → cycle to the next available camera.

When the 5s window expires, the sharpest stored frame is saved to `live_capture.jpg` and recognition runs. Matched people are added to a session set so they aren't marked twice.

## Tuning

All knobs live as kwargs on `capture_from_stream(...)` in `model/capture.py`:

| Knob              | Default | Effect                                                   |
| ----------------- | ------- | -------------------------------------------------------- |
| `detect_every`    | `5`     | Run MTCNN every N preview frames. Lower = snappier.      |
| `min_confidence`  | `0.95`  | MTCNN's own score required to count a detection.         |
| `min_face_size`   | `120`   | Min px on the shorter side of the face box.              |
| `stable_seconds`  | `5.0`   | How long the face must stay in-frame before capture.     |

Recognition threshold is the `RECOGNITION_THRESHOLD` constant at the top of `model/main.py` — lower = stricter.

## Troubleshooting

- **"No working local camera found"** — your only webcams are virtual/static (e.g. idle DroidCam, OBS). Plug in a real one or use IP Webcam mode.
- **IP Webcam stream won't open** — phone and PC must be on the same Wi-Fi; the URL shown by the app is what you paste in.
- **Everyone matches as the same person** — your dataset photos are too few or too similar. Add more varied shots and lower the threshold.
- **TensorFlow install fails** — most often a Python version mismatch. Use 3.9–3.11.
