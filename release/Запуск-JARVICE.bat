@echo off
chcp 65001 >nul
cd /d "%~dp0JARVICE-Portable"
if exist "JARVICE.exe" (
  start "" "%~dp0JARVICE-Portable\JARVICE.exe"
) else (
  echo Папка JARVICE-Portable не найдена. Запустите сборку заново.
  pause
)
