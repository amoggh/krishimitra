@echo off
echo Starting KrushiMitra backend...
echo Using venv Python to avoid protobuf/TF conflicts with Miniconda base env.
echo.
cd /d "%~dp0"
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
