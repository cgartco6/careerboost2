@echo off
title CareerBoost Frontend Server
echo ===================================================
echo    Starting CareerBoost Frontend Server
echo ===================================================
echo.

:: Check if frontend dependencies are installed
cd /d frontend
if not exist node_modules (
    echo ❌ Frontend dependencies not installed. Run install-all.bat first.
    pause
    exit /b 1
)

echo 🚀 Starting frontend development server on port 3000...
echo 📝 Logs will be shown in this window...
echo.

:: Start the frontend development server
npm run dev

echo.
echo Frontend server stopped.
pause
