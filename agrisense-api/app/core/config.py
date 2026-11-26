from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriSense AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: Optional[str] = None  # unused until auth exists
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    # Database
    DATABASE_URL: Optional[str] = None  # not used at runtime yet
    REDIS_URL: Optional[str] = None  # not used at runtime yet
    
    # AI Keys
    GEMINI_API_KEY: str
    # Model used for image analysis, treatment plans and translation.
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    PINECONE_API_KEY: str
    PINECONE_ENVIRONMENT: Optional[str] = None  # not needed by the current Pinecone client
    PINECONE_INDEX_NAME: str
    ELEVENLABS_API_KEY: str
    
    # AWS
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
