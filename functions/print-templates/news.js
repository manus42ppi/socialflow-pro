// functions/print-templates/news.js
// Kurzmeldungen-Seite: 2–3 News-Items mit blauem Header-Balken.

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

// Kürzt Body-Text auf maxChars, bricht an Satzgrenze ab.
function trimBody(text, maxChars = 300) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastBreak = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastBreak > maxChars * 0.5 ? text.slice(0, lastBreak + 1) : sub + "…";
}

// ── buildNewsPage ─────────────────────────────────────────────────

/**
 * Kurzmeldungen-Seite mit 2–3 News-Items.
 * Blauer Header-Balken oben, darunter Meldungen in einer Spalte.
 *
 * @param {object} data
 *   nr         – Seitenzahl
 *   rubrik     – Seitenrubrik, z.B. "NEWS & TRENDS"
 *   meldungen  – Array von { dachzeile?, titel, text, bildKey? }
 *                max. 3 Einträge werden verwendet
 * @returns {string} Typst-Quelltext
 */
export function buildNewsPage(data) {
  const rubrik = esc((data.rubrik ?? "NEWS").toUpperCase().slice(0, 30));
  const nr     = data.nr ?? 0;

  // Max. 3 Meldungen
  const meldungen = (data.meldungen ?? []).slice(0, 3);

  // Meldungen als Typst-Blöcke generieren
  const meldungBlocks = meldungen.map((m, i) => {
    const dachzeile = esc((m.dachzeile ?? "NEWS").toUpperCase().slice(0, 30));
    const titel     = esc((m.titel ?? "Kurzmeldung").slice(0, 80));
    const textBody  = esc(trimBody(m.text ?? "", 300));

    // Trennlinie vor jeder Meldung außer der ersten
    const trennlinie = i > 0
      ? `#v(4mm)
#line(length: 100%, stroke: 0.4pt + rgb("#0077B5").transparentize(60%))
#v(4mm)\n`
      : `#v(4mm)\n`;

    return `${trennlinie}#text(size: 7pt, weight: "bold", fill: rgb("#0077B5"), tracking: 1.8pt, font: "Inter")[${dachzeile}]
#v(1.5mm)
#block(width: 100%)[
  #set text(size: 17pt, weight: "bold", fill: luma(15%), font: "Inter")
  #set par(leading: 1.08em, justify: false)
  ${titel}
]
#v(2.5mm)
#block(width: 100%)[
  #set text(size: 9pt, fill: luma(30%), font: "Inter", lang: "de")
  #set par(leading: 4.5pt, justify: true)
  ${textBody}
]`;
  }).join("\n");

  return `// ── Kurzmeldungen-Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))

// ── Kolumnentitel ──
#kolumnentitel(rubrik: "${rubrik}", seite: ${nr})
#v(4mm)

// ── Blauer Header-Balken (volle Spaltenbreite) ──
#block(width: 100%, fill: rgb("#0077B5"), inset: (x: 5mm, y: 5mm), radius: 2pt)[
  #grid(columns: (1fr, auto), align: (left + horizon, right + horizon),
    [#text(size: 11pt, weight: "black", fill: white, font: "Inter")[NACHRICHTEN]],
    [#text(size: 8pt, fill: white.transparentize(30%), font: "Inter")[${rubrik}]]
  )
]

// ── Meldungen ──
${meldungBlocks}
`;
}
