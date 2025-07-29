#!/bin/bash
echo "🚀 Starting Website Audit Tool..."
echo "📍 Checking Python installation..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✅ Python found"
echo "📦 Installing requirements..."

python3 -m pip install -r requirements.txt

echo "🎭 Setting up Playwright (optional)..."
python3 -m playwright install chromium 2>/dev/null || echo "⚠️ Playwright setup skipped"

echo "🌐 Starting server..."
python3 app.py
