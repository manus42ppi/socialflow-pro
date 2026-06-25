// Cloudflare Pages Function – AI Proxy für Anthropic API
// API-Key liegt sicher im Cloudflare Dashboard als Secret
//
// Supports two modes:
//   stream:false (default) – buffer full response, return JSON (short prompts)
//   stream:true            – forward Anthropic SSE stream directly to client
//                            (avoids 30s Worker timeout for long generations)

import { requireAuth } from "./_lib/auth.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: CORS });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    await requireAuth(request, env);
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  try {
    const body = await request.text();
    const parsed = JSON.parse(body);
    const streaming = parsed.stream === true;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      // When streaming, pass stream:true to Anthropic; otherwise keep body as-is
      body: streaming
        ? JSON.stringify({ ...parsed, stream: true })
        : body,
    });

    if (streaming) {
      // Forward the ReadableStream directly — no buffering, no CPU-time timeout
      return new Response(r.body, {
        status: r.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          ...CORS,
        },
      });
    }

    // Non-streaming: buffer and return JSON (existing behaviour for short prompts)
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}
