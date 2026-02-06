@echo off
REM Trace Agent Installer for Windows
REM Run as Administrator

echo ============================================
echo   Trace Device Agent Installer
echo ============================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this script as Administrator
    pause
    exit /b 1
)

REM Set installation directory
set INSTALL_DIR=C:\Program Files\Trace Agent
set CONFIG_DIR=C:\ProgramData\Trace

echo Installing to: %INSTALL_DIR%
echo.

REM Create directories
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

REM Copy files
echo Copying files...
copy /Y "%~dp0*.py" "%INSTALL_DIR%\"
copy /Y "%~dp0requirements.txt" "%INSTALL_DIR%\"

REM Install Python dependencies
echo.
echo Installing Python dependencies...
pip install -r "%INSTALL_DIR%\requirements.txt"
if %errorLevel% neq 0 (
    echo WARNING: Some dependencies failed to install
)

REM Create default config
if not exist "%CONFIG_DIR%\agent.json" (
    echo.
    echo Creating default configuration...
    echo {"server_url": "https://trace.yourcompany.com/api/v1", "ping_interval": 300} > "%CONFIG_DIR%\agent.json"
    echo Please edit %CONFIG_DIR%\agent.json with your server URL
)

REM Install as Windows service
echo.
echo Installing Windows service...
python "%INSTALL_DIR%\windows_service.py" --install

if %errorLevel% equ 0 (
    echo.
    echo ============================================
    echo   Installation Complete!
    echo ============================================
    echo.
    echo Next steps:
    echo 1. Edit %CONFIG_DIR%\agent.json
    echo    - Set server_url to your Trace server
    echo.
    echo 2. Start the service:
    echo    net start TraceAgent
    echo.
    echo 3. Or run manually for testing:
    echo    python "%INSTALL_DIR%\agent.py" --show-info
    echo.
) else (
    echo.
    echo Installation completed with warnings.
    echo You may need to configure the service manually.
)

pause
