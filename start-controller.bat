@echo off
cd /d H:\STUDIO\studio-controller

:: Check for node_modules before starting
IF NOT EXIST node_modules (
    echo Installing dependencies...
    npm install
)

echo.
echo ===============================
echo Starting Scraplet Controller...
echo ===============================
echo.

npm run dev

echo.
pause
