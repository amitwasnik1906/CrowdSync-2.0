"""Build the in-memory face DB from a dataset folder, and match new faces."""
import os
import cv2
from scipy.spatial.distance import cosine

from .face_utils import extract_face, get_embedding


def build_database(dataset_path):
    database = {}
    for person in os.listdir(dataset_path):
        person_path = os.path.join(dataset_path, person)
        if not os.path.isdir(person_path):
            continue

        embeddings = []
        for img_name in os.listdir(person_path):
            img = cv2.imread(os.path.join(person_path, img_name))
            if img is None:
                continue
            face = extract_face(img)
            if face is None:
                continue
            embeddings.append(get_embedding(face))

        if embeddings:
            database[person] = embeddings
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
