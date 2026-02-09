# Agent Downloads

This folder contains the Trace Agent installers for different platforms.

## Available Downloads

- **TraceAgent-Windows.exe** - Windows 10/11 agent
- **TraceAgent-macOS.dmg** - macOS 12+ agent (coming soon)  
- **TraceAgent-Linux.AppImage** - Linux agent (coming soon)

## Building Agents

To build the Windows agent:
```bash
cd ../../../agent
pyinstaller --onefile --noconsole --name TraceAgent-Cloud trace_agent.py
cp dist/TraceAgent-Cloud.exe ../frontend/public/downloads/TraceAgent-Windows.exe
```
