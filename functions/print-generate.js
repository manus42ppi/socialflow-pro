// Cloudflare Pages Function — POST /print-generate
//
// Empfängt Artikel-Daten, fragt Claude nach dem Layout-Plan,
// generiert Typst-Quellcode und lässt ihn durch den Bridge-Server kompilieren.
//
// Lokal:       Bridge läuft auf localhost:9000
// Produktion:  TYPST_BRIDGE_URL in Cloudflare Pages env setzen

// ── Konfiguration ──────────────────────────────────────────────

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
    format: { breite_mm: 210, hoehe_mm: 297,
               rand_oben_mm: 18.4, rand_unten_mm: 22.1,
               rand_innen_mm: 19.8, rand_aussen_mm: 16.2,
               beschnitt_mm: 3, grundlinienraster_mm: 4.8 },
    typografie: { display_font: "Inter", text_font: "Inter",
                  h1_pt: 52, h2_pt: 30, body_pt: 10, leading_faktor: 1.42,
                  spalten_standard: 3, spaltenabstand_mm: 4.8 },
    farben: { akzent_cmyk: [100, 45, 0, 0], text_cmyk: [0, 0, 0, 92] },
  };
}

// Lädt freigegebene Layout-Beispiele aus KV (für Few-Shot)
async function loadExamples(kv, workspaceId, articleCount) {
  const index = await kv.get(`layouts:${workspaceId}:index`, "json").catch(() => null);
  if (!index?.length) return [];
  // Die 3 Ausgaben mit ähnlichster Artikel-Anzahl
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
      "teasers": ["E-Bike Test: 5 Modelle im Härtetest", "Gravel Trophy KW38", "Winter-Layering"]
    },
    {
      "nr": 4,
      "typ": "opener-solo",
      "artikel_id": "story-123",
      "headline": "Schotter, Staub und Freiheit",
      "unterzeile": "Gravel Cycling · Reportage",
      "byline": "Von Max Mustermann · Fotos: Anna Beispiel",
      "rubrik": "FAHRTECHNIK",
      "bild_empfehlung": "Dramatisches Querformat, Bewegungsunschärfe"
    },
    {
      "nr": 5,
      "typ": "intro-page",
      "artikel_id": "story-123",
      "rubrik": "FAHRTECHNIK",
      "bild_empfehlung": "Detailaufnahme oder atmosphärisches Bild"
    },
    {
      "nr": 6,
      "typ": "standard-feature",
      "artikel_id": "story-456",
      "dachzeile": "TEST",
      "headline": "Specialized Diverge: Der Maßstab",
      "unterzeile": "800 km Schotter im Härtetest",
      "byline": "Test: Johanna Keller",
      "rubrik": "TEST"
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

async function generateLayoutPlan(articles, styleGuide, examples, env) {
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

DRUCKTECHNIK-REGELN die du kennen musst:
- Titelseite (Typ "cover"): IMMER Seite 1 (U1). Felder: magazin, ausgabe, preis, headline (Aufmacher-Thema), teasers (Array mit 2–4 kurzen Texten für Teaserleiste).
- Feature-Opener (Typ "opener-solo"): NUR wenn Artikel ≥ 600 Wörter UND starkes Bild vorhanden. 1 Seite, Vollbild-Foto, sehr große Headline unten. BEGINNT IMMER AUF GERADER SEITE (links/verso): Seiten 4, 6, 8, 10, 12... NIEMALS auf ungeraden!
- Intro-Seite (Typ "intro-page"): Folgt DIREKT auf opener-solo (immer nächste, ungerade Seite). Vollbild-Foto + schwebende Textbox mit Artikel-Einstieg. Felder: artikel_id, rubrik, bild_empfehlung.
- Standard-Feature (Typ "standard-feature"): 1 Seite, Bild oben (~55%), 3-spaltige Text darunter.
- Kurzmeldungen (Typ "kurzmeldungen"): 1 Seite für 3–5 kurze Artikel (< 150 Wörter). Felder: meldungen (Array mit {titel, text, dachzeile}).
- Seiten beginnen bei 4 (U1=1, U2=2, IHV=3 sind fix reserviert).
- Gerade Seitenzahlen = links, ungerade = rechts.
- Seitenanzahl muss Vielfaches von 4 sein (Saddle-Stitch-Bindung).
- Fließtext-Standard: 3 Spalten (nicht 2).

Gib AUSSCHLIESSLICH gültiges JSON zurück, kein Markdown, keine Erklärungen.
Schema:
${LAYOUT_SCHEMA}`;

  const response = await fetch(`${env.SITE_URL ?? ""}/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`AI-Call fehlgeschlagen: ${response.status}`);
  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  // JSON aus der Antwort extrahieren
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Kein JSON in Claude-Antwort gefunden");
  return JSON.parse(jsonMatch[0]);
}

// ── Layout-JSON → Typst-Quellcode ──────────────────────────────

function seiteToTypst(seite, articles) {
  const art = articles.find(a => a.id === seite.artikel_id) ?? {};
  const body = art.content ?? art.body ?? "(Kein Inhalt)";

  if (seite.typ === "opener-solo") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    return `
// ── Feature-Opener: ${seite.headline} (Seite ${nr}, gerade/links) ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)

#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#0d1f2d"), rgb("#1e3650"), rgb("#2a4a6a"), angle: 155deg)
  )
)
#place(bottom + left,
  rect(width: page-w, height: 110mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(100%),
      rgb("#000000").transparentize(10%)
    )
  )
)
#place(top + left, dx: margin-inner, dy: margin-top - 3mm,
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
    #grid(columns: (auto, 1fr), column-gutter: 2.5mm,
      box(width: 8mm, height: 5.5mm, fill: col-accent)[
        #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[${nr}])
      ],
      align(right + horizon)[${seite.rubrik ? `upper("${seite.rubrik}")` : ""}]
    )
  ]
)
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 8mm),
  block(width: page-w - margin-inner - margin-outer)[
    ${seite.unterzeile ? `#set text(size: 11pt, weight: "bold", fill: col-accent, font: "Inter", tracking: 0.3pt)\n    #set par(justify: false)\n    #upper("${seite.unterzeile}")\n    #v(3mm)` : ""}
    #set text(size: 88pt, weight: "black", fill: white, font: "Inter")
    #set par(leading: 0.78em, justify: false)
    ${seite.headline}
    ${seite.byline ? `#v(4mm)\n    #set text(size: 8pt, weight: "bold", fill: white.transparentize(30%), tracking: 0.6pt, font: "Inter")\n    #upper("${seite.byline}")` : ""}
  ]
)
`;
  }

  if (seite.typ === "intro-page") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const intro = body.slice(0, 600);
    return `
// ── Intro-Seite: Seite ${nr} (ungerade/rechts) ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)

#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#1a2a3a"), rgb("#2e4a5e"), rgb("#4a708a"), angle: 135deg)
  )
)
#place(top + left,
  rect(width: page-w, height: 30mm,
    fill: gradient.linear(rgb("#000000").transparentize(40%), rgb("#000000").transparentize(100%))
  )
)
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
  block(width: page-w, fill: rgb("#ffffff").transparentize(12%),
    inset: (x: margin-inner + 4mm, top: 10mm, bottom: margin-bottom + 6mm),
  )[
    #columns(2, gutter: col-gutter)[
      #set text(size: 13pt, weight: "bold", fill: col-text, font: "Inter")
      #set par(leading: 1.35em, justify: false)
      ${intro}
    ]
  ]
)
`;
  }

  // spread-opener wird zu opener-solo + intro-page aufgeteilt (Legacy-Fallback)
  if (seite.typ === "spread-opener") {
    const [seiteL, seiteR] = Array.isArray(seite.nr) ? seite.nr : [seite.nr, seite.nr + 1];
    return `
// ── Aufmacher-Opener: ${seite.headline} (Seite ${seiteL}) ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#0d1f2d"), rgb("#1e3650"), angle: 155deg)
  )
)
#place(bottom + left,
  rect(width: page-w, height: 110mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(10%))
  )
)
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 8mm),
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 88pt, weight: "black", fill: white, font: "Inter")
    #set par(leading: 0.78em, justify: false)
    ${seite.headline}
  ]
)
#pagebreak()

#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "${seite.rubrik ?? ""}", seite: ${seiteR})
#v(8mm)
${seite.byline ? `#hrule(thickness: 0.3pt)\n#v(2.5mm)\n#t-byline[${seite.byline}]\n#v(2.5mm)\n#hrule(thickness: 0.3pt)\n#v(7mm)` : ""}
#columns(3, gutter: col-gutter)[
  #t-body[${body.slice(0, 2000)}]
]
#place(bottom + right, dy: 12mm, t-pagina(${seiteR}))
`;
  }

  if (seite.typ === "standard-feature") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    return `
// ── Standard Feature: ${seite.headline} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "${seite.rubrik ?? ""}", seite: ${nr})
#v(4mm)
#block(width: page-w - margin-inner - margin-outer, height: 138mm, clip: true)[
  #rect(width: 100%, height: 100%,
    fill: gradient.linear(rgb("#b8c8d8"), rgb("#7899aa"), angle: 175deg))
  #place(center + horizon,
    text(size: 10pt, fill: white.transparentize(40%), font: "Inter")[FOTO])
]
#v(4mm)
#t-dachzeile("${seite.dachzeile ?? ""}")
#v(2mm)
#block(width: 100%)[
  #set text(size: 30pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.87em, justify: false)
  ${seite.headline}
]
${seite.unterzeile ? `#v(3mm)\n#t-unterzeile[${seite.unterzeile}]` : ""}
${seite.byline ? `#v(3mm)\n#hrule(thickness: 0.3pt)\n#v(2mm)\n#t-byline[${seite.byline}]\n#v(2mm)\n#hrule(thickness: 0.3pt)` : ""}
#v(5mm)
#columns(3, gutter: col-gutter)[
  #t-body[${body.slice(0, 1500)}]
]
#place(bottom + right, dy: 12mm, t-pagina(${nr}))
`;
  }

  if (seite.typ === "cover") {
    const teaserStr = (seite.teasers ?? []).join("|");
    return `
// ── U1 Titelseite ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#0d1f2d"), rgb("#1a3a4a"), rgb("#2d5a6a"), angle: 160deg)
  )
)
#place(top + left,
  rect(width: page-w, height: 55mm,
    fill: gradient.linear(rgb("#000000").transparentize(15%), rgb("#000000").transparentize(100%))
  )
)
#place(bottom + left,
  rect(width: page-w, height: 72mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(5%))
  )
)
#place(top + left, dx: margin-outer, dy: margin-top - 4mm, {
  set text(font: "Inter")
  stack(dir: ttb, spacing: 2mm,
    { set text(size: 28pt, weight: "bold", fill: white); upper("${seite.magazin ?? "ppi Cycling"}") },
    line(length: 38mm, stroke: 2pt + col-accent),
    { set text(size: 8pt, fill: white.transparentize(30%), tracking: 0.8pt)
      upper("${seite.ausgabe ?? ""}  ·  ${seite.preis ?? "9,80 €"}") },
  )
})
${seite.headline ? `#place(center + horizon, dy: -18mm,
  block(width: page-w - (margin-outer * 2), {
    set text(size: 52pt, weight: "bold", fill: white, font: "Inter", tracking: -1pt)
    set par(leading: 0.8em, justify: false)
    [${seite.headline}]
  })
)` : ""}
${teaserStr ? `#place(bottom + left, dx: margin-outer, dy: -(margin-bottom - 2mm), {
  let ts = "${teaserStr}".split("|")
  set text(font: "Inter")
  grid(columns: range(ts.len()).map(_ => 1fr), column-gutter: 5mm,
    ..ts.map(t => stack(dir: ttb, spacing: 1.5mm,
      line(length: 100%, stroke: 0.4pt + col-accent),
      v(1.5mm),
      { set text(size: 8pt, fill: white.transparentize(20%)); t.trim() },
    ))
  )
})` : ""}
`;
  }

  if (seite.typ === "kurzmeldungen") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const items = (seite.meldungen ?? [])
      .map(m => `${m.titel}||${m.text}||${m.dachzeile ?? ""}`)
      .join(":::");

    return `
// ── Kurzmeldungen Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#block(width: 100%)[
  #rect(width: 100%, height: 7mm, fill: col-accent)
  #place(left + horizon, dx: 4mm, dy: -5mm,
    text(size: 9pt, weight: "bold", fill: white, tracking: 2pt, font: "Inter")[${(seite.rubrik ?? "KURZMELDUNGEN").toUpperCase()}]
  )
]
#v(5mm)
#kolumnentitel(rubrik: "${seite.rubrik ?? "KURZMELDUNGEN"}", seite: ${nr})
#v(2mm)
#columns(2, gutter: col-gutter)[
${(seite.meldungen ?? []).map(m => `
  #t-dachzeile("${m.dachzeile ?? ""}")
  #v(1.5mm)
  #block(width: 100%)[
    #set text(size: 20pt, weight: "bold", fill: col-text, font: "Inter")
    #set par(leading: 0.88em, justify: false)
    ${m.titel}
  ]
  #v(2mm)
  #hrule(thickness: 0.25pt)
  #v(2.5mm)
  #t-body[${m.text}]
  #v(5mm)
`).join("\n")}
]
#place(bottom + right, dy: 12mm, t-pagina(${nr}))
`;
  }

  return `// Unbekannter Seitentyp: ${seite.typ}\n#pagebreak()`;
}

function layoutToTypst(layoutPlan, articles) {
  const seiten = layoutPlan.seiten ?? [];
  const blocks = seiten.map(s => seiteToTypst(s, articles));
  // Erstes Import-Statement nur einmal, dann pagebreaks zwischen Seiten
  const combined = blocks.join("\n#pagebreak()\n");
  // Doppelte imports bereinigen: nur der erste bleibt
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

async function compileTypst(source, env) {
  const bridgeUrl = env.TYPST_BRIDGE_URL ?? TYPST_BRIDGE_LOCAL;
  const res = await fetch(`${bridgeUrl}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Typst-Fehler: ${data.error}`);
  return data.pdf; // base64
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

  const { articles, workspaceId = "ws-ppi-media", issueId } = body;

  if (!articles?.length) return jsonRes({ error: "articles[] erforderlich" }, 400);

  try {
    // 1. Wissen laden
    const [styleGuide, examples] = await Promise.all([
      loadStyleGuide(env.SOCIALFLOW_KV, workspaceId),
      loadExamples(env.SOCIALFLOW_KV, workspaceId, articles.length),
    ]);

    // 2. Claude → Layout-Plan
    const layoutPlan = await generateLayoutPlan(articles, styleGuide, examples, env);

    // 3. Layout-JSON → Typst-Quellcode
    const typstSource = layoutToTypst(layoutPlan, articles);

    // 4. Typst kompilieren → PDF
    const pdfBase64 = await compileTypst(typstSource, env);

    // 5. In KV speichern (für spätere Freigabe/Lern-Zyklus)
    if (issueId && env.SOCIALFLOW_KV) {
      await env.SOCIALFLOW_KV.put(`issue:${workspaceId}:${issueId}:draft`, JSON.stringify({
        layoutPlan,
        typstSource,
        generatedAt: new Date().toISOString(),
        articleIds: articles.map(a => a.id),
      }));
    }

    return jsonRes({ ok: true, pdf: pdfBase64, layoutPlan, pages: layoutPlan.seiten?.length ?? 0 });

  } catch (err) {
    console.error("print-generate Fehler:", err.message);
    return jsonRes({ ok: false, error: err.message }, 500);
  }
}
