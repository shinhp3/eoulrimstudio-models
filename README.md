# eoulrimstudio-models

GitHub Pages로 호스팅하는 정적 STL 뷰어 저장소입니다. Cloudflare Worker는 사용하지 않습니다.

## 구조

- `index.html` — `?model=파일이름`(.stl 제외)으로 `models/` 안의 STL을 불러와 표시합니다.
- `models/` — 여기에 `.stl` 파일을 넣고 커밋·푸시하면 Pages에 반영됩니다.
- `admin/index.html` — 배포 안내, 공개 저장소 기준 GitHub API로 `models/` 목록 표시, 로컬 STL 미리보기(브라우저 전용).

## GitHub Pages 설정

1. 저장소 **Settings → Pages**
2. **Build and deployment**: Branch를 배포에 쓰는 브랜치(예: `main`)로 지정하고, 폴더는 **/(root)** 를 선택합니다.
3. 몇 분 뒤 `https://<사용자명>.github.io/<저장소명>/` 에서 루트 뷰어가 열립니다.

## 뷰어 URL 예시

`https://<사용자명>.github.io/<저장소명>/?model=mybowl`

위 주소는 `models/mybowl.stl` 과 대응합니다.

## 관리 페이지

`/admin/index.html` 에서 `<meta name="github-repo" content="owner/repo">` 를 본인 저장소로 바꿉니다. 저장소가 비공개면 목록 조회가 되지 않을 수 있습니다.

모델 추가·삭제는 Git으로 `models/` 만 수정하면 됩니다.
