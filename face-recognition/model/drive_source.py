"""Stream a face-image dataset from a Google Drive parent folder, using
OAuth user delegation (the same client_secret.json + token.json the backend
uses).

Layout expected on Drive:
    <parent_folder_id>/
        <student folder 1>/   ← subfolder name becomes the label
            img1.jpg
            img2.jpg
        <student folder 2>/
            ...

Use `iter_dataset_from_drive(parent_id)` to yield (label, [image_bytes, ...]).
"""
import io
import json
import os

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ["https://www.googleapis.com/auth/drive"]
FOLDER_MIME = "application/vnd.google-apps.folder"
TOKEN_URI = "https://oauth2.googleapis.com/token"


def _read_client_secret(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("installed") or data.get("web") or {}


def _get_service():
    cs_path = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET_PATH")
    token_path = os.environ.get("GOOGLE_OAUTH_TOKEN_PATH")

    if not cs_path or not os.path.isfile(cs_path):
        raise RuntimeError(
            "GOOGLE_OAUTH_CLIENT_SECRET_PATH is not set or file is missing"
        )
    if not token_path or not os.path.isfile(token_path):
        raise RuntimeError(
            "GOOGLE_OAUTH_TOKEN_PATH is not set or file is missing — "
            "run `node scripts/oauth-init.js` in the backend folder first"
        )

    cs = _read_client_secret(cs_path)
    if not cs.get("client_id") or not cs.get("client_secret"):
        raise RuntimeError(f"Client secret JSON at {cs_path} is missing client_id/client_secret")

    with open(token_path, "r", encoding="utf-8") as f:
        tokens = json.load(f)

    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri=TOKEN_URI,
        client_id=cs["client_id"],
        client_secret=cs["client_secret"],
        scopes=SCOPES,
    )

    # If the access token is missing / expired, refresh now using the refresh
    # token. Don't write back to token.json — the backend owns that file.
    if not creds.valid:
        if not creds.refresh_token:
            raise RuntimeError(
                "Token file has no refresh_token — run `node scripts/oauth-init.js` again"
            )
        creds.refresh(Request())

    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _list_children(service, parent_id, mime_filter=None):
    q_parts = [f"'{parent_id}' in parents", "trashed = false"]
    if mime_filter == "folder":
        q_parts.append(f"mimeType = '{FOLDER_MIME}'")
    elif mime_filter == "image":
        q_parts.append("mimeType contains 'image/'")
    query = " and ".join(q_parts)

    page_token = None
    while True:
        resp = service.files().list(
            q=query,
            spaces="drive",
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token,
            pageSize=100,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()
        for f in resp.get("files", []):
            yield f
        page_token = resp.get("nextPageToken")
        if not page_token:
            break


def _download_bytes(service, file_id):
    request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue()


def iter_dataset_from_drive(parent_folder_id):
    """Generator yielding (label, [image_bytes, ...]) for each subfolder."""
    service = _get_service()
    subfolders = list(_list_children(service, parent_folder_id, mime_filter="folder"))
    print(f"📁 Drive: found {len(subfolders)} student folder(s) under parent.")

    for folder in subfolders:
        label = folder["name"]
        images = []
        for img in _list_children(service, folder["id"], mime_filter="image"):
            try:
                images.append(_download_bytes(service, img["id"]))
            except Exception as e:
                print(f"⚠️  Failed to download {img['name']} from {label}: {e}")
        print(f"   • {label}: {len(images)} image(s)")
        yield label, images
