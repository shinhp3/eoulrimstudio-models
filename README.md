# eoulrimstudio-models

- **GitHub Pages**: 공개 뷰어(`index.html`), 업로드 관리 UI(`admin/index.html`).
- **Cloudflare Worker**: STL 업로드·목록·삭제 API, GitHub 연동. 관리 화면 HTML은 Worker에 두지 않습니다.

## 배포 구조

| 구분 | 내용 |
|------|------|
| Pages `admin/index.html` | 드롭존·미리보기·업로드. **저장 이름**을 바꿔 GitHub·뷰어(`?model=`)용 파일명을 지정할 수 있음. `<meta name="worker-api-base">`로 Worker 주소 지정. |
| Worker `worker.js` | `POST /upload`, `GET /list`, `DELETE /delete`, records/tools 등. **비밀번호 로그인 없음.** |
| Worker `/admin` 접속 시 | GitHub Pages의 `/admin/` 으로 리다이렉트 |

Worker URL이 노출되면 API를 누구나 호출할 수 있습니다. 필요 시 Worker에 별도 검증(예: 공유 시크릿 헤더)을 추가하세요.

## Secrets (Worker)

- `GITHUB_TOKEN`, `GITHUB_USERNAME`, `GITHUB_REPO` — STL 저장소 `models/`
- `GITHUB_RECORDS_REPO`, `GITHUB_TOOLS_REPO` — 해당 API를 쓸 때만

**`ADMIN_PASSWORD`는 사용하지 않습니다.** Cloudflare에서 삭제해도 됩니다.

## Pages 설정

저장소 **Settings → Pages**: 브랜치 루트.

## Worker 설정

대시보드에 **`worker.js` 전체** 붙여넣기. `VIEWER_BASE`는 Pages 뷰어 URL과 맞출 것.
