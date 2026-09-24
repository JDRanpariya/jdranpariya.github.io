import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSessionToken, getAdminUser, safeReturnPath, verifySessionToken } from "./auth";

const env = { RESEARCH_SESSION_SECRET: "local-test-secret" };

describe("research admin sessions", () => {
  it("accepts the existing v1 HMAC cookie shape", async () => {
    const token = await createSessionToken(env);
    assert.match(token, /^v1\.\d+\.[A-Za-z0-9_-]+$/u);
    assert.equal(await verifySessionToken(token, env), true);
    assert.equal(
      (
        await getAdminUser(
          new Request("https://research.jdranpariya.com/library", {
            headers: { cookie: `research_admin=${token}` },
          }),
          env
        )
      )?.userId,
      "personal-admin"
    );
  });

  it("rejects tampered, expired, and foreign-secret cookies", async () => {
    const token = await createSessionToken(env);
    assert.equal(await verifySessionToken(`${token}x`, env), false);
    assert.equal(
      await verifySessionToken(token, { RESEARCH_SESSION_SECRET: "another-key" }),
      false
    );
    assert.equal(await verifySessionToken("v1.1.fake", env), false);
  });

  it("never redirects a login or logout to a foreign origin", () => {
    assert.equal(safeReturnPath("//example.com"), "/library/great-minds");
    assert.equal(safeReturnPath("https://example.com"), "/library/great-minds");
    assert.equal(safeReturnPath("/library/neuroai?q=one"), "/library/neuroai?q=one");
  });
});
