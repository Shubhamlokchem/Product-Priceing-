@echo off
echo ============================================
echo     PricingHub - Starting Application
echo ============================================
echo.

echo [1/2] Starting Backend Server (Port 5000)...
start "PricingHub - Backend" cmd /k "cd /d "%~dp0server" && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Frontend (Port 3000)...
start "PricingHub - Frontend" cmd /k "cd /d "%~dp0client" && npm start"

echo.
echo ============================================
echo  App running at: http://localhost:3000
echo  API running at: http://localhost:5000
echo ============================================
echo.
pause
