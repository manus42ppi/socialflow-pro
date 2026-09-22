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
                  spalten_standard: 2, spaltenabstand_mm: 4.8 },
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
      "nr": [4, 5],
      "typ": "spread-opener",
      "artikel_id": "story-123",
      "dachzeile": "GRAVEL CYCLING · REPORTAGE",
      "headline": "Schotter, Staub und Freiheit",
      "unterzeile": "Wie Gravel Bikes...",
      "byline": "Von Max Mustermann · Fotos: Anna Beispiel",
      "body_woerter": 350,
      "rubrik": "FAHRTECHNIK",
      "bild_empfehlung": "Starkes Querformat, Natur/Bewegung"
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
- Aufmacher-Spread (Typ "spread-opener"): NUR wenn Artikel ≥ 600 Wörter UND starkes Bild vorhanden. Braucht 2 Seiten (links=Bild, rechts=Text). Beginnt immer auf ungerader Seite (rechts).
- Standard-Feature (Typ "standard-feature"): 1 Seite, Bild oben, Text unten.
- Kurzmeldungen (Typ "kurzmeldungen"): Mehrere kurze Artikel auf einer Seite.
- Seiten beginnen bei 4 (U1=1, U2=2, IHV=3 sind reserviert).
- Ungerade Seitenzahlen = rechts, gerade = links.

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

  if (seite.typ === "spread-opener") {
    const [seiteL, seiteR] = Array.isArray(seite.nr) ? seite.nr : [seite.nr, seite.nr + 1];
    return `
// ── Aufmacher-Doppelseite: ${seite.headline} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)

#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#1a2a1a"), rgb("#2d4a2d"), angle: 135deg)
  )
)
#place(bottom + left, dx: margin-outer, dy: -8mm,
  text(size: 8pt, fill: white.transparentize(40%), font: "Inter")[${seiteL}]
)
#pagebreak()

#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "${seite.rubrik ?? ""}", seite: ${seiteR})
#v(8mm)
#t-dachzeile("${seite.dachzeile ?? ""}")
#v(3.5mm)
#t-headline-lg[${seite.headline}]
#v(5mm)
#line(length: 30mm, stroke: 2.5pt + col-accent)
#v(5mm)
${seite.unterzeile ? `#t-unterzeile[${seite.unterzeile}]\n#v(5mm)` : ""}
${seite.byline ? `#hrule(thickness: 0.3pt)\n#v(2.5mm)\n#t-byline[${seite.byline}]\n#v(2.5mm)\n#hrule(thickness: 0.3pt)\n#v(7mm)` : ""}
#columns(2, gutter: col-gutter)[
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
#columns(2, gutter: col-gutter)[
  #t-body[${body.slice(0, 1500)}]
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
