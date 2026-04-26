"""Build the in-memory face DB from a dataset source, and match new faces.

`build_database` accepts either:
  - a string path to a local dataset folder (one subfolder per person), OR
  - an iterable yielding (label, [image_bytes_or_ndarray]) pairs.
"""
import os
import cv2
import numpy as np
from scipy.spatial.distance import cosine

from .face_utils import extract_face, get_embedding


def _decode(img_or_bytes):
    """Accept either a decoded ndarray or raw image bytes; return BGR ndarray or None."""
    if img_or_bytes is None:
        return None
    if isinstance(img_or_bytes, np.ndarray):
        return img_or_bytes
    if isinstance(img_or_bytes, (bytes, bytearray, memoryview)):
        buf = np.frombuffer(img_or_bytes, dtype=np.uint8)
        return cv2.imdecode(buf, cv2.IMREAD_COLOR)
    return None


def _iter_local(dataset_path):
    """Yield (label, [ndarray, ...]) by walking a one-folder-per-person tree."""
    for person in os.listdir(dataset_path):
        person_path = os.path.join(dataset_path, person)
        if not os.path.isdir(person_path):
            continue
        images = []
        for img_name in os.listdir(person_path):
            img = cv2.imread(os.path.join(person_path, img_name))
            if img is not None:
                images.append(img)
        yield person, images


def build_database(source):
    """Build embeddings DB from `source`.

    `source` may be:
      - str: a filesystem path to a dataset folder (one subdir per person), OR
      - iterable of (label, [ndarray|bytes, ...]) tuples.
    """
    if isinstance(source, str):
        items = _iter_local(source)
    else:
        items = source

    database = {}
    for label, images in items:
        embeddings = []
        for raw in images:
            img = _decode(raw)
            if img is None:
                continue
            face = extract_face(img)
            if face is None:
                continue
            embeddings.append(get_embedding(face))
        if embeddings:
            database[label] = embeddings
    return database


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
