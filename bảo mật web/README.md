# Hướng Dẫn Tích Hợp Hệ Thống Bảo Mật (Defense-in-Depth)

Thư mục này chứa toàn bộ cấu trúc thư mục và mã nguồn middleware bảo mật hoàn chỉnh cho backend **Express + MongoDB** quản lý tài khoản Blox Fruits. 

Dưới đây là hướng dẫn từng bước để tích hợp các tính năng này vào dự án chính của bạn.

---

## 1. Cài đặt các thư viện bổ sung

Đứng tại thư mục `backend/` của dự án chính, chạy lệnh sau để cài đặt các package bảo mật cần thiết:

```bash
npm install helmet express-rate-limit winston cookie-parser
```

* **`helmet`**: Quản lý các HTTP headers bảo mật (CSP, HSTS, X-Frame-Options...).
* **`express-rate-limit`**: Chống DDoS, spam API và Brute-force.
* **`winston`**: Ghi log bảo mật chuyên nghiệp ra file (dùng cho giám sát và cảnh báo).
* **`cookie-parser`**: Đọc cookies từ trình duyệt phục vụ cho cơ chế CSRF.

---

## 2. Cấu hình biến môi trường (`.env`)

Thêm các khóa bảo mật sau vào file `backend/.env` của bạn:

```env
# Khóa giải mã dữ liệu nhạy cảm (phải đúng 32 ký tự / 256 bits)
DATABASE_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# JWT Secrets cho Access & Refresh Token
JWT_ACCESS_SECRET=your_jwt_access_secret_should_be_long_and_secure
JWT_REFRESH_SECRET=your_jwt_refresh_secret_should_be_long_and_secure

# Danh sách domains frontend được phép truy cập (CORS) cách nhau bằng dấu phẩy
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173,http://localhost:3000

# Cấu hình thời gian lệch tối đa của Lua client (giây)
LUA_DRIFT_TOLERANCE=30
```

---

## 3. Tích hợp vào `backend/server.js`

Hãy sao chép các middleware vào thư mục `backend/middleware/` và `backend/config/` tương ứng, sau đó cập nhật `server.js` của bạn như sau:

```javascript
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser'); // <-- THÊM MỚI

// Import Database & Security Middlewares <-- THÊM MỚI
const connectDB = require('./config/db');
const helmetConfig = require('./middleware/helmetConfig');
const corsConfig = require('./middleware/corsConfig');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitize');
const { verifyCsrfToken, setCsrfToken } = require('./middleware/csrfProtection');

connectDB();

const app = express();
const server = http.createServer(app);

// 1. HTTP Security Headers (Helmet) <-- THÊM MỚI
app.use(helmetConfig);

// 2. Cookie Parser (Phục vụ đọc CSRF token) <-- THÊM MỚI
app.use(cookieParser(process.env.JWT_ACCESS_SECRET));

// 3. CORS Restricted Whitelist <-- THÊM MỚI
app.use(corsConfig);

// 4. Rate Limiting (Chống API Spam) <-- THÊM MỚI
app.use(generalLimiter);

// 5. Body Parsers
app.use(express.json());

// 6. Sanitization Layer (Chặn XSS & NoSQL Injection) <-- THÊM MỚI
app.use(sanitizeInput);

// Serve static images
const imagesPath = path.join(__dirname, '../ảnh');
app.use('/api/images', express.static(imagesPath));

// 7. CSRF Protection (Chỉ bật khi không phải endpoint Lua) <-- THÊM MỚI
app.use(verifyCsrfToken);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/lua', require('./routes/lua')); // Lua routes tự bỏ qua CSRF bên trong middleware

// Fallback error handlers
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Socket.io Realtime (Nên tích hợp JWT verify tại đây để tránh giả mạo)
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
});
// ... (Logic Socket.io của bạn)
```

---

## 4. Tích hợp Xác Thực API Key Cho Lua (`backend/routes/lua.js`)

Để xác thực Lua client gửi cập nhật tài khoản, ta sử dụng API Key gửi qua header `x-api-key`, kết hợp giới hạn tần suất (Rate Limiting) và kiểm tra dữ liệu đầu vào (Zod Validation) để chặn NoSQL Injection và spam:

```javascript
const express = require('express');
const router = express.Router();
const Account = require('../models/Account');

// Import các middleware bảo mật mới
const { requireApiKey } = require('../middleware/auth');
const { luaLimiter } = require('../middleware/rateLimiter');
const { validate, luaUpdateSchema } = require('../middleware/validator');

// Áp dụng Rate Limit riêng cho Lua, Xác thực API key và Validate Schema dữ liệu đầu vào
router.post(
  ['/update', '/client/update', '/heartbeat'], 
  luaLimiter,          // 1. Giới hạn tần suất gửi từ 1 IP/API-key (tối đa 30 req/phút)
  requireApiKey,       // 2. Xác thực khóa API Key gửi qua header x-api-key
  validate(luaUpdateSchema), // 3. Ràng buộc chặt chẽ schema dữ liệu gửi lên từ game
  async (req, res) => {
    const payload = req.body;
    const user = req.apiUser; // User đã được xác thực từ API Key
    
    // ... logic cập nhật dữ liệu của bạn ...
  }
);
```

---

## 5. Tích hợp Mã Hóa Dữ Liệu Vào Schema Mongoose (`backend/models/User.js`)

Mã hóa API Key hoặc Email của user trong DB sử dụng thuật toán **AES-256-GCM** để nếu hacker có dump được database cũng không thể lấy được API Key của khách hàng.

Sửa file `backend/models/User.js`:

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/cryptoHelper'); // <-- THÊM MỚI

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    // Ta có thể mã hóa email, tuy nhiên nếu muốn truy vấn tìm kiếm theo email thì nên băm thêm 1 trường index hash riêng (Deterministic Hash)
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  apiKey: {
    type: String,
    unique: true,
  }
});

// Middleware mã hóa API Key trước khi lưu
UserSchema.pre('save', function (next) {
  if (this.isModified('apiKey') && this.apiKey) {
    this.apiKey = encrypt(this.apiKey);
  }
  next();
});

// Tự động giải mã API Key sau khi truy vấn từ Database lên
UserSchema.post('init', function (doc) {
  if (doc.apiKey) {
    try {
      doc.apiKey = decrypt(doc.apiKey);
    } catch (err) {
      // Bỏ qua nếu dữ liệu cũ chưa mã hóa
    }
  }
});
```

---

## 6. Hướng Dẫn Gửi Payload bên phía Roblox (Lua Script Client)

Script Lua chạy trên các VM/Phone Farm chỉ cần đính kèm API Key được cấp vào header `x-api-key` khi gửi dữ liệu lên API Gateway.

Ví dụ code Lua gửi dữ liệu sử dụng `HttpService` của Roblox:

```lua
local HttpService = game:GetService("HttpService")

-- API Key được cấp từ Web Dashboard
local API_KEY = "forge_xxxxxx..." 
local API_URL = "https://yourdomain.com/api/lua/update"

local function sendStatsUpdate(stats)
    -- Chuyển đổi dữ liệu thống kê thành JSON
    local successJson, payloadJson = pcall(function()
        return HttpService:JSONEncode(stats)
    end)
    
    if not successJson then
        warn("Lỗi encode JSON payload")
        return
    end
    
    local headers = {
        ["Content-Type"] = "application/json",
        ["x-api-key"] = API_KEY
    }
    
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = API_URL,
            Method = "POST",
            Headers = headers,
            Body = payloadJson
        })
    end)
    
    if success then
        if response.StatusCode == 200 then
            print("Cập nhật thành công: " .. response.Body)
        else
            warn("Server từ chối dữ liệu (Status " .. tostring(response.StatusCode) .. "): " .. response.Body)
        end
    else
        warn("Lỗi kết nối gửi dữ liệu: " .. tostring(response))
    end
end

-- Chạy thử nghiệm
local myStats = {
    username = "blox_player_1",
    level = 2450,
    beli = 5000000,
    fragments = 12000,
    sea = 3,
    status = "grinding"
}

sendStatsUpdate(myStats)
```

---

## 7. Giám sát & Quản lý Log

Hệ thống ghi nhận toàn bộ các vi phạm bảo mật hoặc hành vi đáng ngờ vào thư mục `logs/` (nằm ở thư mục gốc của backend):
* **`logs/security-audit.log`**: Chỉ chứa các cảnh báo (`warn`) và lỗi (`error`), ví dụ như:
  * Sai chữ ký Lua.
  * Replay attack bị phát hiện (trùng Nonce hoặc quá lệch thời gian).
  * Request vượt quá Rate limit của Auth/General.
* **`logs/security-combined.log`**: Chứa tất cả các log hoạt động chung.

Bạn có thể cấu hình Grafana Loki hoặc Prometheus để đọc các file log này và gửi thông báo trực tiếp qua Telegram/Discord khi có dấu hiệu hệ thống đang bị tấn công DDoS hoặc Brute-Force.
