# Request intelligence

The site uses two measurement paths with different jobs:

1. **Human analytics:** Umami records browser sessions, page views, events,
   referrers, and link clicks.
2. **Request intelligence:** the Cloudflare Worker runs before GitHub Pages and
   records selected facts about non-browser requests, then passes the response
   through unchanged.

Both paths use the Umami application's database. The Worker writes through the
authenticated `POST /api/telemetry` endpoint; it does not connect to Supabase
directly and it never receives a database key.

## What is recorded

For a request classified as a crawler or non-browser client, the Worker sends:

- timestamp, host, method, path, and safe campaign parameters
- response status, content type, response bytes when `Content-Length` is known
- User-Agent and a cautious requester label
- referrer origin/path when provided, with sensitive query keys removed
- traffic classification and Cloudflare bot metadata when available
- country, display location (city, region, country), ASN, organization,
  Cloudflare Ray ID, and edge duration
- an optional salted one-way visitor hash for repeat activity

The Worker does **not** store raw request bodies, cookies, raw IP addresses, or
arbitrary browser events. A User-Agent is a claim, not proof of identity. A
Cloudflare verified-bot signal is stronger when the account has that product,
but it can be absent on the free plan.

## Deployment

The Worker configuration lives in `workers/request-intelligence/`:

```sh
cd workers/request-intelligence
bunx wrangler deploy
```

The route covers `jdranpariya.com/*` and `www.jdranpariya.com/*`. Keep only the
web records proxied through Cloudflare. Mail, TXT, and verification records
remain DNS-only.

The Worker needs these Wrangler secrets. Their values must never be committed:

```sh
bunx wrangler secret put TELEMETRY_INGEST_TOKEN
bunx wrangler secret put IP_HASH_SECRET
```

`TELEMETRY_INGEST_URL` is a checked-in variable and is intentionally restricted
by the Worker to the HTTPS Umami endpoint at
`https://jay-cloud.vercel.app/api/telemetry`.

`TELEMETRY_WEBSITE_ID` binds each row to the matching Umami website. Keep it
configured when adding another website so request data cannot be mixed between
sites.

The ingestion request has a five-second timeout. If Umami is unavailable, the
Worker logs the failure and still serves the original site response.

## Retention and access

Crawler records are private Umami data. The dashboard endpoint requires an
Umami owner/admin session; share links must not expose crawler telemetry.
Database access is server-side only, with RLS enabled and no public policies.
Keep the production database migrations in the Umami repository so a new
environment can be recreated from source.

`/telemetry` is not a public dashboard route. It falls through to the normal
site 404 page. The `/__events` path is retained only as a harmless 204 response
for old site builds and does not collect data.
