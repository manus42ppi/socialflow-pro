// Cloudflare Pages Function – Instagram Business Discovery API Proxy
// POST /ig-monitor  →  { profile: {...}, posts: [...] }
// Looks up a PUBLIC Instagram Business/Creator account by username

const CLERK_JWKS_URL = "https://engaging-alpaca-61.clerk.accounts.dev/.well-known/jwks.json";
const FB_API = "https://graph.facebook.com/v19.0";
const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── JWT verification ────────────────────────────────────────────────────────
async function verifyClerkToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));
  const jwks = await fetch(CLERK_JWKS_URL).then(r => r.json());
  const jwk = jwks.keys?.find(k => k.kid === header.kid);
  if (!jwk) throw new Error("No matching JWK");
  const publicKey = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, sig, data);
  if (!valid) throw new Error("Invalid token signature");
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  if (payload.exp * 1000 < Date.now()) throw new Error("Token expired");
  return payload.sub;
}

// ── User-friendly error messages ────────────────────────────────────────────
function friendlyError(igErr) {
  const code = igErr?.code;
  const msg = igErr?.message || "Instagram API Fehler";
  if (code === 190) return "Access Token ist abgelaufen. Bitte neuen Token in den Einstellungen hinterlegen.";
  if (code === 100) return "Account-ID nicht gefunden. Bitte Business Account ID in Einstellungen prüfen.";
  if (code === 10 || code === 200) return "Fehlende Berechtigung. Token benötigt: instagram_basic, pages_show_list.";
  if (msg.includes("does not support")) return "Der gesuchte Account ist kein öffentlicher Business- oder Creator-Account.";
  if (msg.includes("unknown path")) return "Benutzername nicht gefunden.";
  return msg;
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: CORS });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Nicht angemeldet." }), { status: 401, headers: CORS });
    }
    await verifyClerkToken(token);

    // ── Parse body ──────────────────────────────────────────────────────────
    const { accessToken, igUserId, targetUsername } = await request.json();
    if (!accessToken || !igUserId || !targetUsername) {
      return new Response(
        JSON.stringify({ error: "Zugangsdaten oder Benutzername fehlen." }),
        { status: 400, headers: CORS }
      );
    }

    // ── Business Discovery: profile + recent posts ──────────────────────────
    const mediaFields = "caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count";
    const profileFields = `username,name,biography,profile_picture_url,followers_count,media_count,media.limit(12){${mediaFields}}`;
    const discFields = `business_discovery.fields(${profileFields})`;

    const url = `${FB_API}/${igUserId}?fields=${encodeURIComponent(discFields)}&username=${encodeURIComponent(targetUsername)}&access_token=${accessToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = friendlyError(data.error);
      return new Response(JSON.stringify({ error: msg }), { status: res.ok ? 400 : res.status, headers: CORS });
    }

    const disc = data.business_discovery;
    if (!disc) {
      return new Response(
        JSON.stringify({ error: `"${targetUsername}" ist kein öffentlicher Business- oder Creator-Account und kann nicht abgerufen werden.` }),
        { status: 400, headers: CORS }
      );
    }

    // ── Normalize ────────────────────────────────────────────────────────────
    const profile = {
      username:       disc.username       || targetUsername,
      name:           disc.name           || disc.username || targetUsername,
      biography:      disc.biography      || "",
      profilePicture: disc.profile_picture_url || null,
      followersCount: disc.followers_count ?? null,
      mediaCount:     disc.media_count    ?? null,
    };

    const posts = (disc.media?.data || []).map(m => ({
      id:         m.id,
      caption:    m.caption   || "",
      mediaType:  m.media_type,
      mediaUrl:   m.media_url || m.thumbnail_url || null,
      timestamp:  m.timestamp || null,
      permalink:  m.permalink || null,
      likes:      m.like_count      ?? null,
      comments:   m.comments_count  ?? null,
    }));

    return new Response(
      JSON.stringify({ profile, posts }),
      { status: 200, headers: CORS }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || "Unbekannter Fehler" }),
      { status: 500, headers: CORS }
    );
  }
}
