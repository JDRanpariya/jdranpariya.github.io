/*
 * Crawler and request telemetry for jdranpariya.com.
 *
 * This Worker is deliberately separate from the Eleventy site. It runs before
 * GitHub Pages, records a small allow-list of request facts, and then passes
 * the request through unchanged. Human browser analytics stay in Umami. It
 * does not collect cookies, raw request bodies, or the visitor's raw IP address.
 */

const AGENT_PATTERNS = [
  ["OpenAI GPTBot", /\bGPTBot\b/i],
  ["OpenAI ChatGPT-User", /\bChatGPT-User\b/i],
  ["OpenAI OAI-SearchBot", /\bOAI-SearchBot\b/i],
  ["Anthropic ClaudeBot", /\bClaudeBot\b|\banthropic-ai\b/i],
  ["Anthropic Claude-User", /\bClaude-User\b/i],
  ["Perplexity", /\bPerplexityBot\b/i],
  ["Googlebot", /\bGooglebot\b|\bGoogle-InspectionTool\b/i],
  ["Google-Extended", /\bGoogle-Extended\b/i],
  ["Bingbot", /\bbingbot\b|\bBingPreview\b/i],
  ["Applebot", /\bApplebot\b/i],
  ["Meta crawler", /\bfacebookexternalhit\b|\bMeta-ExternalAgent\b/i],
  ["Amazonbot", /\bAmazonbot\b/i],
  ["Bytespider", /\bBytespider\b/i],
  ["CCBot", /\bCCBot\b/i],
  ["Common Crawl", /\b(crawl|commoncrawl)\b/i],
  ["YouBot", /\bYouBot\b/i],
  ["DuckDuckBot", /\bDuckDuckBot\b/i],
  ["Baiduspider", /\bBaiduspider\b/i],
  ["YandexBot", /\bYandexBot\b/i],
  ["PetalBot", /\bPetalBot\b/i],
  ["AhrefsBot", /\bAhrefsBot\b/i],
  ["SemrushBot", /\bSemrushBot\b/i],
  ["curl", /\bcurl\//i],
  ["wget", /\bwget\//i],
  ["Python HTTP client", /\bpython-(?:requests|httpx)\b/i],
  ["Go HTTP client", /\bGo-http-client\b/i],
];

const TELEMETRY_PATH = "/__events";
const TRACKED_HOSTS = new Set(["jdranpariya.com", "www.jdranpariya.com"]);
const TELEMETRY_INGEST_HOST = "jay-cloud.vercel.app";
const TELEMETRY_INGEST_PATH = "/api/telemetry";
const INGEST_TIMEOUT_MS = 5_000;
const MAX_REPORTED_BYTES = Number.MAX_SAFE_INTEGER;

function classify(userAgent, cf) {
  const match = AGENT_PATTERNS.find(([, pattern]) => pattern.test(userAgent));
  const botManagement = cf?.botManagement || null;
  const verifiedBot = botManagement?.verifiedBot === true;
  const browserLike = /\bMozilla\/5\.0\b/i.test(userAgent);

  if (verifiedBot) {
    return {
      trafficType: "verified_crawler",
      claimedAgent: match?.[0] || requesterLabel(userAgent) || "Cloudflare verified bot",
      classificationSource: "cloudflare_verified_bot",
    };
  }

  if (match) {
    return {
      trafficType: "claimed_crawler",
      claimedAgent: match[0],
      classificationSource: "user_agent",
    };
  }

  if (browserLike) {
    return {
      trafficType: "browser_or_browser_like",
      claimedAgent: requesterLabel(userAgent),
      classificationSource: "user_agent_shape",
    };
  }

  return {
    trafficType: "unknown_automation_or_client",
    claimedAgent: requesterLabel(userAgent),
    classificationSource: "insufficient_signal",
  };
}

function requesterLabel(userAgent) {
  const product = userAgent.match(
    /\b(?:Chrome|CriOS|Firefox|FxiOS|Edg|OPR|SamsungBrowser|Safari|curl|wget|python-[\w-]+|Go-http-client)\/?[^\s)]*/i
  );
  if (product) return bounded(product[0], 100);
  const firstToken = userAgent.trim().split(/\s+/)[0];
  return bounded(firstToken, 100);
}

function bounded(value, length = 500) {
  if (!value) return null;
  return String(value).slice(0, length);
}

function isTrackedHost(hostname) {
  return TRACKED_HOSTS.has(String(hostname || "").toLowerCase());
}

function reportedContentLength(value) {
  if (!value) return { value: null, known: false };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_REPORTED_BYTES) {
    return { value: null, known: false };
  }
  return { value: parsed, known: true };
}

function telemetryIngestUrl(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:") return null;
    if (url.hostname !== TELEMETRY_INGEST_HOST) return null;
    if (url.pathname !== TELEMETRY_INGEST_PATH || url.search || url.hash) return null;
    return url;
  } catch (error) {
    return null;
  }
}

function safeQueryString(url) {
  const sensitive = /(?:token|secret|password|passwd|api[_-]?key|auth|code|email)/i;
  const useful = /^(?:utm_[a-z0-9_]+|ref|source|campaign|medium|term|content|analytics)$/i;
  const params = [];
  for (const [key, value] of url.searchParams) {
    if (!useful.test(key)) continue;
    params.push([key, sensitive.test(key) ? "[redacted]" : value]);
  }
  const query = new URLSearchParams(params).toString();
  return bounded(query ? `?${query}` : null, 500);
}

function safeDestination(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return bounded(`${url.origin}${url.pathname}${safeQueryString(url) || ""}`, 500);
  } catch (error) {
    return null;
  }
}

function safeReferrer(value) {
  return safeDestination(value);
}

function safeLocation(cf) {
  const parts = [cf?.city, cf?.region, cf?.country]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());
  return bounded(parts.length ? parts.join(", ") : null, 200);
}

function isAllowedTelemetryOrigin(request, url) {
  const origin = request.headers.get("origin");
  return !origin || origin === url.origin;
}

function isDocumentRequest(request, url, userAgent) {
  const destination = request.headers.get("sec-fetch-dest");
  const accept = request.headers.get("accept") || "";
  const knownResource = /^(?:\/robots\.txt|\/llms\.txt|\/sitemap(?:\.xml)?|\/feed\.xml)$/i.test(
    url.pathname
  );
  const crawler = AGENT_PATTERNS.some(([, pattern]) => pattern.test(userAgent));

  return destination === "document" || /text\/html/i.test(accept) || knownResource || crawler;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function writeEvent(event, env) {
  const ingestUrl = telemetryIngestUrl(env.TELEMETRY_INGEST_URL);
  if (!ingestUrl || !env.TELEMETRY_INGEST_TOKEN) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);
  try {
    const response = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TELEMETRY_INGEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Umami telemetry ingest returned ${response.status}`);
  } catch (error) {
    // Observability must never make the site unavailable.
    console.error("request intelligence write failed", error);
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request, env, ctx) {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const cf = request.cf || {};
    const classification = classify(userAgent, cf);

    // Human analytics remain in Umami. Keep this endpoint as a harmless
    // compatibility response for older local builds that still call it.
    if (url.pathname === TELEMETRY_PATH) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      if (request.method !== "POST" || !isAllowedTelemetryOrigin(request, url)) {
        return new Response("Not allowed", { status: 405 });
      }
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Keep crawler telemetry separate from Umami's browser analytics. A
    // browser-shaped request without a known crawler signature is not stored.
    const explicitOptOut = url.searchParams.get("analytics") === "off";
    const shouldLog =
      isTrackedHost(url.hostname) &&
      isDocumentRequest(request, url, userAgent) &&
      classification.trafficType !== "browser_or_browser_like" &&
      !(explicitOptOut && classification.trafficType === "browser_or_browser_like");

    let response;
    try {
      response = await fetch(request);
    } catch (error) {
      if (shouldLog) {
        ctx.waitUntil(
          writeEvent(
            {
              occurred_at: new Date().toISOString(),
              event_type: "edge_request",
              source: "edge",
              website_id: env.TELEMETRY_WEBSITE_ID || null,
              host: url.hostname,
              method: request.method,
              path: url.pathname,
              query_string: safeQueryString(url),
              status: 523,
              user_agent: bounded(userAgent),
              referrer: safeReferrer(request.headers.get("referer")),
              traffic_type: classification.trafficType,
              claimed_agent: classification.claimedAgent,
              classification_source: classification.classificationSource,
              country: bounded(cf.country, 2),
              location: safeLocation(cf),
              asn: cf.asn || null,
              as_organization: bounded(cf.asOrganization, 200),
              ray_id: bounded(request.headers.get("cf-ray"), 100),
              duration_ms: Date.now() - startedAt,
              event_data: {},
              fetch_error: true,
            },
            env
          )
        );
      }
      throw error;
    }

    if (shouldLog) {
      const ip = request.headers.get("cf-connecting-ip");
      const visitorHash =
        ip && env.IP_HASH_SECRET ? await sha256(`${env.IP_HASH_SECRET}:${ip}`) : null;
      const botManagement = cf.botManagement || null;
      const contentLength = reportedContentLength(response.headers.get("content-length"));

      ctx.waitUntil(
        writeEvent(
          {
            occurred_at: new Date().toISOString(),
            event_type: "edge_request",
            source: "edge",
            website_id: env.TELEMETRY_WEBSITE_ID || null,
            host: url.hostname,
            method: request.method,
            path: url.pathname,
            query_string: safeQueryString(url),
            status: response.status,
            user_agent: bounded(userAgent),
            referrer: safeReferrer(request.headers.get("referer")),
            accept: bounded(request.headers.get("accept"), 200),
            accept_language: bounded(request.headers.get("accept-language"), 200),
            sec_fetch_site: bounded(request.headers.get("sec-fetch-site"), 50),
            sec_fetch_mode: bounded(request.headers.get("sec-fetch-mode"), 50),
            sec_fetch_dest: bounded(request.headers.get("sec-fetch-dest"), 50),
            traffic_type: classification.trafficType,
            claimed_agent: classification.claimedAgent,
            classification_source: classification.classificationSource,
            cf_verified_bot: botManagement?.verifiedBot ?? null,
            cf_bot_score: botManagement?.score ?? null,
            cf_verified_bot_category: bounded(cf.verifiedBotCategory, 100),
            country: bounded(cf.country, 2),
            location: safeLocation(cf),
            asn: cf.asn || null,
            as_organization: bounded(cf.asOrganization, 200),
            visitor_hash: visitorHash,
            ray_id: bounded(request.headers.get("cf-ray"), 100),
            content_type: bounded(response.headers.get("content-type"), 200),
            content_length: contentLength.value,
            content_length_known: contentLength.known,
            duration_ms: Date.now() - startedAt,
            event_data: {},
          },
          env
        )
      );
    }

    return response;
  },
};
