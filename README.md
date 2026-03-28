# gg — 학원 관리 + 학부모 사이트

이 폴더(`d:\gg`)가 **Git 저장소 루트**입니다. Next.js 앱은 **`web`** 폴더 안에 있습니다.

## 폴더 여는 방법 (탐색기)

- 파일 탐색기 주소창에 `d:\gg` 입력 후 Enter  
- 또는 이 폴더의 **`open-folder.bat`** 을 더블클릭

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
