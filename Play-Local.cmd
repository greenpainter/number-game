@echo off
setlocal
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js is required to run this development server.
  pause
  exit /b 1
)
echo Keep this window open while playing. Press Ctrl+C to stop the server.
node.exe "%~dp0serve.mjs" --open
if errorlevel 1 pause
