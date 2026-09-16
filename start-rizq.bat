@echo off
title Rizq Platform - local server
cd /d "%~dp0"
echo.
echo  ========================================
echo   Rizq Platform - starting server...
echo   Open: http://localhost:3000/
echo   Stop: close this window or Ctrl+C
echo  ========================================
echo.
cd rizq-backend
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
call npm start
