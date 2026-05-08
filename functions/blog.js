// Cloudflare Pages Function – Public Blog API
// KV-Binding: SOCIALFLOW_KV (same as store.js)
// Public posts use prefix "public:blog:{slug}" — no user scope

const CLERK_JWKS_URL = "https://engaging-alpaca-61.clerk.accounts.dev/.well-known/jwks.json";

// Copied from functions/store.js
async function verifyClerkToken(token) {
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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      ...extraHeaders,
    },
  });
}

async function getAllPosts(kv) {
  const posts = [];
  let cursor = undefined;

  do {
    const listOpts = { prefix: "public:blog:" };
    if (cursor) listOpts.cursor = cursor;

    const result = await kv.list(listOpts);

    for (const key of result.keys) {
      const post = await kv.get(key.name, "json");
      if (post) posts.push(post);
    }

    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return posts;
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response("", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      },
    });
  }

  const kv = env.SOCIALFLOW_KV;

  // ── GET /api/blog  or  GET /api/blog?slug=some-slug ─────────────────────────
  if (method === "GET") {
    try {
      const slug = url.searchParams.get("slug");

      if (slug) {
        const post = await kv.get(`public:blog:${slug}`, "json");
        if (!post) return json({ error: "Post not found" }, 404);
        return json(post);
      }

      const posts = await getAllPosts(kv);
      return json(posts);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // ── POST /api/blog — publish a new blog post (auth optional for demo) ────────
  if (method === "POST") {
    try {
      // Auth is optional: Clerk JWT if available, anonymous allowed for demo users
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (token) await verifyClerkToken(token); // validate if provided

      const body = await request.json().catch(() => ({}));
      const { title, content, excerpt, category, tags, author, workspaceId } = body;

      if (!title || !content) {
        return json({ error: "title and content are required" }, 400);
      }

      const slug = slugify(title);
      if (!slug) return json({ error: "Could not generate slug from title" }, 400);

      const id = crypto.randomUUID();
      const publishedAt = new Date().toISOString();

      const post = {
        id,
        title,
        slug,
        excerpt: excerpt ?? "",
        content,
        publishedAt,
        author: author ?? null,
        category: category ?? null,
        tags: tags ?? [],
        workspaceId: workspaceId ?? null,
      };

      await kv.put(`public:blog:${slug}`, JSON.stringify(post));

      return json({
        ok: true,
        slug,
        url: `https://ppi-n3xt-website.pages.dev/blog/post.html?slug=${slug}`,
      }, 201);
    } catch (e) {
      const isAuthErr = ["token", "JWK", "signature", "Unauthorized", "expired", "Invalid"].some(w => e.message.includes(w));
      return json({ error: e.message }, isAuthErr ? 401 : 500);
    }
  }

  // ── DELETE /api/blog?slug=xxx — unpublish (auth required) ───────────────────
  if (method === "DELETE") {
    try {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) return json({ error: "Unauthorized: no token" }, 401);

      await verifyClerkToken(token);

      const slug = url.searchParams.get("slug");
      if (!slug) return json({ error: "slug query parameter is required" }, 400);

      const existing = await kv.get(`public:blog:${slug}`, "json");
      if (!existing) return json({ error: "Post not found" }, 404);

      await kv.delete(`public:blog:${slug}`);
      return json({ ok: true, slug });
    } catch (e) {
      const isAuthErr = ["token", "JWK", "signature", "Unauthorized", "expired", "Invalid"].some(w => e.message.includes(w));
      return json({ error: e.message }, isAuthErr ? 401 : 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
