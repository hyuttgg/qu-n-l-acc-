import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, BigInteger, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Load database URL from environment (e.g. for Render deployment)
# Default to local SQLite if no environment variable is provided
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./database.db"

# SQLite requires check_same_thread=False for multi-threading
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Quan hệ 1-n với accounts
    accounts = relationship("Account", back_populates="owner_rel", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    owner = Column(String, ForeignKey("users.username", ondelete="CASCADE"), nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(BigInteger, index=True, nullable=False)
    
    level = Column(Integer, default=0)
    beli = Column(BigInteger, default=0)
    fragments = Column(Integer, default=0)
    race = Column(String, default="Unknown")
    sea = Column(Integer, default=1)
    
    fruit = Column(String, default="None")
    sword = Column(String, default="None")
    gun = Column(String, default="None")
    melee = Column(String, default="None")
    
    inventory = Column(JSON, nullable=False)       # List[str]
    accessories = Column(JSON, nullable=False)     # List[str]
    materials = Column(JSON, nullable=False)       # Dict[str, int]
    
    status = Column(String, default="online")
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner_rel = relationship("User", back_populates="accounts")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
