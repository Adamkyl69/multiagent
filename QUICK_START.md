# Multi-Agent Debator - Quick Start Guide

## Starting the Application

### Option 1: Using Server Manager (Recommended)

1. **Double-click `server-manager.bat`**
2. **Click `[>>] Start All`** button
3. Wait 5-10 seconds for both services to show **[ON] Running** (green)
4. **Click `[F] Open App`** to open the frontend in your browser
5. Watch the live log pane for server activity

### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
```

Then open: http://localhost:3000

## Using the Application

1. **Enter a prompt** in the text area, for example:
   - "Should we use React or Vue for our next project?"
   - "Evaluate the pros and cons of remote work"

2. **Click "Evaluate prompt"** to assess the prompt quality

3. **Answer clarification questions** if requested

4. **Click "Generate project draft"** to create a debate project

5. **Launch a debate run** to see the multi-agent discussion

## Server Manager Features

- **[>] Start Backend** - Start backend server on port 8000
- **[>] Start Frontend** - Start frontend server on port 3000
- **[>>] Start All** - Start both servers
- **[X] Stop Backend/Frontend** - Stop individual servers
- **[XX] Stop All** - Stop all servers
- **[C] Clear Log** - Clear the log viewer
- **[B] API Docs** - Open backend API documentation
- **[F] Open App** - Open frontend in browser
- **Auto-scroll** - Automatically scroll logs as they appear

## Live Logs

The server manager shows real-time logs from both servers:
- Backend requests (uvicorn logs)
- Frontend activity (Vite HMR, build logs)
- All stdout/stderr from both processes

## Troubleshooting

### Server Manager shows loading cursor
- Close the manager window
- Kill any stale processes: `taskkill /F /IM python.exe; taskkill /F /IM node.exe`
- Relaunch `server-manager.bat`

### Backend won't start
- Check if port 8000 is already in use
- Verify Python virtual environment is activated (if using one)
- Check `logs/backend.log` for errors

### Frontend won't start
- Check if port 3000 is already in use
- Run `npm install` if dependencies are missing
- Check `logs/frontend.log` for errors

### CORS errors in browser console
- Verify backend is running on port 8000
- Check that `.env.local` has `VITE_API_BASE_URL=http://127.0.0.1:8000`
- Restart both servers

### No logs appearing in manager
- Ensure you started servers through the manager (not externally)
- Check that `logs/` directory exists
- Click `[C] Clear Log` and restart servers

## Configuration Files

- **Backend**: `backend/.env` - API keys, database URL, dev auth settings
- **Frontend**: `.env.local` - API URL, Supabase config (optional)

## Development Mode

The app runs in dev mode with:
- **No authentication required** (dev mode bypass)
- **SQLite database** (local file `backend/backend.db`)
- **Hot reload** enabled for both frontend and backend
- **CORS** configured for localhost origins

## API Endpoints

Backend runs on http://127.0.0.1:8000

Key endpoints:
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation
- `POST /api/v1/intake/evaluate` - Evaluate prompt
- `POST /api/v1/projects/generate` - Generate debate project
- `POST /api/v1/runs` - Launch debate run
- `GET /api/v1/runs/{run_id}/events` - Stream debate events

## Stopping the Application

### Via Server Manager:
- Click `[XX] Stop All`
- Close the manager window (automatically stops servers)

### Manual:
- Press `Ctrl+C` in each terminal
- Or: `taskkill /F /IM python.exe; taskkill /F /IM node.exe`
