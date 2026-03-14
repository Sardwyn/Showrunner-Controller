@echo off
title Studio Controller Ignition
echo ==============================
echo     Launching All Systems...
echo ==============================

REM --- Launch OBS ---
echo Launching OBS...
start "" "C:\Program Files\obs-studio\bin\64bit\obs64.exe"

REM --- Launch NGINX RTMP Server ---
echo Starting NGINX RTMP server...
cd /d "C:\nginx-rtmp"
start "" nginx.exe

REM --- Launch Studio Controller Dev Server ---
echo Starting React dev server...
cd /d "D:\STUDIO\studio-controller"
start "" cmd /k "npm run dev"

REM --- Open controller in browser ---
echo Opening browser preview...
start "" "http://localhost:5174"

REM --- OPTIONAL: Locale setup or relay ---
:: echo Setting locale or launching additional services...
:: cd /d "C:\your\locale\path"  <- update if needed
:: start "" cmd /k "node your-script.js"

echo ==============================
echo     All Systems Online.
echo ==============================
pause
