#!/usr/bin/env python3
"""
Minimal installation script - only installs what's absolutely needed
"""

import subprocess
import sys
import os

def install_package(package):
    """Install a single package"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ {package}")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ {package}")
        return False

def main():
    print("🚀 Installing minimal requirements for Website Audit Tool...")
    print("=" * 60)
    
    # Check Python version
    if sys.version_info < (3, 6):
        print("❌ Python 3.6 or higher is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version.split()[0]} detected")
    
    # Install only essential packages
    essential_packages = [
        "flask==2.3.3",
        "flask-cors==4.0.0", 
        "requests==2.31.0",
        "beautifulsoup4==4.12.2"
    ]
    
    print("\n📦 Installing essential packages...")
    success_count = 0
    
    for package in essential_packages:
        if install_package(package):
            success_count += 1
    
    # Create directories
    print("\n📁 Creating directories...")
    directories = ["modules", "templates", "logs"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✅ Created {directory}/ directory")
    
    print("\n" + "=" * 60)
    if success_count >= 3:
        print("🎉 Installation successful!")
        print(f"✅ {success_count}/{len(essential_packages)} packages installed")
        print("\n🚀 To start the application:")
        print("   python app.py")
        print("\n🌐 Then open: http://localhost:5000")
    else:
        print("⚠️ Installation incomplete")
        print(f"❌ Only {success_count}/{len(essential_packages)} packages installed")
        print("Please check your internet connection and try again")

if __name__ == "__main__":
    main()
