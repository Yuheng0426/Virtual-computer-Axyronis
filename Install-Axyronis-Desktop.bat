@echo off
cd /d "%~dp0AxyronisComputerSystem"
call npm.cmd install
call "%~dp0Start-Axyronis.bat"
