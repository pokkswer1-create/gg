# gg — 학원 관리 + 학부모 사이트

이 폴더(`d:\gg`)가 **Git 저장소 루트**입니다. Next.js 앱은 **`web`** 폴더 안에 있습니다.

## 한 번에 GitHub에 올리기 (이 PC에서)

1. **`Deploy-GitHub.bat`** 을 더블클릭합니다.  
2. 브라우저가 열리면 **GitHub 로그인·승인**을 합니다 (자동화 불가 구간).  
3. 저장소 이름을 물으면 Enter로 기본값(`gg-academy-web`) 또는 원하는 이름을 입력합니다.  
4. 끝나면 Vercel에서 Import → **Root Directory = `web`** 만 지정하면 됩니다.

(GitHub CLI가 없으면 `winget install GitHub.cli` 로 설치할 수 있습니다. 이미 설치해 둔 환경도 있습니다.)

## 폴더 여는 방법 (탐색기)

- 파일 탐색기 주소창에 `d:\gg` 입력 후 Enter  
- 또는 이 폴더의 **`open-folder.bat`** 을 더블클릭

## Cursor / VS Code에서 Git 보기

- 왼쪽 **소스 제어**(분기 아이콘)를 열면 변경 사항과 커밋을 볼 수 있습니다.  
- 저장소 루트는 **`d:\gg`** 입니다 (앱 코드는 그 안의 **`web`**).

## 커밋 이름·이메일 (이 PC에서만)

첫 설정용으로 로컬 Git에 임시 값이 들어가 있을 수 있습니다. 본인 정보로 바꾸려면 `d:\gg`에서:

```bash
git config user.email "본인@이메일"
git config user.name "본인 이름"
```

## GitHub에 올리기

1. [GitHub](https://github.com/new)에서 새 저장소를 만듭니다 (비어 있는 저장소).
2. 터미널에서:

```bash
cd d:\gg
git remote add origin https://github.com/본인아이디/저장소이름.git
git branch -M main
git push -u origin main
```

3. [Vercel 새 프로젝트](https://vercel.com/new)에서 그 저장소를 Import 할 때  
   **Root Directory** 를 **`web`** 으로 지정합니다.

4. Vercel 환경 변수에 `web/.env.example` 을 참고해 Supabase 키 등을 넣습니다.

학부모 공개 주소는 배포 후 `https://(배포주소)/parents` 입니다.
