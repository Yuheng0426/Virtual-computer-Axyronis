@echo off
if exist "%~dp0AxyronisOS\node_modules\electron\dist\electron.exe" (
  start "" "%~dp0AxyronisOS\node_modules\electron\dist\electron.exe" "%~dp0AxyronisOS"
) else (
  start "" "%~dp0AxyronisOS\index.html"
)
