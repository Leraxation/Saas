@echo off
REM Shares the request form with colleagues on the office network. The planner is protected by a PIN.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
set /p PLANNER_PIN=Choose a planner PIN (department heads will not need it): 
set HOST=0.0.0.0
start "" http://localhost:4000
node server.js
pause
