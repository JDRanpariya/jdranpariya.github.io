import assert from "node:assert/strict";
import test from "node:test";
import { adminInternals, handleAdminRequest } from "../src/admin.js";

const env = {
  ADMIN_SESSION_SECRET: "a-test-secret-that-is-long-enough-for-a-session",
  ADMIN_PASSWORD: "test-passphrase",
  GITHUB_CONTENT_TOKEN: "test-token",
};

async function authenticatedRequest(path, init = {}) {
  const session = {
    login: "JDRanpariya",
    avatar: "",
    csrf: "test-csrf",
    exp: Date.now() + 60_000,
  };
  const cookie = await adminInternals.seal(session, env.ADMIN_SESSION_SECRET);
  return new Request(`https://jdranpariya.com${path}`, {
    ...init,
    headers: {
      cookie: `jay_admin_session=${cookie}`,
      origin: "https://jdranpariya.com",
      ...(init.headers || {}),
    },
  });
}

test("accepts only Markdown paths in the personal and research content roots", () => {
  assert.equal(adminInternals.safeSourcePath("src/writings/example.md"), "src/writings/example.md");
  assert.equal(
    adminInternals.safeSourcePath("apps/research/content/research-home.md"),
    "apps/research/content/research-home.md"
  );
  assert.equal(adminInternals.safeSourcePath("src/../secret.md"), null);
  assert.equal(adminInternals.safeSourcePath("apps/research/app/page.tsx"), null);
  assert.equal(adminInternals.safeSourcePath("apps/other/content/example.md"), null);
  assert.equal(adminInternals.safeSourcePath("README.md"), null);
  assert.equal(adminInternals.safeSourcePath("src/admin.njk"), null);
});

test("seals and opens an authenticated session", async () => {
  const session = { login: "JDRanpariya", exp: Date.now() + 60_000 };
  const sealed = await adminInternals.seal(session, env.ADMIN_SESSION_SECRET);
  assert.notEqual(sealed, JSON.stringify(session));
  assert.deepEqual(await adminInternals.unseal(sealed, env.ADMIN_SESSION_SECRET), session);
  assert.equal(await adminInternals.unseal(`${sealed}broken`, env.ADMIN_SESSION_SECRET), null);
});

test("creates a session only for the configured passphrase", async () => {
  const accepted = await handleAdminRequest(
    new Request("https://jdranpariya.com/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://jdranpariya.com" },
      body: JSON.stringify({ password: "test-passphrase" }),
    }),
    env
  );
  assert.equal(accepted.status, 200);
  assert.match(accepted.headers.get("set-cookie"), /jay_admin_session=/);

  const rejected = await handleAdminRequest(
    new Request("https://jdranpariya.com/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://jdranpariya.com" },
      body: JSON.stringify({ password: "wrong" }),
    }),
    env
  );
  assert.equal(rejected.status, 401);
});

test("reports a signed-out session without a failing network response", async () => {
  const response = await handleAdminRequest(
    new Request("https://jdranpariya.com/api/admin/session"),
    env
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: false });
});

test("lists only editable Markdown files", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        tree: [
          { path: "src/writings/one.md", type: "blob", sha: "one", size: 20 },
          {
            path: "apps/research/content/research-home.md",
            type: "blob",
            sha: "research",
            size: 40,
          },
          { path: "src/index.njk", type: "blob", sha: "two", size: 20 },
          { path: "README.md", type: "blob", sha: "three", size: 20 },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  try {
    const response = await handleAdminRequest(await authenticatedRequest("/api/admin/files"), env);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(
      payload.files.map((file) => file.path),
      ["apps/research/content/research-home.md", "src/writings/one.md"]
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("publishes UTF-8 Markdown with conflict protection", async () => {
  let githubBody;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    githubBody = JSON.parse(init.body);
    return new Response(
      JSON.stringify({
        content: { sha: "new-sha", html_url: "https://github.com/file" },
        commit: { html_url: "https://github.com/commit" },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };
  try {
    const request = await authenticatedRequest("/api/admin/file", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-csrf-token": "test-csrf" },
      body: JSON.stringify({
        path: "src/writings/one.md",
        content: "# café\n",
        sha: "old-sha",
        message: "update one",
      }),
    });
    const response = await handleAdminRequest(request, env);
    assert.equal(response.status, 200);
    assert.equal(Buffer.from(githubBody.content, "base64").toString("utf8"), "# café\n");
    assert.equal(githubBody.sha, "old-sha");
    assert.equal(githubBody.branch, "main");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("rejects a publish without the session CSRF token", async () => {
  const request = await authenticatedRequest("/api/admin/file", {
    method: "PUT",
    headers: { "content-type": "application/json", "x-csrf-token": "wrong" },
    body: JSON.stringify({ path: "src/writings/one.md", content: "test" }),
  });
  const response = await handleAdminRequest(request, env);
  assert.equal(response.status, 403);
});
