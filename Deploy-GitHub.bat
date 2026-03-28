@echo off
chcp 65001 >nul
title GitHub에 올리기
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-all.ps1"
if errorlevel 1 pause
