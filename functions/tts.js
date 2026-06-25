// Cloudflare Pages Function – OpenAI TTS Proxy
// API-Key liegt sicher im Cloudflare Dashboard als Secret: OPENAI_API_KEY
//
// POST /tts { text, voice?, model? }
// → audio/mpeg stream (play directly via new Audio(objectURL))
//
// Voices: nova (freundlich/weiblich), alloy (neutral), onyx (tief/männlich),
//         shimmer (sanft/weiblich), echo, fable
// Model:  tts-1 (schneller, für Voice-Assistenten ideal)
//         tts-1-hd (höhere Qualität, ~2x Latenz)

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

  // No API key configured → 503 so client falls back to browser TTS
  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  try {
    const { text, voice = "nova", model = "tts-1" } = await request.json();

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, input: text, voice }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ error: err }),
        { status: r.status, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Stream audio back to client
    return new Response(r.body, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}
