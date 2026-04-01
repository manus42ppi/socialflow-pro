// Cloudflare Pages Function – Instagram Graph API Proxy
// POST /instagram  →  { posts: [...] }
// Requires Clerk JWT + Instagram credentials in request body

const CLERK_JWKS_URL = "https://engaging-alpaca-61.clerk.accounts.dev/.well-known/jwks.json";
const IG_API = "https://graph.instagram.com/v19.0";
const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── JWT verification (copied from store.js) ─────────────────────────────────
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

// ── Fetch insights for a single media item (may fail for some types) ────────
async function fetchInsights(mediaId, accessToken) {
  try {
    const r = await fetch(
      `${IG_API}/${mediaId}/insights?metric=reach,impressions,saved&access_token=${accessToken}`
    );
    if (!r.ok) return null;
    const d = await r.json();
    const result = {};
    for (const m of d.data || []) {
      result[m.name] = m.values?.[0]?.value ?? m.total_value?.value ?? null;
    }
    return result;
  } catch {
    return null;
  }
}

// ── Convert Instagram media item → SocialFlow post format ──────────────────
function normalizePost(igMedia, insights) {
  const ts = igMedia.timestamp || "";
  const caption = igMedia.caption || "";
  const firstLine = caption.split("\n")[0]?.trim();

  return {
    id: "ig_" + igMedia.id,
    instagramId: igMedia.id,
    instagramUrl: igMedia.permalink || null,
    mediaUrl: igMedia.media_url || igMedia.thumbnail_url || null,
    title: firstLine?.slice(0, 70) || "Instagram Post",
    content: caption,
    channels: ["instagram"],
    status: "published",
    scheduledDate: ts ? ts.slice(0, 10) : "",
    scheduledTime: ts ? ts.slice(11, 16) : "",
    campaignId: null,
    mediaId: null,
    deleted: false,
    metrics: {
      likes:       igMedia.like_count       ?? null,
      comments:    igMedia.comments_count   ?? null,
      reach:       insights?.reach          ?? null,
      impressions: insights?.impressions    ?? null,
      saved:       insights?.saved          ?? null,
    },
  };
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: CORS });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Nicht angemeldet. Bitte zuerst einloggen." }), { status: 401, headers: CORS });
    }
    await verifyClerkToken(token); // throws if invalid

    // ── Parse body ────────────────────────────────────────────────────────────
    const { accessToken, instagramUserId } = await request.json();
    if (!accessToken || !instagramUserId) {
      return new Response(
        JSON.stringify({ error: "Zugangsdaten fehlen. Bitte Instagram in Einstellungen → Meine Kanäle konfigurieren." }),
        { status: 400, headers: CORS }
      );
    }

    // ── Fetch media list from Instagram ───────────────────────────────────────
    const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count";
    const igRes = await fetch(
      `${IG_API}/${instagramUserId}/media?fields=${fields}&limit=25&access_token=${accessToken}`
    );
    const igData = await igRes.json();

    if (!igRes.ok) {
      const msg = igData?.error?.message || "Instagram API Fehler";
      const code = igData?.error?.code;
      // User-friendly error messages
      if (code === 190) return new Response(JSON.stringify({ error: "Access Token ist abgelaufen oder ungültig. Bitte neuen Token generieren." }), { status: 401, headers: CORS });
      if (code === 100) return new Response(JSON.stringify({ error: "Account ID nicht gefunden. Bitte Business Account ID prüfen." }), { status: 400, headers: CORS });
      return new Response(JSON.stringify({ error: msg }), { status: igRes.status, headers: CORS });
    }

    // ── Fetch insights per post (parallel, best-effort) ───────────────────────
    const mediaItems = igData.data || [];
    const postsWithInsights = await Promise.all(
      mediaItems.map(async item => {
        const insights = await fetchInsights(item.id, accessToken);
        return normalizePost(item, insights);
      })
    );

    return new Response(
      JSON.stringify({ posts: postsWithInsights, count: postsWithInsights.length }),
      { status: 200, headers: CORS }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || "Unbekannter Fehler" }),
      { status: 500, headers: CORS }
    );
  }
}
