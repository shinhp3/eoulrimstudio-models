/**
 * Cloudflare Worker — 대시보드에 코드 붙여넣기 배포용 (import 없음)
 * Secrets: ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO (STL models),
 *          GITHUB_RECORDS_REPO (records.json 저장소)
 *
 * HTML은 빌드 시 admin/login.html · admin/index.html · viewer/index.html 에서 생성합니다.
 * 재생성: node _generate_worker_inline.mjs
 */

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>관리자 로그인</title>
  <style>
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #f8f9fb;
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.box {
  background: #fff;
  border: 1px solid #e2e5ed;
  border-radius: 12px;
  padding: 28px;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
h1 {
  font-size: 1.15rem;
  margin: 0 0 16px;
  font-weight: 600;
}
.err {
  color: #b91c1c;
  font-size: 0.88rem;
  margin: 0 0 12px;
  display: none;
}
label {
  display: block;
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 6px;
}
input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e5ed;
  border-radius: 8px;
  font: inherit;
  box-sizing: border-box;
  margin-bottom: 14px;
}
button {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #2f6bff;
  background: rgba(47, 107, 255, 0.12);
  color: #2f6bff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
button:hover {
  background: rgba(47, 107, 255, 0.22);
}
  </style>
</head>
<body>
  <div class="box">
    <h1>관리자 로그인</h1>
    <p id="err" class="err">비밀번호가 틀렸습니다.</p>
    <form method="post" action="/auth">
      <label for="pw">비밀번호</label>
      <input id="pw" type="password" name="password" autocomplete="current-password" required />
      <button type="submit">확인</button>
    </form>
  </div>
  <script>
  (function () {
    if (/\\berr=1\\b/.test(location.search)) {
      document.getElementById("err").style.display = "block";
    }
  })();
  </script>
</body>
</html>
`;

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>STL 업로드 · 어울림 내부</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
:root {
  --bg: #f8f9fb;
  --surface: #ffffff;
  --border: #e2e5ed;
  --text: #111827;
  --muted: #6b7280;
  --accent: #2f6bff;
  --accent-dim: rgba(47, 107, 255, 0.12);
  --danger: #b91c1c;
  --danger-bg: #fef2f2;
  --radius: 12px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: "IBM Plex Sans KR", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}
.wrap { max-width: 920px; margin: 0 auto; padding: 24px 20px 56px; }
.badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-bottom: 8px;
}
h1 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}
.lead { margin: 0 0 20px; font-size: 0.9rem; color: var(--muted); max-width: 640px; }

.warn-box {
  font-size: 0.82rem;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius);
  padding: 12px 14px;
  margin-bottom: 20px;
  line-height: 1.55;
}

.drop-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 28px 20px;
  text-align: center;
  background: linear-gradient(160deg, #f0f4ff 0%, #e8edf8 100%);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  margin-bottom: 16px;
}
.drop-zone:hover, .drop-zone:focus-visible {
  border-color: var(--accent);
  background: var(--accent-dim);
  outline: none;
}
.drop-zone.dragover {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.drop-zone strong { display: block; margin-bottom: 6px; font-size: 0.95rem; }
.drop-zone span { font-size: 0.82rem; color: var(--muted); }

.preview-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.preview-panel h2 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 10px;
}
.preview-viewport {
  position: relative;
  height: min(42vh, 400px);
  background: linear-gradient(160deg, #f0f4ff 0%, #e8edf8 100%);
  border-radius: 8px;
  overflow: hidden;
}
.preview-canvas-host {
  width: 100%;
  height: 100%;
}
.preview-hint {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--muted);
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
}
.btn {
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.btn:hover { border-color: var(--accent); color: var(--accent); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
}
.btn-primary:hover:not(:disabled) {
  background: rgba(47, 107, 255, 0.22);
}
.btn-danger {
  border-color: #fecaca;
  background: var(--danger-bg);
  color: var(--danger);
}
.btn-danger:hover:not(:disabled) {
  border-color: var(--danger);
}

.pending-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.pending-panel h2 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 12px;
}
.pending-list { list-style: none; margin: 0; padding: 0; }
.pending-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.88rem;
}
.pending-list li:last-child { border-bottom: none; }
.pending-list .fname { word-break: break-all; }
.pending-list .fmeta { font-size: 0.78rem; color: var(--muted); flex-shrink: 0; }
.btn-mini {
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 8px;
}

.result-panel {
  display: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.result-panel.visible { display: block; }
.result-panel h2 { font-size: 0.95rem; margin: 0 0 12px; }
.result-url {
  display: block;
  word-break: break-all;
  font-size: 0.85rem;
  padding: 12px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 12px;
  color: var(--accent);
}
.result-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.msg { font-size: 0.82rem; color: var(--muted); margin-top: 10px; }

.loading-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(248, 249, 251, 0.85);
  align-items: center;
  justify-content: center;
  z-index: 100;
  flex-direction: column;
  gap: 14px;
}
.loading-overlay.visible { display: flex; }
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 0.95rem; color: var(--muted); }

.remote-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.remote-panel .head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(248, 249, 251, 0.9);
}
.remote-panel h2 { font-size: 0.95rem; margin: 0; }
.table-wrap { overflow-x: auto; }
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
th, td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
th {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  background: var(--bg);
}
tr:last-child td { border-bottom: none; }
td a { color: var(--accent); text-decoration: none; word-break: break-all; }
td a:hover { text-decoration: underline; }
.empty-row td {
  text-align: center;
  color: var(--muted);
  padding: 24px;
}
.err-toast {
  display: none;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--danger);
  font-size: 0.88rem;
}
.err-toast.visible { display: block; }
  </style>
</head>
<body>
  <div id="loading-overlay" class="loading-overlay" aria-hidden="true">
    <div class="spinner" role="status"></div>
    <p id="loading-text" class="loading-text">업로드 중…</p>
  </div>

  <div class="wrap">
    <span class="badge">Internal</span>
    <h1>STL 업로드</h1>
    <p class="lead">STL을 추가하면 아래에서 <strong>미리보기</strong>할 수 있습니다. 확인 후 <strong>업로드</strong>를 누르면 저장소 <code>models/</code>에 반영됩니다.</p>

    <div class="warn-box">
      GitHub 인증은 Worker에서만 처리합니다. 같은 Worker에서 이 페이지를 <code>/admin</code>으로 제공하면 <code>WORKER_URL</code>을 비워 두어도 됩니다.
    </div>

    <div id="err-toast" class="err-toast" role="alert"></div>

    <div
      id="drop-zone"
      class="drop-zone"
      tabindex="0"
      role="button"
      aria-label="STL 파일을 여기에 놓거나 클릭하여 선택"
    >
      <strong>STL을 여기에 드롭</strong>
      <span>또는 클릭하여 선택 · 여러 파일 가능 (.stl)</span>
    </div>
    <input type="file" id="file-input" accept=".stl,.STL" multiple hidden />

    <div id="preview-panel" class="preview-panel">
      <h2>3D 미리보기</h2>
      <div class="preview-viewport">
        <div id="preview-canvas-host" class="preview-canvas-host"></div>
      </div>
      <p class="preview-hint">대기 목록의 <strong>첫 번째</strong> 파일이 표시됩니다. 드래그로 회전 · 휠로 줌</p>
    </div>

    <div class="row-actions">
      <button type="button" id="btn-upload" class="btn btn-primary" disabled>업로드</button>
      <button type="button" id="btn-clear-pending" class="btn" disabled>대기 목록 비우기</button>
      <button type="button" id="btn-refresh-list" class="btn">목록 새로고침</button>
    </div>

    <div id="pending-panel" class="pending-panel" hidden>
      <h2>업로드 대기</h2>
      <ul id="pending-list" class="pending-list"></ul>
    </div>

    <div id="result-panel" class="result-panel">
      <h2>마지막 업로드 링크</h2>
      <a id="result-url" class="result-url" href="#" target="_blank" rel="noopener"></a>
      <div class="result-actions">
        <button type="button" id="btn-copy-url" class="btn btn-primary">링크 복사</button>
        <button type="button" id="btn-kakao-share" class="btn">카카오톡 공유</button>
      </div>
      <p id="copy-msg" class="msg" hidden>클립보드에 복사했습니다.</p>
    </div>

    <div class="remote-panel">
      <div class="head">
        <h2>저장소의 models/ 파일</h2>
        <span id="remote-meta" class="fmeta"></span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>파일</th>
              <th>뷰어 링크</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody id="remote-tbody">
            <tr class="empty-row"><td colspan="3">목록을 불러오는 중…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>
  <script type="module">
    import * as THREE from "three";
    import { STLLoader } from "three/addons/loaders/STLLoader.js";

    const PUBLIC_VIEWER_BASE = "https://eoulrimstudio-upload.eoulrimstudio.workers.dev";

    /** 비우면 현재 origin — 같은 Worker에서 /admin 제공 시 */
    const WORKER_URL = "";

    function workerEndpoint(path) {
      const p = path.startsWith("/") ? path : "/" + path;
      const raw = (WORKER_URL || "").trim();
      if (raw) return raw.replace(/\\/$/, "") + p;
      if (typeof window !== "undefined" && window.location && window.location.origin) {
        return window.location.origin + p;
      }
      return "https://eoulrimstudio-upload.eoulrimstudio.workers.dev" + p;
    }

    function publicViewerUrlForFilename(filename) {
      const base = String(filename).replace(/\\.stl$/i, "").trim();
      return PUBLIC_VIEWER_BASE.replace(/\\/$/, "") + "/?model=" + encodeURIComponent(base);
    }

    let pendingFiles = [];
    let lastViewerUrl = "";

    let preview = {
      scene: null,
      camera: null,
      renderer: null,
      mesh: null,
      hemiLight: null,
      dirLight: null,
      _raf: null,
      _onResize: null,
      initialCameraPos: null,
    };

    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const btnUpload = document.getElementById("btn-upload");
    const btnClearPending = document.getElementById("btn-clear-pending");
    const btnRefreshList = document.getElementById("btn-refresh-list");
    const pendingPanel = document.getElementById("pending-panel");
    const pendingList = document.getElementById("pending-list");
    const loadingOverlay = document.getElementById("loading-overlay");
    const loadingText = document.getElementById("loading-text");
    const resultPanel = document.getElementById("result-panel");
    const resultUrlEl = document.getElementById("result-url");
    const btnCopyUrl = document.getElementById("btn-copy-url");
    const btnKakaoShare = document.getElementById("btn-kakao-share");
    const copyMsg = document.getElementById("copy-msg");
    const remoteTbody = document.getElementById("remote-tbody");
    const remoteMeta = document.getElementById("remote-meta");
    const errToast = document.getElementById("err-toast");
    const previewHost = document.getElementById("preview-canvas-host");

    function showError(msg) {
      errToast.textContent = msg;
      errToast.classList.add("visible");
    }
    function clearError() {
      errToast.textContent = "";
      errToast.classList.remove("visible");
    }

    function normalizeUploadName(name) {
      const lower = String(name).toLowerCase();
      if (!lower.endsWith(".stl")) return null;
      const base = name.slice(0, -4);
      if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
      return base + ".stl";
    }

    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      const chunk = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    }

    function disposePreviewMesh() {
      if (preview.mesh) {
        preview.scene.remove(preview.mesh);
        preview.mesh.geometry?.dispose();
        preview.mesh.material?.dispose();
        preview.mesh = undefined;
      }
    }

    function stopPreviewLoop() {
      if (preview._raf) {
        cancelAnimationFrame(preview._raf);
        preview._raf = null;
      }
      if (preview._onResize) {
        window.removeEventListener("resize", preview._onResize);
        preview._onResize = null;
      }
    }

    function destroyPreviewGl() {
      stopPreviewLoop();
      disposePreviewMesh();
      if (preview.renderer) {
        preview.renderer.dispose();
        const el = preview.renderer.domElement;
        if (el && el.parentNode) el.parentNode.removeChild(el);
        preview.renderer = null;
      }
      preview.scene = null;
      preview.camera = null;
      preview.hemiLight = null;
      preview.dirLight = null;
    }

    function setupPreviewDrag() {
      const el = preview.renderer.domElement;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      const SPEED = 0.008;

      function applyDelta(dx, dy) {
        if (!preview.mesh) return;
        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * SPEED);
        const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * SPEED);
        preview.mesh.quaternion.premultiply(qY).premultiply(qX);
      }

      function applyZoom(factor) {
        const minDist = 0.5;
        const maxDist = 10000;
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(preview.camera.quaternion);
        const dist = preview.camera.position.length();
        preview.camera.position.addScaledVector(dir, dist * (1 - factor));
        const newDist = preview.camera.position.length();
        if (newDist < minDist) preview.camera.position.setLength(minDist);
        if (newDist > maxDist) preview.camera.position.setLength(maxDist);
      }

      el.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        el.style.cursor = "grabbing";
      });
      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        applyDelta(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX;
        lastY = e.clientY;
      });
      window.addEventListener("mouseup", () => {
        dragging = false;
        el.style.cursor = "grab";
      });
      el.style.cursor = "grab";

      el.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          applyZoom(e.deltaY > 0 ? 1.12 : 1 / 1.12);
        },
        { passive: false }
      );

      let lastTouchX = 0;
      let lastTouchY = 0;
      let lastPinchDist = 0;
      el.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          if (e.touches.length === 1) {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
          } else if (e.touches.length === 2) {
            lastPinchDist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
          }
        },
        { passive: false }
      );
      el.addEventListener(
        "touchmove",
        (e) => {
          e.preventDefault();
          if (e.touches.length === 1) {
            applyDelta(e.touches[0].clientX - lastTouchX, e.touches[0].clientY - lastTouchY);
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
          } else if (e.touches.length === 2) {
            const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            if (lastPinchDist > 0) applyZoom(lastPinchDist / dist);
            lastPinchDist = dist;
          }
        },
        { passive: false }
      );
      el.addEventListener("touchend", () => {
        lastPinchDist = 0;
      }, { passive: true });
    }

    function resizePreview() {
      if (!preview.renderer || !preview.camera || !previewHost) return;
      const w = Math.max(previewHost.clientWidth, 2);
      const h = Math.max(previewHost.clientHeight, 2);
      preview.camera.aspect = w / h;
      preview.camera.updateProjectionMatrix();
      preview.renderer.setSize(w, h);
    }

    function fitCameraToMesh(mesh) {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const dist = maxDim * 2.0;
      preview.camera.near = Math.max(0.01, dist / 200);
      preview.camera.far = dist * 50;
      preview.camera.updateProjectionMatrix();
      preview.initialCameraPos = new THREE.Vector3(0, 0, dist);
      preview.camera.position.copy(preview.initialCameraPos);
      preview.camera.lookAt(0, 0, 0);
    }

    async function ensurePreviewGl() {
      if (preview.renderer && preview.scene) return;
      destroyPreviewGl();
      const host = previewHost;
      const w = Math.max(host.clientWidth, 2);
      const h = Math.max(host.clientHeight, 2);
      preview.scene = new THREE.Scene();
      preview.scene.background = new THREE.Color(0xf0f4ff);
      preview.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
      preview.camera.position.set(0, 0, 120);
      preview.camera.lookAt(0, 0, 0);
      preview.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      preview.renderer.setSize(w, h);
      preview.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(preview.renderer.domElement);

      preview.hemiLight = new THREE.HemisphereLight(0xffffff, 0xdde4f0, 0.25);
      preview.scene.add(preview.hemiLight);
      preview.dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
      preview.scene.add(preview.dirLight.target);
      preview.dirLight.target.position.set(0, 0, 0);
      preview.scene.add(preview.dirLight);
      preview.dirLight.position.set(55, 95, 70);

      setupPreviewDrag();

      function loop() {
        preview._raf = requestAnimationFrame(loop);
        preview.renderer.render(preview.scene, preview.camera);
      }
      loop();

      preview._onResize = resizePreview;
      window.addEventListener("resize", preview._onResize);
      requestAnimationFrame(resizePreview);
    }

    async function loadPreviewFromFirstPending() {
      const first = pendingFiles[0];
      if (!first || !normalizeUploadName(first.name)) {
        destroyPreviewGl();
        return;
      }
      await ensurePreviewGl();
      const buf = await first.arrayBuffer();
      const loader = new STLLoader();
      const geometry = loader.parse(buf);
      geometry.computeVertexNormals();
      geometry.center();
      disposePreviewMesh();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xa3f958,
        metalness: 0.05,
        roughness: 0.55,
      });
      preview.mesh = new THREE.Mesh(geometry, mat);
      preview.scene.add(preview.mesh);
      fitCameraToMesh(preview.mesh);
    }

    async function uploadStlFile(file) {
      const safeName = normalizeUploadName(file.name);
      if (!safeName) {
        throw new Error("허용되지 않는 파일명입니다(영문·숫자·._- 만): " + file.name);
      }
      const buf = await file.arrayBuffer();
      const content = arrayBufferToBase64(buf);

      const res = await fetch(workerEndpoint("/upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: safeName, content }),
        credentials: "include",
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("응답을 해석할 수 없습니다 (HTTP " + res.status + ")");
      }

      if (!res.ok || data.success === false) {
        throw new Error(data.error || "업로드 실패 (HTTP " + res.status + ")");
      }
      const url =
        data.url ||
        publicViewerUrlForFilename(data.filename || safeName);
      return { url, filename: data.filename || safeName };
    }

    function renderPending() {
      pendingList.innerHTML = "";
      if (pendingFiles.length === 0) {
        pendingPanel.hidden = true;
        btnUpload.disabled = true;
        btnClearPending.disabled = true;
        destroyPreviewGl();
        return;
      }
      pendingPanel.hidden = false;
      btnUpload.disabled = false;
      btnClearPending.disabled = false;
      pendingFiles.forEach((file, idx) => {
        const li = document.createElement("li");
        const left = document.createElement("div");
        left.innerHTML =
          '<div class="fname">' +
          escapeHtml(file.name) +
          '</div><div class="fmeta">' +
          formatBytes(file.size) +
          "</div>";
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "btn btn-mini btn-danger";
        rm.textContent = "제거";
        rm.addEventListener("click", () => {
          pendingFiles.splice(idx, 1);
          renderPending();
          loadPreviewFromFirstPending().catch(() => {});
        });
        li.appendChild(left);
        li.appendChild(rm);
        pendingList.appendChild(li);
      });
      loadPreviewFromFirstPending().catch((e) => console.error(e));
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function formatBytes(n) {
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
      return (n / (1024 * 1024)).toFixed(1) + " MB";
    }

    function setLoading(show, text) {
      loadingOverlay.classList.toggle("visible", show);
      loadingOverlay.setAttribute("aria-hidden", show ? "false" : "true");
      if (text) loadingText.textContent = text;
    }

    function showResult(url) {
      lastViewerUrl = url;
      resultUrlEl.href = url;
      resultUrlEl.textContent = url;
      resultPanel.classList.add("visible");
      copyMsg.hidden = true;
    }

    function addFilesFromList(fileList) {
      const incoming = Array.from(fileList || []).filter((f) =>
        f.name.toLowerCase().endsWith(".stl")
      );
      if (incoming.length === 0 && fileList && fileList.length > 0) {
        showError("STL 파일(.stl)만 추가할 수 있습니다.");
        return;
      }
      clearError();
      const names = new Set(pendingFiles.map((f) => f.name));
      for (const f of incoming) {
        if (!names.has(f.name)) {
          pendingFiles.push(f);
          names.add(f.name);
        }
      }
      renderPending();
    }

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });
    ["dragenter", "dragover"].forEach((ev) => {
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      });
    });
    dropZone.addEventListener("dragleave", (e) => {
      if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove("dragover");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      addFilesFromList(e.dataTransfer && e.dataTransfer.files);
    });
    fileInput.addEventListener("change", () => {
      addFilesFromList(fileInput.files);
      fileInput.value = "";
    });

    btnClearPending.addEventListener("click", () => {
      pendingFiles = [];
      renderPending();
    });

    btnUpload.addEventListener("click", async () => {
      clearError();
      if (pendingFiles.length === 0) return;

      const files = pendingFiles.slice();
      let lastUrl = "";
      try {
        for (let i = 0; i < files.length; i++) {
          setLoading(true, "업로드 중… (" + (i + 1) + "/" + files.length + ")");
          const out = await uploadStlFile(files[i]);
          lastUrl = out.url;
        }
        showResult(lastUrl);
        pendingFiles = [];
        renderPending();
        await refreshRemoteList();
      } catch (e) {
        console.error(e);
        showError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    });

    btnCopyUrl.addEventListener("click", async () => {
      if (!lastViewerUrl) return;
      try {
        await navigator.clipboard.writeText(lastViewerUrl);
        copyMsg.hidden = false;
        setTimeout(() => {
          copyMsg.hidden = true;
        }, 2500);
      } catch {
        showError("클립보드 복사에 실패했습니다. 링크를 직접 선택해 복사해 주세요.");
      }
    });

    btnKakaoShare.addEventListener("click", async () => {
      if (!lastViewerUrl) return;
      const title = "3D 모델 미리보기";
      const text = "아래 링크에서 3D 모델을 확인할 수 있습니다.\\n" + lastViewerUrl;
      try {
        if (navigator.share) {
          await navigator.share({
            title,
            text: "3D 모델 미리보기 링크입니다.",
            url: lastViewerUrl,
          });
          return;
        }
      } catch (e) {
        if (e.name === "AbortError") return;
      }
      try {
        await navigator.clipboard.writeText(text);
        alert("안내 문구와 링크를 클립보드에 복사했습니다. 카카오톡 채팅창에 붙여넣기 하세요.");
      } catch {
        alert(text);
      }
    });

    async function deleteRemoteFile(filename) {
      if (!confirm("정말 삭제하시겠습니까?")) return;
      try {
        const res = await fetch(workerEndpoint("/delete"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename }),
          credentials: "include",
        });
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error("응답 해석 실패 (HTTP " + res.status + ")");
        }
        if (!res.ok || data.success === false) {
          throw new Error(data.error || "삭제 실패");
        }
        await refreshRemoteList();
      } catch (e) {
        showError(e.message || String(e));
      }
    }

    async function refreshRemoteList() {
      remoteMeta.textContent = "";
      remoteTbody.innerHTML =
        '<tr class="empty-row"><td colspan="3">불러오는 중…</td></tr>';
      try {
        clearError();
        const res = await fetch(workerEndpoint("/list"), {
          method: "GET",
          credentials: "include",
        });
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error("목록 응답을 해석할 수 없습니다 (HTTP " + res.status + ")");
        }

        if (!res.ok && data.success === false) {
          throw new Error(data.error || "목록 조회 실패 (HTTP " + res.status + ")");
        }
        if (!res.ok) {
          throw new Error(data.error || "HTTP " + res.status);
        }

        if (data.success === false && data.error) {
          throw new Error(data.error);
        }

        const files = Array.isArray(data.files) ? data.files : [];
        remoteMeta.textContent = files.length + "개";
        if (files.length === 0) {
          remoteTbody.innerHTML =
            '<tr class="empty-row"><td colspan="3">models/ 에 STL이 없습니다.</td></tr>';
          return;
        }

        remoteTbody.innerHTML = "";
        for (const item of files) {
          const name = item.filename || "";
          const url =
            item.url || publicViewerUrlForFilename(name);
          const tr = document.createElement("tr");
          const tdName = document.createElement("td");
          tdName.textContent = name;
          const tdLink = document.createElement("td");
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = url;
          tdLink.appendChild(a);
          const tdAct = document.createElement("td");
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "btn btn-mini btn-danger";
          delBtn.textContent = "삭제";
          delBtn.addEventListener("click", () => deleteRemoteFile(name));
          tdAct.appendChild(delBtn);
          tr.appendChild(tdName);
          tr.appendChild(tdLink);
          tr.appendChild(tdAct);
          remoteTbody.appendChild(tr);
        }
      } catch (e) {
        remoteTbody.innerHTML =
          '<tr class="empty-row"><td colspan="3">목록을 불러오지 못했습니다.</td></tr>';
        remoteMeta.textContent = "";
        showError(e.message || String(e));
      }
    }

    btnRefreshList.addEventListener("click", () =>
      refreshRemoteList().catch(() => {})
    );

    refreshRemoteList().catch(() => {});
  </script>
</body>
</html>
`;

const VIEWER_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>3D 모델 뷰어</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
:root {
  --bg: #f8f9fb;
  --surface: #ffffff;
  --border: #e2e5ed;
  --text: #111827;
  --muted: #6b7280;
  --accent: #2f6bff;
  --accent-dim: rgba(47, 107, 255, 0.10);
  --radius: 12px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: "IBM Plex Sans KR", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

.wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

header {
  margin-bottom: 16px;
}

header h1 {
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}

header p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
}

.viewer-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.viewer-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.slot-viewport {
  position: relative;
  height: min(62vh, 520px);
  background: linear-gradient(160deg, #f0f4ff 0%, #e8edf8 100%);
}

.slot-canvas-host {
  width: 100%;
  height: 100%;
}

/* 컬러 피커 */
.color-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.color-wrap-label {
  font-size: 0.82rem;
  color: var(--muted);
  white-space: nowrap;
}

#model-color-picker {
  width: 36px;
  height: 32px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
#model-color-picker::-webkit-color-swatch-wrapper { padding: 0; border-radius: 6px; }
#model-color-picker::-webkit-color-swatch { border: none; border-radius: 6px; }

.color-presets {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.color-preset {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.color-preset:hover { transform: scale(1.15); }
.color-preset.active { border-color: var(--text); }

/* 부트 화면 */
.boot-screen {
  min-height: 100vh;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}
.boot-inner {
  text-align: center;
  max-width: 440px;
}
.boot-inner h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}
.boot-muted {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.55;
}
.boot-inner code {
  font-size: 0.88em;
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.boot-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: boot-spin 0.8s linear infinite;
}
@keyframes boot-spin {
  to { transform: rotate(360deg); }
}
html[data-viewer="error"] #screen-error { display: flex; }
html[data-viewer="error"] #screen-loading,
html[data-viewer="error"] #app-main { display: none !important; }

html[data-viewer="loading"] #screen-loading { display: flex; }
html[data-viewer="loading"] #screen-error,
html[data-viewer="loading"] #app-main { display: none !important; }

html[data-viewer="app"] #app-main { display: block; }
html[data-viewer="app"] #screen-loading,
html[data-viewer="app"] #screen-error { display: none !important; }

html:not([data-viewer]) #screen-error { display: flex; }
  </style>
</head>
<body>
  <script>
  (function () {
    var q = new URLSearchParams(window.location.search).get("model");
    document.documentElement.setAttribute("data-viewer", (q && String(q).trim()) ? "loading" : "error");
  })();
  </script>
  <div id="screen-loading" class="boot-screen" aria-live="polite">
    <div class="boot-inner">
      <div class="boot-spinner" role="status" aria-label="로딩 중"></div>
      <p>모델을 불러오는 중…</p>
    </div>
  </div>
  <div id="screen-error" class="boot-screen">
    <div class="boot-inner">
      <h1>모델을 찾을 수 없습니다</h1>
      <p class="boot-muted">올바른 링크인지 확인해 주세요. 주소에 <code>?model=파일이름</code> 형태가 포함되어 있어야 하며, 해당 STL이 제공 경로에 있어야 합니다.</p>
    </div>
  </div>
  <div id="app-main">
  <div class="wrap">
    <header>
      <h1>3D 미리보기</h1>
      <p>드래그로 회전 · 휠로 줌 · 한 손가락 드래그 / 두 손가락으로 확대(모바일)</p>
    </header>

    <div class="viewer-top">
      <div class="color-wrap">
        <span class="color-wrap-label">모델 색상</span>
        <input type="color" id="model-color-picker" value="#a3f958" title="모델 색상 선택" />
        <div class="color-presets" id="color-presets"></div>
      </div>
    </div>
    <div id="viewers-root"></div>
  </div>
  </div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>
  <script type="module">
    import * as THREE from "three";
    import { STLLoader } from "three/addons/loaders/STLLoader.js";

    function sanitizeModelParam(raw) {
      if (!raw || typeof raw !== "string") return "";
      const base = raw.trim().replace(/\\.stl$/i, "");
      if (!/^[a-zA-Z0-9._-]+$/.test(base)) return "";
      return base;
    }

    function preventNavDrop(e) {
      e.preventDefault();
    }
    ["dragenter", "dragover", "drop"].forEach(ev => {
      window.addEventListener(ev, preventNavDrop, true);
    });

    const viewersRoot    = document.getElementById("viewers-root");
    const colorPickerEl  = document.getElementById("model-color-picker");
    const colorPresetsEl = document.getElementById("color-presets");

    let MODEL_MESH_COLOR = 0xa3f958;

    const COLOR_PRESETS = [
      { hex: "#a3f958", label: "라임" },
      { hex: "#ffffff", label: "화이트" },
      { hex: "#d4d4d4", label: "실버" },
      { hex: "#f5c842", label: "골드" },
      { hex: "#f97316", label: "오렌지" },
      { hex: "#ef4444", label: "레드" },
      { hex: "#3b82f6", label: "블루" },
      { hex: "#8b5cf6", label: "퍼플" },
      { hex: "#1a1a1a", label: "블랙" },
    ];

    function hexToThreeNum(hex) {
      return parseInt(hex.replace("#", ""), 16);
    }
    function threeNumToHex(num) {
      return "#" + num.toString(16).padStart(6, "0");
    }

    function applyColorToAllMeshes(colorNum) {
      viewerSlots.forEach(slot => {
        if (slot.mesh?.material) slot.mesh.material.color.setHex(colorNum);
      });
    }

    function applySlotLighting(slot) {
      if (!slot?.scene || !slot?.dirLight || !slot?.hemiLight) return;
      const hemi = slot.hemiLight;
      const dir  = slot.dirLight;
      if (dir.parent) dir.parent.remove(dir);
      if (dir.target.parent) dir.target.parent.remove(dir.target);
      hemi.intensity = 0.25;
      dir.intensity  = 1.15;
      slot.scene.add(dir.target);
      dir.target.position.set(0, 0, 0);
      slot.scene.add(dir);
      dir.position.set(55, 95, 70);
    }

    function setupMeshDrag(slot) {
      const el = slot.renderer.domElement;
      let dragging = false;
      let lastX = 0, lastY = 0;
      const SPEED = 0.008;

      function applyDelta(dx, dy) {
        if (!slot.mesh) return;
        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * SPEED);
        const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * SPEED);
        slot.mesh.quaternion.premultiply(qY).premultiply(qX);
      }

      function applyZoom(factor) {
        const minDist = 0.5;
        const maxDist = 10000;
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(slot.camera.quaternion);
        const dist = slot.camera.position.distanceTo(slot.controls_target || new THREE.Vector3(0, 0, 0));
        const step = dist * (1 - factor);
        slot.camera.position.addScaledVector(dir, step);
        const newDist = slot.camera.position.length();
        if (newDist < minDist) slot.camera.position.setLength(minDist);
        if (newDist > maxDist) slot.camera.position.setLength(maxDist);
      }

      el.addEventListener("mousedown", e => {
        if (e.button !== 0) return;
        dragging = true;
        lastX = e.clientX; lastY = e.clientY;
        el.style.cursor = "grabbing";
      });
      window.addEventListener("mousemove", e => {
        if (!dragging) return;
        applyDelta(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX; lastY = e.clientY;
      });
      window.addEventListener("mouseup", () => { dragging = false; el.style.cursor = "grab"; });
      el.style.cursor = "grab";

      el.addEventListener("wheel", e => {
        e.preventDefault();
        applyZoom(e.deltaY > 0 ? 1.12 : 1 / 1.12);
      }, { passive: false });

      let lastTouchX = 0, lastTouchY = 0, lastPinchDist = 0;
      el.addEventListener("touchstart", e => {
        e.preventDefault();
        if (e.touches.length === 1) {
          lastTouchX = e.touches[0].clientX;
          lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          lastPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      }, { passive: false });
      el.addEventListener("touchmove", e => {
        e.preventDefault();
        if (e.touches.length === 1) {
          applyDelta(e.touches[0].clientX - lastTouchX, e.touches[0].clientY - lastTouchY);
          lastTouchX = e.touches[0].clientX;
          lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (lastPinchDist > 0) applyZoom(lastPinchDist / dist);
          lastPinchDist = dist;
        }
      }, { passive: false });
      el.addEventListener("touchend", () => { lastPinchDist = 0; }, { passive: true });
    }

    let viewerSeq = 0;
    let viewerSlots = [];

    function resizeSlotRenderer(slot) {
      if (!slot.renderer || !slot.canvasHost || !slot.camera) return;
      const host = slot.canvasHost;
      const w = Math.max(host.clientWidth, 2);
      const h = Math.max(host.clientHeight, 2);
      slot.camera.aspect = w / h;
      slot.camera.updateProjectionMatrix();
      slot.renderer.setSize(w, h);
    }

    function initThreeForSlot(slot) {
      const host = slot.canvasHost;
      const w = Math.max(host.clientWidth, 2);
      const h = Math.max(host.clientHeight, 2);
      slot.scene = new THREE.Scene();
      slot.scene.background = new THREE.Color(0xf0f4ff);
      slot.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
      slot.initialCameraPos = new THREE.Vector3(0, 0, 120);
      slot.camera.position.copy(slot.initialCameraPos);
      slot.camera.lookAt(0, 0, 0);
      slot.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      slot.renderer.setSize(w, h);
      slot.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(slot.renderer.domElement);

      slot.hemiLight = new THREE.HemisphereLight(0xffffff, 0xdde4f0, 0.25);
      slot.scene.add(slot.hemiLight);
      slot.dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
      slot.scene.add(slot.dirLight.target);
      slot.dirLight.target.position.set(0, 0, 0);
      slot.scene.add(slot.dirLight);
      slot.dirLight.position.set(55, 95, 70);
      applySlotLighting(slot);

      setupMeshDrag(slot);

      function loop() {
        slot._raf = requestAnimationFrame(loop);
        slot.renderer.render(slot.scene, slot.camera);
      }
      loop();

      slot._onResize = () => resizeSlotRenderer(slot);
      window.addEventListener("resize", slot._onResize);
      requestAnimationFrame(() => resizeSlotRenderer(slot));
    }

    function clearSlotMesh(slot) {
      if (!slot.scene) return;
      if (slot.mesh) {
        slot.scene.remove(slot.mesh);
        slot.mesh.geometry?.dispose();
        slot.mesh.material?.dispose();
        slot.mesh = undefined;
      }
      slot.geometry = undefined;
      slot.arrayBuffer = undefined;
      slot.fileName = "";
    }

    function fitCameraToSlotMesh(slot) {
      if (!slot.mesh || !slot.camera) return;
      const box = new THREE.Box3().setFromObject(slot.mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const dist = maxDim * 2.0;
      slot.camera.near = Math.max(0.01, dist / 200);
      slot.camera.far = dist * 50;
      slot.camera.updateProjectionMatrix();
      slot.initialCameraPos = new THREE.Vector3(0, 0, dist);
      slot.camera.position.copy(slot.initialCameraPos);
      slot.camera.lookAt(0, 0, 0);
    }

    async function loadSTLIntoSlotFromArrayBuffer(slot, arrayBuffer, fileName) {
      const loader = new STLLoader();
      const geometry = loader.parse(arrayBuffer);
      geometry.computeVertexNormals();
      geometry.center();
      clearSlotMesh(slot);
      slot.geometry = geometry;
      slot.arrayBuffer = arrayBuffer;
      slot.fileName = fileName;
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: MODEL_MESH_COLOR, metalness: 0.05, roughness: 0.55 })
      );
      slot.mesh = mesh;
      slot.scene.add(mesh);
      fitCameraToSlotMesh(slot);
    }

    function createViewerSlot() {
      viewerSeq += 1;
      const card = document.createElement("div");
      card.className = "viewer-card";
      card.innerHTML = \`
        <div class="slot-viewport">
          <div class="slot-canvas-host"></div>
        </div>\`;
      viewersRoot.appendChild(card);

      const slot = {
        id: \`slot-\${viewerSeq}\`,
        card,
        canvasHost: card.querySelector(".slot-canvas-host"),
      };

      initThreeForSlot(slot);
      viewerSlots.push(slot);
      return slot;
    }

    function updateActivePreset(hex) {
      colorPresetsEl.querySelectorAll(".color-preset").forEach(el => {
        el.classList.toggle("active", el.dataset.hex === hex.toLowerCase());
      });
    }

    COLOR_PRESETS.forEach(({ hex, label }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-preset" + (hex === threeNumToHex(MODEL_MESH_COLOR) ? " active" : "");
      btn.style.background = hex;
      btn.dataset.hex = hex;
      btn.title = label;
      btn.addEventListener("click", () => {
        colorPickerEl.value = hex;
        MODEL_MESH_COLOR = hexToThreeNum(hex);
        applyColorToAllMeshes(MODEL_MESH_COLOR);
        updateActivePreset(hex);
      });
      colorPresetsEl.appendChild(btn);
    });

    colorPickerEl.addEventListener("input", () => {
      MODEL_MESH_COLOR = hexToThreeNum(colorPickerEl.value);
      applyColorToAllMeshes(MODEL_MESH_COLOR);
      updateActivePreset(colorPickerEl.value);
    });

    async function initViewerFromQuery() {
      const params = new URLSearchParams(window.location.search);
      const modelName = params.get("model");
      if (!modelName || !String(modelName).trim()) return;

      const slug = sanitizeModelParam(modelName);
      if (!slug) {
        document.documentElement.setAttribute("data-viewer", "error");
        return;
      }

      try {
        const modelName = slug;
        const stlUrl = \`https://raw.githubusercontent.com/shinhp3/eoulrimstudio-models/main/models/\${modelName}.stl\`;
        const res = await fetch(stlUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        const buf = await res.arrayBuffer();
        if (!buf || buf.byteLength === 0) throw new Error("empty body");

        document.documentElement.setAttribute("data-viewer", "app");
        const slot = createViewerSlot();
        await loadSTLIntoSlotFromArrayBuffer(slot, buf, \`\${slug}.stl\`);
      } catch (e) {
        console.error(e);
        document.documentElement.setAttribute("data-viewer", "error");
      }
    }

    initViewerFromQuery();
  </script>
</body>
</html>
`;

const GITHUB_API = "https://api.github.com";
const DEFAULT_BRANCH = "main";
const MODELS_PATH = "models";
const VIEWER_BASE = "https://eoulrimstudio-upload.eoulrimstudio.workers.dev";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_SEC = 30 * 24 * 60 * 60;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-GitHub-Content-Sha",
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function getCookie(request, name) {
  const h = request.headers.get("Cookie");
  if (!h) return "";
  const parts = h.split(";");
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (p.indexOf(name + "=") === 0) {
      return decodeURIComponent(p.slice(name.length + 1).trim());
    }
  }
  return "";
}

function buildSetCookieHeader(tokenValue) {
  return (
    COOKIE_NAME +
    "=" +
    encodeURIComponent(tokenValue) +
    "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" +
    SESSION_MAX_SEC
  );
}

async function getHmacKey(secret) {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function createSessionCookieValue(secret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_SEC;
  const payload = JSON.stringify({ exp: exp, v: 1 });
  const enc = new TextEncoder();
  const key = await getHmacKey(secret);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(sigBuf)));
  return btoa(payload) + "." + sigB64;
}

async function verifySessionCookie(secret, cookieVal) {
  if (!cookieVal || typeof cookieVal !== "string") return false;
  const dot = cookieVal.indexOf(".");
  if (dot < 1) return false;
  const payloadB64 = cookieVal.slice(0, dot);
  const sigB64 = cookieVal.slice(dot + 1);
  let payloadStr;
  try {
    payloadStr = atob(payloadB64);
  } catch {
    return false;
  }
  const enc = new TextEncoder();
  let sigBytes;
  try {
    const bin = atob(sigB64);
    sigBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) sigBytes[i] = bin.charCodeAt(i);
  } catch {
    return false;
  }
  const key = await getHmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payloadStr));
  if (!ok) return false;
  let data;
  try {
    data = JSON.parse(payloadStr);
  } catch {
    return false;
  }
  if (!data || typeof data.exp !== "number") return false;
  return data.exp > Math.floor(Date.now() / 1000);
}

async function requireAdminSession(request, env) {
  const secret = env.ADMIN_PASSWORD;
  if (!secret || typeof secret !== "string") return false;
  const raw = getCookie(request, COOKIE_NAME);
  if (!raw) return false;
  return verifySessionCookie(secret, raw);
}

async function parseAuthPassword(request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (ct.indexOf("application/json") !== -1) {
    try {
      const j = await request.json();
      return typeof j.password === "string" ? j.password : "";
    } catch {
      return "";
    }
  }
  const fd = await request.formData();
  const p = fd.get("password");
  return typeof p === "string" ? p : "";
}

function passwordsEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function handlePostAuth(request, env, requestUrl) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected || typeof expected !== "string") {
    return new Response(LOGIN_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  let pwd = "";
  try {
    pwd = await parseAuthPassword(request);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!pwd) {
    return new Response(null, { status: 400 });
  }
  if (!passwordsEqual(pwd, expected)) {
    return Response.redirect(new URL("/admin?err=1", requestUrl).toString(), 302);
  }
  const token = await createSessionCookieValue(expected);
  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.append("Set-Cookie", buildSetCookieHeader(token));
  return new Response(ADMIN_HTML, { headers: headers });
}

async function handleGetAdmin(request, env) {
  if (await requireAdminSession(request, env)) {
    return new Response(ADMIN_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return new Response(LOGIN_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function gitContentsPath(relPath) {
  return relPath
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
}

function viewerUrlForFilename(filename) {
  const base = VIEWER_BASE.replace(/\/$/, "");
  const baseName = String(filename).replace(/\.stl$/i, "");
  return base + "/?model=" + encodeURIComponent(baseName);
}

function normalizeStlFilename(name) {
  const lower = String(name).toLowerCase();
  if (!lower.endsWith(".stl")) return null;
  const base = name.slice(0, -4);
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base + ".stl";
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "eoulrimstudio-models-worker",
  };
}

async function githubJson(method, url, token, bodyObj) {
  const opts = {
    method,
    headers: {
      ...githubHeaders(token),
      ...(bodyObj !== undefined ? { "Content-Type": "application/json" } : {}),
    },
  };
  if (bodyObj !== undefined) opts.body = JSON.stringify(bodyObj);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  const err = new Error((data && data.message) || res.statusText || "HTTP " + res.status);
  err.status = res.status;
  err.data = data;
  if (!res.ok) throw err;
  return data;
}

function requireEnv(env) {
  const token = env.GITHUB_TOKEN;
  const username = env.GITHUB_USERNAME;
  const repo = env.GITHUB_REPO;
  if (!token || !username || !repo) {
    const e = new Error("서버 설정(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO)이 비어 있습니다.");
    e.status = 500;
    throw e;
  }
  return { token, username, repo };
}

async function handleUpload(request, env) {
  try {
    if (!(await requireAdminSession(request, env))) {
      return jsonResponse({ success: false, error: "인증이 필요합니다." }, 401);
    }
    const { token, username, repo } = requireEnv(env);
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "JSON 본문을 읽을 수 없습니다." }, 400);
    }

    const rawName = body.filename ?? body.name;
    const b64 = body.content ?? body.base64 ?? body.data ?? body.file;
    if (!rawName || typeof b64 !== "string") {
      return jsonResponse(
        { success: false, error: "filename 과 base64 content 필드가 필요합니다." },
        400
      );
    }

    const trimmed = b64.replace(/\s/g, "");
    if (!trimmed.length) {
      return jsonResponse({ success: false, error: "파일 내용이 비어 있습니다." }, 400);
    }

    const safeName = normalizeStlFilename(rawName);
    if (!safeName) {
      return jsonResponse(
        {
          success: false,
          error:
            "허용되지 않는 파일명입니다. .stl 확장자 및 영문·숫자·._- 만 사용하세요.",
        },
        400
      );
    }

    const relPath = MODELS_PATH + "/" + safeName;
    const apiPath = GITHUB_API + "/repos/" + username + "/" + repo + "/contents/" + gitContentsPath(relPath);

    let sha;
    try {
      const existing = await githubJson(
        "GET",
        apiPath + "?ref=" + encodeURIComponent(DEFAULT_BRANCH),
        token
      );
      if (existing && existing.sha) sha = existing.sha;
    } catch (e) {
      if (e.status !== 404) throw e;
    }

    const putBody = {
      message: "Upload STL: " + safeName,
      content: trimmed,
      branch: DEFAULT_BRANCH,
    };
    if (sha) putBody.sha = sha;

    await githubJson("PUT", apiPath, token, putBody);

    const url = viewerUrlForFilename(safeName);
    return jsonResponse({ success: true, url, filename: safeName });
  } catch (e) {
    const msg = e.message || String(e);
    const status = e.status >= 400 && e.status < 600 ? e.status : 500;
    return jsonResponse({ success: false, error: msg }, status);
  }
}

async function handleList(env, request) {
  try {
    const { token, username, repo } = requireEnv(env);
    const pathUrl =
      GITHUB_API +
      "/repos/" +
      username +
      "/" +
      repo +
      "/contents/" +
      gitContentsPath(MODELS_PATH) +
      "?ref=" +
      encodeURIComponent(DEFAULT_BRANCH);

    let data;
    try {
      data = await githubJson("GET", pathUrl, token);
    } catch (e) {
      if (e.status === 404) {
        return jsonResponse({ files: [] });
      }
      throw e;
    }

    if (!Array.isArray(data)) {
      return jsonResponse({ success: false, error: "목록 응답 형식이 올바르지 않습니다." }, 502);
    }

    const files = data
      .filter(
        (item) =>
          item.type === "file" && item.name && item.name.toLowerCase().endsWith(".stl")
      )
      .map((item) => ({
        filename: item.name,
        url: viewerUrlForFilename(item.name),
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename));

    return jsonResponse({ files });
  } catch (e) {
    const msg = e.message || String(e);
    const status = e.status >= 400 && e.status < 600 ? e.status : 500;
    return jsonResponse({ success: false, error: msg }, status);
  }
}

async function handleDelete(request, env) {
  try {
    if (!(await requireAdminSession(request, env))) {
      return jsonResponse({ success: false, error: "인증이 필요합니다." }, 401);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "JSON 본문을 읽을 수 없습니다." }, 400);
    }
    const rawName = body.filename ?? body.name;
    if (!rawName || typeof rawName !== "string") {
      return jsonResponse({ success: false, error: "filename 필드가 필요합니다." }, 400);
    }
    const safeName = normalizeStlFilename(rawName);
    if (!safeName) {
      return jsonResponse({ success: false, error: "허용되지 않는 파일명입니다." }, 400);
    }
    const { token, username, repo } = requireEnv(env);
    const relPath = MODELS_PATH + "/" + safeName;
    const apiPath = GITHUB_API + "/repos/" + username + "/" + repo + "/contents/" + gitContentsPath(relPath);
    let existing;
    try {
      existing = await githubJson(
        "GET",
        apiPath + "?ref=" + encodeURIComponent(DEFAULT_BRANCH),
        token
      );
    } catch (e) {
      if (e.status === 404) {
        return jsonResponse({ success: false, error: "파일을 찾을 수 없습니다." }, 404);
      }
      throw e;
    }
    if (!existing || !existing.sha) {
      return jsonResponse({ success: false, error: "GitHub 응답에 sha가 없습니다." }, 502);
    }
    await githubJson("DELETE", apiPath, token, {
      message: "Delete STL: " + safeName,
      sha: existing.sha,
      branch: DEFAULT_BRANCH,
    });
    return jsonResponse({ success: true });
  } catch (e) {
    const msg = e.message || String(e);
    const status = e.status >= 400 && e.status < 600 ? e.status : 500;
    return jsonResponse({ success: false, error: msg }, status);
  }
}

function recordsUtf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function handleGetRecords(env) {
  try {
    const token = env.GITHUB_TOKEN;
    const username = env.GITHUB_USERNAME;
    const repo = env.GITHUB_RECORDS_REPO;
    if (!token || !username || !repo) {
      return jsonResponse(
        { success: false, error: "서버 설정(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_RECORDS_REPO)이 비어 있습니다." },
        500
      );
    }

    const apiPath =
      GITHUB_API +
      "/repos/" +
      username +
      "/" +
      repo +
      "/contents/" +
      gitContentsPath("records.json") +
      "?ref=" +
      encodeURIComponent(DEFAULT_BRANCH);

    let data;
    try {
      data = await githubJson("GET", apiPath, token);
    } catch (e) {
      if (e.status === 404) {
        const body = JSON.stringify({ records: [] });
        return new Response(body, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders(),
          },
        });
      }
      throw e;
    }

    if (!data.content || data.encoding !== "base64") {
      return jsonResponse({ success: false, error: "GitHub 응답 형식이 올바르지 않습니다." }, 502);
    }

    const bin = atob(String(data.content).replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = new TextDecoder("utf-8").decode(bytes);
    const sha = typeof data.sha === "string" ? data.sha : "";
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    });
    headers.set("Access-Control-Expose-Headers", "X-GitHub-Content-Sha");
    if (sha) headers.set("X-GitHub-Content-Sha", sha);
    return new Response(text, { headers });
  } catch (e) {
    const msg = e.message || String(e);
    const status = e.status >= 400 && e.status < 600 ? e.status : 500;
    return jsonResponse({ success: false, error: msg }, status);
  }
}

async function handlePutRecords(request, env) {
  try {
    const token = env.GITHUB_TOKEN;
    const username = env.GITHUB_USERNAME;
    const repo = env.GITHUB_RECORDS_REPO;
    if (!token || !username || !repo) {
      return jsonResponse(
        { success: false, error: "서버 설정(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_RECORDS_REPO)이 비어 있습니다." },
        500
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "JSON 본문을 읽을 수 없습니다." }, 400);
    }

    if (!Array.isArray(body.records)) {
      return jsonResponse({ success: false, error: "records 배열이 필요합니다." }, 400);
    }

    const payload = JSON.stringify({ records: body.records }, null, 2);
    const content = recordsUtf8ToBase64(payload);
    const apiPath =
      GITHUB_API + "/repos/" + username + "/" + repo + "/contents/" + gitContentsPath("records.json");

    const putBody = {
      message: "Update records.json",
      content,
      branch: DEFAULT_BRANCH,
    };
    if (typeof body.sha === "string" && body.sha.length > 0) putBody.sha = body.sha;

    await githubJson("PUT", apiPath, token, putBody);
    return jsonResponse({ success: true });
  } catch (e) {
    const msg = e.message || String(e);
    let status = 500;
    if (typeof e.status === "number" && e.status >= 400 && e.status < 600) status = e.status;
    return jsonResponse({ success: false, error: msg }, status);
  }
}

const DEFAULT_GITHUB_TOOLS_REPO = "eoulrimstudio-tools";

async function handleGetTools(env) {
  try {
    const token = env.GITHUB_TOKEN;
    const username = env.GITHUB_USERNAME;
    const repo = env.GITHUB_TOOLS_REPO || DEFAULT_GITHUB_TOOLS_REPO;
    if (!token || !username || !repo) {
      return jsonResponse(
        { success: false, error: "서버 설정(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_TOOLS_REPO)이 비어 있습니다." },
        500
      );
    }

    const apiPath =
      GITHUB_API +
      "/repos/" +
      username +
      "/" +
      repo +
      "/contents/" +
      gitContentsPath("tools.json") +
      "?ref=" +
      encodeURIComponent(DEFAULT_BRANCH);

    let data;
    try {
      data = await githubJson("GET", apiPath, token);
    } catch (e) {
      if (e.status === 404) {
        const body = JSON.stringify({ items: [] });
        return new Response(body, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders(),
          },
        });
      }
      throw e;
    }

    if (!data.content || data.encoding !== "base64") {
      return jsonResponse({ success: false, error: "GitHub 응답 형식이 올바르지 않습니다." }, 502);
    }

    const bin = atob(String(data.content).replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = new TextDecoder("utf-8").decode(bytes);
    const sha = typeof data.sha === "string" ? data.sha : "";
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    });
    headers.set("Access-Control-Expose-Headers", "X-GitHub-Content-Sha");
    if (sha) headers.set("X-GitHub-Content-Sha", sha);
    return new Response(text, { headers });
  } catch (e) {
    const msg = e.message || String(e);
    const status = e.status >= 400 && e.status < 600 ? e.status : 500;
    return jsonResponse({ success: false, error: msg }, status);
  }
}

async function handlePutTools(request, env) {
  try {
    const token = env.GITHUB_TOKEN;
    const username = env.GITHUB_USERNAME;
    const repo = env.GITHUB_TOOLS_REPO || DEFAULT_GITHUB_TOOLS_REPO;
    if (!token || !username || !repo) {
      return jsonResponse(
        { success: false, error: "서버 설정(GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_TOOLS_REPO)이 비어 있습니다." },
        500
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "JSON 본문을 읽을 수 없습니다." }, 400);
    }

    if (!Array.isArray(body.items)) {
      return jsonResponse({ success: false, error: "items 배열이 필요합니다." }, 400);
    }

    const payload = JSON.stringify({ items: body.items }, null, 2);
    const content = recordsUtf8ToBase64(payload);
    const apiPath =
      GITHUB_API + "/repos/" + username + "/" + repo + "/contents/" + gitContentsPath("tools.json");

    const putBody = {
      message: "Update tools.json",
      content,
      branch: DEFAULT_BRANCH,
    };
    if (typeof body.sha === "string" && body.sha.length > 0) putBody.sha = body.sha;

    await githubJson("PUT", apiPath, token, putBody);
    return jsonResponse({ success: true });
  } catch (e) {
    const msg = e.message || String(e);
    let status = 500;
    if (typeof e.status === "number" && e.status >= 400 && e.status < 600) status = e.status;
    return jsonResponse({ success: false, error: msg }, status);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const path = new URL(request.url).pathname;

    if (path === "/records" && request.method === "GET") {
      return handleGetRecords(env);
    }

    if (path === "/records" && request.method === "PUT") {
      return handlePutRecords(request, env);
    }

    if (path === "/tools" && request.method === "GET") {
      return handleGetTools(env);
    }

    if (path === "/tools" && request.method === "PUT") {
      return handlePutTools(request, env);
    }

    if (path === "/upload" && request.method === "POST") {
      return handleUpload(request, env);
    }

    if (path === "/list" && request.method === "GET") {
      return handleList(env, request);
    }

    if (path === "/delete" && request.method === "DELETE") {
      return handleDelete(request, env);
    }

    if (path === "/auth" && request.method === "POST") {
      return handlePostAuth(request, env, request.url);
    }

    if (request.method === "GET") {
      if (path === "/admin" || path === "/admin/index.html") {
        return handleGetAdmin(request, env);
      }
      return new Response(VIEWER_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  },
};
