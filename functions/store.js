// Cloudflare Pages Function – KV Store (ersetzt @netlify/blobs)
// KV-Binding: SOCIALFLOW_KV (im Cloudflare Dashboard konfigurieren)

export async function onRequest({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { method, path: p, value } = body;
    const key = p || "default";

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
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
