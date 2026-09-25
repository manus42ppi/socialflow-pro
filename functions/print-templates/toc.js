// ─────────────────────────────────────────────────────────────────────────────
// print-templates/toc.js — Inhaltsverzeichnis für ppi Cycling Magazin
//
// export function buildTOCPage(data)
//
// data = {
//   ausgabe?:   string,   // "September 2026"
//   eintraege?: Array<{
//     seite:   number,    // Seitenzahl
//     rubrik:  string,    // z. B. "REPORTAGE"
//     titel:   string,    // Titel des Beitrags
//     teaser?: string,    // Kurze Beschreibung (max. 90 Zeichen)
//   }>
// }
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

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export function buildTOCPage(data) {
  const ausgabe  = esc(data.ausgabe ?? "");
  const eintraege = data.eintraege ?? [];

  // ── TOC-Einträge aufbauen ──
  const entries = eintraege.map((e, idx) => {
    const seite  = Number(e.seite  ?? 4);
    const rubrik = esc((e.rubrik  ?? "").toUpperCase().slice(0, 20));
    const titel  = esc((e.titel   ?? "").slice(0, 60));
    const teaser = esc((e.teaser  ?? "").slice(0, 90));
    const isLast = idx === eintraege.length - 1;

    // Trennlinie nach jedem Eintrag außer dem letzten
    const trennlinie = isLast
      ? ""
      : `\n#v(3.5mm)\n#line(length: 100%, stroke: 0.2pt + luma(210))\n#v(3.5mm)`;

    return `#grid(columns: (14mm, 1fr), column-gutter: 4mm, align: top,
  // Blauer Seiten-Index-Kasten
  box(width: 14mm, height: 14mm, fill: rgb("#0077B5"))[
    #place(center + horizon)[
      #text(size: 11.5pt, weight: "black", fill: white, font: "Inter")[${seite}]
    ]
  ],
  // Eintrag: Rubrik + Titel + Teaser
  stack(dir: ttb, spacing: 1.5mm,
    { set text(size: 7pt, weight: "bold", fill: rgb("#0077B5"), tracking: 1.8pt, font: "Inter"); set par(justify: false); upper("${rubrik}") },
    { set text(size: 14pt, weight: "bold", fill: luma(15%), font: "Inter"); set par(leading: 1.05em, justify: false); ["${titel}"] },
    v(0.5mm),
    { set text(size: 8pt, fill: luma(90), font: "Inter"); set par(leading: 1.42em, justify: false); ["${teaser}"] },
  ),
)${trennlinie}`;
  }).join("\n");

  // Fallback wenn keine Einträge
  const entryBlock = eintraege.length > 0
    ? entries
    : `#block(width: 100%)[
  #set text(size: 9pt, fill: luma(160), font: "Inter")
  #set par(justify: false)
  Keine Einträge vorhanden.
]`;

  return `// ── Inhaltsverzeichnis ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))

#kolumnentitel(magazin: "ppi CYCLING", rubrik: "INHALT", seite: 4, gerade: true)
#v(7mm)

// ── Seitentitel: "IN DIESER AUSGABE" zweifarbig + Datum rechts ──
#grid(columns: (auto, auto, 1fr), column-gutter: 3mm, align: bottom,
  {
    set text(font: "Inter", size: 36pt, weight: "black", fill: luma(15%))
    set par(justify: false, leading: 0.82em)
    [IN DIESER]
  },
  {
    set text(font: "Inter", size: 36pt, weight: "black", fill: rgb("#0077B5"))
    set par(justify: false, leading: 0.82em)
    [AUSGABE]
  },
  align(right + bottom)[
    #set text(size: 9.5pt, fill: luma(130), font: "Inter")
    #set par(justify: false)
    ${ausgabe}
  ],
)
#v(4mm)

// Blauer Trenner unter dem Titel
#line(length: 100%, stroke: 2.5pt + rgb("#0077B5"))
#v(7mm)

// ── TOC-Einträge ──
${entryBlock}
`;
}
