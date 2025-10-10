@echo off
echo ========================================
echo    Protector.Ng Mobile Access Server
echo ========================================
echo.

echo Starting development server for mobile access...
echo.
echo Server will be accessible from other devices on your network!
echo.

:: Get local IP address
echo Your IP Address:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo   %%a
)
echo.

echo Once the server starts, mobile users can access the app at:
echo   http://YOUR_IP_ADDRESS:3000
echo.
echo Example: http://192.168.1.5:3000
echo.
echo ========================================
echo.

:: Start Next.js dev server with network access
npm run dev -- -H 0.0.0.0

pause

