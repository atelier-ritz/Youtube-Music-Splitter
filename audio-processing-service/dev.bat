@echo off
REM Development script for audio processing service (Windows)
REM This script activates the virtual environment and starts the Flask app

REM Check if virtual environment exists
if not exist "venv" (
    echo ❌ Virtual environment not found!
    echo Please create it first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    exit /b 1
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate

REM Check if dependencies are installed
python -c "import flask" 2>nul
if errorlevel 1 (
    echo 📦 Installing dependencies...
    pip install -r requirements.txt
)

REM Start the Flask application on port 5001 (to avoid conflicts)
echo 🚀 Starting audio processing service...
echo 📍 Service will be available at: http://localhost:5001
set PORT=5001
python app.py