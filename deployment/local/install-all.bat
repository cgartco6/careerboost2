@echo off
echo ===================================================
echo    CareerBoost Dependency Installation
echo ===================================================
echo.

echo Installing backend dependencies...
cd /d backend
if exist node_modules (
    echo ⏩ Backend dependencies already installed.
) else (
    echo 📦 Installing backend packages...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Backend dependency installation failed!
        pause
        exit /b 1
    )
    echo ✅ Backend dependencies installed!
)

echo.
echo Installing frontend dependencies...
cd /d ..\frontend
if exist node_modules (
    echo ⏩ Frontend dependencies already installed.
) else (
    echo 📦 Installing frontend packages...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Frontend dependency installation failed!
        pause
        exit /b 1
    )
    echo ✅ Frontend dependencies installed!
)

echo.
echo ===================================================
echo    DEPENDENCY INSTALLATION COMPLETED!
echo ===================================================
echo.
echo To start the application:
echo 1. Ensure MongoDB is running
echo 2. Run launch-backend.bat (in one Command Prompt)
echo 3. Run launch-frontend.bat (in another Command Prompt)
echo.
echo Access URLs:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo - Health Check: http://localhost:5000/api/health
echo.
pause
