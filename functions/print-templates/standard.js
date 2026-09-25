// functions/print-templates/standard.js
// Standard-Feature-Seite: Kolumnentitel + Foto + Headline + 2-Spalten-Text.
// Häufigster Seitentyp im Magazin.

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
function trimBody(text, maxChars = 700) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastBreak = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastBreak > maxChars * 0.5 ? text.slice(0, lastBreak + 1) : sub + "…";
}

// Extrahiert einen Pull-Quote-Satz aus dem rohen Body-Text.
// Nimmt den ~40%-Satz (nicht zu kurz, nicht zu lang).
function extractPullQuote(rawText) {
  if (!rawText || rawText.length < 100) return null;
  const sentences = rawText.split(/(?<=[.!?])\s+/);
  const good = sentences.filter(s => s.length > 55 && s.length < 160);
  if (!good.length) return null;
  return good[Math.floor(good.length * 0.4)] ?? good[0];
}

// ── buildStandardPage ─────────────────────────────────────────────

/**
 * Standard-Feature-Seite mit Kolumnentitel, Foto, Headline und 2-Spalten-Text.
 * Optional: Pull Quote wenn Body lang genug.
 *
 * @param {object} data
 *   nr          – Seitenzahl
 *   rubrik      – z.B. "ERNÄHRUNG"
 *   dachzeile   – z.B. "IM TEST"
 *   headline    – Artikel-Headline, \n für Umbruch
 *   unterzeile  – Erklärende Zeile (Deck)
 *   byline      – Autorenzeile
 *   body        – Fließtext (bis ~700 Zeichen werden dargestellt)
 *   bildKey     – Asset-Key, z.B. "ms-02-1"
 * @param {object} assets  – Map { "images/key.jpg": true }
 * @returns {string} Typst-Quelltext
 */
export function buildStandardPage(data, assets) {
  const headlineLines = splitHeadline(data.headline ?? "KEINE HEADLINE");
  const headlineTypst = headlineLines.map(esc).join(" \\\n    ");

  const rubrik     = esc((data.rubrik    ?? "FEATURE").toUpperCase().slice(0, 20));
  const dachzeile  = esc((data.dachzeile ?? "").toUpperCase());
  const unterzeile = esc(data.unterzeile ?? "");
  const byline     = esc(data.byline ?? "");
  const bild       = data.bildKey ?? "placeholder";

  // Pull-Quote aus rohem Text extrahieren, BEVOR esc() angewendet wird
  const rawBody     = data.body ?? "";
  const pullQuoteRaw = extractPullQuote(rawBody);
  const usePullQuote = !!pullQuoteRaw && rawBody.length > 200;
  const pullQuote   = usePullQuote ? esc(pullQuoteRaw) : "";

  // Body kürzen und aufteilen
  const bodyFull  = trimBody(rawBody, 700);
  const firstLetter = esc(bodyFull.charAt(0) || "D");

  // Für den Split beim Pull-Quote: Aufteilen bei ~50% der Zeichen
  const bodyRest  = bodyFull.slice(1);
  const splitAt   = usePullQuote ? Math.floor(bodyRest.length * 0.5) : bodyRest.length;
  const bodyFirst = esc(bodyRest.slice(0, splitAt));
  const bodySecond = usePullQuote ? esc(bodyRest.slice(splitAt)) : "";

  const unterzeileBlock = unterzeile
    ? `#v(2mm)
#t-unterzeile[${unterzeile}]`
    : "";

  const bylineBlock = byline
    ? `#v(2mm)
#t-byline[Von ${byline}]`
    : "";

  // Zwei Varianten des Column-Blocks: mit und ohne Pull-Quote
  const columnsBlock = usePullQuote
    ? `#columns(2, gutter: col-gutter)[
  #t-dropcap("${firstLetter}")[${bodyFirst}]
  #colbreak()
  #t-pullquote-wide[${pullQuote}]
  #v(3mm)
  #t-body-serif[${bodySecond}]
]`
    : `#columns(2, gutter: col-gutter)[
  #t-dropcap("${firstLetter}")[${bodyFirst}]
]`;

  return `// ── Standard-Feature-Seite ${data.nr ?? "?"} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))

// ── Kolumnentitel ──
#kolumnentitel(rubrik: "${rubrik}", seite: ${data.nr ?? 0})
#v(4mm)

// ── Foto: volle Breite, 100mm Höhe ──
${imgBox(bild, assets, "100%", "100mm")}
#v(5mm)

// ── Headline-Block ──
#t-dachzeile("${dachzeile}")
#v(1.5mm)
#block(width: 100%)[
  #set text(size: 52pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.85em, justify: false)
  ${headlineTypst}
]
${unterzeileBlock}
${bylineBlock}
#v(3mm)
#hrule()
#v(4mm)

// ── 2-Spalten-Fließtext ──
${columnsBlock}
`;
}
