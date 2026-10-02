#!/bin/sh
# Manpower Budget Planner - start on this computer (macOS / Linux).
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js is not installed. Download the LTS version from https://nodejs.org"; exit 1; }
( sleep 1; (open http://localhost:4000 || xdg-open http://localhost:4000) >/dev/null 2>&1 ) &
exec node server.js "$@"
