import { boundedJson } from "./admin-source.js";

const PAGE_SIZE = 24;
const encoder = new TextEncoder();
const publicFields = "id, name, message, url, theme, stamp, created_at";
const reply = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });

function bad(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function ip(request) {
  const value = request.headers.get("CF-Connecting-IP");
  if (!value || value.length > 64)
    throw bad("Unable to verify this connection. Try again later.", 503);
  return value;
}

async function dayHash(request, env, day) {
  if (!env.IP_HASH_SECRET) throw bad("Guestbook signing is temporarily unavailable.", 503);
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`guestbook:${env.IP_HASH_SECRET}:${day}:${ip(request)}`)
  );
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signingKey(env) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.IP_HASH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function challenge(request, env) {
  const now = Date.now();
  const payload = `${now}.${crypto.randomUUID()}`;
  const hash = await dayHash(request, env, new Date(now).toISOString().slice(0, 10));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(env),
    encoder.encode(`${payload}|${new URL(request.url).origin}|${hash}`)
  );
  return `${payload}.${[...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function verifyChallenge(token, request, env, hash) {
  if (typeof token !== "string" || token.length > 160)
    throw bad("Refresh the guestbook and try again.");
  const [issued, nonce, signature, extra] = token.split(".");
  const elapsed = Date.now() - Number(issued);
  if (
    extra ||
    !/^\d{13}$/.test(issued) ||
    !/^[a-f0-9-]{36}$/.test(nonce || "") ||
    !/^[a-f0-9]{64}$/.test(signature || "") ||
    elapsed < 2_000 ||
    elapsed > 30 * 60_000
  )
    throw bad("Please wait a moment, or refresh the page if it has been open a while.");
  const bytes = Uint8Array.from(signature.match(/../g), (value) => parseInt(value, 16));
  const verified = await crypto.subtle.verify(
    "HMAC",
    await signingKey(env),
    bytes,
    encoder.encode(`${issued}.${nonce}|${new URL(request.url).origin}|${hash}`)
  );
  if (!verified) throw bad("Refresh the guestbook and try again.");
  return nonce;
}

export function validateGuestbook(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw bad("Invalid note.");
  if (typeof input.company !== "string" || input.company) throw bad("Invalid note.");
  const field = (name, max, required = false) => {
    if (typeof input[name] !== "string") throw bad(`Invalid ${name}.`);
    const text = input[name].trim();
    if (
      text.length > max ||
      (required && !text) ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
    )
      throw bad(`Check your ${name}.`);
    return text;
  };
  const name = field("name", 40, true),
    message = field("message", 175, true),
    email = field("email", 80),
    rawUrl = field("url", 500);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad("Check your email address.");
  let url = "";
  if (rawUrl) {
    try {
      const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        !parsed.hostname.includes(".")
      )
        throw new Error();
      url = parsed.href;
    } catch {
      throw bad("Use an http or https website address.");
    }
  }
  const theme = field("theme", 50, true),
    stamp = field("stamp", 50);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(theme) || (stamp && !/^[a-z0-9][a-z0-9-]*$/.test(stamp)))
    throw bad("Invalid card style.");
  // Links belong in the optional URL field. Link/HTML promotion in the note
  // is held for review rather than published automatically.
  const status = /<[^>]*>|href\s*=|https?:\/\/|www\./i.test(`${name} ${message}`)
    ? "held"
    : "visible";
  return { name, message, email, url, theme, stamp, status };
}

function publicEntry(row) {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    url: row.url,
    theme: row.theme,
    stamp: row.stamp,
    date: row.created_at,
  };
}

export async function handleGuestbookRequest(request, env) {
  const url = new URL(request.url);
  if (!["/api/guestbook", "/api/guestbook/challenge"].includes(url.pathname)) return null;
  if (!env.GUESTBOOK_DB) return reply({ error: "Guestbook is temporarily unavailable." }, 503);
  try {
    if (url.pathname.endsWith("/challenge")) {
      if (request.method !== "GET")
        return reply({ error: "Method not allowed." }, 405, { Allow: "GET" });
      return reply({ challenge: await challenge(request, env) });
    }
    if (request.method === "GET") {
      const cursor = url.searchParams.get("before");
      if (cursor && !/^[1-9]\d{0,14}$/.test(cursor)) throw bad("Invalid page.");
      const rows = await env.GUESTBOOK_DB.prepare(
        `SELECT ${publicFields} FROM guestbook_entries WHERE status = 'visible' AND id < ? ORDER BY id DESC LIMIT ?`
      )
        .bind(cursor ? Number(cursor) : Number.MAX_SAFE_INTEGER, PAGE_SIZE + 1)
        .all();
      const page = rows.results.slice(0, PAGE_SIZE);
      return reply({
        entries: page.map(publicEntry),
        next: rows.results.length > PAGE_SIZE ? page.at(-1).id : null,
      });
    }
    if (request.method !== "POST")
      return reply({ error: "Method not allowed." }, 405, { Allow: "GET, POST" });
    if (
      request.headers.get("origin") !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw bad("Invalid request origin.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw bad("Send a JSON note.", 415);
    const input = await boundedJson(request, 4_096);
    const note = validateGuestbook(input);
    const date = new Date().toISOString();
    const hash = await dayHash(request, env, date.slice(0, 10));
    const nonce = await verifyChallenge(input.challenge, request, env, hash);
    const previous = await env.GUESTBOOK_DB.prepare(
      `SELECT ${publicFields}, status FROM guestbook_entries WHERE challenge_id = ? AND ip_day_hash = ?`
    )
      .bind(nonce, hash)
      .first();
    if (previous)
      return reply({
        status: previous.status,
        entry: previous.status === "visible" ? publicEntry(previous) : null,
      });
    // The database constraint enforces the limit atomically, even when two
    // requests arrive at once. The IP itself is never persisted.
    const result = await env.GUESTBOOK_DB.prepare(
      `INSERT INTO guestbook_entries (name,message,url,email,theme,stamp,status,created_at,ip_day_hash,challenge_id) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`
    )
      .bind(
        note.name,
        note.message,
        note.url,
        note.email,
        note.theme,
        note.stamp,
        note.status,
        date,
        hash,
        nonce
      )
      .run();
    if (!result.meta.changes) {
      const retried = await env.GUESTBOOK_DB.prepare(
        `SELECT ${publicFields}, status FROM guestbook_entries WHERE challenge_id = ? AND ip_day_hash = ?`
      )
        .bind(nonce, hash)
        .first();
      if (retried)
        return reply({
          status: retried.status,
          entry: retried.status === "visible" ? publicEntry(retried) : null,
        });
      return reply(
        { error: "Only one note per connection per day. Please come back tomorrow." },
        429,
        {
          "Retry-After": String(
            Math.ceil(
              (Date.parse(`${date.slice(0, 10)}T00:00:00Z`) + 86_400_000 - Date.now()) / 1000
            )
          ),
        }
      );
    }
    return reply(
      {
        status: note.status,
        entry:
          note.status === "visible"
            ? publicEntry({ ...note, id: result.meta.last_row_id, created_at: date })
            : null,
      },
      201
    );
  } catch (error) {
    if (error.status) return reply({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return reply({ error: "Invalid note." }, 400);
    console.error("Guestbook request failed");
    return reply({ error: "Your note could not be saved. Please try again later." }, 503);
  }
}

// Called only after the existing admin authentication and CSRF guards.
export async function manageGuestbook(request, env) {
  if (!env.GUESTBOOK_DB) return reply({ error: "Guestbook is unavailable." }, 503);
  try {
    if (request.method === "GET") {
      const before = new URL(request.url).searchParams.get("before");
      if (before && !/^[1-9]\d{0,14}$/.test(before)) throw bad("Invalid page.");
      const rows = await env.GUESTBOOK_DB.prepare(
        `SELECT ${publicFields}, email, status FROM guestbook_entries WHERE id < ? ORDER BY id DESC LIMIT ?`
      )
        .bind(before ? Number(before) : Number.MAX_SAFE_INTEGER, PAGE_SIZE + 1)
        .all();
      const page = rows.results.slice(0, PAGE_SIZE);
      return reply({
        entries: page.map((row) => ({ ...publicEntry(row), email: row.email, status: row.status })),
        next: rows.results.length > PAGE_SIZE ? page.at(-1).id : null,
      });
    }
    if (request.method !== "PATCH")
      return reply({ error: "Method not allowed." }, 405, { Allow: "GET, PATCH" });
    const input = await boundedJson(request, 1_024);
    if (
      !Number.isSafeInteger(input.id) ||
      input.id < 1 ||
      !["visible", "held", "hidden"].includes(input.status)
    )
      throw bad("Invalid note update.");
    const result = await env.GUESTBOOK_DB.prepare(
      "UPDATE guestbook_entries SET status = ? WHERE id = ?"
    )
      .bind(input.status, input.id)
      .run();
    return result.meta.changes ? reply({ ok: true }) : reply({ error: "Note not found." }, 404);
  } catch (error) {
    return reply(
      { error: error.status ? error.message : "Unable to update the guestbook." },
      error.status || (error instanceof SyntaxError ? 400 : 503)
    );
  }
}
