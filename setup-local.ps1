# Local Development Setup Script for Windows
# Run this after installing Node.js, Python, and Docker Desktop

Write-Host "🚀 Multi-Agent Debator - Local Setup" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found. Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites OK" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend install failed" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Start Supabase
Write-Host "🐳 Starting local Supabase..." -ForegroundColor Yellow
npx supabase start
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase start failed. Is Docker running?" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "✅ Supabase started!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Copy the values above to your .env files!" -ForegroundColor Yellow
Write-Host "   - API URL → .env.local (VITE_SUPABASE_URL)" -ForegroundColor Cyan
Write-Host "   - anon key → .env.local (VITE_SUPABASE_ANON_KEY)" -ForegroundColor Cyan
Write-Host "   - JWT secret → backend/.env (SUPABASE_JWT_SECRET)" -ForegroundColor Cyan
Write-Host ""

# Prompt for environment setup
$setupEnv = Read-Host "Have you configured .env.local and backend/.env? (y/n)"
if ($setupEnv -ne "y") {
    Write-Host ""
    Write-Host "Please configure your environment files:" -ForegroundColor Yellow
    Write-Host "1. Copy env.local.example to .env.local" -ForegroundColor Cyan
    Write-Host "2. Copy backend/env.local.example to backend/.env" -ForegroundColor Cyan
    Write-Host "3. Fill in the values from Supabase output above" -ForegroundColor Cyan
    Write-Host "4. Add at least one LLM API key (GEMINI_API_KEY, etc.)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then run: .\setup-local.ps1" -ForegroundColor Yellow
    exit 0
}

# Initialize database
Write-Host ""
Write-Host "🗄️  Initializing database..." -ForegroundColor Yellow
Set-Location backend
python -m app.db_init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database init failed" -ForegroundColor Red
    exit 1
}

python -m app.db_seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database seed failed" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "✅ Database ready!" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start development:" -ForegroundColor Cyan
Write-Host "  Terminal 1: cd backend && uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host "  Terminal 2: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
