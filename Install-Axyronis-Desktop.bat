@echo off
cd /d "%~dp0AxyronisOS"
call npm.cmd install
call "%~dp0Start-Axyronis.bat"
