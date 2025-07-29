@echo off
echo 🚀 Starting Website Audit Tool...
echo 📍 Checking Python installation...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Python found
echo 📦 Installing requirements...

python -m pip install -r requirements.txt

echo 🎭 Setting up Playwright (optional)...
python -m playwright install chromium 2>nul || echo ⚠️ Playwright setup skipped

echo 🌐 Starting server...
python app.py
pause
