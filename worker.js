/**
 * Cloudflare Worker — 대시보드에 코드 붙여넣기 배포용 (import 없음)
 *
 * 역할: STL 업로드·목록·삭제 API, records/tools API. (인증 없음 — Worker URL 비공개 권장)
 * 관리 UI는 GitHub Pages의 admin/index.html 에서 이 Worker를 호출합니다.
 * 공개 뷰어는 Pages(index.html). Worker 루트(/)는 Pages로 리다이렉트.
 *
 * Secrets: GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO,
 *          GITHUB_RECORDS_REPO (선택), GITHUB_TOOLS_REPO (선택)
 *
 * 업로드 후 뷰어 링크는 VIEWER_BASE(GitHub Pages URL) 기준입니다.
 */

const GITHUB_API = "https://api.github.com";
const DEFAULT_BRANCH = "main";
const MODELS_PATH = "models";
const VIEWER_BASE = "https://shinhp3.github.io/eoulrimstudio-models";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type",
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


async function handleGetTools(env) {
  try {
    const token = env.GITHUB_TOKEN;
    const username = env.GITHUB_USERNAME;
    const repo = env.GITHUB_TOOLS_REPO || "eoulrimstudio-tools";
    if (!token || !username) {
      return jsonResponse({ success: false, error: "서버 설정이 비어 있습니다." }, 500);
    }
    const apiPath = GITHUB_API + "/repos/" + username + "/" + repo + "/contents/" + gitContentsPath("tools.json") + "?ref=" + encodeURIComponent(DEFAULT_BRANCH);
    let data;
    try {
      data = await githubJson("GET", apiPath, token);
    } catch (e) {
      if (e.status === 404) {
        return new Response(JSON.stringify({ items: [] }), {
          headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
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
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", ...corsHeaders() });
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
    const repo = env.GITHUB_TOOLS_REPO || "eoulrimstudio-tools";
    if (!token || !username) {
      return jsonResponse({ success: false, error: "서버 설정이 비어 있습니다." }, 500);
    }
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ success: false, error: "JSON 본문을 읽을 수 없습니다." }, 400);
    }
    if (!Array.isArray(body.items)) {
      return jsonResponse({ success: false, error: "items 배열이 필요합니다." }, 400);
    }
    const payload = JSON.stringify({ items: body.items }, null, 2);
    const content = recordsUtf8ToBase64(payload);
    const apiPath = GITHUB_API + "/repos/" + username + "/" + repo + "/contents/" + gitContentsPath("tools.json");
    const putBody = { message: "Update tools.json", content, branch: DEFAULT_BRANCH };
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

    if (request.method === "GET") {
      if (path === "/admin" || path === "/admin/index.html") {
        const adminPages = new URL("https://shinhp3.github.io/eoulrimstudio-models/admin/");
        return Response.redirect(adminPages.toString(), 302);
      }
      const pagesRoot = new URL("https://shinhp3.github.io/eoulrimstudio-models/");
      const incoming = new URL(request.url);
      pagesRoot.search = incoming.search;
      pagesRoot.hash = incoming.hash;
      return Response.redirect(pagesRoot.toString(), 302);
    }

    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  },
};
