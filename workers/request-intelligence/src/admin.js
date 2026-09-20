const API_ROOT = "/api/admin";
const SESSION_COOKIE = "jay_admin_session";
const REPOSITORY = "JDRanpariya/jdranpariya.github.io";
const DEFAULT_BRANCH = "main";
const ALLOWED_LOGIN = "jdranpariya";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const GITHUB_API_VERSION = "2026-03-10";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function cookieHeader(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return cookieHeader(name, "", 0);
}

function cookies(request) {
  return Object.fromEntries(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf("=");
        return separator < 0
          ? [entry, ""]
          : [entry.slice(0, separator), entry.slice(separator + 1)];
      })
  );
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sessionKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function seal(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await sessionKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value))
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

async function unseal(value, secret) {
  try {
    const [ivValue, payloadValue] = String(value || "").split(".");
    if (!ivValue || !payloadValue) return null;
    const key = await sessionKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(ivValue) },
      key,
      fromBase64Url(payloadValue)
    );
    return JSON.parse(decoder.decode(decrypted));
  } catch (error) {
    return null;
  }
}

function configurationReady(env) {
  return Boolean(env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET && env.GITHUB_CONTENT_TOKEN);
}

function safeSourcePath(value) {
  const path = String(value || "");
  if (!/^src\/[a-zA-Z0-9][a-zA-Z0-9_./-]*\.md$/.test(path)) return null;
  if (path.includes("..") || path.includes("//")) return null;
  return path;
}

function validMutationOrigin(request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

async function githubFetch(path, token, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "jdranpariya-site-admin",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      ...(init.headers || {}),
    },
  });
  if (response.status === 204) return { response, payload: null };
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function authenticate(request, env) {
  if (!configurationReady(env))
    return { error: json({ error: "Admin login is not configured." }, 503) };
  const sealed = cookies(request)[SESSION_COOKIE];
  const stored = await unseal(sealed, env.ADMIN_SESSION_SECRET);
  if (!stored || stored.exp < Date.now() || stored.login.toLowerCase() !== ALLOWED_LOGIN) {
    return {
      error: json({ authenticated: false }, 401, { "Set-Cookie": clearCookie(SESSION_COOKIE) }),
    };
  }
  return { session: stored, setCookie: null };
}

function authenticatedJson(auth, data, status = 200) {
  return json(data, status, auth.setCookie ? { "Set-Cookie": auth.setCookie } : {});
}

function requireCsrf(request, auth) {
  return validMutationOrigin(request) && request.headers.get("x-csrf-token") === auth.session.csrf;
}

async function sameSecret(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(left || ""))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(right || ""))),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function login(request, env) {
  if (!configurationReady(env)) return json({ error: "Admin login is not configured." }, 503);
  if (!validMutationOrigin(request)) return json({ error: "Invalid request." }, 403);
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "Invalid request." }, 400);
  }
  if (!(await sameSecret(body.password, env.ADMIN_PASSWORD))) {
    return json({ error: "The passphrase is incorrect." }, 401);
  }
  const session = {
    login: "JDRanpariya",
    csrf: toBase64Url(crypto.getRandomValues(new Uint8Array(24))),
    exp: Date.now() + SESSION_SECONDS * 1000,
  };
  return json({ authenticated: true, login: session.login, csrf: session.csrf }, 200, {
    "Set-Cookie": cookieHeader(
      SESSION_COOKIE,
      await seal(session, env.ADMIN_SESSION_SECRET),
      SESSION_SECONDS
    ),
  });
}

async function listFiles(auth, env) {
  const branch = encodeURIComponent(DEFAULT_BRANCH);
  const { response, payload } = await githubFetch(
    `/repos/${REPOSITORY}/git/trees/${branch}?recursive=1`,
    env.GITHUB_CONTENT_TOKEN
  );
  if (!response.ok)
    return authenticatedJson(
      auth,
      { error: payload.message || "Could not load files." },
      response.status
    );
  const files = (payload.tree || [])
    .filter((item) => item.type === "blob" && safeSourcePath(item.path))
    .map((item) => ({ path: item.path, sha: item.sha, size: item.size || 0 }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return authenticatedJson(auth, { files, truncated: payload.truncated === true });
}

async function readFile(request, auth, env) {
  const sourcePath = safeSourcePath(new URL(request.url).searchParams.get("path"));
  if (!sourcePath) return authenticatedJson(auth, { error: "Invalid Markdown path." }, 400);
  const { response, payload } = await githubFetch(
    `/repos/${REPOSITORY}/contents/${sourcePath.split("/").map(encodeURIComponent).join("/")}?ref=${DEFAULT_BRANCH}`,
    env.GITHUB_CONTENT_TOKEN
  );
  if (!response.ok)
    return authenticatedJson(
      auth,
      { error: payload.message || "Could not load file." },
      response.status
    );
  if (payload.encoding !== "base64")
    return authenticatedJson(auth, { error: "This file is too large to edit here." }, 413);
  const bytes = Uint8Array.from(atob(payload.content.replaceAll("\n", "")), (character) =>
    character.charCodeAt(0)
  );
  return authenticatedJson(auth, {
    path: sourcePath,
    sha: payload.sha,
    content: decoder.decode(bytes),
    htmlUrl: payload.html_url,
  });
}

async function publishFile(request, auth, env) {
  if (!requireCsrf(request, auth))
    return authenticatedJson(auth, { error: "Invalid request." }, 403);
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return authenticatedJson(auth, { error: "Invalid JSON body." }, 400);
  }
  const sourcePath = safeSourcePath(body.path);
  const content = typeof body.content === "string" ? body.content : null;
  if (!sourcePath || content === null)
    return authenticatedJson(auth, { error: "A Markdown path and content are required." }, 400);
  if (encoder.encode(content).byteLength > 1_500_000)
    return authenticatedJson(auth, { error: "The file is too large." }, 413);
  const requestedMessage = String(body.message || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const message =
    requestedMessage || `${body.sha ? "update" : "add"} ${sourcePath.split("/").pop()}`;
  const encoded = toBase64(encoder.encode(content));
  const payload = { message, content: encoded, branch: DEFAULT_BRANCH };
  if (body.sha) payload.sha = String(body.sha);
  const result = await githubFetch(
    `/repos/${REPOSITORY}/contents/${sourcePath.split("/").map(encodeURIComponent).join("/")}`,
    env.GITHUB_CONTENT_TOKEN,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!result.response.ok) {
    const status =
      result.response.status === 409 || result.response.status === 422
        ? 409
        : result.response.status;
    return authenticatedJson(
      auth,
      { error: result.payload.message || "GitHub rejected the update." },
      status
    );
  }
  return authenticatedJson(auth, {
    path: sourcePath,
    sha: result.payload.content?.sha,
    commitUrl: result.payload.commit?.html_url,
    fileUrl: result.payload.content?.html_url,
  });
}

export async function handleAdminRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(API_ROOT)) return null;

  if (url.pathname === `${API_ROOT}/auth/login` && request.method === "POST") {
    return login(request, env);
  }

  const auth = await authenticate(request, env);
  if (auth.error) {
    if (
      url.pathname === `${API_ROOT}/session` &&
      request.method === "GET" &&
      auth.error.status === 401
    ) {
      return json({ authenticated: false });
    }
    return auth.error;
  }

  if (url.pathname === `${API_ROOT}/session` && request.method === "GET") {
    return authenticatedJson(auth, {
      authenticated: true,
      login: auth.session.login,
      csrf: auth.session.csrf,
      repository: REPOSITORY,
      branch: DEFAULT_BRANCH,
    });
  }
  if (url.pathname === `${API_ROOT}/files` && request.method === "GET") return listFiles(auth, env);
  if (url.pathname === `${API_ROOT}/file` && request.method === "GET")
    return readFile(request, auth, env);
  if (url.pathname === `${API_ROOT}/file` && request.method === "PUT")
    return publishFile(request, auth, env);
  if (url.pathname === `${API_ROOT}/logout` && request.method === "POST") {
    if (!requireCsrf(request, auth))
      return authenticatedJson(auth, { error: "Invalid request." }, 403);
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie(SESSION_COOKIE) });
  }
  return authenticatedJson(auth, { error: "Not found." }, 404);
}

export const adminInternals = { safeSourcePath, seal, unseal };
