@echo off
REM Manpower Budget Planner - double-click to start on this computer.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
start "" http://localhost:4000
node server.js
pause
