# CheckoutDesignator startup script for Windows PowerShell
# Starts backend (FastAPI), frontend (Vite), and TimeTwister dev servers

Write-Host "Starting CheckoutDesignator..." -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "Starting backend server (http://localhost:8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\.venv\Scripts\Activate.ps1; uvicorn checkoutdesignator.app.main:app --host 0.0.0.0 --port 8000"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start TimeTwister in a new window
Write-Host "Starting TimeTwister server (http://localhost:8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\.venv\Scripts\Activate.ps1; python TimeTwister/main.py"

# Wait a moment for TimeTwister to initialize
Start-Sleep -Seconds 1

# Start frontend in a new window
Write-Host "Starting frontend dev server (http://localhost:5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev -- --host 0.0.0.0 --port 5173"

Write-Host ""
Write-Host "All servers started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:     http://localhost:8000" -ForegroundColor Yellow
Write-Host "API Docs:    http://localhost:8000/api/docs" -ForegroundColor Yellow
Write-Host "TimeTwister: http://localhost:8001" -ForegroundColor Yellow
Write-Host "Frontend:    http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Close the server windows to stop the servers." -ForegroundColor Cyan
