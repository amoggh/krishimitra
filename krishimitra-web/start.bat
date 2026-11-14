@echo off
setlocal
title KrishiMitra launcher

rem ---- Ports: unusual on purpose, so KrishiMitra does not clash with other projects (8000, 8010, 5173...) ----
rem      Change these two numbers if another program ever needs them.
set API_PORT=8765
set WEB_PORT=5765

cd /d "%~dp0"
echo.
echo   KrishiMitra
echo   -----------

rem ---- 1. Tools installed? ----
where python >nul 2>nul || (echo   [X] Python not found. Install Python 3.10+ and tick "Add to PATH". & goto :fail)
where node   >nul 2>nul || (echo   [X] Node.js not found. Install Node 18+ from nodejs.org. & goto :fail)

rem ---- 2. Ports free? ----
netstat -ano | findstr /R /C:":%API_PORT% .*LISTENING" >nul && (echo   [X] Port %API_PORT% is already in use: KrishiMitra may already be running, or another program has it. & echo       Close that window, or change API_PORT at the top of start.bat. & goto :fail)
netstat -ano | findstr /R /C:":%WEB_PORT% .*LISTENING" >nul && (echo   [X] Port %WEB_PORT% is already in use: KrishiMitra may already be running, or another program has it. & echo       Close that window, or change WEB_PORT at the top of start.bat. & goto :fail)

rem ---- 3. Dependencies (first run only) ----
if not exist "node_modules\" (
  echo   Installing website packages, first run only...
  call npm install || goto :fail
)
python -c "import fastapi, uvicorn, multipart, sklearn, pandas, joblib, PIL, h5py, torch" >nul 2>nul || (
  echo   Installing Python packages, first run only. This can take several minutes...
  python -m pip install -q -r server\requirements.txt || goto :fail
)

rem ---- 4. Keys file ----
if not exist "server\.env" (
  copy "server\.env.example" "server\.env" >nul
  echo   [!] Created server\.env from the example. Add your data.gov.in and Groq keys to it for live prices and chat.
)

rem ---- 5. Start the API and the website, each in its own window ----
echo   Starting API on port %API_PORT%...
start "KrishiMitra API (port %API_PORT%)" /D "%~dp0server" cmd /k python -m uvicorn app.main:app --host 127.0.0.1 --port %API_PORT%

echo   Starting website on port %WEB_PORT%...
rem The website window inherits KM_API_PORT, which vite.config.js uses to reach the API.
set "KM_API_PORT=%API_PORT%"
start "KrishiMitra website (port %WEB_PORT%)" /D "%~dp0" cmd /k node node_modules\vite\bin\vite.js --port %WEB_PORT% --strictPort

rem ---- 6. Wait until both answer, then open the browser ----
echo   Waiting for the servers to come up...
set /a tries=0
:wait
set /a tries+=1
if %tries% gtr 60 (echo   [X] Servers did not start within 60 seconds. Check the two new windows for errors. & goto :fail)
timeout /t 1 /nobreak >nul
curl -s -o nul http://127.0.0.1:%API_PORT%/api/health || goto :wait
curl -s -o nul http://localhost:%WEB_PORT%/ || goto :wait

start "" http://localhost:%WEB_PORT%
echo.
echo   [OK] KrishiMitra is running at http://localhost:%WEB_PORT%
echo        To stop it, close the two windows titled "KrishiMitra API" and "KrishiMitra website".
echo.
timeout /t 8 >nul
exit /b 0

:fail
echo.
pause
exit /b 1
