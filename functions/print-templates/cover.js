// ─────────────────────────────────────────────────────────────────────────────
// print-templates/cover.js — U1 Titelseite für ppi Cycling Magazin
//
// export function buildCoverPage(data, assets)
//
// data = {
//   magazin?:    string,      // "ppi CYCLING"
//   ausgabe?:    string,      // "September 2026"
//   preis?:      string,      // "€ 4,90"
//   headline?:   string,      // Hauptzeile; \n für Zeilenumbruch
//   unterzeile?: string,      // Kurze Aussage direkt unter der Headline
//   teasers?:    string[],    // bis zu 4 Teaserzeilen am Seitenende
//   bildKey?:    string,      // Asset-Key (Standard: "cover")
// }
// assets = { "images/cover.jpg": true, ... }
// ─────────────────────────────────────────────────────────────────────────────

// ── Lokale Hilfsfunktionen (self-contained, kein import) ─────────────────────

function esc(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/#/g, "\\#")
    .replace(/\n/g, " ")
    .slice(0, 400);
}

function splitHeadline(raw) {
  return String(raw ?? "")
    .replace(/^\[|\]$/g, "")
    .split(/\\n|\n/)
    .filter(l => l.trim().length > 0);
}

function hasBild(key, assets) {
  return !!assets[`images/${key}.jpg`];
}

function imgFull(key, assets, w = "page-w", h = "page-h") {
  if (hasBild(key, assets))
    return `image("images/${key}.jpg", width: ${w}, height: ${h}, fit: "cover")`;
  return `rect(width: ${w}, height: ${h}, fill: gradient.linear(rgb("#0a1828"), rgb("#1a3550"), rgb("#0a1828"), angle: 160deg))`;
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export function buildCoverPage(data, assets) {
  // ── Daten aufbereiten ──
  const headlineLines = splitHeadline(data.headline ?? "PULSSCHLAG");
  // " \\ " → im Ausgabestring: Space + Backslash + Space = Typst-Zeilenumbruch in Content-Mode
  const headlineTypst = headlineLines.map(esc).join(" \\ ");

  const teasers = (data.teasers ?? []).slice(0, 4).map(t => String(t ?? ""));
  while (teasers.length < 4) teasers.push("");
  const hasTeasers = teasers.some(t => t.trim().length > 0);

  const bildKey = data.bildKey   ?? "cover";
  const magazin = esc(data.magazin   ?? "ppi CYCLING");
  const ausgabe = esc(data.ausgabe   ?? "");
  const preis   = esc(data.preis     ?? "€ 4,90");
  const unterz  = esc(data.unterzeile ?? "");

  // ── Teaser-Spalten für das untere Grid ──
  const teaserCols = teasers.map(t => {
    const txt = esc(t.slice(0, 52));
    return `stack(dir: ttb, spacing: 1.5mm,
      line(length: 100%, stroke: 0.6pt + rgb("#0077B5")),
      v(1mm),
      { set text(size: 7.5pt, fill: white.transparentize(15%), font: "Inter", lang: "de"); set par(justify: false, leading: 3.5pt); [${txt}] },
    )`;
  }).join(",\n      ");

  // Headline-Block: Abstand vom unteren Seitenrand
  // Wenn Teaser-Leiste vorhanden: 44mm (über dem ~30mm-Balken) + Puffer
  const headlineDy = hasTeasers ? "-44mm" : "-16mm";

  // Unterzeile-Block (optional)
  const unterzeileItem = unterz
    ? `{
      set text(font: "Inter", size: 13pt, weight: "light", fill: white.transparentize(22%))
      set par(justify: false, leading: 1.35em)
      [${unterz}]
    }`
    : "";

  // Stack-Items für den Headline-Bereich zusammenbauen
  const headlineStackItems = [
    `t-headline-opener(size: 80pt)[${headlineTypst}]`,
    ...(unterzeileItem ? [unterzeileItem] : []),
  ].join(",\n      ");

  // Teaser-Leiste (bedingt)
  const teaserBlock = hasTeasers
    ? `// Teaser-Leiste ganz unten
#place(bottom + left)[
  #block(width: page-w, fill: rgb("#000000").transparentize(28%),
    inset: (x: margin-outer, top: 4mm, bottom: margin-bottom))[
    #set text(font: "Inter")
    #grid(
      columns: (1fr, 1fr, 1fr, 1fr),
      column-gutter: 4mm,
      ${teaserCols}
    )
  ]
]`
    : "";

  return `// ── U1 Titelseite ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm,
  background: ${imgFull(bildKey, assets)})

// Dunkler Gradient oben — sichert Logo-Lesbarkeit über hellem Foto
#place(top + left,
  rect(width: page-w, height: 80mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(18%),
      rgb("#000000").transparentize(100%),
      angle: 90deg
    )
  )
)

// Blauer Winkelbalken oben-links — subtiles Designelement
#place(top + left,
  polygon(
    fill: rgb("#0077B5").transparentize(72%),
    (0mm, 0mm), (62mm, 0mm), (0mm, 34mm)
  )
)

// Logo-Bereich: Wortmarke + blaue Trennlinie + Datum/Preis
#place(top + left, dx: margin-inner, dy: 10mm,
  block(width: page-w - margin-inner - margin-outer)[
    #set text(font: "Inter", size: 34pt, weight: "black", fill: white, tracking: -0.5pt)
    #set par(justify: false, leading: 0.85em)
    ${magazin}
    #v(3mm)
    #line(length: 50mm, stroke: 1.8pt + rgb("#0077B5"))
    #v(2.5mm)
    #grid(columns: (1fr, auto), align: horizon,
      {
        set text(size: 8pt, weight: "regular", fill: white.transparentize(28%), tracking: 0.3pt, font: "Inter")
        set par(justify: false)
        [${ausgabe}]
      },
      {
        set text(size: 8pt, weight: "bold", fill: white.transparentize(22%), font: "Inter")
        set par(justify: false)
        [${preis}]
      },
    )
  ]
)

// Headline + Unterzeile — unteres Drittel der Seite, linksbündig ab margin-inner
#place(bottom + left, dx: margin-inner, dy: ${headlineDy},
  block(width: page-w - margin-inner - margin-outer)[
    #stack(dir: ttb, spacing: 4.5mm,
      ${headlineStackItems}
    )
  ]
)

${teaserBlock}
`;
}
