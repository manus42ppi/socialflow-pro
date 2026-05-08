// Cloudflare Pages Function – Blog Article Analytics
// Route: /track
// KV binding: SOCIALFLOW_KV
// Key schema:  stats:blog:{slug}
//
// POST body variants:
//   { slug, event:"view" }                         — sofortiger View-Event beim Laden
//   { slug, batch: [{event, ...}, ...] }           — gebündelter Unload-Beacon (1 Write!)
//
// Batch events: duration, scroll, referrer, link, return

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

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function emptyStats() {
  return {
    views: 0,
    dailyViews: {},
    durations: [],
    scrollDepths: {},
    referrers: {},
    linkClicks: 0,
    returnVisits: 0,
  };
}

function applyEvent(stats, ev, today) {
  const { event, duration, depth, source, clicks } = ev;

  if (event === "view") {
    stats.views = (stats.views || 0) + 1;
    stats.dailyViews = stats.dailyViews || {};
    stats.dailyViews[today] = (stats.dailyViews[today] || 0) + 1;
    const cutoff = dateOffset(60);
    for (const d of Object.keys(stats.dailyViews)) {
      if (d < cutoff) delete stats.dailyViews[d];
    }
  }

  if (event === "duration" && typeof duration === "number" && duration > 5 && duration < 3600) {
    stats.durations = stats.durations || [];
    stats.durations.push(Math.round(duration));
    if (stats.durations.length > 200) stats.durations = stats.durations.slice(-200);
  }

  if (event === "scroll" && [25, 50, 75, 100].includes(depth)) {
    stats.scrollDepths = stats.scrollDepths || {};
    stats.scrollDepths[String(depth)] = (stats.scrollDepths[String(depth)] || 0) + 1;
  }

  if (event === "referrer" && ["direct","social","organic","newsletter","other"].includes(source)) {
    stats.referrers = stats.referrers || {};
    stats.referrers[source] = (stats.referrers[source] || 0) + 1;
  }

  if (event === "link") {
    stats.linkClicks = (stats.linkClicks || 0) + (typeof clicks === "number" ? clicks : 1);
  }

  if (event === "return") {
    stats.returnVisits = (stats.returnVisits || 0) + 1;
  }
}

export async function onRequest({ request, env }) {
  const url    = new URL(request.url);
  const method = request.method.toUpperCase();
  const kv     = env.SOCIALFLOW_KV;

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

    const stats = (await kv.get(`stats:blog:${slug}`, "json").catch(() => null)) ?? emptyStats();

    // Trend
    let last7 = 0, prev7 = 0;
    for (let i = 0; i < 14; i++) {
      const v = stats.dailyViews?.[dateOffset(i)] || 0;
      if (i < 7) last7 += v; else prev7 += v;
    }
    const trend    = prev7 === 0 ? (last7 > 0 ? "up" : "neutral")
                   : last7 > prev7 ? "up" : last7 < prev7 ? "down" : "neutral";
    const trendPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

    // Ø Verweildauer
    const durations = stats.durations || [];
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // Sparkline
    const sparkline = [];
    for (let i = 13; i >= 0; i--) {
      const d = dateOffset(i);
      sparkline.push({ date: d, views: stats.dailyViews?.[d] || 0 });
    }

    // Scroll-Tiefe
    const sd = stats.scrollDepths || {};
    const totalViews = Math.max(1, stats.views || 1);
    const scrollStats = {
      pct25:  Math.round(((sd["25"]  || 0) / totalViews) * 100),
      pct50:  Math.round(((sd["50"]  || 0) / totalViews) * 100),
      pct75:  Math.round(((sd["75"]  || 0) / totalViews) * 100),
      pct100: Math.round(((sd["100"] || 0) / totalViews) * 100),
    };

    // Referrer
    const ref = stats.referrers || {};
    const refTotal = Object.values(ref).reduce((a, b) => a + b, 0) || 1;
    const referrerBreakdown = {
      direct:     { count: ref.direct     || 0, pct: Math.round(((ref.direct     || 0) / refTotal) * 100) },
      social:     { count: ref.social     || 0, pct: Math.round(((ref.social     || 0) / refTotal) * 100) },
      organic:    { count: ref.organic    || 0, pct: Math.round(((ref.organic    || 0) / refTotal) * 100) },
      newsletter: { count: ref.newsletter || 0, pct: Math.round(((ref.newsletter || 0) / refTotal) * 100) },
      other:      { count: ref.other      || 0, pct: Math.round(((ref.other      || 0) / refTotal) * 100) },
    };

    // Klick-Rate
    const linkClicks   = stats.linkClicks || 0;
    const linkClickRate = totalViews > 0 ? Math.round((linkClicks / totalViews) * 100) : 0;

    // Rückkehr-Quote
    const returnVisits = stats.returnVisits || 0;
    const returnRate   = totalViews > 0 ? Math.round((returnVisits / totalViews) * 100) : 0;

    // Engagement-Score (0–100): 50% Scroll bis 75%, 50% Zeit bis 5 Min
    const scrollScore    = scrollStats.pct75;
    const timeScore      = Math.min(100, Math.round(((avgDuration || 0) / 300) * 100));
    const engagementScore = Math.round((scrollScore + timeScore) / 2);

    return json({
      views: stats.views || 0,
      avgDuration,
      trend, trendPct, last7, prev7, sparkline,
      scrollStats,
      referrerBreakdown,
      linkClicks, linkClickRate,
      returnVisits, returnRate,
      engagementScore,
    });
  }

  // ── POST /track ───────────────────────────────────────────────────────────
  // text/plain Blob von sendBeacon: request.json() parst body-Text als JSON
  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { slug, batch } = body;
    if (!slug) return json({ error: "slug required" }, 400);

    const key   = `stats:blog:${slug}`;
    const stats = (await kv.get(key, "json").catch(() => null)) ?? emptyStats();
    const today = new Date().toISOString().slice(0, 10);

    // batch = Array von Events (ein Write statt N parallele Writes)
    // Fallback: single-event Body für Rückwärtskompatibilität
    const events = Array.isArray(batch) ? batch : [body];
    for (const ev of events) {
      applyEvent(stats, ev, today);
    }

    await kv.put(key, JSON.stringify(stats));
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}
