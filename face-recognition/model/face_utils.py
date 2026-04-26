"""Face detection + embedding primitives. Models load once on import."""
import cv2
import numpy as np
from mtcnn import MTCNN
from keras_facenet import FaceNet

try:
    import colorama
    colorama.just_fix_windows_console()
except Exception:
    pass


class color:
    GREEN = "\033[92m"
    RED = "\033[91m"
    END = "\033[0m"


detector = MTCNN()
embedder = FaceNet()


def extract_face(image):
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    faces = detector.detect_faces(rgb)
    if not faces:
        return None
    x, y, w, h = faces[0]['box']
    x, y = abs(x), abs(y)
    face = rgb[y:y + h, x:x + w]
    return cv2.resize(face, (160, 160))


def get_embedding(face):
    face = face.astype('float32')
    face = np.expand_dims(face, axis=0)
    emb = embedder.embeddings(face)[0]
    return emb / np.linalg.norm(emb)


def get_face_embedding(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return None
    face = extract_face(img)
    if face is None:
        return None
    return get_embedding(face)
