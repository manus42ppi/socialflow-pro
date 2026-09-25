// ─────────────────────────────────────────────────────────────────────────────
// print-templates/editorial.js — Editorial-Seite für ppi Cycling Magazin
//
// export function buildEditorialPage(data, assets)
//
// data = {
//   text?:    string,   // Haupttext des Editorials
//   ausgabe?: string,   // z. B. "September 2026"
// }
// assets = { "images/redaktion.jpg": true, ... }  (optional, wird als Placeholder ersetzt)
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

function featureText(text, max = 600) {
  if (!text) return "";
  if (text.length <= max) return esc(text);
  const sub  = text.slice(0, max);
  const last = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return esc(last > max * 0.5 ? text.slice(0, last + 1) : sub + " …");
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export function buildEditorialPage(data, assets) {
  const ausgabe  = esc(data.ausgabe ?? "");
  const bodyText = featureText(data.text ?? "", 580);

  // Aktuelles Jahr für Copyright
  const year = new Date().getFullYear();

  return `// ── Editorial ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom, left: margin-inner, right: margin-outer))

#kolumnentitel(magazin: "ppi CYCLING", rubrik: "EDITORIAL", seite: 3, gerade: true)
#v(7mm)

// ── Hauptinhalt: zweispaltig (Text links / Foto rechts) ──
#grid(columns: (1fr, 58mm), column-gutter: 9mm, align: top,

  // ── Linke Spalte: Editorial-Text ──
  [
    // Rubrik-Label
    #set text(size: 8pt, weight: "bold", fill: rgb("#0077B5"), tracking: 2.5pt, font: "Inter")
    #set par(justify: false)
    #upper("Editorial")
    #v(2.5mm)
    // Blauer Akzentbalken
    #line(length: 40mm, stroke: 2pt + rgb("#0077B5"))
    #v(6mm)
    // Persönliche Grußformel
    #block(width: 100%)[
      #set text(size: 28pt, weight: "bold", fill: luma(15%), font: "Inter")
      #set par(leading: 0.90em, justify: false)
      Herzlich \\ Willkommen
    ]
    #v(7mm)
    // Fließtext
    #block(width: 100%)[
      #set text(size: 10.5pt, font: "Inter", fill: luma(30%), lang: "de")
      #set par(justify: false, leading: 1.55em, first-line-indent: 0mm)
      ${bodyText}
    ]
    #v(8mm)
    // Unterschrift
    #line(length: 30mm, stroke: 1.5pt + rgb("#0077B5"))
    #v(3mm)
    #block(width: 100%)[
      #set text(size: 9pt, weight: "bold", fill: luma(20%), font: "Inter")
      #set par(justify: false)
      Die Redaktion
    ]
    #v(1.5mm)
    #block(width: 100%)[
      #set text(size: 8pt, fill: luma(120), font: "Inter")
      #set par(justify: false)
      ${ausgabe ? `ppi Cycling — ${ausgabe}` : "ppi Cycling"}
    ]
  ],

  // ── Rechte Spalte: Foto + Infobox ──
  [
    // Redaktionsfoto-Placeholder (88mm hoch)
    #block(width: 100%, height: 88mm,
      fill: luma(220), stroke: 0.5pt + luma(190), radius: 2pt)[
      #place(center + horizon)[
        #set text(size: 8pt, fill: luma(140), font: "Inter")
        #set par(justify: false)
        Redaktionsfoto
      ]
    ]
    #v(5mm)
    // In dieser Ausgabe
    #block(width: 100%, stroke: (left: 2.5pt + rgb("#0077B5")),
      inset: (left: 5mm, right: 0mm, y: 4mm))[
      #block(width: 100%)[
        #set text(size: 7pt, weight: "bold", fill: rgb("#0077B5"), tracking: 1.8pt, font: "Inter")
        #set par(justify: false)
        #upper("In dieser Ausgabe")
      ]
      #v(3mm)
      #block(width: 100%)[
        #set text(size: 8.5pt, fill: luma(55), font: "Inter", lang: "de")
        #set par(leading: 1.48em, justify: false)
        Neue Tests, Reportagen und Hintergrundgeschichten rund um Radsport und Outdoor-Lifestyle — für alle, die mehr wollen als nur Kilometer.
      ]
    ]
  ],
)

// ── Impressum ─────────────────────────────────────────────────────────────────
#place(bottom + left)[
  #block(width: page-w - margin-inner - margin-outer)[
    #line(length: 100%, stroke: 0.4pt + luma(200))
    #v(3.5mm)
    #grid(columns: (1fr, 1fr, 1fr), column-gutter: 6mm, align: top,

      // Spalte 1: Impressum-Basis
      [
        #set text(size: 6.5pt, fill: luma(130), font: "Inter", lang: "de")
        #set par(leading: 1.42em, justify: false)
        #block(width: 100%)[
          #set text(weight: "bold", tracking: 1pt)
          #upper("Impressum")
        ]
        #v(1.5mm)
        ppi Cycling — Erscheinungsweise monatlich \\
        Herausgeber: ppi Media GmbH, Hamburg \\
        Gedruckt auf FSC-zertifiziertem Papier
      ],

      // Spalte 2: Redaktion
      [
        #set text(size: 6.5pt, fill: luma(130), font: "Inter", lang: "de")
        #set par(leading: 1.42em, justify: false)
        #block(width: 100%)[
          #set text(weight: "bold", tracking: 1pt)
          #upper("Redaktion")
        ]
        #v(1.5mm)
        Chefredaktion: ppi Redaktionsteam \\
        Artdirection: ppi Creative Studio \\
        Lektorat: ppi Editorial Office
      ],

      // Spalte 3: Kontakt
      [
        #set text(size: 6.5pt, fill: luma(130), font: "Inter", lang: "de")
        #set par(leading: 1.42em, justify: false)
        #block(width: 100%)[
          #set text(weight: "bold", tracking: 1pt)
          #upper("Kontakt")
        ]
        #v(1.5mm)
        #"redaktion@ppi-cycling.de" \\
        www.ppi-cycling.de \\
        © ${year} ppi Media. Alle Rechte vorbehalten.
      ],
    )
  ]
]
`;
}
