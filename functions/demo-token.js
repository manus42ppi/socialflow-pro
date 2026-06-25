// POST /demo-token — issues a short-lived HMAC-signed token for demo users
// Public endpoint (no auth required) — the token itself is signed with DEMO_SECRET
// Token is valid for 1 hour and can be used as Bearer token for all secured endpoints

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function onRequestPost({ env }) {
  if (!env.DEMO_SECRET) {
    return new Response(JSON.stringify({ error: "DEMO_SECRET not configured" }), {
      status: 503,
      headers: CORS,
    });
  }

  const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const payloadB64 = btoa(JSON.stringify({ exp }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const keyData = new TextEncoder().encode(env.DEMO_SECRET);
  const msgData = new TextEncoder().encode(payloadB64);

  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, msgData);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const token = `demo_v1.${payloadB64}.${sigB64}`;

  return new Response(JSON.stringify({ token, expiresAt: exp * 1000 }), {
    status: 200,
    headers: CORS,
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
