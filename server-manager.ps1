# Server Manager with Separate Log Windows and Export
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ROOT = $PSScriptRoot
$LOGS_DIR = Join-Path $ROOT "logs"
$BACKEND_LOG = Join-Path $LOGS_DIR "backend.log"
$FRONTEND_LOG = Join-Path $LOGS_DIR "frontend.log"

if (-not (Test-Path $LOGS_DIR)) { New-Item -ItemType Directory -Path $LOGS_DIR -Force | Out-Null }

$global:backendJob = $null
$global:frontendJob = $null
$global:backendPos = 0
$global:frontendPos = 0

# Main form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Server Manager - Multi-Agent Debator"
$form.Size = New-Object System.Drawing.Size(1400,850)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(25,25,30)

# ===== LEFT PANEL: Controls =====
$panelControls = New-Object System.Windows.Forms.Panel
$panelControls.Location = New-Object System.Drawing.Point(10,10)
$panelControls.Size = New-Object System.Drawing.Size(300,790)
$panelControls.BackColor = [System.Drawing.Color]::FromArgb(35,35,40)
$form.Controls.Add($panelControls)

# Status labels
$lblBackend = New-Object System.Windows.Forms.Label
$lblBackend.Text = "Backend: STOPPED"
$lblBackend.Location = New-Object System.Drawing.Point(10,10)
$lblBackend.Size = New-Object System.Drawing.Size(280,25)
$lblBackend.ForeColor = [System.Drawing.Color]::Red
$lblBackend.Font = New-Object System.Drawing.Font("Consolas",10,[System.Drawing.FontStyle]::Bold)
$panelControls.Controls.Add($lblBackend)

$lblFrontend = New-Object System.Windows.Forms.Label
$lblFrontend.Text = "Frontend: STOPPED"
$lblFrontend.Location = New-Object System.Drawing.Point(10,40)
$lblFrontend.Size = New-Object System.Drawing.Size(280,25)
$lblFrontend.ForeColor = [System.Drawing.Color]::Red
$lblFrontend.Font = New-Object System.Drawing.Font("Consolas",10,[System.Drawing.FontStyle]::Bold)
$panelControls.Controls.Add($lblFrontend)

# Helper function to create buttons
function New-ControlButton($text, $y, $color) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $text
    $btn.Location = New-Object System.Drawing.Point(10,$y)
    $btn.Size = New-Object System.Drawing.Size(280,45)
    $btn.BackColor = $color
    $btn.ForeColor = [System.Drawing.Color]::White
    $btn.Font = New-Object System.Drawing.Font("Consolas",9,[System.Drawing.FontStyle]::Bold)
    $btn.FlatStyle = "Flat"
    return $btn
}

function Stop-Ports([int[]]$ports) {
    $killed = New-Object System.Collections.Generic.List[string]
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($processId in $connections) {
            if ($processId -and $processId -gt 0) {
                taskkill /F /PID $processId /T 2>$null | Out-Null
                $killed.Add("Port $port -> PID $processId")
            }
        }
    }
    return $killed
}

function Write-ManagerLogEntry($path, $message) {
    try {
        [System.IO.File]::AppendAllText($path, $message + [Environment]::NewLine)
    } catch {
    }
}

# Start Backend
$btnStartBackend = New-ControlButton "START BACKEND" 80 ([System.Drawing.Color]::FromArgb(76,175,80))
$btnStartBackend.Add_Click({
    "" | Set-Content $BACKEND_LOG
    $global:backendPos = 0
    $txtBackendLog.Text = ""
    
    Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique | 
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
    
    $backendDir = Join-Path $ROOT "backend"
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.WorkingDirectory = $backendDir
    $psi.Arguments = '/c set PYTHONUNBUFFERED=1& python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 >"' + $BACKEND_LOG + '" 2>&1'
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $global:backendJob = [System.Diagnostics.Process]::Start($psi)
    
    $lblBackend.Text = "Backend: STARTING..."
    $lblBackend.ForeColor = [System.Drawing.Color]::Yellow
})
$panelControls.Controls.Add($btnStartBackend)

# Stop Backend
$btnStopBackend = New-ControlButton "STOP BACKEND" 130 ([System.Drawing.Color]::FromArgb(244,67,54))
$btnStopBackend.Add_Click({
    # Kill manager-controlled process
    if ($global:backendJob -and -not $global:backendJob.HasExited) {
        taskkill /F /PID $global:backendJob.Id /T 2>$null | Out-Null
    }
    $global:backendJob = $null
    
    # Kill any process on port 8000
    Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique | 
        ForEach-Object { taskkill /F /PID $_ /T 2>$null | Out-Null }
    
    Start-Sleep -Milliseconds 500
    $lblBackend.Text = "Backend: STOPPED"
    $lblBackend.ForeColor = [System.Drawing.Color]::Red
})
$panelControls.Controls.Add($btnStopBackend)

# Start Frontend
$btnStartFrontend = New-ControlButton "START FRONTEND" 190 ([System.Drawing.Color]::FromArgb(33,150,243))
$btnStartFrontend.Add_Click({
    "" | Set-Content $FRONTEND_LOG
    $global:frontendPos = 0
    $txtFrontendLog.Text = ""
    
    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique | 
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.WorkingDirectory = $ROOT
    $psi.Arguments = '/c npm run dev -- --clearScreen false >"' + $FRONTEND_LOG + '" 2>&1'
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $global:frontendJob = [System.Diagnostics.Process]::Start($psi)
    
    $lblFrontend.Text = "Frontend: STARTING..."
    $lblFrontend.ForeColor = [System.Drawing.Color]::Yellow
})
$panelControls.Controls.Add($btnStartFrontend)

# Stop Frontend
$btnStopFrontend = New-ControlButton "STOP FRONTEND" 240 ([System.Drawing.Color]::FromArgb(244,67,54))
$btnStopFrontend.Add_Click({
    # Kill manager-controlled process
    if ($global:frontendJob -and -not $global:frontendJob.HasExited) {
        taskkill /F /PID $global:frontendJob.Id /T 2>$null | Out-Null
    }
    $global:frontendJob = $null
    
    # Kill any process on port 3000
    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique | 
        ForEach-Object { taskkill /F /PID $_ /T 2>$null | Out-Null }
    
    Start-Sleep -Milliseconds 500
    $lblFrontend.Text = "Frontend: STOPPED"
    $lblFrontend.ForeColor = [System.Drawing.Color]::Red
})
$panelControls.Controls.Add($btnStopFrontend)

# Start All
$btnStartAll = New-ControlButton "START ALL" 310 ([System.Drawing.Color]::FromArgb(156,39,176))
$btnStartAll.Add_Click({
    $btnStartBackend.PerformClick()
    Start-Sleep -Milliseconds 500
    $btnStartFrontend.PerformClick()
})
$panelControls.Controls.Add($btnStartAll)

# Stop All
$btnStopAll = New-ControlButton "STOP ALL" 360 ([System.Drawing.Color]::FromArgb(183,28,28))
$btnStopAll.Add_Click({
    $btnStopBackend.PerformClick()
    $btnStopFrontend.PerformClick()
})
$panelControls.Controls.Add($btnStopAll)

# Kill Active Ports
$btnKillPorts = New-ControlButton "KILL ACTIVE PORT TASKS" 410 ([System.Drawing.Color]::FromArgb(121,85,72))
$btnKillPorts.Add_Click({
    $portsToKill = @(3000, 4173, 5173, 8000, 8080, 8081, 8787)
    $killed = Stop-Ports $portsToKill
    $global:backendJob = $null
    $global:frontendJob = $null

    $lblBackend.Text = "Backend: STOPPED"
    $lblBackend.ForeColor = [System.Drawing.Color]::Red
    $lblFrontend.Text = "Frontend: STOPPED"
    $lblFrontend.ForeColor = [System.Drawing.Color]::Red

    $message = if ($killed.Count -gt 0) {
        "Killed tasks:`n" + ($killed -join "`n")
    } else {
        "No active listeners found on managed dev ports."
    }

    $timestampedMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message"
    Write-ManagerLogEntry $BACKEND_LOG $timestampedMessage
    Write-ManagerLogEntry $FRONTEND_LOG $timestampedMessage
    if ($txtBackendLog) {
        $txtBackendLog.AppendText($timestampedMessage + "`r`n")
    }
    if ($txtFrontendLog) {
        $txtFrontendLog.AppendText($timestampedMessage + "`r`n")
    }
    [System.Windows.Forms.MessageBox]::Show($message, "Kill Active Port Tasks")
})
$panelControls.Controls.Add($btnKillPorts)

# Export Backend Logs
$btnExportBackend = New-ControlButton "EXPORT BACKEND LOGS" 480 ([System.Drawing.Color]::FromArgb(63,81,181))
$btnExportBackend.Add_Click({
    $saveDialog = New-Object System.Windows.Forms.SaveFileDialog
    $saveDialog.Filter = "Log files (*.log)|*.log|Text files (*.txt)|*.txt|All files (*.*)|*.*"
    $saveDialog.FileName = "backend-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    if ($saveDialog.ShowDialog() -eq "OK") {
        $txtBackendLog.Text | Set-Content $saveDialog.FileName
        [System.Windows.Forms.MessageBox]::Show("Backend logs exported to:`n$($saveDialog.FileName)", "Export Successful")
    }
})
$panelControls.Controls.Add($btnExportBackend)

# Export Frontend Logs
$btnExportFrontend = New-ControlButton "EXPORT FRONTEND LOGS" 530 ([System.Drawing.Color]::FromArgb(63,81,181))
$btnExportFrontend.Add_Click({
    $saveDialog = New-Object System.Windows.Forms.SaveFileDialog
    $saveDialog.Filter = "Log files (*.log)|*.log|Text files (*.txt)|*.txt|All files (*.*)|*.*"
    $saveDialog.FileName = "frontend-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    if ($saveDialog.ShowDialog() -eq "OK") {
        $txtFrontendLog.Text | Set-Content $saveDialog.FileName
        [System.Windows.Forms.MessageBox]::Show("Frontend logs exported to:`n$($saveDialog.FileName)", "Export Successful")
    }
})
$panelControls.Controls.Add($btnExportFrontend)

# Clear Logs
$btnClearLogs = New-ControlButton "CLEAR ALL LOGS" 580 ([System.Drawing.Color]::FromArgb(96,125,139))
$btnClearLogs.Add_Click({
    $txtBackendLog.Text = ""
    $txtFrontendLog.Text = ""
    "" | Set-Content $BACKEND_LOG
    "" | Set-Content $FRONTEND_LOG
    $global:backendPos = 0
    $global:frontendPos = 0
})
$panelControls.Controls.Add($btnClearLogs)

# Open App
$btnOpenApp = New-ControlButton "OPEN APP" 640 ([System.Drawing.Color]::FromArgb(0,150,136))
$btnOpenApp.Add_Click({
    Start-Process "http://localhost:3000"
})
$panelControls.Controls.Add($btnOpenApp)

# Open API Docs
$btnOpenDocs = New-ControlButton "API DOCS" 690 ([System.Drawing.Color]::FromArgb(0,150,136))
$btnOpenDocs.Add_Click({
    Start-Process "http://127.0.0.1:8000/docs"
})
$panelControls.Controls.Add($btnOpenDocs)

# ===== RIGHT PANEL: Logs =====
$panelLogs = New-Object System.Windows.Forms.Panel
$panelLogs.Location = New-Object System.Drawing.Point(320,10)
$panelLogs.Size = New-Object System.Drawing.Size(1060,790)
$panelLogs.BackColor = [System.Drawing.Color]::FromArgb(35,35,40)
$form.Controls.Add($panelLogs)

# Backend Log Label
$lblBackendLog = New-Object System.Windows.Forms.Label
$lblBackendLog.Text = "BACKEND LOG (Port 8000)"
$lblBackendLog.Location = New-Object System.Drawing.Point(10,10)
$lblBackendLog.Size = New-Object System.Drawing.Size(1040,25)
$lblBackendLog.ForeColor = [System.Drawing.Color]::LightGreen
$lblBackendLog.Font = New-Object System.Drawing.Font("Consolas",11,[System.Drawing.FontStyle]::Bold)
$panelLogs.Controls.Add($lblBackendLog)

# Backend Log TextBox
$txtBackendLog = New-Object System.Windows.Forms.TextBox
$txtBackendLog.Multiline = $true
$txtBackendLog.ReadOnly = $true
$txtBackendLog.ScrollBars = "Both"
$txtBackendLog.WordWrap = $false
$txtBackendLog.Location = New-Object System.Drawing.Point(10,40)
$txtBackendLog.Size = New-Object System.Drawing.Size(1040,330)
$txtBackendLog.BackColor = [System.Drawing.Color]::Black
$txtBackendLog.ForeColor = [System.Drawing.Color]::LightGreen
$txtBackendLog.Font = New-Object System.Drawing.Font("Consolas",9)
$panelLogs.Controls.Add($txtBackendLog)

# Frontend Log Label
$lblFrontendLog = New-Object System.Windows.Forms.Label
$lblFrontendLog.Text = "FRONTEND LOG (Port 3000)"
$lblFrontendLog.Location = New-Object System.Drawing.Point(10,380)
$lblFrontendLog.Size = New-Object System.Drawing.Size(1040,25)
$lblFrontendLog.ForeColor = [System.Drawing.Color]::LightBlue
$lblFrontendLog.Font = New-Object System.Drawing.Font("Consolas",11,[System.Drawing.FontStyle]::Bold)
$panelLogs.Controls.Add($lblFrontendLog)

# Frontend Log TextBox
$txtFrontendLog = New-Object System.Windows.Forms.TextBox
$txtFrontendLog.Multiline = $true
$txtFrontendLog.ReadOnly = $true
$txtFrontendLog.ScrollBars = "Both"
$txtFrontendLog.WordWrap = $false
$txtFrontendLog.Location = New-Object System.Drawing.Point(10,410)
$txtFrontendLog.Size = New-Object System.Drawing.Size(1040,370)
$txtFrontendLog.BackColor = [System.Drawing.Color]::Black
$txtFrontendLog.ForeColor = [System.Drawing.Color]::Cyan
$txtFrontendLog.Font = New-Object System.Drawing.Font("Consolas",9)
$panelLogs.Controls.Add($txtFrontendLog)

# Function to read new log lines
function Read-LogFile($path, [ref]$position) {
    if (-not (Test-Path $path)) { return $null }
    try {
        $content = Get-Content $path -Raw -ErrorAction SilentlyContinue
        if ($null -eq $content) { return $null }
        
        $newContent = $content.Substring([Math]::Min($position.Value, $content.Length))
        $position.Value = $content.Length
        return $newContent
    } catch {
        return $null
    }
}

# Timer for status and log updates
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$timer.Add_Tick({
    try {
        # Update backend status - only show green if manager controls it
        $backendPortActive = $null -ne (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)
        $backendControlled = $global:backendJob -and -not $global:backendJob.HasExited
        
        if ($backendControlled -and $backendPortActive) {
            $lblBackend.Text = "Backend: RUNNING (Managed)"
            $lblBackend.ForeColor = [System.Drawing.Color]::LightGreen
        } elseif ($backendPortActive) {
            $lblBackend.Text = "Backend: EXTERNAL (Not Managed)"
            $lblBackend.ForeColor = [System.Drawing.Color]::Orange
        } elseif ($lblBackend.Text -notlike "*STARTING*") {
            $lblBackend.Text = "Backend: STOPPED"
            $lblBackend.ForeColor = [System.Drawing.Color]::Red
        }
        
        # Update frontend status - only show green if manager controls it
        $frontendPortActive = $null -ne (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
        $frontendControlled = $global:frontendJob -and -not $global:frontendJob.HasExited
        
        if ($frontendControlled -and $frontendPortActive) {
            $lblFrontend.Text = "Frontend: RUNNING (Managed)"
            $lblFrontend.ForeColor = [System.Drawing.Color]::LightGreen
        } elseif ($frontendPortActive) {
            $lblFrontend.Text = "Frontend: EXTERNAL (Not Managed)"
            $lblFrontend.ForeColor = [System.Drawing.Color]::Orange
        } elseif ($lblFrontend.Text -notlike "*STARTING*") {
            $lblFrontend.Text = "Frontend: STOPPED"
            $lblFrontend.ForeColor = [System.Drawing.Color]::Red
        }
        
        # Read and append new backend logs
        $newBackend = Read-LogFile $BACKEND_LOG ([ref]$global:backendPos)
        if ($newBackend) {
            $txtBackendLog.AppendText($newBackend)
            if ($txtBackendLog.TextLength -gt 100000) {
                $txtBackendLog.Text = $txtBackendLog.Text.Substring($txtBackendLog.TextLength - 80000)
            }
            $txtBackendLog.SelectionStart = $txtBackendLog.TextLength
            $txtBackendLog.ScrollToCaret()
        }
        
        # Read and append new frontend logs
        $newFrontend = Read-LogFile $FRONTEND_LOG ([ref]$global:frontendPos)
        if ($newFrontend) {
            $txtFrontendLog.AppendText($newFrontend)
            if ($txtFrontendLog.TextLength -gt 100000) {
                $txtFrontendLog.Text = $txtFrontendLog.Text.Substring($txtFrontendLog.TextLength - 80000)
            }
            $txtFrontendLog.SelectionStart = $txtFrontendLog.TextLength
            $txtFrontendLog.ScrollToCaret()
        }
    } catch {
        # Silently ignore timer errors
    }
})
$timer.Start()

# Cleanup on close
$form.Add_FormClosing({
    $timer.Stop()
})

# Show form
[void]$form.ShowDialog()
