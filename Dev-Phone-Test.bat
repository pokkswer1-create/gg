@echo off
setlocal
chcp 65001 >nul
title 폰에서 로컬 미리보기 (Next.js)
cd /d "%~dp0web"

if not exist "package.json" (
  echo web\package.json 을 찾을 수 없습니다.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  폰에서 열기 — PC와 폰이 같은 Wi-Fi 여야 합니다.
echo  아래 주소 중 하나를 폰 브라우저에 입력하세요. (포트 3000)
echo ============================================================
echo.

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=powershell"

"%PS%" -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress -Unique); " ^
  "foreach ($ip in $ips) { Write-Host ('  http://' + $ip + ':3000') }; " ^
  "if ($ips.Count -eq 0) { Write-Host '  (IP 자동 감지 실패 — cmd에서 ipconfig 로 IPv4 확인 후 http://주소:3000 )' -ForegroundColor Yellow }"

echo.
echo  안 열리면: Windows 방화벽에서 인바운드 TCP 3000 허용 또는
echo  관리자 PowerShell: New-NetFirewallRule -DisplayName \"Next dev 3000\" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
echo.
echo  서버 시작... (종료: Ctrl+C)
echo.

call npm run dev:phone
set ERR=%ERRORLEVEL%
if %ERR% neq 0 echo *** 오류 코드: %ERR% ***
pause
