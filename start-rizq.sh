#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/rizq-backend"
echo ""
echo "  Rizq Platform — http://localhost:3000/"
echo "  Stop with Ctrl+C"
echo ""
if [ ! -d node_modules ]; then npm install; fi
exec npm start
