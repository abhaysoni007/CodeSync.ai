# 🚀 Quick Deploy Script - CodeSync.AI
# This script helps you deploy the fixes to production

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  CodeSync.AI Deployment Fix" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend/server.js")) {
    Write-Host "❌ Error: Please run this script from 'New Project' directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-Deployment Checklist:" -ForegroundColor Yellow
Write-Host ""

# Backend changes
Write-Host "✅ Backend CORS configuration updated" -ForegroundColor Green
Write-Host "✅ Backend .env updated with production URL" -ForegroundColor Green
Write-Host ""

# Show what needs to be done
Write-Host "🔧 Actions Required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. UPDATE RENDER ENVIRONMENT VARIABLES:" -ForegroundColor White
Write-Host "   Go to: https://dashboard.render.com" -ForegroundColor Gray
Write-Host "   → Your Service → Environment" -ForegroundColor Gray
Write-Host "   → Add/Update these variables:" -ForegroundColor Gray
Write-Host ""
Write-Host "   NODE_ENV=production" -ForegroundColor Cyan
Write-Host "   FRONTEND_URL=https://codesyncai.vercel.app" -ForegroundColor Cyan
Write-Host "   (Copy other variables from backend/.env)" -ForegroundColor Gray
Write-Host ""

Write-Host "2. COMMIT AND PUSH CHANGES:" -ForegroundColor White
$response = Read-Host "   Do you want to commit and push changes now? (y/n)"

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "📦 Committing changes..." -ForegroundColor Cyan
    
    git add backend/server.js
    git add backend/.env
    git add DEPLOYMENT_FIX_GUIDE.md
    git add deploy-fixes.ps1
    
    git commit -m "fix: Update CORS configuration and environment for production deployment

- Fixed CORS to support specific origins instead of wildcard
- Enabled credentials support for JWT authentication
- Updated FRONTEND_URL to production Vercel URL
- Added proper origin validation for production
- Created deployment guide documentation"
    
    Write-Host ""
    Write-Host "🚀 Pushing to remote..." -ForegroundColor Cyan
    git push origin main
    
    Write-Host ""
    Write-Host "✅ Changes pushed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⏭️  Skipping git push. You can manually run:" -ForegroundColor Yellow
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host "   git commit -m 'fix: Update CORS and environment for production'" -ForegroundColor Gray
    Write-Host "   git push origin main" -ForegroundColor Gray
}

Write-Host ""
Write-Host "3. VERIFY RENDER DEPLOYMENT:" -ForegroundColor White
Write-Host "   → Check Render dashboard for deployment status" -ForegroundColor Gray
Write-Host "   → View logs for any errors" -ForegroundColor Gray
Write-Host "   → Test: https://codesyncai.onrender.com/health" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. VERIFY FRONTEND:" -ForegroundColor White
Write-Host "   → Ensure VITE_API_URL is set on Vercel" -ForegroundColor Gray
Write-Host "   → Redeploy if needed" -ForegroundColor Gray
Write-Host "   → Test login/signup on: https://codesyncai.vercel.app" -ForegroundColor Cyan
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "📖 Full Guide: DEPLOYMENT_FIX_GUIDE.md" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test backend health
Write-Host "🔍 Testing backend health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://codesyncai.onrender.com/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "   MongoDB: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Backend health check failed. It may still be deploying." -ForegroundColor Yellow
    Write-Host "   Wait a few minutes and check: https://codesyncai.onrender.com/health" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
