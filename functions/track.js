// Cloudflare Pages Function – Blog Article Analytics
// Route: /track
// KV binding: SOCIALFLOW_KV
// Key schema:  stats:blog:{slug}
// Value:       { views, dailyViews: {"YYYY-MM-DD": N}, durations: [seconds…],
//               scrollDepths: { "25": N, "50": N, "75": N, "100": N } }

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

/** ISO date string N days ago */
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function onRequest({ request, env }) {
  const url    = new URL(request.url);
  const method = request.method.toUpperCase();
  const kv     = env.SOCIALFLOW_KV;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response("", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  // ── GET /track?slug=… ────────────────────────────────────────────────────
  if (method === "GET") {
    const slug = url.searchParams.get("slug");
    if (!slug) return json({ error: "slug required" }, 400);

    const stats = (await kv.get(`stats:blog:${slug}`, "json").catch(() => null))
      ?? { views: 0, dailyViews: {}, durations: [], scrollDepths: {} };

    // Trend: last 7 days vs previous 7 days
    let last7 = 0, prev7 = 0;
    for (let i = 0; i < 14; i++) {
      const d = dateOffset(i);
      const v = stats.dailyViews?.[d] || 0;
      if (i < 7) last7 += v; else prev7 += v;
    }
    const trend    = prev7 === 0 ? (last7 > 0 ? "up" : "neutral")
                   : last7 > prev7 ? "up" : last7 < prev7 ? "down" : "neutral";
    const trendPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

    // Average dwell time
    const durations   = stats.durations || [];
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // 14-day sparkline (oldest → newest)
    const sparkline = [];
    for (let i = 13; i >= 0; i--) {
      const d = dateOffset(i);
      sparkline.push({ date: d, views: stats.dailyViews?.[d] || 0 });
    }

    // Scroll-depth / completion rate
    const sd = stats.scrollDepths || {};
    const totalViews = stats.views || 1;
    const scrollStats = {
      pct25:  Math.round(((sd["25"]  || 0) / totalViews) * 100),
      pct50:  Math.round(((sd["50"]  || 0) / totalViews) * 100),
      pct75:  Math.round(((sd["75"]  || 0) / totalViews) * 100),
      pct100: Math.round(((sd["100"] || 0) / totalViews) * 100),
    };

    return json({
      views: stats.views || 0,
      avgDuration, trend, trendPct, last7, prev7, sparkline,
      scrollStats,
    });
  }

  // ── POST /track — record view, duration, or scroll event ─────────────────
  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { slug, event, duration, depth } = body;
    if (!slug) return json({ error: "slug required" }, 400);

    const key   = `stats:blog:${slug}`;
    const stats = (await kv.get(key, "json").catch(() => null))
      ?? { views: 0, dailyViews: {}, durations: [], scrollDepths: {} };

    const today = new Date().toISOString().slice(0, 10);

    if (event === "view") {
      stats.views = (stats.views || 0) + 1;
      stats.dailyViews = stats.dailyViews || {};
      stats.dailyViews[today] = (stats.dailyViews[today] || 0) + 1;

      // Prune entries older than 60 days
      const cutoff = dateOffset(60);
      for (const d of Object.keys(stats.dailyViews)) {
        if (d < cutoff) delete stats.dailyViews[d];
      }
    }

    if (event === "duration"
        && typeof duration === "number"
        && duration > 5
        && duration < 3600) {
      stats.durations = stats.durations || [];
      stats.durations.push(Math.round(duration));
      // Keep last 200 samples
      if (stats.durations.length > 200) stats.durations = stats.durations.slice(-200);
    }

    if (event === "scroll" && [25, 50, 75, 100].includes(depth)) {
      stats.scrollDepths = stats.scrollDepths || {};
      stats.scrollDepths[String(depth)] = (stats.scrollDepths[String(depth)] || 0) + 1;
    }

    await kv.put(key, JSON.stringify(stats));
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}
