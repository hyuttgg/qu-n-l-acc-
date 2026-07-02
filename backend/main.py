"""
Blox Fruits Account Manager — FastAPI Relay Server
────────────────────────────────────────────────────
Endpoints:
  POST /relay          ← Lua Sender gửi data lên
  GET  /accounts       ← Lấy tất cả acc
  GET  /accounts/{u}   ← Lấy 1 acc theo username
  GET  /online         ← Lấy acc đang online
  GET  /stats          ← Thống kê tổng quan
  GET  /health         ← Health check
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, HTTPException, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import config
import auth
from models import AccountPayload, RelayResponse, AccountListResponse, UserCreate, UserLogin, Token
from database import get_db, init_db, User, Account


# ─────────────────────────────────────────────────────
# Khởi tạo MySQL
# ─────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[DB] Connecting to MySQL database and initializing tables...")
    try:
        init_db()
        print("[DB] MySQL database initialized successfully.")
    except Exception as e:
        print(f"[DB] Error initializing MySQL database: {e}")
    yield


# ─────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────

app = FastAPI(
    title="Blox Fruits Account Manager API",
    version="1.0.0",
    description="Relay server nhận data từ Lua Sender và lưu vào MySQL",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Cho phép tất cả các nguồn truy cập
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────
# Rate Limiter — in-memory per username
# ─────────────────────────────────────────────────────

_rate_cache: dict[str, float] = {}  # username → last_request_time


def check_rate_limit(username: str) -> bool:
    """
    Trả về True nếu được phép, False nếu bị rate-limit.
    Mặc định: 1 request / 3 giây / user.
    """
    now = time.monotonic()
    last = _rate_cache.get(username, 0.0)

    if now - last < config.RATE_LIMIT_SECONDS:
        return False   # Bị giới hạn

    _rate_cache[username] = now
    return True


# ─────────────────────────────────────────────────────
# Auth Dependency & Endpoints
# ─────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


@app.post("/auth/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Kiểm tra xem user đã tồn tại chưa
        existing_user = db.query(User).filter(User.username == user.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already registered")
            
        hashed_password = auth.get_password_hash(user.password)
        import uuid
        api_key = uuid.uuid4().hex
        
        db_user = User(
            username=user.username,
            hashed_password=hashed_password,
            api_key=api_key,
            role="user"
        )
        db.add(db_user)
        db.commit()
        return {"message": "User registered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(error_details)
        raise HTTPException(status_code=400, detail=f"Register Error: {str(e)}")


@app.post("/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = auth.create_access_token(
        data={"sub": user.username}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    api_key = current_user.api_key
    if not api_key:
        import uuid
        api_key = uuid.uuid4().hex
        current_user.api_key = api_key
        db.commit()
    return {
        "username": current_user.username,
        "api_key": api_key
    }


# ─────────────────────────────────────────────────────
# Helper: serialize MySQL record → dict an toàn
# ─────────────────────────────────────────────────────

def serialize_account(acc: Account) -> dict:
    """Chuyển đổi SQLAlchemy Account sang dict an toàn cho JSON response."""
    return {
        "owner":        acc.owner,
        "username":     acc.username,
        "user_id":      acc.user_id,
        "level":        acc.level,
        "beli":         acc.beli,
        "fragments":    acc.fragments,
        "race":         acc.race,
        "sea":          acc.sea,
        "fruit":        acc.fruit,
        "sword":        acc.sword,
        "gun":          acc.gun,
        "melee":        acc.melee,
        "inventory":    acc.inventory,
        "accessories":  acc.accessories,
        "materials":    acc.materials,
        "status":       acc.status,
        "last_seen":    acc.last_seen.replace(tzinfo=timezone.utc).isoformat() if acc.last_seen else None,
        "created_at":   acc.created_at.replace(tzinfo=timezone.utc).isoformat() if acc.created_at else None,
        "updated_at":   acc.updated_at.replace(tzinfo=timezone.utc).isoformat() if acc.updated_at else None,
    }


def is_online(doc: dict) -> bool:
    """Kiểm tra acc có đang online không dựa vào last_seen."""
    last_seen = doc.get("last_seen")
    if not last_seen:
        return False
    if isinstance(last_seen, str):
        last_seen = datetime.fromisoformat(last_seen)
    threshold = datetime.now(timezone.utc) - timedelta(
        seconds=config.OFFLINE_THRESHOLD_SECONDS
    )
    # Đảm bảo timezone aware
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    return last_seen >= threshold


# ─────────────────────────────────────────────────────
# POST /relay — Lua Sender gửi data lên
# ─────────────────────────────────────────────────────

@app.post("/relay", response_model=RelayResponse)
@app.post("/data", response_model=RelayResponse)
def relay(payload: AccountPayload, db: Session = Depends(get_db)):
    # 1. Xác thực API Key
    user = db.query(User).filter(User.api_key == payload.api_key).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    owner = user.username

    # 2. Rate limit
    if not check_rate_limit(payload.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit: tối đa 1 request / {config.RATE_LIMIT_SECONDS}s"
        )

    # 3. Build & Upsert vào MySQL
    now = datetime.utcnow()

    try:
        account = db.query(Account).filter(Account.username == payload.username).first()
        if account:
            # Update các trường thông tin tài khoản
            account.owner = owner
            account.user_id = payload.user_id
            account.level = payload.level
            account.beli = payload.beli
            account.fragments = payload.fragments
            account.race = payload.race
            account.sea = payload.sea
            account.fruit = payload.fruit
            account.sword = payload.sword
            account.gun = payload.gun
            account.melee = payload.melee
            account.inventory = payload.inventory
            account.accessories = payload.accessories
            account.materials = payload.materials
            account.status = payload.status
            account.last_seen = now
            account.updated_at = now
        else:
            # Insert tài khoản mới
            account = Account(
                owner=owner,
                username=payload.username,
                user_id=payload.user_id,
                level=payload.level,
                beli=payload.beli,
                fragments=payload.fragments,
                race=payload.race,
                sea=payload.sea,
                fruit=payload.fruit,
                sword=payload.sword,
                gun=payload.gun,
                melee=payload.melee,
                inventory=payload.inventory,
                accessories=payload.accessories,
                materials=payload.materials,
                status=payload.status,
                last_seen=now,
                created_at=now,
                updated_at=now
            )
            db.add(account)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB error: {str(e)}"
        )

    return RelayResponse(
        success=True,
        message="Data received",
        username=payload.username,
    )


# ─────────────────────────────────────────────────────
# GET /accounts — Tất cả tài khoản
# ─────────────────────────────────────────────────────

@app.get("/accounts")
def get_accounts(
    sea: int | None = None,
    min_level: int | None = None,
    max_level: int | None = None,
    status: str | None = None,
    limit: int = 100,
    skip: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách tài khoản với filter tùy chọn.
    - sea: 1, 2, 3
    - min_level / max_level: filter theo level
    - status: "online" | "offline"
    - limit / skip: pagination
    """
    query = db.query(Account).filter(Account.owner == current_user.username)

    if sea is not None:
        query = query.filter(Account.sea == sea)

    if min_level is not None:
        query = query.filter(Account.level >= min_level)
        
    if max_level is not None:
        query = query.filter(Account.level <= max_level)

    threshold = datetime.utcnow() - timedelta(seconds=config.OFFLINE_THRESHOLD_SECONDS)
    
    if status == "online":
        query = query.filter(Account.last_seen >= threshold)
    elif status == "offline":
        query = query.filter((Account.last_seen < threshold) | (Account.last_seen.is_(None)))

    total = query.count()
    accounts = query.order_by(Account.level.desc()).offset(skip).limit(limit).all()

    # Đếm số lượng online thực tế của user (không phân biệt filter status)
    total_online_query = db.query(Account).filter(
        Account.owner == current_user.username,
        Account.last_seen >= threshold
    )
    online_count = total_online_query.count()

    results = []
    for acc in accounts:
        s = serialize_account(acc)
        online = is_online({"last_seen": s.get("last_seen")})
        s["is_online"] = online
        results.append(s)

    return {
        "total": total,
        "online": online_count,
        "returned": len(results),
        "accounts": results,
    }


# ─────────────────────────────────────────────────────
# GET /accounts/{username} — 1 tài khoản
# ─────────────────────────────────────────────────────

@app.get("/accounts/{username}")
def get_account(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.username == username, Account.owner == current_user.username).first()
    if not acc:
        raise HTTPException(status_code=404, detail=f"Account '{username}' not found")

    result = serialize_account(acc)
    result["is_online"] = is_online({"last_seen": result.get("last_seen")})
    return result


# ─────────────────────────────────────────────────────
# GET /online — Tài khoản đang online
# ─────────────────────────────────────────────────────

@app.get("/online")
def get_online(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    threshold = datetime.utcnow() - timedelta(
        seconds=config.OFFLINE_THRESHOLD_SECONDS
    )
    accounts = db.query(Account).filter(
        Account.owner == current_user.username,
        Account.last_seen >= threshold
    ).order_by(Account.last_seen.desc()).limit(500).all()

    results = [serialize_account(acc) for acc in accounts]
    for r in results:
        r["is_online"] = True

    return {"online": len(results), "accounts": results}


# ─────────────────────────────────────────────────────
# GET /stats — Thống kê tổng quan
# ─────────────────────────────────────────────────────

@app.get("/stats")
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import func, cast, String
    
    owner_username = current_user.username
    total = db.query(Account).filter(Account.owner == owner_username).count()

    threshold = datetime.utcnow() - timedelta(
        seconds=config.OFFLINE_THRESHOLD_SECONDS
    )
    online_count = db.query(Account).filter(
        Account.owner == owner_username,
        Account.last_seen >= threshold
    ).count()

    sea1 = db.query(Account).filter(Account.owner == owner_username, Account.sea == 1).count()
    sea2 = db.query(Account).filter(Account.owner == owner_username, Account.sea == 2).count()
    sea3 = db.query(Account).filter(Account.owner == owner_username, Account.sea == 3).count()

    # Top fruit
    top_fruits_query = db.query(
        Account.fruit,
        func.count(Account.fruit).label("count")
    ).filter(
        Account.owner == owner_username
    ).group_by(
        Account.fruit
    ).order_by(
        func.count(Account.fruit).desc()
    ).limit(5).all()
    
    top_fruits = [{"fruit": item[0], "count": item[1]} for item in top_fruits_query]

    # Top race
    top_races_query = db.query(
        Account.race,
        func.count(Account.race).label("count")
    ).filter(
        Account.owner == owner_username
    ).group_by(
        Account.race
    ).order_by(
        func.count(Account.race).desc()
    ).limit(5).all()
    
    top_races = [{"race": item[0], "count": item[1]} for item in top_races_query]

    # Avg level
    avg_level = db.query(func.avg(Account.level)).filter(Account.owner == owner_username).scalar()
    avg_level_val = round(float(avg_level), 1) if avg_level is not None else 0.0

    # Farming Statistics (Calculated in Python to be database-independent)
    accounts_all = db.query(Account).filter(Account.owner == owner_username).all()
    
    total_beli = sum(acc.beli for acc in accounts_all) if accounts_all else 0
    total_fragments = sum(acc.fragments for acc in accounts_all) if accounts_all else 0
    max_level_count = sum(1 for acc in accounts_all if acc.level >= 2550)

    def has_item(acc, item_name):
        if acc.melee == item_name or acc.sword == item_name or acc.gun == item_name:
            return True
        inv = acc.inventory
        if isinstance(inv, list) and item_name in inv:
            return True
        return False

    godhuman_count = sum(1 for acc in accounts_all if has_item(acc, "Godhuman"))
    cdk_count = sum(1 for acc in accounts_all if has_item(acc, "Cursed Dual Katana"))
    soul_guitar_count = sum(1 for acc in accounts_all if has_item(acc, "Soul Guitar"))

    return {
        "total_accounts": total,
        "online_now": online_count,
        "offline": total - online_count,
        "sea_breakdown": {"sea1": sea1, "sea2": sea2, "sea3": sea3},
        "top_fruits": top_fruits,
        "top_races": top_races,
        "avg_level": avg_level_val,
        "total_beli": int(total_beli),
        "total_fragments": int(total_fragments),
        "max_level_count": max_level_count,
        "godhuman_count": godhuman_count,
        "cdk_count": cdk_count,
        "soul_guitar_count": soul_guitar_count,
    }



# ─────────────────────────────────────────────────────
# GET /health — Health check
# ─────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


from fastapi.responses import PlainTextResponse

@app.get("/script", response_class=PlainTextResponse)
def get_script(key: str):
    script_path = os.path.join(os.path.dirname(__file__), "..", "core", "sender_obfuscated.lua")
    if not os.path.exists(script_path):
        script_path = os.path.join(os.path.dirname(__file__), "..", "core", "sender.lua")
        if not os.path.exists(script_path):
            raise HTTPException(status_code=404, detail="Script not found")
            
    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    return f'_G.BF_API_KEY = "{key}"\n\n' + content


# ─────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=True,
        log_level="info",
    )
