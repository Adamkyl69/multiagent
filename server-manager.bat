@echo off
title Multi-Agent Debator - Server Manager
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-manager.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server Manager exited with error code %ERRORLEVEL%
    pause
)
