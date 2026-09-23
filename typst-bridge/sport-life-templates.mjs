// ─────────────────────────────────────────────────────────────────────────────
// sport-life-templates.mjs — Generisches Designsystem für SPORT & LIFE Magazin
//
// Alle 8 Template-Funktionen nehmen (data, loaded) entgegen:
//   data   = Artikel-Daten-Objekt (Struktur pro Funktion dokumentiert)
//   loaded = { "assetKey-0": "imgs/assetKey-0.jpg", ... }
//
// Abhängigkeiten (lokal definiert; können auch aus sport-life-v6.mjs importiert werden):
//   esc(s), featureText(s, max), catPill(rubrik)
//   imgTypst(key, loaded, w, h)  → #image(...) — nur in [..]-Markup-Blöcken
//   imgCode(key, loaded)         → image(...)  — als Argument (background: etc.)
//   kolumnentitelWeiss(mag, rubrik, seite, gerade)
//   BODY_STYLE
// ─────────────────────────────────────────────────────────────────────────────

// ── Lokale Hilfsfunktionen ────────────────────────────────────────────────────

function esc(s = "") {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/#/g, "\\#")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/"/g, '\\"');
}

function featureText(s = "", max = 480) {
  if (s.length <= max) return esc(s);
  const cut = s.lastIndexOf(". ", max);
  return esc(s.slice(0, cut > 0 ? cut + 1 : max) + " …");
}

const CAT_COLORS = {
  REPORTAGE: "#C8341A",
  TEST:      "#2563EB",
  INTERVIEW: "#7C3AED",
  RATGEBER:  "#059669",
  SPEZIAL:   "#0891B2",
  FEATURE:   "#B45309",
  NEWS:      "#374151",
  STUDIE:    "#0891B2",
  MARKT:     "#92400E",
  EVENT:     "#BE123C",
  TRAINING:  "#6D28D9",
  ERNÄHRUNG: "#15803D",
};

function catPill(cat) {
  const c = CAT_COLORS[cat] || "#FF6B00";
  return `#box(inset: (x: 3.5mm, y: 1.5mm), fill: rgb("${c}"), radius: 2pt)[#set text(size: 7.5pt, tracking: 2pt, fill: white, weight: "bold", font: "Inter"); #set par(justify: false); ${esc(cat)}]`;
}

// Markup-mode image block → nur in [..]-Blöcken verwenden
function imgTypst(key, loaded, w = "100%", h = "60mm") {
  const f = loaded[key];
  if (f) return `#image("${f}", width: ${w}, height: ${h}, fit: "cover")`;
  return `#rect(width: ${w}, height: ${h}, fill: luma(185))`;
}

// Code-mode image → für background:, grid-Zellen etc.
function imgCode(key, loaded) {
  const f = loaded[key];
  if (f) return `image("${f}", width: 100%, height: 100%, fit: "cover")`;
  return `rect(width: 100%, height: 100%, fill: luma(60))`;
}

// Kolumnentitel weiß (für 0mm-Margin-Seiten mit Foto-Hintergrund)
// Rückgabe als String — Verwendung: #place(top + left, [${kolumnentitelWeiss(...)}])
function kolumnentitelWeiss(magazin, rubrik, seite, gerade = false) {
  if (gerade) {
    return `#block(width: 100%, inset: (left: margin-outer, right: margin-inner, top: 6mm, bottom: 0mm))[
  #set text(size: 7pt, fill: white, tracking: 0.4pt, font: "Inter")
  #grid(columns: (8mm, 1fr, auto), column-gutter: 2.5mm, align: horizon,
    box(width: 8mm, height: 5.5mm, fill: col-accent, radius: 0.5pt)[#place(center + horizon)[#set text(size: 7pt, fill: white, weight: "bold"); ${seite}]],
    [#upper("${esc(magazin)}")],
    [#upper("${esc(rubrik)}")],
  )
  #v(1.5mm)
  #line(length: 100%, stroke: 0.4pt + white.transparentize(40%))
]`;
  } else {
    return `#block(width: 100%, inset: (left: margin-outer, right: margin-inner, top: 6mm, bottom: 0mm))[
  #set text(size: 7pt, fill: white, tracking: 0.4pt, font: "Inter")
  #grid(columns: (auto, 1fr, 8mm), column-gutter: 2.5mm, align: horizon,
    [#upper("${esc(rubrik)}")],
    [#align(right)[#upper("${esc(magazin)}")]],
    box(width: 8mm, height: 5.5mm, fill: col-accent, radius: 0.5pt)[#place(center + horizon)[#set text(size: 7pt, fill: white, weight: "bold"); ${seite}]],
  )
  #v(1.5mm)
  #line(length: 100%, stroke: 0.4pt + white.transparentize(40%))
]`;
  }
}

// Standard-Fließtext-Stil (9.5pt / 4.5pt leading)
const BODY_STYLE = `#set text(size: 9.5pt, font: "Inter", fill: col-text, lang: "de")
  #set par(leading: 4.5pt, justify: true, first-line-indent: 3.5mm)`;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: buildCover
// ─────────────────────────────────────────────────────────────────────────────
// Full-Bleed Cover: Ganzseitiges Foto (margin: 0mm), Magazinname + Akzentlinie
// oben links, Hauptheadline unten links (riesig, weiß), Teaserzeilen rechts
// unten, Preis-/Ausgabebereich.
//
// data = {
//   magazinName?: string,    // "SPORT & LIFE"
//   ausgabe: string,         // "Herbst 2026 · Nr. 42"
//   preis?: string,          // "4,90 €"
//   headline: string,        // \n für Zeilenumbruch
//   subheadline?: string,    // Kurzzeile unter der Headline
//   teasers?: string[],      // 2–4 Teaserzeilen rechts unten
// }
// loaded keys: "cover-0"
export function buildCover(data, loaded) {
  const bgImg   = imgCode("cover-0", loaded);
  const mag     = esc(data.magazinName || "SPORT & LIFE");
  const ausgabe = esc(data.ausgabe || "");
  const preis   = esc(data.preis || "4,90 €");
  const headline= esc(data.headline || "");
  const sub     = esc(data.subheadline || "");

  const teasers = (data.teasers || []).map(t =>
    `#grid(columns: (5mm, 1fr), column-gutter: 2mm, align: top,
      [#box(width: 3.5pt, height: 3.5pt, fill: col-accent)],
      [#set text(size: 8pt, fill: white.transparentize(10%), tracking: 0.3pt, font: "Inter"); #set par(justify: false, leading: 3.5pt); ${esc(t)}]
    )`
  ).join("\n#v(4mm)\n");

  return `#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm, background: ${bgImg})
#place(top + left,
  block(width: 100%, height: 100%)[
    // Gradient-Overlay unten (Lesbarkeit Headline + Teasers)
    #place(bottom + left,
      block(width: 100%, height: 70%,
        fill: gradient.linear(black.transparentize(100%), black.transparentize(4%), angle: 90deg)
      )
    )
    // ── Kopfzeile: Wortmarke + Ausgaben-Pill ──
    #place(top + left, block(width: 100%)[
      #box(width: 100%, inset: (x: 12mm, top: 13mm, bottom: 0mm))[
        #grid(columns: (1fr, auto), align: bottom,
          [
            #set text(size: 30pt, weight: "black", fill: white, font: "Inter")
            #set par(leading: 0.70em, justify: false)
            ${mag}
            #v(2mm)
            #box(width: 42mm, height: 3pt, fill: col-accent)
          ],
          [
            #box(inset: (x: 5mm, y: 3mm), fill: col-accent, radius: 2.5pt)[
              #set text(size: 7pt, weight: "bold", fill: white, font: "Inter", tracking: 0.6pt)
              #set par(justify: false)
              ${ausgabe}
            ]
          ]
        )
      ]
    ])
    // ── Hauptheadline unten links (60% Breite) ──
    #place(bottom + left, block(width: 62%)[
      #box(width: 100%, inset: (left: 12mm, right: 4mm, bottom: 28mm, top: 0mm))[
        #block(width: 100%)[
          #set text(size: 56pt, weight: "black", fill: white, font: "Inter")
          #set par(leading: 0.82em, justify: false)
          ${headline.split("\\n").join(" \\\n          ")}
        ]
        ${sub ? `#v(4mm)
        #block(width: 100%)[
          #set text(size: 14pt, weight: "light", fill: white.transparentize(20%), font: "Inter")
          #set par(leading: 1.35em, justify: false)
          ${sub}
        ]` : ""}
      ]
    ])
    // ── Teaser-Spalte unten rechts ──
    #place(bottom + right, block(width: 40%)[
      #box(width: 100%, inset: (left: 0mm, right: 12mm, bottom: 28mm, top: 0mm))[
        #block(width: 100%)[
          #set text(size: 7pt, tracking: 2pt, fill: white.transparentize(40%), weight: "bold", font: "Inter")
          #set par(justify: false)
          AUCH IN DIESEM HEFT
        ]
        #v(3.5mm)
        #line(length: 100%, stroke: 0.5pt + white.transparentize(55%))
        #v(3.5mm)
        ${teasers}
        #v(6mm)
        #line(length: 100%, stroke: 0.5pt + white.transparentize(55%))
        #v(3.5mm)
        #grid(columns: (1fr, auto), align: bottom,
          [#set text(size: 6.5pt, fill: white.transparentize(55%), font: "Inter"); #set par(justify: false); DEUTSCHLAND],
          [#set text(size: 11pt, weight: "bold", fill: white, font: "Inter"); ${preis}]
        )
      ]
    ])
  ]
)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: buildLeitartikel
// ─────────────────────────────────────────────────────────────────────────────
// Editorial: Links Chefredakteur-Portrait (6:7-Ratio), rechts Drop-Cap-Text
// + 2-Spalten-Fließtext + Signatur.
//
// data = {
//   headline: string,
//   dropCapLetter: string,    // Einzelbuchstabe für die Initiale, z. B. "D"
//   dropCapText: string,      // Erster Absatz neben der Initiale
//   body: string,             // Restlicher Text (2-spaltig unterhalb)
//   autor: string,
//   position?: string,        // "Chefredaktion"
//   rubrik?: string,          // "EDITORIAL"
//   seite?: number,
// }
// loaded keys: "portrait-0"
export function buildLeitartikel(data, loaded) {
  const headline = esc(data.headline || "");
  const cap      = esc((data.dropCapLetter || "D").charAt(0));
  const capText  = featureText(data.dropCapText || "", 350);
  const bodyMain = featureText(data.body || "", 700);
  const autor    = esc(data.autor || "");
  const position = esc(data.position || "Chefredaktion");
  const rubrik   = esc(data.rubrik || "EDITORIAL");
  const seite    = data.seite || 3;

  return `#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "${rubrik}", seite: ${seite}, gerade: true)
#v(6mm)

#grid(columns: (46%, 54%), column-gutter: 8mm, align: top,
  // ── Linke Spalte: Portrait (6:7-Ratio, ca. 108 mm hoch) ──
  [
    ${imgTypst("portrait-0", loaded, "100%", "108mm")}
    #v(4mm)
    // Name + Position, oranger Strich oben
    #block(width: 100%, stroke: (top: 2pt + col-accent), inset: (top: 4mm))[
      #block(width: 100%)[
        #set text(size: 9pt, weight: "bold", fill: col-text, font: "Inter")
        #set par(justify: false)
        ${autor}
      ]
      #v(1.2mm)
      #block(width: 100%)[
        #set text(size: 7.5pt, fill: luma(100), font: "Inter")
        #set par(justify: false)
        ${position}
      ]
    ]
  ],
  // ── Rechte Spalte: Editorial-Text ──
  [
    // Rubrik-Label
    #block(width: 100%)[
      #set text(size: 7pt, tracking: 2pt, fill: col-accent, weight: "bold", font: "Inter")
      #set par(justify: false)
      ${rubrik}
    ]
    #v(4mm)
    // Headline
    #block(width: 100%)[
      #set text(size: 22pt, weight: "black", fill: col-text, font: "Inter")
      #set par(leading: 0.92em, justify: false)
      ${headline}
    ]
    #v(5mm)
    #line(length: 100%, stroke: 0.5pt + luma(220))
    #v(5mm)
    // Drop Cap: Initiale (72pt, Orange) + erster Absatz in Grid
    #grid(
      columns: (auto, 1fr),
      column-gutter: 2.5mm,
      align: (bottom, top),
      [
        #set text(size: 72pt, weight: "black", fill: col-accent, font: "Inter")
        #set par(justify: false, leading: 0em)
        ${cap}
      ],
      [
        #set text(size: 9.5pt, font: "Inter", fill: col-text, lang: "de")
        #set par(leading: 4.5pt, justify: true, first-line-indent: 0mm)
        ${capText}
      ]
    )
    #v(4mm)
    // Zweispalten-Fließtext
    #columns(2, gutter: col-gutter)[
      ${BODY_STYLE}
      ${bodyMain}
    ]
    #v(6mm)
    // Signatur
    #line(length: 28mm, stroke: 1.5pt + col-accent)
    #v(3mm)
    #block(width: 100%)[
      #set text(size: 9pt, style: "italic", fill: col-text, font: "Inter")
      #set par(justify: false)
      ${autor}
    ]
    #v(1mm)
    #block(width: 100%)[
      #set text(size: 7.5pt, fill: luma(100), font: "Inter")
      #set par(justify: false)
      ${position}
    ]
  ]
)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: buildReportage
// ─────────────────────────────────────────────────────────────────────────────
// Opener-Doppelseite — gibt ZWEI Seiten zurück (durch \n#pagebreak()\n getrennt).
// Linke Seite: Full-Bleed Foto + Headline overlaid (unten, weiß, groß).
// Rechte Seite: Pullquote (Orange-Block), kleines Bild, 3-Spalten-Fließtext.
//
// data = {
//   headline: string,          // \n für Zeilenumbruch
//   subheadline?: string,
//   body: string,
//   pullquote: string,         // Ohne Anführungszeichen
//   autor?: string,
//   rubrik?: string,           // "REPORTAGE"
//   seiteLinks?: number,       // Seitenzahl linke Seite (rechte = +1)
// }
// loaded keys: "reportage-0" (Hauptfoto), "reportage-1" (kleines Foto rechts)
export function buildReportage(data, loaded) {
  const headline = esc(data.headline || "");
  const sub      = esc(data.subheadline || "");
  const body     = featureText(data.body || "", 900);
  const pq       = esc(data.pullquote || "");
  const autor    = esc(data.autor || "");
  const rubrik   = esc(data.rubrik || "REPORTAGE");
  const seiteL   = data.seiteLinks || 4;
  const seiteR   = seiteL + 1;

  // ── Linke Seite: Full-Bleed Foto ──
  const linksSeite = `#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm, background: ${imgCode("reportage-0", loaded)})
// Gradient-Rampe unten (Lesbarkeit der Headline)
#place(bottom + left,
  block(width: 100%, height: 68%,
    fill: gradient.linear(black.transparentize(100%), black.transparentize(7%), angle: 90deg)
  )
)
// Kolumnentitel weiß über Bild
#place(top + left, [${kolumnentitelWeiss("SPORT & LIFE", data.rubrik || "REPORTAGE", seiteL, true)}])
// Headline-Block unten links
#place(bottom + left, block(width: 100%)[
  #box(width: 100%, inset: (x: margin-inner, bottom: 14mm, top: 0mm))[
    ${catPill(data.rubrik || "REPORTAGE")}
    #v(5mm)
    #block(width: 100%)[
      #set text(size: 66pt, weight: "black", fill: white, font: "Inter")
      #set par(leading: 0.80em, justify: false)
      ${headline.split("\\n").join(" \\\n      ")}
    ]
    ${sub ? `#v(5mm)
    #block(width: 100%)[
      #set text(size: 14pt, weight: "light", fill: white.transparentize(18%), font: "Inter")
      #set par(leading: 1.35em, justify: false)
      ${sub}
    ]` : ""}
    #v(4mm)
    #block(width: 100%)[
      #set text(size: 7.5pt, fill: white.transparentize(55%), tracking: 1.5pt, font: "Inter", weight: "medium")
      #set par(justify: false)
      ${autor ? `TEXT & FOTOS: ${autor.toUpperCase()}` : ""}
    ]
  ]
])`;

  // ── Rechte Seite: Pullquote + Foto + 3-Spalter ──
  const rechtsSeite = `#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-outer, right: margin-inner))
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "${rubrik}", seite: ${seiteR})
#v(5mm)
// Pullquote: volle Breite, orange Block
#block(width: 100%, fill: col-accent, inset: (x: 8mm, y: 8mm), radius: 3pt)[
  #block(width: 100%)[
    #set text(size: 7pt, tracking: 2pt, fill: white.transparentize(30%), weight: "bold", font: "Inter")
    #set par(justify: false)
    SCHLÜSSELSTELLE
  ]
  #v(3mm)
  #block(width: 100%)[
    #set text(size: 13pt, style: "italic", fill: white, font: "Inter", weight: "light")
    #set par(leading: 5pt, justify: false)
    »${pq}«
  ]
]
#v(5mm)
// Kleines Bild: volle Breite
${imgTypst("reportage-1", loaded, "100%", "44mm")}
#v(5mm)
// Dreispalten-Fließtext
#columns(3, gutter: col-gutter)[
  ${BODY_STYLE}
  ${body}
]`;

  return linksSeite + "\n#pagebreak()\n" + rechtsSeite;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4: buildFeature
// ─────────────────────────────────────────────────────────────────────────────
// Full-Bleed Foto oben (50% Seitenhöhe, margin: 0mm), darunter
// 2-Spalten-Text (breit) + schmale Sidebox.
//
// data = {
//   headline: string,
//   subheadline?: string,
//   body: string,
//   sideboxTitle?: string,   // Heading der Sidebox (Standard: "ZUM THEMA")
//   sideboxBody: string,
//   rubrik?: string,         // "FEATURE"
//   seite?: number,
// }
// loaded keys: "feature-0"
export function buildFeature(data, loaded) {
  const headline  = esc(data.headline || "");
  const sub       = esc(data.subheadline || "");
  const body      = featureText(data.body || "", 550);
  const sideTitle = esc(data.sideboxTitle || "ZUM THEMA");
  const sideBody  = featureText(data.sideboxBody || "", 280);
  const rubrik    = esc(data.rubrik || "FEATURE");
  const seite     = data.seite || 5;

  return `#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
// Full-Bleed Foto: 50% Seitenhöhe (148.5mm)
${imgTypst("feature-0", loaded, "100%", "148.5mm")}
// Kolumnentitel weiß über Bild
#place(top + left, [${kolumnentitelWeiss("SPORT & LIFE", data.rubrik || "FEATURE", seite, false)}])
// Rubrik-Pill im unteren Bildbereich (130mm von oben)
#place(top + left, dx: margin-outer, dy: 128mm,
  ${catPill(data.rubrik || "FEATURE")}
)
// Content-Bereich unterhalb Foto (mit Standard-Margin)
#block(width: 100%, inset: (left: margin-outer, right: margin-inner, top: 6mm, bottom: margin-bottom))[
  #grid(columns: (1fr, 52mm), column-gutter: 7mm, align: top,
    // Linke Spalte: Headline + Body-Text
    [
      #block(width: 100%)[
        #set text(size: 26pt, weight: "black", fill: col-text, font: "Inter")
        #set par(leading: 0.88em, justify: false)
        ${headline}
      ]
      ${sub ? `#v(3mm)
      #block(width: 100%)[
        #set text(size: 12pt, weight: "light", fill: luma(55), font: "Inter")
        #set par(leading: 1.4em, justify: false)
        ${sub}
      ]` : ""}
      #v(5mm)
      #set text(size: 9.5pt, font: "Inter", fill: col-text, lang: "de")
      #set par(leading: 4.5pt, justify: true, first-line-indent: 3.5mm)
      ${body}
    ],
    // Rechte Spalte: Sidebox (linker oranger Akzentstrich)
    [
      #block(width: 100%, fill: luma(247),
        stroke: (left: 3pt + col-accent),
        inset: (left: 5mm, right: 5mm, y: 6mm),
        radius: (right: 3pt)
      )[
        #block(width: 100%)[
          #set text(size: 7pt, tracking: 2pt, fill: col-accent, weight: "bold", font: "Inter")
          #set par(justify: false)
          ${sideTitle}
        ]
        #v(3mm)
        #block(width: 100%)[
          #set text(size: 8.5pt, fill: luma(40), font: "Inter", lang: "de")
          #set par(leading: 4.5pt, justify: true, first-line-indent: 0pt)
          ${sideBody}
        ]
      ]
    ]
  )
]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5: buildTest
// ─────────────────────────────────────────────────────────────────────────────
// Test/Review: Headline + Intro, Grid aus Produkt-Karten (2×2 oder 3×2
// je nach Anzahl), jede Karte mit Foto + Name + Wertungsbalken + Specs.
// Optionale Vergleichstabelle darunter.
//
// data = {
//   headline: string,
//   intro?: string,
//   produkte: Array<{
//     key: string,             // Bild-Asset-Key, z. B. "schuh-0-0"
//     name: string,
//     wertung: number,         // 0–10
//     preis?: string,          // "280 €"
//     specs: { [label: string]: string },
//   }>,
//   vergleich?: {
//     headers: string[],
//     rows: string[][],
//   },
//   rubrik?: string,           // "TEST"
//   seite?: number,
// }
// loaded keys: per p.key (z. B. "schuh-0-0", "schuh-1-0" …)
export function buildTest(data, loaded) {
  const headline = esc(data.headline || "");
  const intro    = featureText(data.intro || "", 200);
  const rubrik   = esc(data.rubrik || "TEST");
  const seite    = data.seite || 5;
  const produkte = data.produkte || [];
  const cols     = produkte.length <= 4 ? 2 : 3;

  // ── Produkt-Karten ──
  const karten = produkte.map((p, idx) => {
    const specs = Object.entries(p.specs || {}).map(([k, v]) =>
      `[#set text(fill: luma(120), tracking: 0.5pt); ${esc(k.toUpperCase())}], ` +
      `[#set text(fill: col-text); ${esc(String(v))}]`
    ).join(",\n          ");
    const scorePercent = Math.round(Math.min((p.wertung || 0) / 10, 1) * 100);
    const scoreStr     = (p.wertung || 0).toFixed(1);

    return `[
    #block(width: 100%, radius: 3pt, fill: rgb("\\#F8FAFF"),
      stroke: 0.75pt + luma(215), clip: true)[
      ${imgTypst(p.key || `produkt-${idx}-0`, loaded, "100%", "34mm")}
      #block(width: 100%, inset: (x: 4.5mm, y: 4mm))[
        #block(width: 100%)[
          #set text(size: 9.5pt, weight: "bold", fill: col-text, font: "Inter")
          #set par(justify: false, leading: 1.1em)
          ${esc(p.name || "")}
        ]
        #v(2.5mm)
        // Wertungsbalken + Punktzahl
        #grid(columns: (1fr, auto), column-gutter: 3mm, align: bottom,
          [
            #block(width: 100%, height: 4pt, fill: luma(225), radius: 2pt)[
              #block(width: ${scorePercent}%, height: 4pt, fill: col-accent, radius: 2pt)[]
            ]
          ],
          [#set text(size: 10pt, weight: "black", fill: col-accent, font: "Inter"); ${scoreStr}]
        )
        #v(3mm)
        #set text(size: 7.5pt, font: "Inter")
        #grid(columns: (auto, 1fr), row-gutter: 1.5mm, column-gutter: 3mm,
          ${specs}
        )
        ${p.preis ? `#v(3mm)
        #align(right)[
          #set text(size: 11pt, weight: "black", fill: rgb("\\#2563EB"), font: "Inter")
          ${esc(p.preis)}
        ]` : ""}
      ]
    ]
  ]`;
  }).join(",\n  ");

  // ── Optionale Vergleichstabelle ──
  let vergleichTable = "";
  if (data.vergleich) {
    const vh = data.vergleich.headers || [];
    const vr = data.vergleich.rows    || [];
    const colDef  = `(${vh.map((_, i) => i === 0 ? "1.5fr" : "1fr").join(", ")})`;
    const headers = vh.map(h =>
      `[#set text(size: 7pt, tracking: 1pt, weight: "bold", fill: luma(80), font: "Inter"); #set par(justify: false); ${esc(h.toUpperCase())}]`
    ).join(", ");
    const rows = vr.map(row =>
      row.map((c, i) =>
        `[#set text(size: 8pt, font: "Inter"${i === 0 ? `, weight: "bold", fill: col-text` : `, fill: luma(55)`}); #set par(justify: false); ${esc(String(c))}]`
      ).join(", ")
    ).join(",\n    ");

    vergleichTable = `
#v(6mm)
#line(length: 100%, stroke: 0.5pt + luma(215))
#v(3mm)
#block(width: 100%)[
  #set text(size: 7pt, tracking: 2pt, fill: luma(100), weight: "bold", font: "Inter")
  #set par(justify: false)
  VERGLEICH IM ÜBERBLICK
]
#v(3mm)
#table(
  columns: ${colDef},
  stroke: (x, y) => if y == 0 { (bottom: 0.8pt + col-accent) } else { (bottom: 0.4pt + luma(225)) },
  fill: (x, y) => if calc.rem(y, 2) == 0 { luma(249) } else { white },
  inset: (x: 3mm, y: 3mm),
  ${headers},
  ${rows}
)`;
  }

  return `#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "${rubrik}", seite: ${seite})
#v(5mm)
#grid(columns: (1fr, auto), align: bottom,
  [
    ${catPill(data.rubrik || "TEST")}
    #v(2.5mm)
    #block(width: 100%)[
      #set text(size: 28pt, weight: "black", fill: col-text, font: "Inter")
      #set par(leading: 0.9em, justify: false)
      ${headline}
    ]
  ],
  []
)
${intro ? `#v(3mm)
#block(width: 100%)[
  #set text(size: 9.5pt, font: "Inter", fill: luma(55), lang: "de")
  #set par(leading: 4.5pt, justify: false, first-line-indent: 0pt)
  ${intro}
]` : ""}
#v(5mm)
#grid(columns: (${Array(cols).fill("1fr").join(", ")}),
  column-gutter: col-gutter, row-gutter: col-gutter,
  ${karten}
)
${vergleichTable}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 6: buildInterview
// ─────────────────────────────────────────────────────────────────────────────
// Split-Page: Links 48% Full-Bleed Portrait (margin: 0mm), Rechts 52%:
// Rubrik → Headline → Unterzeile kursiv → Schlüsselzitat (Orange-Box) → Q&A.
// Fragen: Bold/Orange. Antworten: Normal.
//
// data = {
//   name?: string,              // z. B. "Dr. Sarah Klein, Charité Berlin"
//   titel: string,              // Haupt-Headline (Zitat oder Name, \n erlaubt)
//   unterzeile?: string,        // Kursiv
//   schluesselzitat: string,    // Ohne Anführungszeichen
//   qa: Array<{ frage: string, antwort: string }>,
//   rubrik?: string,            // "INTERVIEW"
//   seite?: number,
// }
// loaded keys: "interview-0" (Portrait, hochformat)
export function buildInterview(data, loaded) {
  const name            = esc(data.name || "");
  const titel           = esc(data.titel || "");
  const unterzeile      = esc(data.unterzeile || "");
  const schluesselzitat = esc(data.schluesselzitat || "");
  const rubrik          = esc(data.rubrik || "INTERVIEW");
  const seite           = data.seite || 6;
  const qa              = data.qa || [];

  const qaBlocks = qa.map(item =>
    `#block(width: 100%, inset: (bottom: 2.5mm))[
    #block(width: 100%)[
      #set text(size: 9pt, weight: "bold", fill: col-accent, font: "Inter")
      #set par(justify: false, leading: 4pt)
      ${esc(item.frage)}
    ]
    #v(1.5mm)
    #block(width: 100%)[
      #set text(size: 9.5pt, fill: col-text, font: "Inter", lang: "de")
      #set par(leading: 4.5pt, justify: true, first-line-indent: 0pt)
      ${featureText(item.antwort || "", 300)}
    ]
  ]`
  ).join("\n#v(2.5mm)\n");

  return `#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#grid(
  columns: (48%, 52%),
  rows: (page-h,),
  // Linke Spalte: Full-Bleed Portrait
  [
    #box(width: 100%, height: page-h, clip: true)[
      ${imgTypst("interview-0", loaded, "100%", "100%")}
    ]
    // Weicher Übergang zur rechten Seite
    #place(top + right,
      block(width: 35%, height: page-h,
        fill: gradient.linear(white.transparentize(100%), white.transparentize(0%), angle: 0deg)
      )
    )
  ],
  // Rechte Spalte: Inhalt
  [
    #block(width: 100%, height: 100%,
      inset: (left: 7mm, right: margin-inner, top: margin-top, bottom: margin-bottom)
    )[
      #kolumnentitel(magazin: "SPORT & LIFE", rubrik: "${rubrik}", seite: ${seite})
      #v(7mm)
      ${catPill(data.rubrik || "INTERVIEW")}
      #v(4mm)
      // Haupt-Headline
      #block(width: 100%)[
        #set text(size: 22pt, weight: "black", fill: col-text, font: "Inter")
        #set par(leading: 0.95em, justify: false)
        ${titel.split("\\n").join(" \\\n        ")}
      ]
      ${unterzeile ? `#v(2.5mm)
      #block(width: 100%)[
        #set text(size: 10pt, style: "italic", fill: luma(80), font: "Inter")
        #set par(justify: false, leading: 1.35em)
        ${unterzeile}
      ]` : ""}
      ${name ? `#v(2mm)
      #block(width: 100%)[
        #set text(size: 7.5pt, fill: luma(130), font: "Inter", tracking: 0.3pt)
        #set par(justify: false)
        ${name}
      ]` : ""}
      #v(6mm)
      // SCHLÜSSELZITAT (Orange-Block)
      #block(width: 100%, fill: col-accent, inset: (x: 6mm, y: 7mm), radius: 3pt)[
        #block(width: 100%)[
          #set text(size: 6.5pt, tracking: 2pt, fill: white.transparentize(35%), weight: "bold", font: "Inter")
          #set par(justify: false)
          SCHLÜSSELZITAT
        ]
        #v(3mm)
        #block(width: 100%)[
          #set text(size: 12pt, style: "italic", fill: white, font: "Inter", weight: "light")
          #set par(leading: 5pt, justify: false)
          »${schluesselzitat}«
        ]
      ]
      #v(6mm)
      // Q&A: 2 Spalten
      #columns(2, gutter: col-gutter)[
        ${qaBlocks}
      ]
    ]
  ]
)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 7: buildSpecial
// ─────────────────────────────────────────────────────────────────────────────
// Infografik-Seite: Große Zahl/Statistic als 120pt-Anker, Erklärungs-Text,
// strukturierte Infoboxen nebeneinander (2–3 Spalten), 1 Bild.
//
// data = {
//   headline: string,
//   ankerzahl: string | number,  // z. B. "VO2max", "171", "4:32"
//   ankereinheit?: string,       // z. B. "ml/min/kg"
//   ankertext?: string,          // Erklärungs-Satz (max. 250 Zeichen)
//   infoboxen: Array<{
//     titel: string,
//     content: string,
//   }>,
//   rubrik?: string,             // "SPEZIAL"
//   seite?: number,
// }
// loaded keys: "special-0"
export function buildSpecial(data, loaded) {
  const headline     = esc(data.headline || "");
  const ankerzahl    = esc(String(data.ankerzahl || ""));
  const ankereinheit = esc(data.ankereinheit || "");
  const ankertext    = featureText(data.ankertext || "", 250);
  const rubrik       = esc(data.rubrik || "SPEZIAL");
  const seite        = data.seite || 7;
  const infoboxen    = data.infoboxen || [];
  const boxCols      = Math.min(Math.max(infoboxen.length, 2), 3);

  const boxen = infoboxen.map(box => `[
    #block(width: 100%, fill: luma(247), stroke: 0.5pt + luma(215),
      inset: (x: 5mm, y: 5mm), radius: 3pt)[
      #block(width: 100%)[
        #set text(size: 7pt, tracking: 2pt, fill: col-accent, weight: "bold", font: "Inter")
        #set par(justify: false)
        ${esc((box.titel || "").toUpperCase())}
      ]
      #v(2.5mm)
      #block(width: 100%)[
        #set text(size: 8.5pt, fill: col-text, font: "Inter", lang: "de")
        #set par(leading: 4.5pt, justify: true, first-line-indent: 0pt)
        ${featureText(box.content || "", 200)}
      ]
    ]
  ]`).join(",\n  ");

  return `#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "${rubrik}", seite: ${seite})
#v(6mm)
#grid(columns: (1fr, auto), align: bottom,
  [
    ${catPill(data.rubrik || "SPEZIAL")}
    #v(2.5mm)
    #block(width: 100%)[
      #set text(size: 26pt, weight: "black", fill: col-text, font: "Inter")
      #set par(leading: 0.9em, justify: false)
      ${headline}
    ]
  ],
  []
)
#v(6mm)
// ── Ankerzahl: 120pt visueller Gravitationspunkt ──
#block(width: 100%, stroke: (top: 2pt + col-accent, bottom: 1pt + luma(220)), inset: (y: 6mm))[
  #grid(columns: (auto, 1fr), column-gutter: 8mm, align: bottom,
    [
      #set text(size: 120pt, weight: "black", fill: col-accent, font: "Inter")
      #set par(leading: 0.75em, justify: false)
      ${ankerzahl}
    ],
    [
      ${ankereinheit ? `#block(width: 100%)[
        #set text(size: 18pt, weight: "bold", fill: col-text, font: "Inter")
        #set par(justify: false, leading: 1.1em)
        ${ankereinheit}
      ]
      #v(2mm)` : ""}
      #block(width: 100%)[
        #set text(size: 9.5pt, fill: luma(60), font: "Inter", lang: "de")
        #set par(leading: 4.5pt, justify: true, first-line-indent: 0pt)
        ${ankertext}
      ]
    ]
  )
]
#v(6mm)
// ── Bild links + Infoboxen rechts ──
#grid(columns: (1fr, 1.3fr), column-gutter: 8mm, align: top,
  [${imgTypst("special-0", loaded, "100%", "78mm")}],
  [
    #grid(columns: (${Array(boxCols).fill("1fr").join(", ")}),
      column-gutter: col-gutter, row-gutter: col-gutter,
      ${boxen}
    )
  ]
)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 8: buildNews
// ─────────────────────────────────────────────────────────────────────────────
// News-Seite: "NEWS" als 44pt-Seitenheader, 3 Spalten mit je 2 Items.
// Jedes Item: farbiger Category-Pill (6.5pt caps), Bold-Headline (9.5pt),
// Body (8.5pt). Automatischer Spaltenumbruch nach ⌈n/3⌉ Items.
//
// data = {
//   seite?: number,
//   headlineLabel?: string,   // "NEWS" (Standard)
//   meldungen: Array<{
//     dachzeile: string,      // Pill-Label (Caps, z. B. "STUDIE")
//     cat?: string,           // Farb-Key (REPORTAGE | TEST | NEWS | ...)
//     titel: string,
//     text: string,
//   }>,
// }
export function buildNews(data, loaded) {
  const seite  = data.seite || 9;
  const label  = esc(data.headlineLabel || "NEWS");
  const mel    = data.meldungen || [];
  const perCol = Math.ceil(mel.length / 3);

  const CAT_COLORS_NEWS = {
    REPORTAGE: "#C8341A", TEST: "#2563EB", INTERVIEW: "#7C3AED",
    RATGEBER:  "#059669", SPEZIAL: "#0891B2", NEWS: "#374151",
    STUDIE:    "#0891B2", MARKT: "#92400E",  EVENT: "#BE123C",
    TRAINING:  "#6D28D9", ERNÄHRUNG: "#15803D", KÄLTE: "#0284C7",
    NEUHEIT:   "#7C3AED", PRODUKT: "#B45309", KOFFEIN: "#9A3412",
    UTMB:      "#C8341A",
  };

  const melStr = mel.map((m, i) => {
    const catKey   = m.cat || m.dachzeile || "NEWS";
    const catColor = CAT_COLORS_NEWS[catKey] || "#374151";
    const item = `
#block(width: 100%, inset: (y: 4mm), stroke: (bottom: 0.4pt + luma(215)))[
  #box(inset: (x: 2.5mm, y: 1.2mm), fill: rgb("${catColor}"), radius: 1.5pt)[
    #set text(size: 6.5pt, tracking: 1.5pt, fill: white, weight: "bold", font: "Inter")
    #set par(justify: false)
    ${esc(m.dachzeile || catKey)}
  ]
  #v(2.5mm)
  #block(width: 100%)[
    #set text(size: 9.5pt, weight: "bold", fill: col-text, font: "Inter")
    #set par(leading: 3.5pt, justify: false)
    ${esc(m.titel || "")}
  ]
  #v(2mm)
  #block(width: 100%)[
    #set text(size: 8.5pt, fill: luma(55), font: "Inter", lang: "de")
    #set par(leading: 4pt, justify: true, first-line-indent: 0pt)
    ${featureText(m.text || "", 200)}
  ]
]`;
    const needsBreak = (i + 1) % perCol === 0 && i < mel.length - 1;
    return item + (needsBreak ? "\n#colbreak()" : "");
  }).join("\n");

  return `#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "NEWS", seite: ${seite})
#v(5mm)
// "NEWS" als visueller Anker-Header
#block(width: 100%)[
  #set text(size: 44pt, weight: "black", fill: col-text, font: "Inter")
  #set par(justify: false, leading: 0.85em)
  ${label}
]
#block(width: 100%, height: 3pt, fill: col-accent)
#v(5mm)
// 3 Spalten, je ⌈n/3⌉ Items, dann #colbreak()
#columns(3, gutter: col-gutter)[
${melStr}
]`;
}
