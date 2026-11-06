#!/data/data/com.termux/files/usr/bin/bash

# ======================================================
# J.A.R.V.I.S. Android & Termux Full-Access Launcher
# ======================================================

echo "======================================================"
echo "      J.A.R.V.I.S. Neural Core - Android Package       "
echo "======================================================"

# 1. Update Termux repositories & install Node.js + Git + Build Tools
echo "[+] Step 1: Checking dependencies (Node.js, Git, Build Tools)..."
pkg update -y
pkg install -y nodejs-lts git python make clang openjdk-17

# 2. Verify Node version
echo "[+] Node.js version: $(node -v)"
echo "[+] NPM version: $(npm -v)"

# 3. Install project dependencies
echo "[+] Step 2: Installing project dependencies & Capacitor..."
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android

# 4. Build production web bundle
echo "[+] Step 3: Building production web bundle..."
npm run build

# 5. Initialize Capacitor Android
if [ ! -d "android" ]; then
    echo "[+] Step 4: Initializing Capacitor Android platform..."
    npx cap init "JARVIS Voice AI" "com.stark.jarvis" --web-dir dist
    npx cap add android
fi

npx cap sync android

echo "------------------------------------------------------"
echo "[+] SUCCESS: Android project prepared with full device permissions!"
echo "[!] To compile the APK binary in Termux, run:"
echo "    cd android && ./gradlew assembleDebug"
echo "[!] The APK will be saved at: android/app/build/outputs/apk/debug/app-debug.apk"
echo "------------------------------------------------------"
