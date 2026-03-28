# UTF-8
$ErrorActionPreference = "Continue"
try {
  chcp 65001 | Out-Null
} catch {}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

function Get-GhExe {
  $cmd = Get-Command "gh" -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  foreach ($p in @(
      "${env:ProgramFiles}\GitHub CLI\gh.exe",
      "${env:ProgramFiles(x86)}\GitHub CLI\gh.exe"
    )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Test-GitOk {
  $g = Get-Command "git" -ErrorAction SilentlyContinue
  return [bool]($g -and $g.Source)
}

Write-Host ""
Write-Host "=== GitHub 배포 ===" -ForegroundColor Cyan
Write-Host "작업 폴더: $Root" -ForegroundColor Gray
Write-Host ""

if (-not (Test-GitOk)) {
  Write-Host "[오류] git 명령을 찾을 수 없습니다." -ForegroundColor Red
  Write-Host "Git for Windows 설치: https://git-scm.com/download/win" -ForegroundColor Yellow
  Write-Host "설치 후 PC를 다시 시작하거나, 새 CMD에서 이 bat을 다시 실행하세요." -ForegroundColor Yellow
  exit 10
}

$gh = Get-GhExe
if (-not $gh) {
  Write-Host "[오류] GitHub CLI(gh)를 찾을 수 없습니다." -ForegroundColor Red
  Write-Host "관리자 PowerShell에서 실행: winget install --id GitHub.cli -e" -ForegroundColor Yellow
  Write-Host "설치 후 이 창을 닫았다가 Deploy-GitHub.bat 을 다시 실행하세요." -ForegroundColor Yellow
  exit 11
}

Write-Host "gh: $gh" -ForegroundColor DarkGray
Write-Host ""

& $gh auth status 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "GitHub 로그인이 필요합니다. 브라우저가 열리면 승인하세요." -ForegroundColor Yellow
  Write-Host "브라우저가 전혀 안 열리면 이 창에 직접 입력하는 방식으로 바꿉니다." -ForegroundColor DarkGray
  Write-Host ""
  & $gh auth login -h github.com -p https -w
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[오류] GitHub 로그인이 완료되지 않았습니다." -ForegroundColor Red
    exit 12
  }
}

$hasOrigin = $false
git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $hasOrigin = $true }

if (-not $hasOrigin) {
  $defaultName = "gg-academy-web"
  Write-Host "새 GitHub 저장소 이름을 입력하세요 (그냥 Enter = $defaultName)." -ForegroundColor Cyan
  $inputName = Read-Host "저장소 이름"
  $repo = if ([string]::IsNullOrWhiteSpace($inputName)) { $defaultName } else { $inputName.Trim() }

  Write-Host ""
  Write-Host "저장소 생성(비공개) + push: $repo" -ForegroundColor Green
  & $gh repo create $repo --private --source=$Root --remote=origin --push
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[오류] 저장소 생성 또는 push 실패 (이미 같은 이름이 있을 수 있음)." -ForegroundColor Red
    Write-Host "GitHub 웹에서 빈 저장소를 만든 뒤:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/본인아이디/저장소.git" -ForegroundColor Gray
    Write-Host "  git push -u origin main" -ForegroundColor Gray
    exit 13
  }
} else {
  Write-Host "origin 이 있습니다. git push 실행..." -ForegroundColor Green
  git push -u origin main
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[오류] push 실패." -ForegroundColor Red
    exit 14
  }
}

Write-Host ""
Write-Host "완료." -ForegroundColor Green
Write-Host "Vercel: https://vercel.com/new → Import → Root Directory = web" -ForegroundColor Cyan
Write-Host ""
exit 0
