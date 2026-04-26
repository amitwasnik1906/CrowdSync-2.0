# Face Recognition Attendance

A small webcam-based attendance tool. It opens your camera, watches the preview for a stable, in-focus face, auto-captures the sharpest frame, and matches it against a folder of known people using FaceNet embeddings.

## How it works

1. **Build database** — at startup, every image under each person folder is cropped to a face (MTCNN) and embedded (FaceNet, 512-d vectors). The folder source is configurable: a local `dataset/` tree, **or** a shared Google Drive parent folder (one subfolder per student) populated by the admin dashboard.
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
│   ├── database.py       # build_database (local OR Drive), find_match
│   ├── drive_source.py   # Stream training images from a Google Drive folder
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

Two options — pick one, the script chooses based on env vars at startup.

### Option A — Local dataset folder (default)

Create `dataset/<Name>/` and drop a few clear face photos (3–10 is plenty). Folder name becomes the displayed label. Re-run the script to rebuild.

### Option B — Google Drive (admin dashboard enrollment)

Students enrolled via the admin dashboard get a per-student subfolder under a shared Drive parent. Point this tool at that parent folder and it'll pull images directly.

1. **Enable** the Google Drive API in a GCP project.
2. **Create** a service account; download its JSON key.
3. **Share** your "CrowdSync Faces" parent folder with the service-account email as **Viewer** (read-only is enough for this tool; the backend writes with its own credentials).
4. Copy `sample.env` to `.env` in the `face-recognition/` folder and fill it in:

   ```bash
   cp sample.env .env       # macOS/Linux
   copy sample.env .env     # Windows (cmd)
   ```

   Then edit `.env`:

   ```ini
   GOOGLE_SERVICE_ACCOUNT_JSON_PATH=./credentials/service-account.json
   DRIVE_PARENT_FOLDER_ID=<the-folder-id-from-the-Drive-URL>
   ```

   `DRIVE_PARENT_FOLDER_ID` is the long alphanumeric string in the folder's URL (e.g. `1aB2cD3eFgHi…`), **not** the folder name.

   Real OS environment variables override the `.env` file, so you can also export them in a shell instead.

5. Run as usual. Startup will print `Building database from Drive (parent ...)` and list each student folder it found.

Unset `DRIVE_PARENT_FOLDER_ID` to fall back to the local dataset.

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
- **`GOOGLE_SERVICE_ACCOUNT_JSON_PATH is not set`** — Drive mode was selected (env var present) but no creds path was given. Either set both env vars or unset `DRIVE_PARENT_FOLDER_ID` to use local mode.
- **Drive returns 0 student folders** — confirm the parent folder is shared with the service-account email (look for `*-iam.gserviceaccount.com` in the Share dialog).
