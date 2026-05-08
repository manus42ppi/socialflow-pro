// Cloudflare Pages Function – KV Store mit Clerk-JWT-Auth + User-Isolation
// KV-Binding: SOCIALFLOW_KV (im Cloudflare Dashboard konfiguriert)

const CLERK_JWKS_URL = "https://engaging-alpaca-61.clerk.accounts.dev/.well-known/jwks.json";

// Lightweight JWT-Verifikation via Web Crypto (kein npm nötig)
async function verifyClerkToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [headerB64, payloadB64, sigB64] = parts;

  // Header parsen → kid
  const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));

  // JWKS laden (Cloudflare cached automatisch via Cache-Control)
  const jwks = await fetch(CLERK_JWKS_URL).then(r => r.json());
  const jwk = jwks.keys?.find(k => k.kid === header.kid);
  if (!jwk) throw new Error("No matching JWK for kid: " + header.kid);

  // Public Key importieren
  const publicKey = await crypto.subtle.importKey(
    "jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["verify"]
  );

  // Signatur prüfen
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = Uint8Array.from(
    atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
    c => c.charCodeAt(0)
  );
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, sig, data);
  if (!valid) throw new Error("Invalid token signature");

  // Payload parsen + Ablauf prüfen
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  if (payload.exp * 1000 < Date.now()) throw new Error("Token expired");

  return payload.sub; // Clerk User-ID (z.B. "user_2abc...")
}

export async function onRequest({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  try {
    // ── Auth: Clerk-JWT prüfen ──────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: no token" }), { status: 401, headers });
    }

    const userId = await verifyClerkToken(token);

    // ── Request Body ────────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { method, path: p, value } = body;

    // ── User-scoped KV-Key ──────────────────────────────────────────────────
    // "posts" → "user:user_2abc:posts"
    const key = `user:${userId}:${p || "default"}`;

    if (method === "get") {
      const data = await env.SOCIALFLOW_KV.get(key, "json");
      return new Response(JSON.stringify({ ok: true, data: data ?? null }), { headers });
    }

    if (method === "set") {
      await env.SOCIALFLOW_KV.put(key, JSON.stringify(value));
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (method === "delete") {
      await env.SOCIALFLOW_KV.delete(key);
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ error: "Unknown method" }), { status: 400, headers });

  } catch (e) {
    const isAuthErr = ["token", "JWK", "signature", "Unauthorized", "expired", "Invalid"].some(w => e.message.includes(w));
    return new Response(JSON.stringify({ error: e.message }), { status: isAuthErr ? 401 : 500, headers });
  }
}
