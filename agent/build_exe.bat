@echo off
REM Build Trace Agent EXE using PyInstaller
REM Run this script from the agent directory

echo ============================================
echo   Building Trace Agent EXE
echo ============================================

REM Check if PyInstaller is installed
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

REM Install agent requirements
echo Installing dependencies...
pip install requests geocoder psutil

REM Build the EXE
echo.
echo Building EXE...
pyinstaller --onefile ^
    --name TraceAgent ^
    --icon trace_icon.ico ^
    --add-data "config.py;." ^
    --hidden-import=geocoder ^
    --hidden-import=psutil ^
    --noconsole ^
    trace_agent.py

echo.
echo ============================================
if exist dist\TraceAgent.exe (
    echo SUCCESS! EXE created at: dist\TraceAgent.exe
    echo.
    echo To install:
    echo   1. Copy TraceAgent.exe to a folder
    echo   2. Run: TraceAgent.exe --configure
    echo   3. Enter your server URL and Asset ID
    echo   4. Run: TraceAgent.exe
    echo.
    echo For automatic startup, add to Windows Task Scheduler
) else (
    echo BUILD FAILED! Check the errors above.
)
echo ============================================

pause
