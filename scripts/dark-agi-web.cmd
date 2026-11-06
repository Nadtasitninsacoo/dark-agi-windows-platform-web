@echo off
rem dark-agi-frontend launcher for cmd.exe: forwards all arguments to dark-agi-web.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dark-agi-web.ps1" %*
