# Quick Start Guide

## ✅ What's Been Set Up

Your platform is **production-ready** with:
- ✅ Multi-provider LLM support (OpenAI, Anthropic, Google Gemini, X.AI)
- ✅ Per-agent model selection
- ✅ Real-time debate streaming
- ✅ Usage tracking and billing integration
- ✅ Supabase auth + database ready
- ✅ Frontend and backend fully wired

## 🚀 Choose Your Testing Path

### Option A: Local Testing with Supabase (Recommended)

**Best for**: Full feature testing with real auth, database, and multi-user support

**Requirements**:
1. Docker Desktop (download from https://www.docker.com/products/docker-desktop)
2. Node.js 20+
3. Python 3.11+

**Steps**:
```bash
# 1. Start Docker Desktop first!

# 2. Run setup script
.\setup-local.ps1  # Windows
# or
./setup-local.sh   # macOS/Linux

# 3. Follow the prompts to configure .env files

# 4. Start development (2 terminals)
# Terminal 1:
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2:
npm run dev
```

See `LOCAL_SETUP.md` for detailed instructions.

---

### Option B: Quick SQLite Testing (No Docker)

**Best for**: Quick backend testing without auth setup

**Steps**:
```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt

# 2. Create .env file
cp env.local.example .env

# Edit backend/.env:
DATABASE_URL=sqlite+aiosqlite:///./backend.db
ALLOW_INSECURE_DEV_AUTH=true
GEMINI_API_KEY=your_key_here

# 3. Initialize database
python -m app.db_init
python -m app.db_seed

# 4. Start backend
uvicorn app.main:app --reload --port 8000
```

**Note**: This skips Supabase auth. The backend will use dev auth mode (insecure, dev only).

---

### Option C: Cloud Deployment (Production)

**Best for**: Public release

**Backend** (Railway/Render):
1. Connect your GitHub repo
2. Set environment variables from `backend/env.local.example`
3. Use Supabase cloud Postgres URL
4. Deploy!

**Frontend** (Netlify):
1. Connect your GitHub repo
2. Build: `npm run build`
3. Publish: `dist`
4. Set environment variables from `env.local.example`
5. Deploy!

See `LOCAL_SETUP.md` section "Production Deployment" for details.

---

## 📋 What You Need

### Required for ANY option:
- At least one LLM API key:
  - `GEMINI_API_KEY` (Google)
  - `OPENAI_API_KEY` (OpenAI)
  - `ANTHROPIC_API_KEY` (Anthropic)
  - `XAI_API_KEY` (X.AI)

### For Local Supabase (Option A):
- Docker Desktop running
- Values from `npx supabase start` output

### For Production (Option C):
- Supabase cloud project
- Stripe account (for billing)
- Deployment platform accounts

---

## 🎯 Next Steps

1. **Choose your path** above
2. **Configure environment variables** (see example files)
3. **Start the stack**
4. **Open** http://localhost:5173 (local) or your deployed URL
5. **Create a project** and launch a debate!

---

## 📚 Documentation

- `LOCAL_SETUP.md` - Detailed local development guide
- `MULTI_PROVIDER_SETUP.md` - LLM provider configuration
- `backend/migrations/` - Database schema migrations

## 🆘 Troubleshooting

### "Docker is not running"
→ Start Docker Desktop before running `npx supabase start`

### "Module not found"
→ Run `npm install` (frontend) or `pip install -r requirements.txt` (backend)

### "Database connection failed"
→ Check your `DATABASE_URL` in `backend/.env`

### "JWT verification failed"
→ Make sure `SUPABASE_JWT_SECRET` matches your Supabase instance

---

## 🎉 You're Ready!

The platform is production-ready. Choose your testing path above and start building!
