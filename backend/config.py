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
