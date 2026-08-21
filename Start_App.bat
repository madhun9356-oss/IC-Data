@echo off
title IC Verify System

echo =========================================
echo    Starting TNS IC Verify System...
echo =========================================
echo.

echo [1/2] Starting Backend Server...
start "IC Verify Backend (Node.js)" cmd /k "npm run server"

echo [2/2] Starting Frontend Server...
start "IC Verify Frontend (Vite)" cmd /k "npm run dev"

echo.
echo Servers are starting up in separate windows!
echo Your default web browser will open automatically in a few seconds.
echo.
echo Press any key to exit this launcher (the servers will keep running in their own windows).
pause > nul
