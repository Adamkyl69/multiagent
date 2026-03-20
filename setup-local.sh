#!/bin/bash
# Local Development Setup Script for macOS/Linux
# Run this after installing Node.js, Python, and Docker Desktop

set -e

echo "🚀 Multi-Agent Debator - Local Setup"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.11+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop"
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
python3 -m pip install -r requirements.txt
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Start Supabase
echo "🐳 Starting local Supabase..."
npx supabase start
echo ""
echo "✅ Supabase started!"
echo ""
echo "⚠️  IMPORTANT: Copy the values above to your .env files!"
echo "   - API URL → .env.local (VITE_SUPABASE_URL)"
echo "   - anon key → .env.local (VITE_SUPABASE_ANON_KEY)"
echo "   - JWT secret → backend/.env (SUPABASE_JWT_SECRET)"
echo ""

# Prompt for environment setup
read -p "Have you configured .env.local and backend/.env? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please configure your environment files:"
    echo "1. Copy env.local.example to .env.local"
    echo "2. Copy backend/env.local.example to backend/.env"
    echo "3. Fill in the values from Supabase output above"
    echo "4. Add at least one LLM API key (GEMINI_API_KEY, etc.)"
    echo ""
    echo "Then run: ./setup-local.sh"
    exit 0
fi

# Initialize database
echo ""
echo "🗄️  Initializing database..."
cd backend
python3 -m app.db_init
python3 -m app.db_seed
cd ..
echo "✅ Database ready!"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "To start development:"
echo "  Terminal 1: cd backend && uvicorn app.main:app --reload --port 8000"
echo "  Terminal 2: npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
