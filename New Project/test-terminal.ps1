# Terminal Testing Script
# Automated tests to verify terminal functionality

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Terminal Integration - Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\yuvra\Downloads\Testing 2 - Copy\New Project"

# Test 1: Check if files exist
Write-Host "[Test 1] Verifying file structure..." -ForegroundColor Yellow

$files = @(
    "$projectRoot\frontend-new\src\components\TerminalPanel.jsx",
    "$projectRoot\frontend-new\src\stores\terminalStore.js",
    "$projectRoot\backend\routes\terminal.js",
    "$projectRoot\backend\controllers\terminalController.js",
    "$projectRoot\backend\services\TerminalSocketHandlers.js"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ $($file.Split('\')[-1])" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Missing: $($file.Split('\')[-1])" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Write-Host "✓ All files present" -ForegroundColor Green
} else {
    Write-Host "✗ Some files are missing!" -ForegroundColor Red
}

Write-Host ""

# Test 2: Check dependencies
Write-Host "[Test 2] Checking dependencies..." -ForegroundColor Yellow

Set-Location "$projectRoot\frontend-new"

$packages = @("xterm", "xterm-addon-fit", "xterm-addon-web-links")
$allPackagesInstalled = $true

foreach ($package in $packages) {
    $result = npm list $package 2>&1
    if ($result -match "$package@") {
        Write-Host "  ✓ $package installed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $package not installed" -ForegroundColor Red
        $allPackagesInstalled = $false
    }
}

if ($allPackagesInstalled) {
    Write-Host "✓ All frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Some dependencies missing. Run setup-terminal.ps1" -ForegroundColor Red
}

Write-Host ""

# Test 3: Check backend
Write-Host "[Test 3] Checking backend configuration..." -ForegroundColor Yellow

Set-Location "$projectRoot\backend"

$serverContent = Get-Content "server.js" -Raw
if ($serverContent -match "terminalRoutes" -and $serverContent -match "setupTerminalSockets") {
    Write-Host "  ✓ server.js configured correctly" -ForegroundColor Green
} else {
    Write-Host "  ✗ server.js missing terminal imports" -ForegroundColor Red
}

Write-Host ""

# Test 4: Integration Check
Write-Host "[Test 4] Checking ProjectRoom integration..." -ForegroundColor Yellow

Set-Location "$projectRoot\frontend-new"

$projectRoomContent = Get-Content "src\pages\ProjectRoom.jsx" -Raw
if ($projectRoomContent -match "TerminalPanel" -and $projectRoomContent -match "showTerminal") {
    Write-Host "  ✓ Terminal integrated into ProjectRoom" -ForegroundColor Green
} else {
    Write-Host "  ✗ Terminal not properly integrated" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($allFilesExist -and $allPackagesInstalled) {
    Write-Host "✓ All tests passed! Terminal is ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Start backend: cd backend && npm run dev" -ForegroundColor White
    Write-Host "2. Start frontend: cd frontend-new && npm run dev" -ForegroundColor White
    Write-Host "3. Open browser: http://localhost:5173" -ForegroundColor White
    Write-Host "4. Login and open a project" -ForegroundColor White
    Write-Host "5. Click 'Terminal' button in header" -ForegroundColor White
    Write-Host "6. Test commands: node --version, npm --version, dir" -ForegroundColor White
} else {
    Write-Host "✗ Some tests failed. Please review errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix issues:" -ForegroundColor Yellow
    Write-Host "1. Run: .\setup-terminal.ps1" -ForegroundColor White
    Write-Host "2. Check TERMINAL_INTEGRATION_GUIDE.md for details" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
