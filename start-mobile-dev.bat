@echo off
echo 🚀 Starting Protector.Ng Mobile Development Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo 📱 Opening mobile access page...
start "" "mobile-access.html"

echo 🌐 Starting development server...
echo.
echo 📱 Mobile Access Instructions:
echo 1. The mobile-access.html page should open in your browser
echo 2. Scan the QR code with your phone
echo 3. Or manually type the URL on your phone
echo 4. Make sure your phone is on the same WiFi network
echo.
echo 🌐 Server will be available at: http://localhost:3000
echo 📱 Mobile access page: %cd%\mobile-access.html
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the development server
npm run dev



