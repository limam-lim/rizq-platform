# Rizq local dev — ONE server (HTML + API on port 3000)
# Usage:  npm run dev   OR   npm start   OR   double-click start-rizq.bat
#
# Old split mode (front :5500 + api :3000) broke links — use dev:split only if needed.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'rizq-backend'

Write-Host ""
Write-Host "  Rizq Platform" -ForegroundColor DarkYellow
Write-Host "  Open: http://localhost:3000/" -ForegroundColor Cyan
Write-Host "  (HTML + API on the same port — required for links to work)" -ForegroundColor DarkGray
Write-Host "  Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Set-Location -LiteralPath $Backend
if (-not (Test-Path 'node_modules')) {
  Write-Host "Installing rizq-backend dependencies..." -ForegroundColor Yellow
  npm install
}
npm start
