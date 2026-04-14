#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend in background
cd "$ROOT_DIR/backend" && node src/server.js &
BACKEND_PID=$!

# Start frontend
cd "$ROOT_DIR/frontend" && npm run dev

# If frontend exits, kill backend
kill $BACKEND_PID
