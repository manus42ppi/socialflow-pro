import { requireAuth } from "./_lib/auth.js";

/**
 * Cloudflare Pages Function — Creation Voodoo site deployer
 * Route:  POST /deploy-site
 * KV:     SOCIALFLOW_KV
 *
 * Writes AI-generated HTML to KV under "site:{slug}".
 * This is separate from /store because site pages are global (not user-scoped)
 * and need to be served publicly by /site/[slug].js.
 *
 * Body: { slug: string, html: string }
 * The slug is validated (alphanumeric + hyphens) to prevent key injection.
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response("", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try { await requireAuth(request, env); }
  catch { return json({ error: "Unauthorized" }, 401); }

  const body = await request.json().catch(() => ({}));
  const { slug, html, delete: del } = body;

  if (!slug || typeof slug !== "string") return json({ error: "slug required" }, 400);

  // Validate slug: only lowercase alphanumeric + hyphens, 3–80 chars
  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(slug)) {
    return json({ error: "Invalid slug. Use lowercase letters, numbers and hyphens (3–80 chars)." }, 400);
  }

  // DELETE: remove the deployed site from KV
  if (del === true) {
    await env.SOCIALFLOW_KV.delete(`site:${slug}`);
    return json({ ok: true, deleted: true, slug });
  }

  if (!html || typeof html !== "string") return json({ error: "html required" }, 400);

  await env.SOCIALFLOW_KV.put(`site:${slug}`, html);

  return json({
    ok: true,
    slug,
    url: `https://socialflow-pro.pages.dev/site/${slug}`,
  });
}
