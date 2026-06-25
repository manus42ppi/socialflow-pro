// Shared auth utilities for all Cloudflare Pages Functions
// Supports Clerk JWTs (real users) and HMAC-signed demo tokens

const CLERK_JWKS_URL = "https://engaging-alpaca-61.clerk.accounts.dev/.well-known/jwks.json";

export async function verifyClerkToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));

  const jwks = await fetch(CLERK_JWKS_URL).then(r => r.json());
  const jwk = jwks.keys?.find(k => k.kid === header.kid);
  if (!jwk) throw new Error("No matching JWK for kid: " + header.kid);

  const publicKey = await crypto.subtle.importKey(
    "jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["verify"]
  );

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = Uint8Array.from(
    atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
    c => c.charCodeAt(0)
  );
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, sig, data);
  if (!valid) throw new Error("Invalid token signature");

  const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  if (payload.exp * 1000 < Date.now()) throw new Error("Token expired");

  return payload.sub;
}

// Demo token format: "demo_v1.{base64url(payload)}.{base64url(hmac)}"
// payload: JSON { exp: unixSeconds }
export async function verifyDemoToken(token, env) {
  if (!env?.DEMO_SECRET) throw new Error("DEMO_SECRET not configured");
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "demo_v1") throw new Error("Invalid demo token format");

  const [, payloadB64, sigB64] = parts;

  const keyData = new TextEncoder().encode(env.DEMO_SECRET);
  const msgData = new TextEncoder().encode(payloadB64);

  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );

  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
    c => c.charCodeAt(0)
  );
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, msgData);
  if (!valid) throw new Error("Invalid demo token signature");

  const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  if (payload.exp < Date.now() / 1000) throw new Error("Demo token expired");

  return "demo_user";
}

// Returns { userId, isDemo } or throws
export async function requireAuth(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);

  if (token.startsWith("demo_v1.")) {
    const userId = await verifyDemoToken(token, env);
    return { userId, isDemo: true };
  }

  const userId = await verifyClerkToken(token);
  return { userId, isDemo: false };
}
