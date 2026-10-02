@echo off
REM Shares the planner and request form on the office network over HTTPS.
REM Needs a certificate from IT in the certs folder: server.crt + server.key, or server.pfx.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
if not exist certs\server.pfx if not exist certs\server.crt (
  echo.
  echo  Network sharing needs an HTTPS certificate so passwords and salaries are encrypted.
  echo  Ask IT for a certificate for this computer's name and save it in the "certs" folder
  echo  as server.pfx, or as server.crt plus server.key. Then run this again.
  echo.
  pause & exit /b 1
)
if exist certs\server.pfx set /p TLS_PFX_PASSPHRASE=Certificate password (press Enter if none): 
node server.js --share
pause
