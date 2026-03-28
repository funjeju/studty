import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import settings
import os

_db = None


def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            if settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
            else:
                # 환경변수로 직접 설정
                cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db
