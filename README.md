# 🏴‍☠️ Blox Fruits Account Manager

Hệ thống quản lý tài khoản Roblox Blox Fruits realtime.

## Kiến trúc

```
[Lua Sender]  →  [Python FastAPI]  →  [MongoDB Atlas]
                                           ↓
                                   [React Dashboard]
```

## Cấu trúc thư mục

```
📁 quản lý acc python/
├── 📄 START.bat              ← Chạy cái này để start toàn bộ
├── 📁 core/
│   └── sender.lua            ← Lua script chạy trong Executor
├── 📁 backend/
│   ├── .env                  ← Config (MongoDB URI, API Keys)
│   ├── main.py               ← FastAPI relay server
│   ├── config.py             ← Settings
│   ├── models.py             ← Data models
│   └── requirements.txt      ← Python dependencies
└── 📁 frontend/
    └── src/                  ← React dashboard
```

## Cài đặt

### 1. Backend (Python)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server chạy tại: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Dashboard tại: `http://localhost:5173`

### 3. Hoặc chạy tất cả cùng lúc

```
Double-click: START.bat
```

---

## Lua Sender

File: `core/sender.lua`

### Cách dùng

1. Mở Executor (Delta / Hydrogen / KRNL / Arceus X...)
2. Vào game Blox Fruits
3. Copy toàn bộ nội dung `sender.lua`
4. Paste vào Executor và Execute

### Config (đầu file)

```lua
local CONFIG = {
    API_URL         = "http://YOUR_PC_IP:8000/relay",  -- IP máy chủ
    API_KEY         = "BF_SECRET_2024",                -- Phải khớp .env
    UPDATE_INTERVAL = 5,                               -- Giây/lần
    RETRY_LIMIT     = 3,
}
```

> ⚠️ Nếu chạy trên UGPhone/VMOS cùng máy: dùng IP LAN của máy tính thay vì `127.0.0.1`

---

## API Endpoints

| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/relay` | Lua gửi data lên |
| GET | `/accounts` | Lấy tất cả acc |
| GET | `/accounts/{username}` | Lấy 1 acc |
| GET | `/online` | Acc đang online |
| GET | `/stats` | Thống kê tổng quan |
| GET | `/health` | Health check |

### Filter params cho `/accounts`

```
?sea=3               → chỉ Sea 3
?status=online       → chỉ online
?min_level=2000      → level từ 2000+
?max_level=2550      → level đến 2550
?limit=50&skip=0     → pagination
```

---

## Dữ liệu được track

| Field | Ý nghĩa |
|-------|---------|
| `level` | Level nhân vật |
| `beli` | Số tiền Beli |
| `fragments` | Fragments |
| `race` | Race (Human/Mink/Shark/Angel/Ghoul) |
| `sea` | Sea hiện tại (1/2/3) |
| `fruit` | Fruit đang có |
| `sword` | Sword đang hold |
| `gun` | Gun đang hold |
| `melee` | Melee style |
| `inventory` | Toàn bộ item trong Backpack |
| `accessories` | Helm, Cape, Scarf... |
| `materials` | Nguyên liệu và số lượng |
| `status` | online / offline |
| `last_seen` | Lần cuối thấy online |

---

## MongoDB

- **DB**: `bloxfruits_manager`
- **Collection**: `accounts`
- **Indexes**: `username` (unique), `user_id`, `last_seen`

---

## Thay đổi API Key

Sửa file `backend/.env`:

```
API_KEYS=YOUR_NEW_KEY_1,YOUR_NEW_KEY_2
```

Và sửa trong `core/sender.lua`:

```lua
API_KEY = "YOUR_NEW_KEY_1",
```

---

## Nâng cấp tiếp theo

- [ ] WebSocket sender (thay POST)
- [ ] AES encrypt payload
- [ ] Boss detector
- [ ] Raid detector
- [ ] Mastery tracker
- [ ] Bounty tracker
- [ ] Fruit stock detector
