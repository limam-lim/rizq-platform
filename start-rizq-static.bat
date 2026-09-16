@echo off
chcp 65001 >nul 2>&1
title Rizq Platform - Static (no API)
cd /d "%~dp0"

echo.
echo  ============================================================
echo   وضع ثابت — الصفحات تفتح بدون API
echo   Static mode - pages open, ads/API may be empty
echo   http://localhost:3000/
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js غير مثبت — https://nodejs.org/
  pause
  exit /b 1
)

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000/rizq_landing_v8.html"

echo  Starting static server... لا تغلق هذه النافذة
npx --yes serve -l 3000 -n .
pause
