// Cloudflare Pages Function — POST /print-generate
// "Liquid Layout" — Iteratives KI-Magazin-Layout-System

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

function esc(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/#/g, "\\#")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ")
    .slice(0, 300);
}

function splitHeadline(raw) {
  return String(raw ?? "")
    .replace(/^\[|\]$/g, "")  // strip AI-added brackets
    .split(/\\n|\n/)
    .filter(l => l.trim().length > 0);
}

function introText(text, maxChars = 300) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastDot = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastDot > maxChars * 0.5 ? text.slice(0, lastDot + 1) : sub + "…";
}

function featureText(text, maxChars = 700) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastDot = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastDot > maxChars * 0.5 ? text.slice(0, lastDot + 1) : sub + "…";
}

function extractPullQuote(text) {
  if (!text) return null;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const good = sentences.filter(s => s.length > 55 && s.length < 155);
  if (!good.length) return null;
  return good[Math.floor(good.length * 0.4)] ?? good[0];
}

// ── Style Guide & Lern-Index ───────────────────────────────────

async function loadStyleGuide(kv, workspaceId) {
  const stored = await kv?.get(`brand:${workspaceId}:style-guide`, "json").catch(() => null);
  return stored ?? {
    format: { breite_mm: 210, hoehe_mm: 297, rand_oben_mm: 18.4, rand_unten_mm: 22.1, rand_innen_mm: 19.8, rand_aussen_mm: 16.2 },
    typografie: { display_font: "Inter", text_font: "PT Serif", text_groesse_pt: 8.5, spalten_standard: 2 },
    farben: { akzent_hex: "#0077B5", text_hex: "#111111" },
  };
}

async function loadExamples(kv, workspaceId, articleCount) {
  const index = await kv?.get(`layouts:${workspaceId}:index`, "json").catch(() => null);
  if (!index?.length) return [];
  return index.filter(e => e.approved)
    .sort((a, b) => Math.abs(a.artikel_anzahl - articleCount) - Math.abs(b.artikel_anzahl - articleCount))
    .slice(0, 2)
    .map(e => ({ artikel_anzahl: e.artikel_anzahl, komposition: e.komposition, layout_zusammenfassung: e.layout_zusammenfassung }));
}

// ── KI Layout-Planung (iterativ, 3-Phasen-Prompt) ─────────────

async function generateLayoutPlan(articles, styleGuide, examples, env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY nicht gesetzt");

  const examplesText = examples.length > 0
    ? `\nBEWÄHRTE FREIGABEN ZUM LERNEN:\n${JSON.stringify(examples, null, 2)}\n`
    : "";

  const ausgabe = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const articleSummaries = articles.map((a, i) => {
    const imgCount = a.imageUrls?.length ?? 0;
    const teaser = (a.teaser ?? a.content ?? "").slice(0, 100);
    return `Artikel ${i + 1}:
  id: "${a.id}"
  titel: "${(a.title ?? "").slice(0, 80)}"
  kategorie: "${a.category ?? "feature"}"
  wörter: ${a.wordCount ?? 0}
  bilder: ${imgCount} (bildKey-Muster: ${a.id}-0, ${a.id}-1 etc.)
  teaser: "${teaser}"`;
  }).join("\n\n");

  const prompt = `Du bist Art Director und Chefredakteur eines deutschsprachigen Sport-Lifestyle-Magazins (Radfahren, Gesundheit, Ernährung).
Ausgabe: ${ausgabe} | Zielgruppe: aktive Erwachsene 28–55 Jahre, sportaffin, qualitätsbewusst

${examplesText}
ARTIKEL FÜR DIESE AUSGABE:
${articleSummaries}

════════════════════════════════════════════════════════════
FÜHRE FOLGENDE 3 PHASEN DURCH, GIB NUR DAS ENDRESULTAT ALS JSON AUS:

PHASE 1 — ANALYSE:
• Welcher Artikel ist das Cover-Thema? (stärkste Geschichte, emotionalste Headline-Potenzial, bestes Bild)
• Seitenumfang: Artikel >= 600 Wörter = 3 Seiten (opener+intro+feature), 300-600 = 1-2 Seiten (feature), <300 = Kurzmeldung
• Gesamtseiten = Vielfaches von 4 minus 3 (Cover, Editorial, TOC auto-generiert) → Artikel ab Seite 4
• Decke alle Artikel ab — kein Artikel darf fehlen

PHASE 2 — LAYOUT-ENTWURF:
• Cover mit dem stärksten Artikel-Bild
• Artikel-Seiten ab Seite 4: abwechslungsreicher Rhythmus
• Opener-Solo nur auf geraden Seiten (4, 6, 8 ...)
• Kurze Artikel (<300 Wörter) zusammen auf einer Kurzmeldungen-Seite
• Bilder: verschiedene bildKeys pro Artikel (opener nimmt -0, feature nimmt -1 wenn vorhanden)

PHASE 3 — REVIEW ALS SENIOR ART DIRECTOR:
• Sind alle Seiten gefüllt? Keine leeren?
• Ist Cover-Headline packend (max 25 Zeichen, Schlagwort-style)?
• Hat jeder Opener ein Bild? (nur wenn imageUrls > 0)
• Stimmt der Seitenrhythmus? (Opener → Intro → Feature → News → Opener → ...)
• Sind Seitenzahlen gültig (Vielfaches der Seiten + 3)?
• Gib die verbesserte Finale Version aus

════════════════════════════════════════════════════════════
SEITENTYPEN (NUR FÜR SEITEN AB 4):
• "opener-solo": Vollbild-Feature-Opener. NUR wenn wörter >= 500 UND bilder >= 1. IMMER auf gerader Seite.
  Felder: nr, typ, artikel_id, headline (max 30 Zeichen, mit \\n für Umbruch), unterzeile (1-2 Wörter), byline, rubrik, bildKey
• "intro-page": Kommt DIREKT nach opener-solo (nächste Seite).
  Felder: nr, typ, artikel_id, rubrik, bildKey (zweites Bild wenn vorhanden, sonst -1 oder -0)
• "standard-feature": 1 Seite. Foto oben, 2 Textspalten, Drop Cap, Pull Quote.
  Felder: nr, typ, artikel_id, dachzeile, headline (mit \\n), unterzeile, byline, rubrik, bildKey
• "kurzmeldungen": 1 Seite für 2-4 kurze Artikel (<300 Wörter), 2 Spalten.
  Felder: nr, typ, rubrik, meldungen (Array mit {dachzeile, titel, text max 150 Zeichen})

════════════════════════════════════════════════════════════
AUSGABE — NUR DIESES JSON, KEIN MARKDOWN, KEIN TEXT DAVOR/DANACH:
{
  "cover": {
    "magazin": "ppi Cycling",
    "ausgabe": "${ausgabe}",
    "preis": "9,80 €",
    "headline": "MAX 25 ZEICHEN",
    "unterzeile": "Unterzeile max 40 Zeichen",
    "teasers": ["Teaser 1 (max 26 Z.)", "Teaser 2", "Teaser 3", "Teaser 4"],
    "bildKey": "ms-xx-0",
    "bildArtikelId": "ms-xx"
  },
  "editorial_text": "3-4 Sätze Editorial-Text der die Heft-Themen vorstellt, persönlich und einladend",
  "seiten": [
    { "nr": 4, "typ": "opener-solo", "artikel_id": "ms-xx", "headline": "HEADLINE\\nUMBRUCH", "unterzeile": "Feature", "byline": "Von der Redaktion", "rubrik": "FEATURE", "bildKey": "ms-xx-0" },
    { "nr": 5, "typ": "intro-page", "artikel_id": "ms-xx", "rubrik": "FEATURE", "bildKey": "ms-xx-1" },
    { "nr": 6, "typ": "standard-feature", "artikel_id": "ms-yy", "dachzeile": "TEST", "headline": "TITEL\\nZWEIZEILIG", "unterzeile": "Kurzbeschreibung", "byline": "Redaktion", "rubrik": "TEST", "bildKey": "ms-yy-0" },
    { "nr": 7, "typ": "kurzmeldungen", "rubrik": "NEWS", "meldungen": [{"dachzeile": "MARKT", "titel": "Kurztitel", "text": "Kurztext max 150 Zeichen"}] }
  ]
}

REGELN:
- KEINE echten Zeilenumbrüche in Strings — nutze \\n
- Alle Texte max 80 Zeichen pro Feld
- Seitenzahlen: fortlaufend, Vielfaches von 2 möglich, opener-solo immer gerade`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
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
    throw new Error(`Anthropic-Antwort kein JSON: ${respText.slice(0, 200)}`);
  }
  const text = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Kein JSON in KI-Antwort. Anfang: " + text.slice(0, 200));
  const sanitized = jsonMatch[0].replace(/"(?:[^"\\]|\\.)*"/g, m =>
    m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
  );
  try {
    return JSON.parse(sanitized);
  } catch (err) {
    throw new Error(`Layout-JSON ungültig: ${err.message}. Anfang: ${text.slice(0, 400)}`);
  }
}

// ── Typst-Hilfsfunktionen ──────────────────────────────────────

function imgTypst(bildKey, assets = {}, w = "page-w", h = "page-h") {
  const fn = `${bildKey}.jpg`;
  if (assets[fn]) return `image("${fn}", width: ${w}, height: ${h}, fit: "cover")`;
  return `rect(width: ${w}, height: ${h}, fill: gradient.linear(rgb("#0a1520"), rgb("#1a3040"), rgb("#0a1520"), angle: 160deg))`;
}

function imgBox(bildKey, assets = {}, w = "100%", h = "82mm") {
  const fn = `${bildKey}.jpg`;
  if (assets[fn]) return `#box(width: ${w}, height: ${h}, clip: true)[#image("${fn}", width: 100%, height: 100%, fit: "cover")]`;
  return `#box(width: ${w}, height: ${h})[#rect(width: 100%, height: 100%, fill: gradient.linear(rgb("#1a2a3a"), rgb("#2e4560"), rgb("#4a6080"), angle: 175deg))]`;
}

// ── Strukturseiten (automatisch, kein KI nötig) ────────────────

function buildCoverPage(coverData, articles, assets) {
  const bk = coverData.bildKey ?? `${articles[0]?.id ?? "placeholder"}-0`;
  const teasers = (coverData.teasers ?? []).slice(0, 5).map(t => String(t).slice(0, 30));
  const headlineLines = splitHeadline(coverData.headline ?? "PULSSCHLAG");
  const hasBild = !!assets[`${bk}.jpg`];

  const bgBlock = hasBild
    ? `#place(top + left, image("${bk}.jpg", width: page-w, height: page-h, fit: "cover"))
#place(top + left, rect(width: page-w, height: page-h, fill: rgb("#000000").transparentize(36%)))`
    : `#place(top + left, rect(width: page-w, height: page-h, fill: gradient.linear(rgb("#0a1520"), rgb("#0d2035"), rgb("#163050"), rgb("#0a1520"), angle: 165deg)))`;

  const teaserBlock = teasers.length > 0 ? `
#place(bottom + left)[
  #block(width: page-w, fill: rgb("#000000").transparentize(35%),
    inset: (x: margin-outer, top: 5mm, bottom: margin-bottom + 1mm))[
    #set text(font: "Inter")
    #let ts = (${teasers.map(t => `"${esc(t)}"`).join(", ")},)
    #grid(columns: range(ts.len()).map(_ => 1fr), column-gutter: 4mm,
      ..ts.map(t => stack(dir: ttb, spacing: 2mm,
        line(length: 100%, stroke: 0.5pt + col-accent),
        v(1mm),
        { set text(size: 7.5pt, fill: white.transparentize(12%)); t },
      )))
  ]
]` : "";

  return `// ── U1 Titelseite ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
${bgBlock}
#place(top + left, polygon(fill: rgb("#0077B5").transparentize(82%),
  (0mm, 0mm), (page-w, 0mm), (page-w, 70mm), (0mm, 155mm)))
#place(bottom + left,
  rect(width: page-w, height: 95mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(6%))))
#place(top + left,
  rect(width: page-w, height: 72mm,
    fill: gradient.linear(rgb("#000000").transparentize(12%), rgb("#000000").transparentize(100%))))
#place(top + left, dx: margin-outer, dy: margin-top - 5mm)[
  #set text(font: "Inter")
  #stack(dir: ttb, spacing: 2mm,
    { set text(size: 34pt, weight: "black", fill: white, tracking: -0.5pt); upper("${esc(coverData.magazin ?? "ppi Cycling")}") },
    line(length: 52mm, stroke: 2.5pt + col-accent),
    { set text(size: 8pt, fill: white.transparentize(22%), tracking: 1.2pt); upper("${esc(coverData.ausgabe ?? "")}  ·  ${esc(coverData.preis ?? "9,80 €")}") },
  )
]
#place(center + bottom, dy: -(${teasers.length > 0 ? "82mm" : "52mm"}))[
  #block(width: page-w - (margin-outer * 2.4))[
    #set text(size: 76pt, weight: "black", fill: white, font: "Inter", tracking: -2.5pt)
    #set par(leading: 0.75em, justify: false)
    ${headlineLines.map(esc).join(" \\ ")}
  ]
]
${coverData.unterzeile ? `#place(center + bottom, dy: -(${teasers.length > 0 ? "70mm" : "42mm"}))[
  #block(width: page-w - (margin-outer * 2.4))[
    #set text(size: 14pt, weight: "light", fill: white.transparentize(18%), font: "Inter")
    ${esc(coverData.unterzeile).replace(/^\\\[/, "").replace(/\\\]$/, "")}
  ]
]` : ""}
${teaserBlock}`;
}

function buildEditorialPage(editorialText, ausgabe) {
  const txt = esc(editorialText ?? "Willkommen zu dieser Ausgabe von ppi Cycling. Wir haben für Sie spannende Themen rund um Radfahren, Gesundheit und aktiven Lifestyle zusammengestellt. Viel Freude beim Lesen!");
  return `// ── U2 Editorial + Impressum ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#grid(columns: (1fr, 1fr), column-gutter: col-gutter * 1.5,
  stack(dir: ttb, spacing: 3mm,
    { set text(size: 8pt, weight: "bold", fill: col-accent, tracking: 2.2pt, font: "Inter"); upper("Editorial") },
    hrule(thickness: 0.5pt, color: col-accent),
    v(2mm),
    { set text(size: 24pt, weight: "bold", fill: col-text, font: "Inter"); set par(leading: 0.9em); [Herzlich\\nWillkommen] },
    v(4mm),
    { set text(size: 9.5pt, fill: col-text, font: "Inter"); set par(justify: false, leading: 1.58em); [${txt}] },
    v(8mm),
    hrule(thickness: 0.3pt),
    v(3mm),
    { set text(size: 9pt, weight: "bold", fill: col-text, font: "Inter"); [Die Redaktion] },
    v(0.5mm),
    { set text(size: 8pt, fill: luma(120), font: "Inter"); [ppi Cycling · ${esc(ausgabe)}] },
  ),
  stack(dir: ttb, spacing: 4mm,
    rect(width: 100%, height: 88mm, fill: luma(235), stroke: 0.3pt + luma(200))[
      #place(center + horizon)[
        #set text(size: 9pt, fill: luma(150), font: "Inter")
        [Redaktionsfoto]
      ]
    ],
    { set text(size: 7.5pt, weight: "bold", fill: col-accent, tracking: 1.8pt, font: "Inter"); upper("In dieser Ausgabe") },
    hrule(thickness: 0.3pt, color: col-accent),
    v(1mm),
    { set text(size: 8.5pt, fill: luma(70), font: "Inter"); set par(leading: 1.65em, justify: false); [Entdecken Sie auf den folgenden Seiten unsere sorgfältig recherchierten Beiträge — von Ernährungstipps über Fahrtechnik bis zu exklusiven Produkt-Tests.] },
  ),
)
#place(bottom + left, dy: -(margin-bottom - 2mm))[
  #block(width: page-w - margin-inner - margin-outer)[
    #hrule(thickness: 0.35pt)
    #v(2.5mm)
    #set text(size: 6.5pt, fill: luma(130), font: "Inter")
    #grid(columns: (1fr, 1fr, 1fr), column-gutter: 4mm,
      stack(dir: ttb, spacing: 1.2mm,
        strong[IMPRESSUM],
        [ppi Cycling — Erscheinungsweise monatlich],
        [Herausgeber: ppi Media GmbH, Hamburg],
        [ISSN: DEMO-ISSN · Einzelpreis: 9,80 €],
      ),
      stack(dir: ttb, spacing: 1.2mm,
        strong[REDAKTION],
        [Chefredaktion: ppi Redaktionsteam],
        [Artdirection: ppi Creative Studio],
        [Druck: ppi Print GmbH, Hamburg],
      ),
      stack(dir: ttb, spacing: 1.2mm,
        strong[KONTAKT],
        [redaktion\\@ppi-cycling.de],
        [www.ppi-cycling.de],
        [© ${new Date().getFullYear()} ppi Media. Alle Rechte vorbehalten.],
      ),
    )
  ]
]`;
}

function buildTOCPage(articles, seiten, ausgabe) {
  const pageMap = {};
  for (const s of seiten) {
    if (s.artikel_id && !pageMap[s.artikel_id]) pageMap[s.artikel_id] = s.nr;
  }

  const tocEntries = articles.map(a => {
    const pg = pageMap[a.id] ?? 4;
    const title = esc(a.title ?? "Artikel");
    const teaser = esc((a.teaser ?? a.content ?? "").slice(0, 85));
    const rubrik = esc((a.category ?? "FEATURE").toUpperCase().slice(0, 20));
    return `#grid(columns: (14mm, 1fr), column-gutter: 4mm, align: top,
  box(width: 14mm, height: 14mm, fill: col-accent)[
    #place(center + horizon)[#set text(size: 11.5pt, weight: "black", fill: white, font: "Inter"); [${pg}]]
  ],
  stack(dir: ttb, spacing: 1.5mm,
    { set text(size: 7pt, weight: "bold", fill: col-accent, tracking: 1.8pt, font: "Inter"); upper("${rubrik}") },
    { set text(size: 13pt, weight: "bold", fill: col-text, font: "Inter"); set par(leading: 1.08em); ["${title}"] },
    v(0.5mm),
    { set text(size: 8.5pt, fill: luma(85), font: "Inter"); set par(leading: 1.42em, justify: false); ["${teaser}"] },
  ),
)
#v(3.5mm)
#hrule(thickness: 0.2pt)
#v(3.5mm)`;
  }).join("\n");

  return `// ── Inhaltsverzeichnis Seite 3 ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "INHALT", seite: 3)
#v(5mm)
#grid(columns: (1fr, auto), align: bottom,
  stack(dir: ttb, spacing: 0mm,
    { set text(size: 36pt, weight: "black", fill: col-text, font: "Inter"); [IN DIESER] },
    { set text(size: 36pt, weight: "black", fill: col-accent, font: "Inter"); [AUSGABE] },
  ),
  { set text(size: 8.5pt, fill: luma(130), font: "Inter"); align(right)[${esc(ausgabe)}] },
)
#v(3mm)
#hrule(thickness: 2pt, color: col-accent)
#v(6mm)
${tocEntries}`;
}

// ── Artikel-Seiten ─────────────────────────────────────────────

function seiteToTypst(seite, articles, assets = {}) {
  const art = articles.find(a => a.id === seite.artikel_id) ?? {};
  const body = art.content ?? art.body ?? "";
  const bk = seite.bildKey ?? `${seite.artikel_id ?? "placeholder"}-0`;
  const nr = Array.isArray(seite.nr) ? seite.nr[0] : (seite.nr ?? 4);

  // ── opener-solo ──
  if (seite.typ === "opener-solo" || seite.typ === "spread-opener") {
    const headlineLines = splitHeadline(seite.headline ?? art.title ?? "");
    return `// ── Feature-Opener Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left, ${imgTypst(bk, assets)})
#place(bottom + left, rect(width: page-w, height: 155mm,
  fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(3%))))
#place(top + left, rect(width: page-w, height: 30mm,
  fill: gradient.linear(rgb("#000000").transparentize(20%), rgb("#000000").transparentize(100%))))
#place(top + left, dx: margin-inner, dy: margin-top - 4mm)[
  #block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 7pt, fill: white.transparentize(28%), tracking: 0.5pt, font: "Inter")
    #grid(columns: (auto, 1fr), column-gutter: 3mm,
      box(width: 9mm, height: 6.5mm, fill: col-accent)[
        #place(center + horizon)[#text(size: 8pt, weight: "bold", fill: white)[${nr}]]
      ],
      align(right + horizon)[${seite.rubrik ? `#upper("${esc(seite.rubrik)}")` : ""}]
    )
  ]
]
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 12mm))[
  #block(width: page-w - margin-inner - margin-outer)[
    ${seite.unterzeile ? `#{ set text(size: 9pt, weight: "bold", fill: col-accent, font: "Inter", tracking: 2.2pt); set par(justify: false); upper("${esc(seite.unterzeile)}") }
    #v(4mm)` : ""}
    #{ set text(size: 76pt, weight: "black", fill: white, font: "Inter", tracking: -2pt); set par(leading: 0.77em, justify: false);
      [${headlineLines.map(esc).join(" \\ ")}] }
    ${seite.byline ? `#v(6mm)
    #hrule(thickness: 0.3pt, color: white.transparentize(55%))
    #v(2.5mm)
    #{ set text(size: 8pt, weight: "bold", fill: white.transparentize(22%), tracking: 0.9pt, font: "Inter"); upper("${esc(seite.byline)}") }` : ""}
  ]
]`;
  }

  // ── intro-page ──
  if (seite.typ === "intro-page") {
    const intro = esc(introText(body, 340));
    return `// ── Intro-Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left, ${imgTypst(bk, assets, "page-w", "55%")})
#place(top + left, dy: 49%,
  rect(width: page-w, height: 26mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#0a1520").transparentize(0%))))
#place(bottom + left)[
  #block(width: page-w, height: 46%, fill: rgb("#0a1520"),
    inset: (x: margin-inner + 5mm, top: 12mm, bottom: margin-bottom + 6mm))[
    #columns(2, gutter: col-gutter)[
      #set text(size: 10pt, weight: "regular", fill: rgb("#dce8f4"), font: "Inter")
      #set par(leading: 1.52em, justify: false)
      [${intro}]
    ]
  ]
]
#place(top + right, dx: -margin-outer, dy: margin-top - 4mm)[
  #grid(columns: (1fr, auto), column-gutter: 3mm,
    align(left + horizon)[
      #set text(size: 7pt, fill: white.transparentize(30%), tracking: 0.5pt, font: "Inter")
      ${seite.rubrik ? `#upper("${esc(seite.rubrik)}")` : ""}
    ],
    box(width: 9mm, height: 6.5mm, fill: col-accent)[
      #place(center + horizon)[#text(size: 8pt, weight: "bold", fill: white)[${nr}]]
    ]
  )
]`;
  }

  // ── standard-feature ──
  if (seite.typ === "standard-feature" || seite.typ === "feature-2col") {
    const pullQuote = extractPullQuote(body);
    const featureBody = featureText(body, 650);
    const firstChar = featureBody.slice(0, 1);
    const isLetter = /[a-zA-ZäöüÄÖÜß]/.test(firstChar);
    const bodyRest = esc(isLetter ? featureBody.slice(1) : featureBody);
    const headlineLines = splitHeadline(seite.headline ?? art.title ?? "");

    return `// ── Standard Feature Seite ${nr}: ${esc((seite.headline ?? "").replace(/\\n/g, " ").slice(0, 40))} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "${esc(seite.rubrik ?? "")}", seite: ${nr})
#v(3mm)
${imgBox(bk, assets)}
#v(4mm)
#t-dachzeile("${esc(seite.dachzeile ?? seite.rubrik ?? "")}")
#v(2mm)
#block(width: 100%)[
  #set text(size: 27pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.85em, justify: false)
  ${headlineLines.map(esc).join(" \\ ")}
]
${seite.unterzeile ? `#v(2mm)\n#t-unterzeile[${esc(seite.unterzeile)}]` : ""}
#v(3mm)
${seite.byline ? `#hrule(thickness: 0.35pt)\n#v(2mm)\n#t-byline[${esc(seite.byline)}]\n#v(2mm)\n#hrule(thickness: 0.35pt)\n#v(4mm)` : ""}
#columns(2, gutter: col-gutter)[
  #block(breakable: false)[
    ${isLetter ? `#t-dropcap("${esc(firstChar)}")[${bodyRest}]` : `#t-body-serif[${bodyRest}]`}
  ]
  ${pullQuote ? `\n  #t-pullquote-wide[${esc(pullQuote)}]` : ""}
]`;
  }

  // ── kurzmeldungen ──
  if (seite.typ === "kurzmeldungen") {
    const meldungen = seite.meldungen ?? [];
    const mTypst = meldungen.map((m, i) => {
      const block = `  #t-dachzeile("${esc(m.dachzeile ?? "")}")
  #v(2mm)
  #block(width: 100%)[
    #set text(size: 17pt, weight: "bold", fill: col-text, font: "Inter")
    #set par(leading: 0.88em, justify: false)
    [${esc(m.titel ?? "")}]
  ]
  #v(2.5mm)
  #hrule(thickness: 0.25pt)
  #v(3mm)
  #t-body[${esc((m.text ?? "").slice(0, 250))}]
  #v(7mm)`;
      return (i === 0 && meldungen.length > 1) ? block + "\n  #colbreak()" : block;
    }).join("\n");

    return `// ── Kurzmeldungen Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#block(width: 100%)[
  #box(width: 100%, height: 8.5mm, fill: col-accent)
  #place(left + horizon, dx: 5mm, dy: -6mm)[
    #text(size: 9pt, weight: "bold", fill: white, tracking: 2.5pt, font: "Inter")[${esc((seite.rubrik ?? "NEWS").toUpperCase())}]
  ]
]
#v(5mm)
#kolumnentitel(rubrik: "${esc(seite.rubrik ?? "NEWS")}", seite: ${nr})
#v(5mm)
#columns(2, gutter: col-gutter)[
${mTypst}
]`;
  }

  // Unbekannter Typ — leerer Kommentar (kein Seitenumbruch, kein Inhalt)
  return `// Typ '${seite.typ}' wird übersprungen`;
}

// ── Vollständiges Magazin zusammenbauen ────────────────────────

function buildCompleteLayout(layoutPlan, articles, assets) {
  const coverData = layoutPlan.cover ?? {};
  const ausgabe = coverData.ausgabe ?? new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const seiten = layoutPlan.seiten ?? [];

  const blocks = [];
  let importSeen = false;

  function addBlock(typstCode) {
    const lines = typstCode.split("\n").filter(line => {
      if (line.startsWith("#import")) {
        if (importSeen) return false;
        importSeen = true;
      }
      return true;
    });
    blocks.push(lines.join("\n"));
  }

  // Seite 1: Cover
  addBlock(buildCoverPage(coverData, articles, assets));
  // Seite 2: Editorial + Impressum
  addBlock(buildEditorialPage(layoutPlan.editorial_text, ausgabe));
  // Seite 3: TOC
  addBlock(buildTOCPage(articles, seiten, ausgabe));
  // Artikel-Seiten (überspringt unbekannte Typen)
  for (const seite of seiten) {
    const typst = seiteToTypst(seite, articles, assets);
    if (typst.startsWith("// Typ '")) continue; // unbekannter Typ → kein Block
    addBlock(typst);
  }

  return blocks.join("\n#pagebreak()\n");
}

// ── Bild-Download (Workers-kompatibel, kein Node Buffer) ───────

async function fetchImages(layoutPlan, articles) {
  const assets = {};
  const toFetch = [];

  // Artikel-Seiten
  for (const seite of layoutPlan.seiten ?? []) {
    if (seite.bildKey && seite.bildUrls) {
      seite.bildUrls.forEach(url => toFetch.push({ key: `${seite.bildKey}.jpg`, url }));
    }
  }
  // Cover-Bild
  const coverBk = layoutPlan.cover?.bildKey;
  const coverArtId = layoutPlan.cover?.bildArtikelId;
  if (coverBk) {
    const coverArt = articles.find(a => a.id === coverArtId || coverBk.startsWith(a.id));
    if (coverArt) {
      const idx = parseInt(coverBk.split("-").pop()) || 0;
      const url = coverArt.imageUrls?.[idx];
      if (url) toFetch.push({ key: `${coverBk}.jpg`, url });
    }
  }

  await Promise.allSettled(toFetch.map(async ({ key, url }) => {
    if (assets[key]) return;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const chunks = [];
      for (let i = 0; i < bytes.length; i += 8192) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
      }
      assets[key] = btoa(chunks.join(""));
    } catch { /* Gradient-Fallback */ }
  }));

  return assets;
}

// ── Typst Bridge ───────────────────────────────────────────────

async function compileTypst(source, files, assets, env) {
  const bridgeUrl = env.TYPST_BRIDGE_URL ?? TYPST_BRIDGE_LOCAL;
  let res;
  try {
    res = await fetch(`${bridgeUrl}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, files, assets }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return null; // Bridge nicht erreichbar — plan-only Modus
  }
  const data = await res.json();
  if (!data.ok) throw new Error(`Typst-Fehler: ${data.error}`);
  return data.pdf;
}

// ── Haupt-Handler ──────────────────────────────────────────────

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response("", { headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    }});
  }
  if (request.method !== "POST") return jsonRes({ error: "POST required" }, 405);

  let body;
  try { body = await request.json(); } catch { return jsonRes({ error: "Invalid JSON" }, 400); }

  const { articles, workspaceId = "ws-ppi-media", issueId, templateFiles } = body;
  if (!articles?.length) return jsonRes({ error: "articles[] erforderlich" }, 400);

  try {
    const [styleGuide, examples] = await Promise.all([
      loadStyleGuide(env.SOCIALFLOW_KV, workspaceId),
      loadExamples(env.SOCIALFLOW_KV, workspaceId, articles.length),
    ]);

    const layoutPlan = await generateLayoutPlan(articles, styleGuide, examples, env);

    // bildUrls in Layout-Plan injizieren
    const imageMap = {};
    for (const a of articles) {
      (a.imageUrls ?? []).forEach((url, idx) => { imageMap[`${a.id}-${idx}`] = url; });
    }
    for (const seite of layoutPlan.seiten ?? []) {
      if (seite.bildKey && !seite.bildUrls) {
        const url = imageMap[seite.bildKey];
        if (url) seite.bildUrls = [url];
      }
    }

    // Bilder laden
    const assets = await fetchImages(layoutPlan, articles);

    // Vollständiges Magazin bauen
    const typstSource = buildCompleteLayout(layoutPlan, articles, assets);

    // PDF kompilieren
    const pdfBase64 = await compileTypst(typstSource, templateFiles ?? {}, assets, env);

    if (issueId && env.SOCIALFLOW_KV) {
      await env.SOCIALFLOW_KV.put(`issue:${workspaceId}:${issueId}:draft`, JSON.stringify({
        layoutPlan, typstSource, generatedAt: new Date().toISOString(),
        articleIds: articles.map(a => a.id),
      })).catch(() => {});
    }

    const totalPages = (layoutPlan.seiten?.length ?? 0) + 3; // +Cover+Editorial+TOC
    return jsonRes({ ok: true, pdf: pdfBase64 ?? null, pdfAvailable: !!pdfBase64, layoutPlan, pages: totalPages });

  } catch (err) {
    console.error("Liquid Layout Fehler:", err.message);
    return jsonRes({ ok: false, error: err.message }, 500);
  }
}
