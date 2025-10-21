@echo off
echo.
echo ========================================
echo   PROTECTOR.NG MOBILE SERVER STARTUP
echo ========================================
echo.

echo Getting your computer's IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set ip=%%a
)
set ip=%ip: =%

echo.
echo ========================================
echo   MOBILE ACCESS INFORMATION
echo ========================================
echo.
echo Computer IP Address: %ip%
echo Server Port: 3000
echo.
echo ========================================
echo   PHONE ACCESS INSTRUCTIONS
echo ========================================
echo.
echo 1. Connect your phone to the same WiFi network
echo 2. Open your phone's browser
echo 3. Go to: http://%ip%:3000
echo 4. Or scan the QR code in mobile-access.html
echo.
echo ========================================
echo   STARTING MOBILE SERVER...
echo ========================================
echo.

start "" "mobile-access.html"
node start-mobile-server.js

pause
