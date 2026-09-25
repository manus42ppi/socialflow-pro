// functions/print-templates/intro.js
// Intro-Seite: Fortsetzung nach dem Opener.
// Foto oben (58% der Seitenhöhe), darunter dunkles Panel mit 2-Spalten-Text.

// ── Helpers ──────────────────────────────────────────────────────

function esc(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/#/g, "\\#")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
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

// Gibt Typst-Box-Ausdruck MIT führendem # zurück — direkt in Template einfügen.
function imgBox(key, assets, w = "100%", h = "80mm") {
  if (hasBild(key, assets))
    return `#box(width: ${w}, height: ${h}, clip: true)[#image("images/${key}.jpg", width: 100%, height: 100%, fit: "cover")]`;
  return `#box(width: ${w}, height: ${h})[#rect(width: 100%, height: 100%, fill: gradient.linear(rgb("#1a2a3a"), rgb("#2e4560"), rgb("#4a6080"), angle: 175deg))]`;
}

// Kürzt Body-Text auf maxChars, bricht an Satzgrenze ab.
function trimBody(text, maxChars = 500) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastBreak = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastBreak > maxChars * 0.5 ? text.slice(0, lastBreak + 1) : sub + "…";
}

// ── buildIntroPage ────────────────────────────────────────────────

/**
 * Intro-Seite (rechte Seite nach dem Opener).
 * Foto oben (172mm), dunkel-blaues Panel unten mit Drop-Cap-Text.
 *
 * @param {object} data
 *   nr          – Seitenzahl (ungerade, z.B. 5)
 *   rubrik      – z.B. "GESUNDHEIT"
 *   dachzeile   – Kurze Rubrikzeile
 *   headline    – Artikel-Headline (darf kürzer sein als auf Opener)
 *   unterzeile  – Optionaler Lead-Satz
 *   byline      – Autorenzeile
 *   body        – Fließtext des Artikels (Anfang)
 *   bildKey     – Asset-Key, z.B. "ms-01-1"
 *   artikelId   – ID des Quell-Artikels (für Weiterlesen-Hinweis, optional)
 * @param {object} assets  – Map { "images/key.jpg": true }
 * @returns {string} Typst-Quelltext
 */
export function buildIntroPage(data, assets) {
  const headlineLines = splitHeadline(data.headline ?? "");
  const headlineTypst = headlineLines.map(esc).join(" \\\n      ");
  const hasHeadline   = headlineLines.length > 0;

  const rubrik     = esc((data.rubrik    ?? "FEATURE").toUpperCase().slice(0, 20));
  const dachzeile  = esc((data.dachzeile ?? "").toUpperCase());
  const unterzeile = esc(data.unterzeile ?? "");
  const byline     = esc(data.byline ?? "");
  const bild       = data.bildKey ?? "placeholder";

  // Drop-Cap: erster Buchstabe + Rest des Texts
  const rawBody  = trimBody(data.body ?? "", 500);
  const firstLetter = esc(rawBody.charAt(0) || "D");
  const restBody    = esc(rawBody.slice(1));

  // Foto-Höhe: 58% der Seitenhöhe ≈ 172mm
  const FOTO_H = "172mm";
  // Dunkles Panel: Rest der verfügbaren Seitenhöhe (page-h − Foto − Unterrand)
  const PANEL_H = "page-h - 172mm - margin-bottom";

  const unterzeileBlock = unterzeile
    ? `#v(2mm)
    #text(size: 10pt, weight: "light", fill: white.transparentize(20%), font: "Inter")[${unterzeile}]`
    : "";

  const bylineBlock = byline
    ? `#v(1.5mm)
    #text(size: 7.5pt, fill: white.transparentize(50%), tracking: 1pt, font: "Inter")[${byline}]`
    : "";

  return `// ── Intro-Seite ${data.nr ?? "?"} ──
#import "templates/base.typ": *
// Kein oberer/seitlicher Rand → Foto blutet zu drei Seiten
#set page(width: page-w, height: page-h,
  margin: (top: 0mm, left: 0mm, right: 0mm, bottom: margin-bottom))

// ── Foto-Bereich oben (${FOTO_H}) ──
${imgBox(bild, assets, "page-w", FOTO_H)}

// ── Dunkles Panel (dunkel-blau #1a2a3a) ──
#block(width: page-w, height: ${PANEL_H}, fill: rgb("#1a2a3a"),
  inset: (left: margin-inner, right: margin-outer, top: 8mm, bottom: 0mm))[
  // Rubrik-Zeile in hellem Blau (auf dunklem Hintergrund)
  #text(size: 7pt, weight: "bold", fill: rgb("#5ab3e8"), tracking: 1.8pt, font: "Inter")[${rubrik}]
  ${dachzeile ? `#text(size: 7pt, fill: rgb("#5ab3e8").transparentize(30%), tracking: 1.8pt, font: "Inter")[  ·  ${dachzeile}]` : ""}
  #v(3mm)
  // Headline im Panel (mittelgroß, weiß)
  ${hasHeadline ? `#block(width: 100%)[
    #set text(size: 26pt, weight: "bold", fill: white, font: "Inter")
    #set par(leading: 0.9em, justify: false)
    ${headlineTypst}
  ]` : ""}
  ${unterzeileBlock}
  ${bylineBlock}
  #v(5mm)
  // 2-Spalten-Fließtext: eigene Drop-Cap-Impl. (t-dropcap setzt col-text, hier weiß benötigt)
  #columns(2, gutter: col-gutter)[
    #grid(columns: (auto, 1fr), column-gutter: 2mm, align: (top, top),
      [#text(size: 34pt, weight: "black", fill: white, font: "Inter")[${firstLetter}]],
      [#set text(size: 9.5pt, fill: white.transparentize(8%), font: "Inter", lang: "de")
       #set par(leading: 4.5pt, justify: true)
       ${restBody}]
    )
  ]
]
`;
}
