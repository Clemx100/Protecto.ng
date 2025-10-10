@echo off
echo ========================================
echo   Protector.Ng - Mobile Access URLs
echo ========================================
echo.

echo Your Local IP Addresses:
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set ip=%%a
    set ip=!ip: =!
    echo Mobile URL: http://!ip!:3000
)

echo.
echo ========================================
echo.
echo Share these URLs with mobile users on the same WiFi network.
echo Make sure the dev server is running: npm run dev -- -H 0.0.0.0
echo.
pause

