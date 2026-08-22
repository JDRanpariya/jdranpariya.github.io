import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

const env = {
  IP_HASH_SECRET: "test-only-salt",
  TELEMETRY_INGEST_TOKEN: "test-only-token",
  TELEMETRY_INGEST_URL: "https://jay-cloud.vercel.app/api/telemetry",
  TELEMETRY_WEBSITE_ID: "a210a5bb-3c45-4542-be4e-d3b7efa3de33",
};

function requestWithCf(url, init, cf) {
  const request = new Request(url, init);
  Object.defineProperty(request, "cf", { value: cf });
  return request;
}

async function runWorker(request, fetchOrigin) {
  const calls = [];
  const waiters = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push({ url, init });
    if (url === env.TELEMETRY_INGEST_URL) return new Response(null, { status: 204 });
    return fetchOrigin(input, init);
  };

  try {
    const response = await worker.fetch(request, env, {
      waitUntil(promise) {
        waiters.push(promise);
      },
    });
    await Promise.all(waiters);
    return { calls, response };
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test("records a crawler request with safe location and website scope", async () => {
  const { calls, response } = await runWorker(
    requestWithCf(
      "https://jdranpariya.com/writings/example?utm_source=test&email=private@example.com",
      {
        headers: {
          accept: "text/html",
          referer: "https://news.example/story?utm_campaign=launch",
          "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.0)",
          "cf-connecting-ip": "203.0.113.10",
          "cf-ray": "test-ray",
        },
      },
      { city: "Erlangen", region: "Bavaria", country: "DE" }
    ),
    async () => new Response("hello", { status: 200, headers: { "content-length": "5" } })
  );

  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[1].init.body);
  assert.equal(payload.website_id, env.TELEMETRY_WEBSITE_ID);
  assert.equal(payload.location, "Erlangen, Bavaria, DE");
  assert.equal(payload.content_length, 5);
  assert.equal(payload.content_length_known, true);
  assert.equal(payload.query_string, "?utm_source=test");
  assert.match(payload.visitor_hash, /^[a-f0-9]{64}$/);
});

test("does not send telemetry for an untracked host", async () => {
  const { calls, response } = await runWorker(
    requestWithCf(
      "https://untracked.example/page",
      { headers: { accept: "text/html", "user-agent": "GPTBot/1.0" } },
      {}
    ),
    async () => new Response("ok", { status: 200 })
  );

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
});
