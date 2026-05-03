import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function escapeForTemplateLiteral(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

const admin = fs.readFileSync(path.join(__dirname, "admin", "index.html"), "utf8");
const viewer = fs.readFileSync(path.join(__dirname, "viewer", "index.html"), "utf8");

const adminEsc = escapeForTemplateLiteral(admin);
const viewerEsc = escapeForTemplateLiteral(viewer);

const core = String.raw`const GITHUB_API = "https://api.github.com";
const DEFAULT_BRANCH = "main";
const MODELS_PATH = "models";
const VIEWER_BASE = "https://eoulrimstudio-models.eoulrimstudio.workers.dev";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function normalizeRoutePath(pathname) {
  return pathname.replace(/\/$/, "") || "/";
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

async function handleList(env) {
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

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const pathname = normalizeRoutePath(url.pathname);

    if (pathname === "/upload" && request.method === "POST") {
      return handleUpload(request, env);
    }

    if (pathname === "/list" && request.method === "GET") {
      return handleList(env);
    }

    if (request.method === "GET") {
      if (pathname === "/admin") {
        return htmlResponse(ADMIN_HTML);
      }
      return htmlResponse(VIEWER_HTML);
    }

    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  },
};
`;

const header = `/**
 * Cloudflare Worker — 대시보드에 코드 붙여넣기 배포용 (import 없음)
 * Secrets: GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO
 *
 * HTML은 빌드 시 admin/index.html · viewer/index.html 에서 생성합니다.
 * 재생성: node _generate_worker_inline.mjs
 */

`;

const out =
  header +
  "const ADMIN_HTML = `" +
  adminEsc +
  "`;\n\n" +
  "const VIEWER_HTML = `" +
  viewerEsc +
  "`;\n\n" +
  core;

fs.writeFileSync(path.join(__dirname, "worker.js"), out, "utf8");
console.log("Written worker.js (" + out.length + " bytes)");
