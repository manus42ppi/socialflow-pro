// Cloudflare Pages Function — POST /print-generate
//
// Empfängt Artikel-Daten, fragt Claude nach dem Layout-Plan,
// generiert Typst-Quellcode und lässt ihn durch den Bridge-Server kompilieren.
//
// Lokal:       Bridge läuft auf localhost:9000
// Produktion:  TYPST_BRIDGE_URL in Cloudflare Pages env setzen

const TYPST_BRIDGE_LOCAL = "http://localhost:9000";

// ── Hilfsfunktionen ────────────────────────────────────────────

function jsonRes(data, status = 200) {
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

// Lädt Brand Style Guide aus KV (Fallback: ppi-Media-Defaults)
async function loadStyleGuide(kv, workspaceId) {
  const stored = await kv.get(`brand:${workspaceId}:style-guide`, "json").catch(() => null);
  return stored ?? {
    format: {
      breite_mm: 210, hoehe_mm: 297,
      rand_oben_mm: 18.4, rand_unten_mm: 22.1,
      rand_innen_mm: 19.8, rand_aussen_mm: 16.2,
      beschnitt_mm: 3, grundlinienraster_mm: 4.8,
    },
    typografie: {
      display_font: "Inter",
      text_font: "Minion Pro / Hoefler Text / PT Serif",
      text_groesse_pt: 8.5,
      leading_faktor: 1.48,
      spalten_standard: 2,
      spaltenabstand_mm: 4.8,
      drop_cap: true,
      pull_quote: true,
    },
    farben: { akzent_cmyk: [100, 45, 0, 0], text_cmyk: [0, 0, 0, 92] },
  };
}

// Lädt freigegebene Layout-Beispiele aus KV (für Few-Shot)
async function loadExamples(kv, workspaceId, articleCount) {
  const index = await kv.get(`layouts:${workspaceId}:index`, "json").catch(() => null);
  if (!index?.length) return [];
  return index
    .filter(e => e.approved)
    .sort((a, b) => Math.abs(a.artikel_anzahl - articleCount) - Math.abs(b.artikel_anzahl - articleCount))
    .slice(0, 3)
    .map(e => ({
      artikel_anzahl: e.artikel_anzahl,
      komposition: e.komposition,
      layout_zusammenfassung: e.layout_zusammenfassung,
    }));
}

// ── Typografie-Hilfsfunktionen ──────────────────────────────────

function esc(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/#/g, "\\#")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ");
}

function introText(text, maxChars = 280) {
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastDot = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastDot > maxChars * 0.5 ? text.slice(0, lastDot + 1) : sub + "…";
}

function featureText(text, maxChars = 500) {
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastDot = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastDot > maxChars * 0.5 ? text.slice(0, lastDot + 1) : sub + "…";
}

function extractPullQuote(text) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const good = sentences.filter(s => s.length > 60 && s.length < 160);
  if (!good.length) return null;
  return good[Math.floor(good.length * 0.45)] ?? good[0];
}

// ── Claude → Layout-JSON ────────────────────────────────────────

const LAYOUT_SCHEMA = `
{
  "seiten": [
    {
      "nr": 1,
      "typ": "cover",
      "magazin": "ppi Cycling",
      "ausgabe": "Oktober 2026",
      "preis": "9,80 €",
      "headline": "Schotter, Staub und Freiheit",
      "teasers": ["Alpencross: 5 Tage Alpen", "E-Bike Test", "Interview Profi"]
    },
    {
      "nr": 4,
      "typ": "opener-solo",
      "artikel_id": "story-123",
      "headline": "Schotter,\\nStaub und Freiheit",
      "unterzeile": "Reportage",
      "byline": "Von Max Mustermann",
      "rubrik": "FAHRTECHNIK",
      "bildKey": "story-123-0"
    },
    {
      "nr": 5,
      "typ": "intro-page",
      "artikel_id": "story-123",
      "rubrik": "FAHRTECHNIK",
      "bildKey": "story-123-1"
    },
    {
      "nr": 6,
      "typ": "standard-feature",
      "artikel_id": "story-456",
      "dachzeile": "TEST",
      "headline": "Specialized Diverge:\\nDer Maßstab",
      "unterzeile": "800 km Schotter im Härtetest",
      "byline": "Test: Johanna Keller",
      "rubrik": "TEST",
      "bildKey": "story-456-0"
    },
    {
      "nr": 7,
      "typ": "kurzmeldungen",
      "rubrik": "NEWS",
      "meldungen": [
        { "dachzeile": "MARKT", "titel": "Canyon startet E-Gravel", "text": "..." },
        { "dachzeile": "RENNEN", "titel": "Trophy-Ergebnisse KW38", "text": "..." }
      ]
    }
  ]
}
`;

async function generateLayoutPlan(articles, styleGuide, examples, env, siteOrigin) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY nicht gesetzt — bitte in Cloudflare Pages Dashboard (Einstellungen → Umgebungsvariablen) hinterlegen");
  const examplesText = examples.length > 0
    ? `\nFREIGEGEBENE AUSGABEN ZUM LERNEN:\n${JSON.stringify(examples, null, 2)}`
    : "";

  const prompt = `Du bist Art Director für ein professionelles Fahrrad-Magazin.
Erstelle einen konkreten Layout-Plan für diese ${articles.length} Artikel.

STIL-HANDBUCH:
${JSON.stringify(styleGuide, null, 2)}
${examplesText}

ARTIKEL:
${articles.map((a, i) => `
Artikel ${i + 1}:
- ID: ${a.id}
- Titel: ${a.title}
- Wörter: ${a.wordCount ?? "unbekannt"}
- Typ: ${a.category ?? "feature"}
- Hat starkes Bild: ${a.hasHeroImage ? "ja" : "nein"}
`).join("")}

LAYOUT-REGELN (STRIKT EINHALTEN):

Cover (Typ "cover"): Immer Seite 1.
  Felder: magazin, ausgabe, preis, headline (Aufmacher, max. 30 Zeichen), teasers (2–4 Texte, je max. 26 Zeichen).

Feature-Opener (Typ "opener-solo"): Nur wenn Artikel >= 600 Wörter UND starkes Bild.
  Startet IMMER auf gerader Seite (4, 6, 8 ...). Felder: artikel_id, headline (mit \\n für Zeilenumbruch), unterzeile (1–2 Wörter Kategorie, z.B. "Reportage"), byline, rubrik, bildKey.

Intro-Seite (Typ "intro-page"): Folgt direkt auf opener-solo (nächste Seite).
  Felder: artikel_id, rubrik, bildKey (zweites Bild falls vorhanden, sonst gleiches wie opener).

Standard-Feature (Typ "standard-feature"): 1 Seite. Foto oben 80mm, darunter 2 Textspalten mit Drop Cap + Pull Quote.
  Max. 900 Zeichen Fließtext. Felder: artikel_id, dachzeile, headline (mit \\n für Umbruch), unterzeile, byline, rubrik, bildKey.

Kurzmeldungen (Typ "kurzmeldungen"): 1 Seite für 3 kurze Artikel (<150 Wörter), 2 Spalten.
  Felder: meldungen (Array mit {dachzeile, titel, text}).

Seitennummern: Seiten 1 (U1), 2 (U2), 3 (IHV) sind fix. Artikel ab Seite 4.
Gerade = links, ungerade = rechts. Seitenanzahl = Vielfaches von 4.

Gib AUSSCHLIESSLICH gültiges JSON zurück, kein Markdown, keine Erklärungen.
Schema:
${LAYOUT_SCHEMA}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.status.toString());
    throw new Error(`AI-Call fehlgeschlagen: ${response.status} — ${errText.slice(0, 200)}`);
  }
  const respText = await response.text();
  let data;
  try { data = JSON.parse(respText); } catch {
    throw new Error(`Anthropic-Antwort ist kein gültiges JSON: ${respText.slice(0, 200)}`);
  }
  const text = data.content?.[0]?.text ?? "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Kein JSON in Claude-Antwort gefunden. Antwort-Anfang: " + text.slice(0, 200));
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    // Truncated JSON: show position of error for debugging
    throw new Error(\`Layout-JSON ungültig (evtl. abgeschnitten): \${parseErr.message}. JSON-Anfang: \${jsonMatch[0].slice(0, 300)}\`);
  }
}

// ── Layout-JSON → Typst-Quellcode ──────────────────────────────

function imgBox(bildKey, assets = {}, w = "100%", h = "80mm") {
  const filename = `${bildKey}.jpg`;
  if (assets[filename]) {
    return `#box(width: ${w}, height: ${h}, clip: true)[
  #image("${filename}", width: 100%, height: 100%, fit: "cover")
]`;
  }
  return `#box(width: ${w}, height: ${h})[
  #rect(width: 100%, height: 100%,
    fill: gradient.linear(rgb("#1a2a3a"), rgb("#2e4560"), rgb("#4a6080"), angle: 175deg))
]`;
}

function imgTypst(bildKey, assets = {}, w = "page-w", h = "page-h") {
  const filename = `${bildKey}.jpg`;
  if (assets[filename]) {
    return `image("${filename}", width: ${w}, height: ${h}, fit: "cover")`;
  }
  return `rect(width: ${w}, height: ${h},
    fill: gradient.linear(rgb("#0d1f2d"), rgb("#1e3650"), rgb("#2a4a6a"), angle: 155deg))`;
}

function seiteToTypst(seite, articles, assets = {}) {
  const art = articles.find(a => a.id === seite.artikel_id) ?? {};
  const body = art.content ?? art.body ?? "(Kein Inhalt)";
  const bk = seite.bildKey ?? seite.artikel_id ?? "";

  if (seite.typ === "cover") {
    const hasBild = assets[`${bk}.jpg`];
    const teaserStr = (seite.teasers ?? []).join("|");
    const headlineLines = (seite.headline ?? "").split("\n");
    const bgBlock = hasBild
      ? `#place(top + left, image("${bk}.jpg", width: page-w, height: page-h, fit: "cover"))
#place(top + left, rect(width: page-w, height: page-h, fill: rgb("#000000").transparentize(42%)))`
      : `#place(top + left, rect(width: page-w, height: page-h,
  fill: gradient.linear(rgb("#0a1520"), rgb("#1a3040"), rgb("#0a1520"), angle: 160deg)))`;
    return `
// ── U1 Titelseite ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
${bgBlock}
#place(top + left,
  polygon(fill: rgb("#0077b5").transparentize(75%),
    (0mm, 0mm), (page-w, 0mm), (page-w, 100mm), (0mm, 180mm)))
#place(bottom + left,
  rect(width: page-w, height: 80mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(10%))))
#place(top + left,
  rect(width: page-w, height: 60mm,
    fill: gradient.linear(rgb("#000000").transparentize(20%), rgb("#000000").transparentize(100%))))
#place(top + left, dx: margin-outer, dy: margin-top - 4mm, {
  set text(font: "Inter")
  stack(dir: ttb, spacing: 2mm,
    { set text(size: 32pt, weight: "black", fill: white, tracking: -0.5pt); upper("${seite.magazin ?? "ppi Cycling"}") },
    line(length: 42mm, stroke: 2.5pt + col-accent),
    { set text(size: 8pt, fill: white.transparentize(30%), tracking: 0.8pt)
      upper("${seite.ausgabe ?? ""}  ·  ${seite.preis ?? "9,80 €"}") },
  )
})
#place(center + horizon, dy: -20mm,
  block(width: page-w - (margin-outer * 2), {
    set text(size: 68pt, weight: "black", fill: white, font: "Inter", tracking: -2pt)
    set par(leading: 0.78em, justify: false)
    [${headlineLines.join(" \\\n    ")}]
  })
)
${teaserStr ? `#place(bottom + left, dx: margin-outer, dy: -(margin-bottom - 2mm), {
  let ts = "${teaserStr}".split("|")
  set text(font: "Inter")
  grid(columns: range(ts.len()).map(_ => 1fr), column-gutter: 5mm,
    ..ts.map(t => stack(dir: ttb, spacing: 1.5mm,
      line(length: 100%, stroke: 0.4pt + col-accent),
      v(1.5mm),
      { set text(size: 7.5pt, fill: white.transparentize(20%)); t.trim() },
    )))
})` : ""}
`;
  }

  if (seite.typ === "opener-solo") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const headlineLines = (seite.headline ?? "").split("\n");
    return `
// ── Feature-Opener Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left, ${imgTypst(bk, assets)})
#place(bottom + left,
  rect(width: page-w, height: 140mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(5%))))
#place(top + left,
  rect(width: page-w, height: 22mm,
    fill: gradient.linear(rgb("#000000").transparentize(30%), rgb("#000000").transparentize(100%))))
#place(top + left, dx: margin-inner, dy: margin-top - 3mm,
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
    #grid(columns: (auto, 1fr), column-gutter: 2.5mm,
      box(width: 8mm, height: 5.5mm, fill: col-accent)[
        #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[${nr}])
      ],
      align(right + horizon)[${seite.rubrik ? `#upper("${seite.rubrik}")` : ""}]
    )
  ]
)
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 8mm),
  block(width: page-w - margin-inner - margin-outer)[
    ${seite.unterzeile
      ? `#set text(size: 8pt, weight: "bold", fill: col-accent, font: "Inter", tracking: 1.8pt)
    #set par(justify: false)
    #upper("${seite.unterzeile}")
    #v(3mm)`
      : ""}
    #set text(size: 72pt, weight: "black", fill: white, font: "Inter")
    #set par(leading: 0.80em, justify: false)
    ${headlineLines.join(" \\\n    ")}
    ${seite.byline
      ? `#v(5mm)
    #set text(size: 8pt, weight: "bold", fill: white.transparentize(30%), tracking: 0.6pt, font: "Inter")
    #upper("${seite.byline}")`
      : ""}
  ]
)
`;
  }

  if (seite.typ === "intro-page") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const intro = esc(introText(body, 280));
    return `
// ── Intro-Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left, ${imgTypst(bk, assets)})
#place(top + left,
  rect(width: page-w, height: 24mm,
    fill: gradient.linear(rgb("#000000").transparentize(30%), rgb("#000000").transparentize(100%))))
#place(top + right, dx: -margin-outer, dy: margin-top - 3mm,
  grid(columns: (1fr, auto), column-gutter: 2.5mm,
    align(left + horizon)[
      #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
      ${seite.rubrik ? `#upper("${seite.rubrik}")` : ""}
    ],
    box(width: 8mm, height: 5.5mm, fill: col-accent)[
      #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[${nr}])
    ]
  )
)
#place(bottom + left,
  block(width: page-w, fill: rgb("#ffffff").transparentize(10%),
    inset: (x: margin-inner + 4mm, top: 10mm, bottom: margin-bottom + 6mm))[
    #columns(2, gutter: col-gutter)[
      #set text(size: 10pt, weight: "regular", fill: rgb("#1a1a1a"), font: "Inter")
      #set par(leading: 1.45em, justify: false)
      ${intro}
    ]
  ]
)
`;
  }

  if (seite.typ === "standard-feature") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const pullQuote = extractPullQuote(body);
    const featureBody = featureText(body, 500);
    const firstChar = featureBody.slice(0, 1);
    const isLetter = /[a-zA-ZäöüÄÖÜß]/.test(firstChar);
    const bodyRest = esc(isLetter ? featureBody.slice(1) : featureBody);
    const headlineLines = (seite.headline ?? "").split("\n");

    return `
// ── Standard Feature: ${seite.headline?.replace(/\n/g, " ")} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "${seite.rubrik ?? ""}", seite: ${nr})
#v(3mm)
${imgBox(bk, assets, "100%", "80mm")}
#v(3mm)
#t-dachzeile("${seite.dachzeile ?? ""}")
#v(1.5mm)
#block(width: 100%)[
  #set text(size: 26pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.87em, justify: false)
  ${headlineLines.join(" \\\n  ")}
]
${seite.unterzeile ? `#v(1.5mm)\n#t-unterzeile[${seite.unterzeile}]` : ""}
${seite.byline ? `#v(2mm)\n#hrule(thickness: 0.3pt)\n#v(1.5mm)\n#t-byline[${seite.byline}]\n#v(1.5mm)\n#hrule(thickness: 0.3pt)` : ""}
#v(3mm)
#block(breakable: false)[
  ${isLetter ? `#t-dropcap("${firstChar}")[${bodyRest}]` : `#t-body-serif[${bodyRest}]`}
]
${pullQuote ? `#t-pullquote-wide[${esc(pullQuote)}]` : ""}
`;
  }

  if (seite.typ === "kurzmeldungen") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const meldungen = seite.meldungen ?? [];
    const meldungenTypst = meldungen
      .map((m, i) => {
        const block = `  #t-dachzeile("${m.dachzeile ?? ""}")
  #v(1.5mm)
  #block(width: 100%)[
    #set text(size: 17pt, weight: "bold", fill: col-text, font: "Inter")
    #set par(leading: 0.88em, justify: false)
    ${m.titel}
  ]
  #v(2mm)
  #hrule(thickness: 0.25pt)
  #v(2.5mm)
  #t-body[${esc(m.text)}]
  #v(6mm)`;
        return i === 0 ? block + "\n  #colbreak()" : block;
      })
      .join("\n");

    return `
// ── Kurzmeldungen Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#block(width: 100%)[
  #box(width: 100%, height: 7mm, fill: col-accent)
  #place(left + horizon, dx: 4mm, dy: -5mm,
    text(size: 9pt, weight: "bold", fill: white, tracking: 2pt, font: "Inter")[${(seite.rubrik ?? "NEWS").toUpperCase()}]
  )
]
#v(3mm)
#kolumnentitel(rubrik: "${seite.rubrik ?? "NEWS"}", seite: ${nr})
#v(4mm)
#columns(2, gutter: col-gutter)[
${meldungenTypst}
]
`;
  }

  if (seite.typ === "spread-opener") {
    return seiteToTypst({ ...seite, typ: "opener-solo" }, articles, assets);
  }

  return `// Unbekannter Seitentyp: ${seite.typ}\n#pagebreak()`;
}

function layoutToTypst(layoutPlan, articles, assets = {}) {
  const seiten = layoutPlan.seiten ?? [];
  const blocks = seiten.map(s => seiteToTypst(s, articles, assets));
  const combined = blocks.join("\n#pagebreak()\n");
  const lines = combined.split("\n");
  let importSeen = false;
  return lines.filter(line => {
    if (line.startsWith("#import")) {
      if (importSeen) return false;
      importSeen = true;
    }
    return true;
  }).join("\n");
}

// ── Typst Bridge aufrufen ──────────────────────────────────────

async function compileTypst(source, files, assets, env) {
  const bridgeUrl = env.TYPST_BRIDGE_URL ?? TYPST_BRIDGE_LOCAL;
  let res;
  try {
    res = await fetch(`${bridgeUrl}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, files, assets }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    return null; // Bridge nicht erreichbar — Layout-Plan bleibt nutzbar
  }
  const data = await res.json();
  if (!data.ok) throw new Error(`Typst-Fehler: ${data.error}`);
  return data.pdf; // base64
}

async function fetchImages(layoutPlan) {
  const assets = {};
  const toFetch = [];

  for (const seite of layoutPlan.seiten ?? []) {
    if (seite.bildKey && seite.bildUrls) {
      seite.bildUrls.forEach((url) => {
        toFetch.push({ key: `${seite.bildKey}.jpg`, url });
      });
    }
  }

  await Promise.allSettled(
    toFetch.map(async ({ key, url }) => {
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        assets[key] = Buffer.from(buf).toString("base64");
      } catch {
        // Gradient-Fallback in Typst
      }
    })
  );

  return assets;
}

// ── Haupt-Handler ──────────────────────────────────────────────

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response("", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (method !== "POST") return jsonRes({ error: "POST required" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return jsonRes({ error: "Invalid JSON" }, 400); }

  const { articles, workspaceId = "ws-ppi-media", issueId, templateFiles } = body;

  if (!articles?.length) return jsonRes({ error: "articles[] erforderlich" }, 400);

  try {
    const [styleGuide, examples] = await Promise.all([
      loadStyleGuide(env.SOCIALFLOW_KV, workspaceId),
      loadExamples(env.SOCIALFLOW_KV, workspaceId, articles.length),
    ]);

    const siteOrigin = env.SITE_URL ?? new URL(request.url).origin;
    const layoutPlan = await generateLayoutPlan(articles, styleGuide, examples, env, siteOrigin);
    const assets = await fetchImages(layoutPlan);
    const typstSource = layoutToTypst(layoutPlan, articles, assets);
    const pdfBase64 = await compileTypst(typstSource, templateFiles ?? {}, assets, env);

    if (issueId && env.SOCIALFLOW_KV) {
      await env.SOCIALFLOW_KV.put(`issue:${workspaceId}:${issueId}:draft`, JSON.stringify({
        layoutPlan,
        typstSource,
        generatedAt: new Date().toISOString(),
        articleIds: articles.map(a => a.id),
      }));
    }

    return jsonRes({ ok: true, pdf: pdfBase64 ?? null, pdfAvailable: !!pdfBase64, layoutPlan, pages: layoutPlan.seiten?.length ?? 0 });

  } catch (err) {
    console.error("print-generate Fehler:", err.message);
    return jsonRes({ ok: false, error: err.message }, 500);
  }
}
