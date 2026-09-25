// functions/print-templates/opener.js
// Opener-Seite: Dramatische Vollbild-Seite (linke Seite, gerade Seitenzahl)
// Kein Kolumnentitel — die Seite spricht für sich.

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

// Gibt Typst-Ausdruck OHNE führendes # zurück.
// Verwendung als background-Wert: background: ${imgFull(...)}
// Verwendung als Inline-Element: #${imgFull(...)}
function imgFull(key, assets, w = "page-w", h = "page-h") {
  if (hasBild(key, assets))
    return `image("images/${key}.jpg", width: ${w}, height: ${h}, fit: "cover")`;
  return `rect(width: ${w}, height: ${h}, fill: gradient.linear(rgb("#0a1828"), rgb("#1a3550"), rgb("#0a1828"), angle: 160deg))`;
}

// ── buildOpenerPage ───────────────────────────────────────────────

/**
 * Vollbild-Opener-Seite (linke Seite, gerade Seitenzahl).
 *
 * @param {object} data
 *   nr          – Seitenzahl (gerade, z.B. 4)
 *   rubrik      – z.B. "GESUNDHEIT"
 *   dachzeile   – Kurzer Über-Titel, z.B. "EXKLUSIV-SERIE"
 *   headline    – Haupt-Headline, \n für Umbruch, max 30 Zeichen
 *   unterzeile  – Kurze Ergänzung, 1–2 Sätze
 *   byline      – Autorenzeile, z.B. "Von Max Mustermann"
 *   bildKey     – Asset-Key ohne Prefix, z.B. "ms-01-0"
 * @param {object} assets  – Map { "images/key.jpg": true }
 * @returns {string} Typst-Quelltext
 */
export function buildOpenerPage(data, assets) {
  const headlineLines = splitHeadline(data.headline ?? "PULSSCHLAG");
  // Backslash vor echtem Newline = Typst-Zeilenumbruch innerhalb von [content]
  const headlineTypst = headlineLines.map(esc).join(" \\\n    ");

  const rubrik     = esc((data.rubrik    ?? "FEATURE").toUpperCase().slice(0, 20));
  const dachzeile  = esc((data.dachzeile ?? "").toUpperCase());
  const unterzeile = esc(data.unterzeile ?? "");
  const byline     = esc(data.byline ?? "Die Redaktion");
  const bild       = data.bildKey ?? "placeholder";
  const bildContent = imgFull(bild, assets, "page-w", "page-h");

  return `// ── Opener-Seite ${data.nr ?? "?"} ──
#import "templates/base.typ": *
// Margin 0mm: Vollbild-Bleed zu allen Seiten; background für das Foto
#set page(width: page-w, height: page-h, margin: 0mm,
  background: ${bildContent})

// ── Gradient-Overlay von unten (transparent oben → dunkel unten) ──
#place(bottom + left,
  block(width: 100%, height: 130mm,
    fill: gradient.linear(black.transparentize(100%), black.transparentize(7%), angle: 90deg)
  )
)

// ── Rubrik-Badge oben rechts ──
#place(top + right, dx: -16mm, dy: 18mm,
  box(fill: rgb("#0077B5"), inset: (x: 5mm, y: 2.5mm))[
    #text(size: 7.5pt, weight: "bold", fill: white, tracking: 1.8pt, font: "Inter")[${rubrik}]
  ]
)

// ── Haupt-Textblock unten links ──
// dx: linker Rand, dy negativ = Abstand vom Seitenende
#place(bottom + left, dx: margin-inner, dy: -margin-bottom,
  block(width: 170mm, below: 0pt)[
    #text(size: 8pt, weight: "bold", fill: white, tracking: 2pt, font: "Inter")[${dachzeile}]
    #v(2.5mm)
    #t-headline-opener[${headlineTypst}]
    #v(3mm)
    #text(size: 12pt, weight: "light", fill: white.transparentize(25%), font: "Inter")[${unterzeile}]
    #v(1.5mm)
    #text(size: 8pt, fill: white.transparentize(40%), font: "Inter")[${byline}]
  ]
)

// ── Deko-Linie am unteren Seitenrand ──
#place(bottom + left,
  line(length: page-w, stroke: 0.3pt + white.transparentize(70%))
)
`;
}
