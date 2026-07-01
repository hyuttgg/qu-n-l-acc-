@echo off
echo ===========================================
echo  Blox Fruits Account Manager - STARTUP
echo ===========================================
echo.
echo [1/2] Starting Python FastAPI Backend...
start "BF Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul
echo.
echo [2/2] Starting React Dashboard...
start "BF Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo ==========================================
echo  Backend:   http://localhost:8000
echo  API Docs:  http://localhost:8000/docs
echo  Dashboard: http://localhost:5173
echo ==========================================
echo.
echo Press any key to open the dashboard in browser...
pause >nul
start http://localhost:5173
