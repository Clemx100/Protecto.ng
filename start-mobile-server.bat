@echo off
echo Starting PROTECTOR.NG for mobile access...
echo.
echo Your local IP: 192.168.1.142
echo Server will be accessible at: http://192.168.1.142:3000
echo.
echo Make sure your phone is on the same WiFi network!
echo.
set HOSTNAME=0.0.0.0
set PORT=3000
npm run dev -- --hostname %HOSTNAME% --port %PORT%
pause