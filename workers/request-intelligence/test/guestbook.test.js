import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleGuestbookRequest, validateGuestbook, manageGuestbook } from "../src/guestbook.js";
import { handleAdminRequest, adminInternals } from "../src/admin.js";
import { sqliteD1 } from "./d1-fixture.js";

const note = {
  name: "Jay",
  message: "Grateful for good friends.",
  url: "",
  email: "private@example.com",
  theme: "beige",
  stamp: "",
  company: "",
};
function fixture() {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../migrations/0001_guestbook.sql", import.meta.url), "utf8"));
  return { database, env: { GUESTBOOK_DB: sqliteD1(database), IP_HASH_SECRET: "test-only-salt" } };
}
function request(path = "/api/guestbook", body, extra = {}) {
  return new Request(`https://jdranpariya.com${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "CF-Connecting-IP": "192.0.2.1",
      origin: "https://jdranpariya.com",
      "Content-Type": "application/json",
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function token(env, headers = {}) {
  const originalNow = Date.now;
  Date.now = () => originalNow() - 3000;
  try {
    return (
      await (
        await handleGuestbookRequest(request("/api/guestbook/challenge", null, headers), env)
      ).json()
    ).challenge;
  } finally {
    Date.now = originalNow;
  }
}

test("validates lengths, honeypots, URLs and suspicious promotional text", () => {
  assert.equal(validateGuestbook(note).status, "visible");
  assert.equal(validateGuestbook({ ...note, url: "example.com" }).url, "https://example.com/");
  for (const invalid of [
    { ...note, company: "bot" },
    { ...note, message: "" },
    { ...note, name: "a".repeat(41) },
    { ...note, message: "a".repeat(176) },
    { ...note, url: "javascript:alert(1)" },
    { ...note, url: "https://u:p@example.com" },
    { ...note, email: "wrong" },
    { ...note, theme: "../secret" },
  ])
    assert.throws(() => validateGuestbook(invalid));
  assert.equal(
    validateGuestbook({ ...note, message: '<a href="https://spam.example">buy</a>' }).status,
    "held"
  );
});

test("publishes immediately while public responses exclude email, IP hashes and challenge IDs", async () => {
  const { env, database } = fixture();
  const challenge = await token(env);
  const result = await handleGuestbookRequest(request(undefined, { ...note, challenge }), env);
  assert.equal(result.status, 201);
  const saved = await result.json();
  assert.equal(saved.status, "visible");
  assert.equal(saved.entry.message, note.message);
  const publicPage = await (await handleGuestbookRequest(request(), env)).json();
  assert.equal(publicPage.entries.length, 1);
  for (const body of [saved, publicPage]) {
    const json = JSON.stringify(body);
    for (const field of ["private@example.com", "192.0.2.1", "ip_day_hash", "challenge_id"])
      assert.ok(!json.includes(field));
  }
  assert.equal(database.prepare("SELECT email FROM guestbook_entries").get().email, note.email);
  database.close();
});

test("daily limits and idempotent retries are enforced by SQLite", async () => {
  const { env, database } = fixture();
  const challenge = await token(env);
  const results = await Promise.all([
    handleGuestbookRequest(request(undefined, { ...note, challenge }), env),
    handleGuestbookRequest(request(undefined, { ...note, challenge }), env),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
  const limit = await handleGuestbookRequest(
    request(undefined, { ...note, challenge: await token(env) }),
    env
  );
  assert.equal(limit.status, 429);
  assert.ok(Number(limit.headers.get("retry-after")) > 0);
  assert.equal(database.prepare("SELECT count(*) AS count FROM guestbook_entries").get().count, 1);
  database.close();
});

test("rejects forged, replayed-from-another-IP, premature, cross-origin and oversized submissions", async () => {
  const { env, database } = fixture();
  const challenge = await token(env);
  assert.equal(
    (await handleGuestbookRequest(request(undefined, { ...note, challenge: challenge + "a" }), env))
      .status,
    400
  );
  assert.equal(
    (
      await handleGuestbookRequest(
        request(undefined, { ...note, challenge }, { "CF-Connecting-IP": "192.0.2.2" }),
        env
      )
    ).status,
    400
  );
  const premature = (
    await (await handleGuestbookRequest(request("/api/guestbook/challenge"), env)).json()
  ).challenge;
  assert.equal(
    (await handleGuestbookRequest(request(undefined, { ...note, challenge: premature }), env))
      .status,
    400
  );
  assert.equal(
    (
      await handleGuestbookRequest(
        request(undefined, { ...note, challenge }, { origin: "https://attacker.example" }),
        env
      )
    ).status,
    403
  );
  assert.equal(
    (
      await handleGuestbookRequest(
        request(undefined, { ...note, challenge, message: "a".repeat(5000) }),
        env
      )
    ).status,
    413
  );
  assert.equal(
    (
      await handleGuestbookRequest(request(undefined, { ...note, challenge }), {
        ...env,
        IP_HASH_SECRET: undefined,
      })
    ).status,
    503
  );
  assert.equal(
    (
      await handleGuestbookRequest(
        request(undefined, { ...note, challenge }, { "CF-Connecting-IP": "" }),
        env
      )
    ).status,
    503
  );
  assert.equal(database.prepare("SELECT count(*) AS count FROM guestbook_entries").get().count, 0);
  database.close();
});

test("held notes remain private and can be approved, hidden and restored", async () => {
  const { env, database } = fixture();
  const saved = await (
    await handleGuestbookRequest(
      request(undefined, {
        ...note,
        message: "Visit https://example.com",
        challenge: await token(env),
      }),
      env
    )
  ).json();
  assert.equal(saved.status, "held");
  assert.equal(saved.entry, null);
  assert.equal((await (await handleGuestbookRequest(request(), env)).json()).entries.length, 0);
  const list = await (
    await manageGuestbook(new Request("https://jdranpariya.com/api/admin/guestbook"), env)
  ).json();
  assert.equal(list.entries[0].email, note.email);
  for (const status of ["visible", "hidden", "visible"]) {
    const response = await manageGuestbook(
      new Request("https://jdranpariya.com/api/admin/guestbook", {
        method: "PATCH",
        body: JSON.stringify({ id: list.entries[0].id, status }),
      }),
      env
    );
    assert.equal(response.status, 200);
    assert.equal(
      (await (await handleGuestbookRequest(request(), env)).json()).entries.length,
      status === "visible" ? 1 : 0
    );
  }
  database.close();
});

test("moderation requires the real admin session and CSRF token", async () => {
  const { env, database } = fixture();
  Object.assign(env, {
    ADMIN_PASSWORD: "test",
    ADMIN_SESSION_SECRET: "test-admin-session-secret",
    GITHUB_CONTENT_TOKEN: "test",
  });
  assert.equal(
    (await handleAdminRequest(new Request("https://jdranpariya.com/api/admin/guestbook"), env))
      .status,
    401
  );
  const cookie = await adminInternals.seal(
    { login: "JDRanpariya", exp: Date.now() + 60_000, csrf: "test-csrf" },
    env.ADMIN_SESSION_SECRET
  );
  const headers = { cookie: `jay_admin_session=${cookie}`, origin: "https://jdranpariya.com" };
  assert.equal(
    (
      await handleAdminRequest(
        new Request("https://jdranpariya.com/api/admin/guestbook", { headers }),
        env
      )
    ).status,
    200
  );
  assert.equal(
    (
      await handleAdminRequest(
        new Request("https://jdranpariya.com/api/admin/guestbook", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id: 1, status: "visible" }),
        }),
        env
      )
    ).status,
    403
  );
  database.close();
});

test("pagination uses fixed-size pages with no repeat records", async () => {
  const { env, database } = fixture();
  const insert = database.prepare(
    "INSERT INTO guestbook_entries(name,message,status,created_at,ip_day_hash,challenge_id) VALUES (?,?,?,?,?,?)"
  );
  for (let i = 1; i <= 25; i++)
    insert.run("Visitor", "Thanks", "visible", "2026-10-09", `hash-${i}`, `nonce-${i}`);
  const first = await (await handleGuestbookRequest(request(), env)).json();
  assert.equal(first.entries.length, 24);
  const last = await (
    await handleGuestbookRequest(request(`/api/guestbook?before=${first.next}`), env)
  ).json();
  assert.equal(last.entries.length, 1);
  assert.equal(last.next, null);
  assert.equal(new Set([...first.entries, ...last.entries].map((e) => e.id)).size, 25);
  database.close();
});
