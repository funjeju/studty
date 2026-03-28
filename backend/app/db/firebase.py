import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import settings
import os

_db = None


def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                # 배포 환경: 환경변수에 JSON 문자열로 주입
                import json
                info = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                # Railway에서 private_key의 \n이 이스케이프된 경우 복구
                if "private_key" in info:
                    info["private_key"] = info["private_key"].replace("\\n", "\n")
                cred = credentials.Certificate(info)
            elif settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
            else:
                cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db
