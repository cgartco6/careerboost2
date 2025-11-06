
## Local Windows Installation Scripts

**deployment/local/setup.bat**
```batch
@echo off
echo ===================================================
echo    CareerBoost Windows Setup Script
echo ===================================================
echo.

echo Checking prerequisites...

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

:: Check MongoDB
tasklist /fi "imagename eq mongod.exe" 2>NUL | find /i "mongod.exe" >NUL
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB is not running. Starting MongoDB service...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Failed to start MongoDB. Please install MongoDB first.
        echo Download from: https://www.mongodb.com/try/download/community
        pause
        exit /b 1
    )
)

:: Check Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Git is not installed. Installing Git...
    powershell -Command "Start-Process -Wait -FilePath 'https://git-scm.com/download/win' -PassThru"
    echo Please restart the setup after installing Git.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed!

echo.
echo Creating project structure...
mkdir backend 2>nul
mkdir backend\src 2>nul
mkdir backend\src\middleware 2>nul
mkdir backend\src\models 2>nul
mkdir backend\src\routes 2>nul
mkdir backend\src\services 2>nul
mkdir backend\src\security 2>nul
mkdir backend\src\database 2>nul
mkdir frontend 2>nul
mkdir frontend\src 2>nul
mkdir frontend\src\components 2>nul
mkdir frontend\src\components\Layout 2>nul
mkdir frontend\src\components\Cart 2>nul
mkdir frontend\src\pages 2>nul
mkdir frontend\public 2>nul
mkdir ai_services 2>nul
mkdir deployment 2>nul
mkdir deployment\local 2>nul
mkdir deployment\afrihost 2>nul
mkdir logs 2>nul
mkdir uploads 2>nul

echo ✅ Project structure created!

echo.
echo Copying configuration files...
copy "deployment\local\backend\.env" "backend\.env" >nul 2>&1
copy "deployment\local\backend\package.json" "backend\package.json" >nul 2>&1
copy "deployment\local\frontend\package.json" "frontend\package.json" >nul 2>&1
copy "deployment\local\frontend\vite.config.js" "frontend\vite.config.js" >nul 2>&1
copy "deployment\local\frontend\tailwind.config.js" "frontend\tailwind.config.js" >nul 2>&1

echo ✅ Configuration files copied!

echo.
echo ===================================================
echo    SETUP COMPLETED SUCCESSFULLY!
echo ===================================================
echo.
echo Next steps:
echo 1. Run install-all.bat to install dependencies
echo 2. Run launch-backend.bat to start backend server
echo 3. Run launch-frontend.bat to start frontend server
echo.
echo The application will be available at:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:5000
echo.
pause
