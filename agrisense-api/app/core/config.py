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
    
    # Paid endpoints refuse every call unless this is set and the caller sends it (X-Access-Key)
    ACCESS_KEY: Optional[str] = None
    # Master switch for every paid provider call. Off unless explicitly set to true, so a present
    # ACCESS_KEY alone never lets a scan spend money.
    GENERATION_ENABLED: bool = False
    # Temporary public demo window. Off by default. When on, scanning needs no access key, but only
    # until PUBLIC_UNTIL (ISO 8601 with a timezone, e.g. 2026-11-27T23:59:00+05:30) and only for
    # SCAN_TOTAL_CAP scans counted in the database at DATABASE_URL. If any of the three is missing,
    # expired or unreachable, scanning is refused. Audio stays off unless PUBLIC_VOICE_ENABLED is true.
    PUBLIC_MODE: bool = False
    PUBLIC_UNTIL: Optional[str] = None
    SCAN_TOTAL_CAP: int = 0
    PUBLIC_VOICE_ENABLED: bool = False

    # Usage limits (in-memory safety nets for paid or quota-limited APIs)
    SCANS_PER_IP_PER_HOUR: int = 5
    DAILY_SCAN_CAP: int = 100
    MONTHLY_VOICE_CAP: int = 15
    MAX_UPLOAD_MB: int = 8
    # Scans handled at once in this process (the free Render instance has 512 MB). Extra requests get a 503.
    MAX_CONCURRENT_SCANS: int = 2
    # Wall-clock limits for the blocking provider calls made after detection
    # Provider calls that may still be running in worker threads, including ones whose caller timed out
    MAX_OUTSTANDING_PROVIDER_CALLS: int = 4
    TREATMENT_TIMEOUT_SECONDS: int = 40
    VOICE_TIMEOUT_SECONDS: int = 60
    # Output caps for every Gemini call (bounds cost per call)
    MAX_OUTPUT_TOKENS_DETECTION: int = 1200
    MAX_OUTPUT_TOKENS_TREATMENT: int = 2000
    MAX_OUTPUT_TOKENS_TRANSLATION: int = 800
    # Comma-separated browser origins allowed to call the API. "*" is for local development only.
    CORS_ORIGINS: str = "*"
    MAX_VOICE_CHARS: int = 800
    # Input caps, checked with the free count_tokens call before each paid generate call
    MAX_INPUT_TOKENS_DETECTION: int = 2500
    MAX_INPUT_TOKENS_TREATMENT: int = 4000
    MAX_INPUT_TOKENS_TRANSLATION: int = 1500
    # Aggregate Gemini allowance for this process (in memory: resets on restart, so a soft limit)
    TOTAL_GEMINI_CALLS_BUDGET: int = 60
    TOTAL_INPUT_TOKENS_BUDGET: int = 150000

    # AWS
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
