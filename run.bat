@echo off
setlocal ENABLEDELAYEDEXPANSION
pushd %~dp0

REM Create venv if missing
if not exist .venv (
    py -3 -m venv .venv
)

REM Activate venv
call .venv\Scripts\activate.bat

REM Upgrade pip and install requirements
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt

set OPEN_BROWSER=1
python app.py

popd
endlocal


