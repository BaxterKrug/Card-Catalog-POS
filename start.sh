#!/usr/bin/env bash
set -e

# CheckoutDesignator startup script
# Starts both backend (FastAPI) and frontend (Vite) dev servers

cd "$(dirname "$0")"

echo "🚀 Starting CheckoutDesignator..."
echo ""

# Start backend
echo "📦 Starting backend server (http://0.0.0.0:8000)..."
.venv/bin/uvicorn checkoutdesignator.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "🎨 Starting frontend dev server (http://0.0.0.0:5173)..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both servers started!"
echo ""
echo "Backend:  http://localhost:8000"
echo "API Docs: http://localhost:8000/api/docs"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for Ctrl+C and clean up
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Keep script running
wait
