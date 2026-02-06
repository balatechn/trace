@echo off
REM Trace Agent Installer for Windows
REM Run as Administrator

echo ============================================
echo   Trace Agent Installer
echo ============================================
echo.

REM Check for admin rights
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: Please run this installer as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Set installation directory
set INSTALL_DIR=%ProgramFiles%\Trace

REM Create installation directory
echo Creating installation directory...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copy agent files
echo Copying agent files...
copy /Y TraceAgent.exe "%INSTALL_DIR%\" >nul

REM Create configuration
set CONFIG_DIR=%APPDATA%\Trace
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

REM Get server URL from user
echo.
set /p SERVER_URL="Enter Server URL [http://localhost:8000/api/v1]: "
if "%SERVER_URL%"=="" set SERVER_URL=http://localhost:8000/api/v1

set /p ASSET_ID="Enter Asset ID (or press Enter for auto): "

REM Create config file
echo Creating configuration...
echo { > "%CONFIG_DIR%\config.json"
echo   "server_url": "%SERVER_URL%", >> "%CONFIG_DIR%\config.json"
echo   "ping_interval": 300, >> "%CONFIG_DIR%\config.json"
if not "%ASSET_ID%"=="" echo   "asset_id": "%ASSET_ID%", >> "%CONFIG_DIR%\config.json"
echo   "serial_number": "", >> "%CONFIG_DIR%\config.json"
echo   "agent_token": "", >> "%CONFIG_DIR%\config.json"
echo   "device_id": "" >> "%CONFIG_DIR%\config.json"
echo } >> "%CONFIG_DIR%\config.json"

REM Create scheduled task to run at startup
echo Creating startup task...
schtasks /create /tn "Trace Agent" /tr "\"%INSTALL_DIR%\TraceAgent.exe\"" /sc onlogon /rl highest /f >nul 2>&1

REM Start the agent now
echo Starting Trace Agent...
start "" "%INSTALL_DIR%\TraceAgent.exe"

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo The Trace Agent has been installed and started.
echo It will automatically run when you log in.
echo.
echo Configuration: %CONFIG_DIR%\config.json
echo Logs: %CONFIG_DIR%\agent.log
echo.
echo To uninstall, run uninstall.bat as Administrator
echo ============================================

pause
