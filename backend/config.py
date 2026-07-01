import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI: str = os.getenv("MONGODB_URI", "")
MONGODB_DB: str = os.getenv("MONGODB_DB", "bloxfruits_manager")

# API Keys — comma-separated trong .env
_raw_keys = os.getenv("API_KEYS", "BF_SECRET_2024")
API_KEYS: set[str] = set(k.strip() for k in _raw_keys.split(",") if k.strip())

RATE_LIMIT_PER_USER: int = int(os.getenv("RATE_LIMIT_PER_USER", "1"))
RATE_LIMIT_SECONDS: int = int(os.getenv("RATE_LIMIT_SECONDS", "3"))

# Nếu last_seen > threshold → offline
OFFLINE_THRESHOLD_SECONDS: int = int(os.getenv("OFFLINE_THRESHOLD_SECONDS", "30"))

HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# Auth JWT Config
SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7") # random secret key
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
