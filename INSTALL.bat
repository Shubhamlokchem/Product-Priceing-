@echo off
echo ============================================
echo     PricingHub - Installing Dependencies
echo ============================================
echo.

echo Installing backend dependencies...
cd /d "%~dp0server"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend install failed!
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd /d "%~dp0client"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend install failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Installation complete! Run START.bat next.
echo ============================================
pause
