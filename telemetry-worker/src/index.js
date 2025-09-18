import { createClient } from '@supabase/supabase-js';

// --------------------
// Supabase client
// --------------------
// In production, SUPABASE_URL and SUPABASE_KEY should come from Wrangler secrets or vars
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --------------------
// KV binding for geo cache
// --------------------
const GEO_CACHE = GEO_CACHE_STORE;

// --------------------
// CORS helper
// --------------------
function getCorsHeaders(origin) {
  const allowed = ['https://jdranpariya.github.io', 'http://localhost:8080'];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// --------------------
// Fetch geo info with KV caching
// --------------------
async function getGeo(ip) {
  const key = `geo:${ip}`;
  let geo = await GEO_CACHE.get(key, { type: 'json' });

  if (!geo) {
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}`);
      const json = await res.json();
      geo = json.status === 'success' ? {
        country: json.country,
        city: json.city,
        region: json.regionName,
        ip
      } : { country: 'unknown', city: 'unknown', ip };

      // cache for 30 days
      await GEO_CACHE.put(key, JSON.stringify(geo), { expirationTtl: 30 * 24 * 3600 });
    } catch {
      geo = { country: 'unknown', city: 'unknown', ip };
    }
  }

  return geo;
}

// --------------------
// Worker entry point
// --------------------
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    // Parse payload
    const payload = await request.json();
    const events = Array.isArray(payload.events) ? payload.events : [];
    if (!events.length) return new Response('No events provided', { status: 400, headers: corsHeaders });

    // Enrich events with geo info and timestamp
    const enriched = await Promise.all(events.map(async ev => ({
      ...ev,
      geo: ev.geo || await getGeo(request.headers.get('cf-connecting-ip') || 'unknown'),
      receivedAt: new Date().toISOString() // match DB column 'receivedat'
    })));
	  console.log(JSON.stringify(enriched, null, 2));

    // Insert batch into Supabase
    const { error } = await supabase.from('telemetry').insert(enriched);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ ok: true, count: enriched.length }), { status: 200, headers: corsHeaders });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

