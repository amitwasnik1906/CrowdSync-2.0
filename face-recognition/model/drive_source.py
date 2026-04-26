"""Stream a face-image dataset from a shared Google Drive parent folder.

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
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
FOLDER_MIME = "application/vnd.google-apps.folder"


def _get_service():
    key_path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON_PATH")
    if not key_path:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON_PATH is not set")
    if not os.path.isfile(key_path):
        raise RuntimeError(f"Service-account file not found: {key_path}")

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
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
        ).execute()
        for f in resp.get("files", []):
            yield f
        page_token = resp.get("nextPageToken")
        if not page_token:
            break


def _download_bytes(service, file_id):
    request = service.files().get_media(fileId=file_id)
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
