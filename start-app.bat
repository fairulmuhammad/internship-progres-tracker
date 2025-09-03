@echo off
title Internship Progress Tracker
echo.
echo ============================================
echo    Internship Progress Tracker
echo ============================================
echo.
echo Starting the application...
echo.

cd /d "%~dp0"
start "" "http://127.0.0.1:8000"
npm run serve

pause
