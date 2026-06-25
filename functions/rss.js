/**
 * Cloudflare Pages Function: /rss?url=FEED_URL
 * Server-side RSS proxy – no CORS issues, works for any public RSS feed.
 * Cached 5 min on CF edge to reduce origin load.
 */
import { requireAuth } from "./_lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url     = new URL(request.url);
  const feedUrl = url.searchParams.get("url");

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization",
      },
    });
  }

  try {
    await requireAuth(request, env);
  } catch {
    return new Response("Unauthorized", { status: 401, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  if (!feedUrl) {
    return new Response("Missing ?url= parameter", { status: 400 });
  }

  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SocialFlowBot/1.0)",
        "Accept":     "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      // Follow redirects (Cloudflare fetch follows by default)
    });

    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: 502 });
    }

    const xml = await res.text();

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type":                "application/xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control":               "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, { status: 502 });
  }
}
