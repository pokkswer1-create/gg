#Requires -Version 5.1
$ErrorActionPreference = "Stop"
chcp 65001 | Out-Null

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

function Get-GhExe {
  $candidates = @(
    "${env:ProgramFiles}\GitHub CLI\gh.exe",
    "${env:ProgramFiles(x86)}\GitHub CLI\gh.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  return "gh"
}

$gh = Get-GhExe

Write-Host ""
Write-Host "=== GitHub: $Root ===" -ForegroundColor Cyan
Write-Host ""

& $gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub 로그인이 필요합니다. 잠시 후 브라우저가 열리면 승인하세요." -ForegroundColor Yellow
  & $gh auth login -h github.com -p https -w
  if ($LASTEXITCODE -ne 0) {
    Write-Host "로그인이 완료되지 않았습니다. 다시 이 스크립트를 실행하세요." -ForegroundColor Red
    exit 1
  }
}

$hasOrigin = $false
git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $hasOrigin = $true }

if (-not $hasOrigin) {
  $defaultName = "gg-academy-web"
  $inputName = Read-Host "새 GitHub 저장소 이름 (Enter=$defaultName)"
  $repo = if ([string]::IsNullOrWhiteSpace($inputName)) { $defaultName } else { $inputName.Trim() }

  Write-Host ""
  Write-Host "저장소 생성(비공개) + origin 연결 + push: $repo" -ForegroundColor Green
  & $gh repo create $repo --private --source=$Root --remote=origin --push
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "실패 시: GitHub에 같은 이름 저장소가 이미 있거나 네트워크 문제일 수 있습니다." -ForegroundColor Red
    Write-Host "다른 이름으로 다시 실행하거나, github.com 에서 빈 저장소를 만든 뒤:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/본인아이디/저장소.git" -ForegroundColor Gray
    Write-Host "  git push -u origin main" -ForegroundColor Gray
    exit 1
  }
} else {
  Write-Host "origin 이 이미 있습니다. push 만 실행합니다." -ForegroundColor Green
  git push -u origin main
  if ($LASTEXITCODE -ne 0) {
    Write-Host "push 실패. GitHub 인증 또는 권한을 확인하세요." -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "완료." -ForegroundColor Green
Write-Host ""
Write-Host "Vercel 배포:" -ForegroundColor Cyan
Write-Host "  1) https://vercel.com/new 에서 방금 저장소 Import" -ForegroundColor Gray
Write-Host "  2) Root Directory -> web" -ForegroundColor Gray
Write-Host "  3) Environment Variables 에 web/.env.example 참고해 Supabase 키 입력" -ForegroundColor Gray
Write-Host "  4) Deploy 후 주소 + /parents 가 학부모 페이지" -ForegroundColor Gray
Write-Host ""
Read-Host "Enter 로 종료"
