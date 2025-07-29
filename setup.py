#!/usr/bin/env python3
"""
Website Audit Tool Setup Script
Installs all required dependencies and sets up the environment
"""

import subprocess
import sys
import os

def run_command(command):
    """Run a command and return success status"""
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {command}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {command}")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🚀 Setting up Website Audit Tool...")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version.split()[0]} detected")
    
    # Install core requirements
    print("\n📦 Installing core requirements...")
    core_packages = [
        "flask==2.3.3",
        "flask-cors==4.0.0", 
        "requests==2.31.0",
        "beautifulsoup4==4.12.2",
        "lxml==4.9.3"
    ]
    
    for package in core_packages:
        if not run_command(f"pip install {package}"):
            print(f"⚠️ Failed to install {package}, but continuing...")
    
    # Install optional packages
    print("\n🔧 Installing optional packages...")
    optional_packages = [
        "selenium==4.15.0",
        "webdriver-manager==4.0.1",
        "playwright==1.40.0"
    ]
    
    for package in optional_packages:
        if not run_command(f"pip install {package}"):
            print(f"⚠️ {package} installation failed - some features may not work")
    
    # Setup Playwright
    print("\n🎭 Setting up Playwright...")
    if not run_command("python -m playwright install chromium"):
        print("⚠️ Playwright setup failed - Playwright features will not work")
    
    # Create directories
    print("\n📁 Creating directories...")
    directories = ["logs", "exports", "static"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✅ Created {directory}/ directory")
    
    # Test imports
    print("\n🧪 Testing imports...")
    test_imports = [
        ("flask", "Flask"),
        ("requests", "requests"),
        ("bs4", "BeautifulSoup"),
        ("selenium", "webdriver"),
        ("playwright", "sync_playwright")
    ]
    
    working_modules = []
    for module, import_name in test_imports:
        try:
            __import__(module)
            working_modules.append(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"⚠️ {module} - not available")
    
    print("\n" + "=" * 50)
    print("🎉 Setup Complete!")
    print(f"✅ {len(working_modules)} modules working")
    print("\n🚀 To start the application:")
    print("   python app.py")
    print("\n🌐 Then open: http://localhost:5000")
    
    if len(working_modules) >= 3:
        print("\n✅ Minimum requirements met - tool will work!")
    else:
        print("\n⚠️ Some core modules missing - please check installation")

if __name__ == "__main__":
    main()
