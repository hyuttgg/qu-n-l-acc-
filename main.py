import sys
import os

# Thêm thư mục backend vào hệ thống PATH để import config và models
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# Import app từ backend/main.py
from backend.main import app

if __name__ == "__main__":
    import uvicorn
    # Chạy uvicorn local nếu cần
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
