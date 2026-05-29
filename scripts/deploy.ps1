# Canteen Management System - Deployment Script
# ==============================================
# Prerequisites:
#   1. Node.js 20+ installed
#   2. Vercel CLI: npm i -g vercel
#   3. Vercel account with token
#   4. Supabase project running
#
# Steps:
#   1. Run this script
#   2. Follow the Vercel login prompts
#   3. Set environment variables in Vercel dashboard

Write-Host "🚀 Deploying Canteen Management System to Vercel..." -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 2: Login to Vercel (if not already)
Write-Host "`n🔑 Checking Vercel login status..." -ForegroundColor Yellow
vercel whois 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Vercel:" -ForegroundColor Yellow
    vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Vercel login failed" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Link project or deploy
Write-Host "`n🌐 Deploying to Vercel..." -ForegroundColor Yellow
vercel deploy --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "`n📋 IMPORTANT: Set these environment variables in Vercel Dashboard:" -ForegroundColor Cyan
    Write-Host "  - NEXT_PUBLIC_SUPABASE_URL"
    Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    Write-Host "  - SUPABASE_SERVICE_ROLE_KEY"
    Write-Host "  - JWT_SECRET"
    Write-Host "`n🔑 Login credentials (seed data):" -ForegroundColor Cyan
    Write-Host "  admin@canteen.com   / admin123"
    Write-Host "  manager@canteen.com / manager123"
    Write-Host "  staff@canteen.com   / staff123"
    Write-Host "  faculty@canteen.com / faculty123"
    Write-Host "  student@canteen.com / student123"
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
}
