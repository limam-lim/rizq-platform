# Rizq local dev — static frontend + backend API (Windows)
# Usage:  .\scripts\dev.ps1
#         npm run dev

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'rizq-backend'
$FrontendPort = if ($env:RIZQ_FRONT_PORT) { [int]$env:RIZQ_FRONT_PORT } else { 5500 }
$BackendPort = if ($env:PORT) { [int]$env:PORT } else { 3000 }

Write-Host "Rizq dev" -ForegroundColor DarkYellow
Write-Host "  Frontend : http://localhost:$FrontendPort/" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:$BackendPort/" -ForegroundColor Cyan
Write-Host "  Ctrl+C stops both." -ForegroundColor DarkGray
Write-Host ""

$frontCmd = "Set-Location -LiteralPath '$Root'; Write-Host '[front] http://localhost:$FrontendPort/' -ForegroundColor Cyan; npx --yes serve -l $FrontendPort ."
$backCmd = "Set-Location -LiteralPath '$Backend'; Write-Host '[api] starting…' -ForegroundColor Cyan; npm run dev"

$front = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-Command', $frontCmd) -PassThru -WindowStyle Normal
$back = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-Command', $backCmd) -PassThru -WindowStyle Normal

try {
  Wait-Process -Id $front.Id, $back.Id
} finally {
  foreach ($p in @($front, $back)) {
    if ($p -and -not $p.HasExited) {
      Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
  }
}
