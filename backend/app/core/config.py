from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "serviceAccountKey.json"
    GEMINI_API_KEY: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "ebs-ai-assets"
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"


settings = Settings()
