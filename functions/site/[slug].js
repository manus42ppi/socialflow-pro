/**
 * Cloudflare Pages Function — Creation Voodoo site server
 * Route:  GET /site/:slug
 * KV:     SOCIALFLOW_KV  key = "site:{slug}"
 *
 * Serves the AI-generated HTML landing page publicly (no auth required).
 * Cache: 60s at edge so live-link previews are fresh but not hammered.
 */
export async function onRequestGet({ params, env }) {
  const slug = params.slug;
  if (!slug) {
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const html = await env.SOCIALFLOW_KV.get(`site:${slug}`).catch(() => null);
  if (!html) {
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Seite nicht gefunden</title>
       <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;color:#374151}</style>
       </head><body><div style="text-align:center"><h1 style="font-size:2rem;margin-bottom:.5rem">404</h1>
       <p>Diese Seite wurde noch nicht generiert oder existiert nicht.</p></div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, s-maxage=60, max-age=30",
      "X-Powered-By": "SocialFlow Creation Voodoo",
    },
  });
}
