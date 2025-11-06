@echo off
title CareerBoost Backend Server
echo ===================================================
echo    Starting CareerBoost Backend Server
echo ===================================================
echo.

:: Check if MongoDB is running
tasklist /fi "imagename eq mongod.exe" 2>NUL | find /i "mongod.exe" >NUL
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB is not running. Attempting to start...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Failed to start MongoDB. Please start MongoDB manually.
        echo Run: net start MongoDB
        pause
        exit /b 1
    )
    echo ✅ MongoDB started successfully!
)

:: Check if backend dependencies are installed
cd /d backend
if not exist node_modules (
    echo ❌ Backend dependencies not installed. Run install-all.bat first.
    pause
    exit /b 1
)

echo 🚀 Starting backend server on port 5000...
echo 📝 Logs will be saved to ..\logs\backend.log
echo.

:: Start the backend server and log output
node src/server.js 2>&1 | tee ..\logs\backend.log

echo.
echo Backend server stopped.
pause
