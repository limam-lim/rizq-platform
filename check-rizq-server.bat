@echo off
chcp 65001 >nul 2>&1
echo.
echo  === Rizq Server Check ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [FAIL] Node.js not installed
) else (
  echo  [OK] Node.js:
  node -v
)

echo.
echo  Testing http://localhost:3000/ ...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/' -UseBasicParsing -TimeoutSec 3; Write-Host '  [OK] Server responds:' $r.StatusCode } catch { Write-Host '  [FAIL] No server on port 3000' ; Write-Host '  Run start-rizq.bat first and keep window open' }"

echo.
echo  If FAIL: double-click start-rizq.bat and wait for
echo  [rizq-backend] running on port 3000
echo.
pause
