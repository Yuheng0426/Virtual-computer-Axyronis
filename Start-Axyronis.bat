@echo off
if exist "%~dp0AxyronisComputerSystem\node_modules\electron\dist\electron.exe" (
  start "" "%~dp0AxyronisComputerSystem\node_modules\electron\dist\electron.exe" "%~dp0AxyronisComputerSystem"
) else (
  start "" "%~dp0AxyronisComputerSystem\index.html"
)
