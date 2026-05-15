"""Send attendance updates to the backend after a face match.

The face-recognition match returns the Drive folder name, which equals the
`faceId` stored on each Student. The backend's POST /api/attendance/face
endpoint looks the student up by faceId and marks entry/exit on their bus.
"""
import os
import requests


class AttendanceClient:
    def __init__(self, base_url=None, api_key=None, timeout=10):
        self.base_url = (base_url or os.environ.get("BACKEND_API_URL", "")).rstrip("/")
        self.api_key = api_key or os.environ.get("BACKEND_API_KEY", "")
        self.timeout = timeout

    def configured(self):
        return bool(self.base_url and self.api_key)

    def mark(self, face_id, mode, latitude=None, longitude=None):
        """Send POST /api/attendance/face. Returns (ok: bool, message: str)."""
        if not self.configured():
            return False, "Attendance API not configured (set BACKEND_API_URL and BACKEND_API_KEY)"

        payload = {"faceId": face_id, "mode": mode}
        if latitude is not None and longitude is not None:
            payload["latitude"] = latitude
            payload["longitude"] = longitude

        url = f"{self.base_url}/api/attendance/face"
        try:
            resp = requests.post(
                url,
                json=payload,
                headers={"X-API-Key": self.api_key},
                timeout=self.timeout,
            )
        except requests.RequestException as e:
            return False, f"Network error: {e}"

        try:
            body = resp.json()
        except ValueError:
            body = {}

        if resp.ok and body.get("success"):
            return True, f"{mode.upper()} marked for {face_id}"
        return False, body.get("error") or f"HTTP {resp.status_code}"

    def mark_driver(self, face_id, image_path):
        """POST /api/attendance/driver-mark with the captured frame.

        Returns (matched_driver: bool, ok: bool, message: str):
          - (True,  True,  msg) → was a driver, marked successfully → stop.
          - (False, False, msg) → backend returned 404 "Not a driver" →
            caller should fall back to mark() for student attendance.
          - (True,  False, msg) → was a driver but the call failed → log,
            do NOT fall back (avoids double-marking the face as a student).
        """
        if not self.configured():
            return False, False, "Attendance API not configured (set BACKEND_API_URL and BACKEND_API_KEY)"

        url = f"{self.base_url}/api/attendance/driver-mark"
        try:
            with open(image_path, "rb") as fh:
                resp = requests.post(
                    url,
                    data={"faceId": face_id},
                    files={"photo": (os.path.basename(image_path), fh, "image/jpeg")},
                    headers={"X-API-Key": self.api_key},
                    timeout=self.timeout,
                )
        except (OSError, requests.RequestException) as e:
            # Network/file error — assume the face MIGHT be a driver; don't fall
            # back to the student endpoint, since we can't tell.
            return True, False, f"Driver-mark error: {e}"

        try:
            body = resp.json()
        except ValueError:
            body = {}

        if resp.status_code == 404 and body.get("error") == "Not a driver":
            return False, False, "Not a driver"

        if resp.ok and body.get("success"):
            return True, True, f"Driver marked for {face_id}"

        # Was a driver (or ambiguous response) but failed.
        return True, False, body.get("error") or f"HTTP {resp.status_code}"
