# Server Manager - GUI with Separate Log Windows

## How to Use

1. **Double-click `server-manager.bat`**
2. A large GUI window appears with:
   - **Left panel**: Control buttons
   - **Right panel**: Separate log windows for backend and frontend
3. Click **START ALL** to start both servers
4. Watch logs appear in real-time in the separate windows
5. Click **OPEN APP** to open http://localhost:3000

## Features

### Control Buttons (Left Panel)

- **START BACKEND** - Starts backend on port 8000
- **STOP BACKEND** - Stops backend server
- **START FRONTEND** - Starts frontend on port 3000
- **STOP FRONTEND** - Stops frontend server
- **START ALL** - Starts both servers
- **STOP ALL** - Stops both servers
- **EXPORT BACKEND LOGS** - Save backend logs to file
- **EXPORT FRONTEND LOGS** - Save frontend logs to file
- **CLEAR ALL LOGS** - Clear both log windows
- **OPEN APP** - Opens frontend in browser
- **API DOCS** - Opens backend API documentation

### Log Windows (Right Panel)

- **BACKEND LOG** (top) - Shows all backend server output in green text
  - Uvicorn startup messages
  - API requests and responses
  - Errors and warnings
  
- **FRONTEND LOG** (bottom) - Shows all frontend server output in cyan text
  - Vite dev server messages
  - Hot module reload events
  - Build errors and warnings

## Status Indicators

- **Red** = Server stopped
- **Yellow** = Server starting
- **Green** = Server running

Status updates every 1 second automatically.

## Real-Time Logs

Logs update **every 1 second** showing:
- All stdout and stderr from both servers
- Auto-scroll to latest entries
- Automatic trimming (keeps last 80,000 characters)
- Color-coded: Backend (green), Frontend (cyan)

## Export Logs

Click **EXPORT BACKEND LOGS** or **EXPORT FRONTEND LOGS** to:
1. Choose save location
2. Save current log content to file
3. Filename format: `backend-YYYYMMDD-HHmmss.log`

Logs are also automatically saved to:
- `logs/backend.log`
- `logs/frontend.log`

## Troubleshooting

**GUI doesn't appear:**
- Kill all PowerShell: `taskkill /F /IM powershell.exe`
- Try again

**No logs appearing:**
- Ensure you clicked START through the manager
- Check that `logs/` folder exists
- Click CLEAR ALL LOGS and restart servers

**Server won't start:**
- Click STOP first to kill any existing process
- Wait 2 seconds
- Click START again

**Port already in use:**
- Click the STOP button for that server
- Wait 2 seconds
- Click START again

## Notes

- Servers run **hidden** (no separate windows)
- All logs appear in the GUI in real-time
- Closing the manager does NOT stop the servers
- Use STOP ALL before closing if you want to stop servers
- Log files persist in `logs/` folder
