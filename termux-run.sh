#!/data/data/com.termux/files/usr/bin/bash

# ======================================================
# J.A.R.V.I.S. Voice AI - Termux Setup & Run Script
# ======================================================

echo "======================================================"
echo "      J.A.R.V.I.S. Neural Core for Termux (Android)    "
echo "======================================================"

# 1. Update Termux repositories & install Node.js + Git
echo "[+] Step 1: Checking dependencies (Node.js & Git)..."
pkg update -y
pkg install -y nodejs-lts git python make clang

# 2. Verify Node version
echo "[+] Node.js version: $(node -v)"
echo "[+] NPM version: $(npm -v)"

# 3. Install dependencies
echo "[+] Step 2: Installing project dependencies..."
npm install

# 4. Prompt for API key if missing
if [ -z "$GEMINI_API_KEY" ]; then
    echo "------------------------------------------------------"
    echo "[-] WARNING: GEMINI_API_KEY environment variable is not set."
    echo "[?] Please enter your Google Gemini API Key (or press Enter to set later):"
    read -r user_key
    if [ -n "$user_key" ]; then
        export GEMINI_API_KEY="$user_key"
        echo "export GEMINI_API_KEY=\"$user_key\"" >> ~/.bashrc
        echo "[+] API Key saved to ~/.bashrc"
    fi
fi

# 5. Build and launch server
echo "------------------------------------------------------"
echo "[+] Step 3: Starting J.A.R.V.I.S. Voice Engine on http://localhost:3000..."
echo "[!] Open Chrome/Brave/Firefox on your Android device and navigate to:"
echo "    http://localhost:3000"
echo "------------------------------------------------------"

npm run dev
