@echo off
setlocal
chcp 65001 >nul
title GitHub에 올리기
cd /d "%~dp0"

echo.
echo [Deploy-GitHub] 폴더: %CD%
echo.

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=powershell"

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-all.ps1"
set ERR=%ERRORLEVEL%

echo.
if %ERR% neq 0 (
  echo *** 오류 코드: %ERR% ***
) else (
  echo 스크립트가 정상 종료했습니다.
)
echo.
pause
