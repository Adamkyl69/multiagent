# Local Development Setup with Supabase

This guide shows you how to run the entire stack locally using **Supabase CLI** for auth + database, while keeping production deployment simple.

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop (required for Supabase local stack)

## 1. Install Dependencies

### Frontend
```bash
npm install
```

### Backend
```bash
cd backend
pip install -r requirements.txt
pip install asyncpg  # PostgreSQL driver for Supabase
```

## 2. Start Local Supabase

```bash
# From repo root
npx supabase start
```

This starts a local Supabase stack (Postgres + Auth + API Gateway) in Docker.

**Important**: Save the output! You'll need:
- `API URL` (e.g., `http://127.0.0.1:54321`)
- `anon key`
- `service_role key`
- `JWT secret`
- `DB URL` (e.g., `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)

Keep this terminal running or use `npx supabase status` to see the values again.

## 3. Configure Environment Variables

### Frontend `.env.local`
```bash
# Copy the example
cp env.local.example .env.local

# Edit .env.local with values from `npx supabase start`:
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<paste anon key>
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Backend `.env`
```bash
# Copy the example
cp backend/env.local.example backend/.env

# Edit backend/.env with values from `npx supabase start`:
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_JWT_SECRET=<paste JWT secret>
SUPABASE_JWT_AUDIENCE=authenticated

# Add at least one LLM API key:
GEMINI_API_KEY=<your key>
# or OPENAI_API_KEY=<your key>
# or ANTHROPIC_API_KEY=<your key>
# or XAI_API_KEY=<your key>
```

## 4. Initialize Database

```bash
cd backend

# Create all tables
python -m app.db_init

# Seed dev data (creates test user/workspace)
python -m app.db_seed
```

You should see:
```
✅ All tables created successfully!
✅ Dev data seeded successfully!
   User: dev@example.com
   Workspace: Dev Workspace
```

## 5. Start the Backend

```bash
# From backend/ directory
uvicorn app.main:app --reload --port 8000
```

Backend will be at `http://127.0.0.1:8000`

## 6. Start the Frontend

```bash
# From repo root (separate terminal)
npm run dev
```

Frontend will be at `http://localhost:5173`

## 7. Test the Stack

1. **Open** `http://localhost:5173`
2. **Sign up** with any email/password (local Supabase doesn't send real emails)
3. **Create a project** from a prompt
4. **Launch a debate run** and watch it stream live

## Local Development Workflow

### Daily workflow
```bash
# Terminal 1: Supabase (if not already running)
npx supabase start

# Terminal 2: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
npm run dev
```

### View local Supabase dashboard
```bash
npx supabase status
# Open "Studio URL" in browser (usually http://127.0.0.1:54323)
```

### Reset database
```bash
cd backend
python -m app.db_init --drop  # Drops all tables
python -m app.db_init          # Recreates tables
python -m app.db_seed          # Seeds dev data
```

### Stop Supabase
```bash
npx supabase stop
```

## Production Deployment

When deploying to production, you only need to change environment variables:

### Frontend (Netlify)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<cloud anon key>
VITE_API_BASE_URL=https://your-backend.railway.app
```

### Backend (Railway/Render)
```bash
APP_ENV=production
DATABASE_URL=<Supabase cloud Postgres URL>
SUPABASE_JWT_SECRET=<cloud JWT secret>
GEMINI_API_KEY=<your key>
# ... other production keys
```

No code changes needed—just environment variables!

## Troubleshooting

### "Docker is not running"
Start Docker Desktop before running `npx supabase start`

### "Port already in use"
```bash
npx supabase stop
npx supabase start
```

### "Tables already exist"
```bash
cd backend
python -m app.db_init --drop
python -m app.db_init
```

### "JWT verification failed"
Make sure `SUPABASE_JWT_SECRET` in `backend/.env` matches the output from `npx supabase start`

### Can't sign in
Local Supabase doesn't send emails. Just use any email/password and it will work immediately.

## Next Steps

- See `MULTI_PROVIDER_SETUP.md` for configuring multiple LLM providers
- See `backend/migrations/` for database schema migrations
- See Supabase docs: https://supabase.com/docs/guides/cli/local-development
