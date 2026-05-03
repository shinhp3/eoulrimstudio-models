# eoulrimstudio-models

STL 뷰어는 **GitHub Pages**, 업로드·삭제·관리자 로그인은 **Cloudflare Worker**로 나눈 구성입니다.

## 역할 분담

| 구분 | 주소(예시) | 내용 |
|------|------------|------|
| 뷰어 | `https://shinhp3.github.io/eoulrimstudio-models/?model=이름` | `index.html`이 `models/`의 STL을 불러옵니다. |
| 업로드·목록·삭제·로그인 | Worker 대시보드에 등록한 Worker 도메인 `/admin` | 저장소 루트의 `worker.js` 코드를 붙여넣어 배포합니다. |

Worker 루트(`/`)로 접속하면 같은 Pages 뷰어로 **리다이렉트**됩니다.

## GitHub Pages

1. 저장소 **Settings → Pages**에서 브랜치(예: `main`) · **/(root)** 선택
2. `models/`에 `.stl` 추가 후 푸시 → Pages에 반영

## Cloudflare Worker

1. Cloudflare 대시보드에서 Worker 편집기에 **`worker.js` 전체**를 붙여넣고 배포합니다.
2. 아래 **Secrets / 변수**를 설정합니다.  
   - `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_USERNAME`, `GITHUB_REPO`  
   - `GITHUB_RECORDS_REPO` (records/API를 쓰는 경우)
3. 업로드 후 뷰어 링크에 쓰이는 주소는 코드 안 **`VIEWER_BASE`** 와 동일해야 합니다. (현재 GitHub Pages 기준으로 맞춰 두었습니다.)
4. Worker 도메인이 바뀌면 `index.html` 안의 관리자 링크도 같은 호스트로 수정하세요.

## 정적 admin 페이지

`/admin/index.html`(Pages)은 배포 안내·공개 API 목록·로컬 미리보기용입니다. 실제 GitHub에 파일을 쓰는 업로드는 Worker에서만 됩니다.
