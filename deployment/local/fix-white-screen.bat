@echo off
echo ===================================================
echo    Fixing White Screen Issues
echo ===================================================
echo.

echo 🔧 Reinstalling frontend dependencies...
cd /d frontend

:: Remove node_modules and reinstall
if exist node_modules (
    echo Removing existing node_modules...
    rmdir /s /q node_modules
)

echo Reinstalling packages...
npm install

echo Building frontend...
npm run build

echo ✅ Fix completed! Try launching the frontend again.
echo.
pause
