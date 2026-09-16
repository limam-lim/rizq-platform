@echo off
chcp 65001 >nul 2>&1
title Rizq Platform - Server
cd /d "%~dp0"

echo.
echo  ============================================================
echo   منصة رزق — تشغيل الخادم المحلي
echo   Rizq Platform - Local Server
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js غير مثبت / Node.js is NOT installed.
  echo  حمّل من / Download from: https://nodejs.org/
  echo  ثم أعد تشغيل هذا الملف.
  echo.
  pause
  exit /b 1
)

echo  Node: 
node -v
echo.

cd rizq-backend
if not exist node_modules (
  echo  تثبيت الحزم لأول مرة — قد يستغرق دقائق...
  echo  Installing packages - first time may take a few minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo  [ERROR] فشل npm install
    echo  جرّب البديل: start-rizq-static.bat
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  ============================================================
echo   الخادم يعمل على / Server URL:
echo   http://localhost:3000/
echo.
echo   لا تغلق هذه النافذة / DO NOT CLOSE THIS WINDOW
echo  ============================================================
echo.

REM Open browser after short delay (server starts in this window)
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000/rizq_landing_v8.html"

call npm start

echo.
echo  [STOP] الخادم توقف. اضغط أي مفتاح...
pause
