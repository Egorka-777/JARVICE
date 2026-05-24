@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "JARVICE.exe" (
  start "" "%~dp0JARVICE.exe"
) else (
  echo Файл JARVICE.exe не найден в папке release.
  pause
)
