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
