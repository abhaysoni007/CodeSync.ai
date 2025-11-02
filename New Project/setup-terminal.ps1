# Terminal Integration - Quick Setup Script
# Run this script to install all dependencies and start the system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Terminal Integration - Quick Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\yuvra\Downloads\Testing 2 - Copy\New Project"

# Step 1: Install Frontend Dependencies
Write-Host "[1/3] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend-new"

Write-Host "Installing xterm.js packages..." -ForegroundColor Gray
npm install xterm xterm-addon-fit xterm-addon-web-links

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Error installing frontend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Verify Backend Dependencies
Write-Host "[2/3] Verifying backend dependencies..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"

$socketio = npm list socket.io 2>&1
if ($socketio -match "socket.io@") {
    Write-Host "✓ socket.io is installed" -ForegroundColor Green
} else {
    Write-Host "Installing socket.io..." -ForegroundColor Gray
    npm install socket.io
}

Write-Host ""

# Step 3: Setup Complete
Write-Host "[3/3] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ready to Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the backend server:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "To start the frontend (in a new terminal):" -ForegroundColor Yellow
Write-Host "  cd frontend-new" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then navigate to: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
