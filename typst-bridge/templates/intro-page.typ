// ─────────────────────────────────────────────────────────────
// intro-page.typ — Intro-Seite (folgt auf opener-solo)
//
// Layout: Vollbild-Foto + schwebende Textbox unten/mittig.
//         Textbox: fett formatierter Einstieg (~200 Wörter), 2-spaltig.
//
// Regel aus Magazin-Analyse:
//   - Immer ungerade Seite (rechts/recto), direkt nach opener-solo
//   - Foto nimmt gesamte Seite ein
//   - Textbox ist semi-transparent auf dem Foto
//   - Kein Kolumnentitel auf dieser Seite (Foto zu dominant)
//   - Normaler 3-Spalten-Fließtext beginnt erst auf Folgeseiten
//
// Seitentyp in Layout-Plan: "intro-page"
// ─────────────────────────────────────────────────────────────

#import "base.typ": *

#let p-intro      = sys.inputs.at("intro",     default: "")
#let p-image      = sys.inputs.at("image",     default: "")
#let p-seite      = int(sys.inputs.at("seite", default: "7"))
#let p-rubrik     = sys.inputs.at("rubrik",    default: "")

#set page(
  width: page-w, height: page-h,
  margin: 0mm,
  numbering: none,
)

// Vollbild-Foto
#place(top + left,
  if p-image != "" {
    image(p-image, width: page-w, height: page-h, fit: "cover")
  } else {
    rect(
      width: page-w, height: page-h,
      fill: gradient.linear(
        rgb("#1a2a3a"), rgb("#2e4a5e"), rgb("#4a708a"), angle: 135deg
      )
    )
  }
)

// Leichter Gradient oben für Kolumnentitel-Lesbarkeit
#place(top + left,
  rect(
    width: page-w, height: 30mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(40%),
      rgb("#000000").transparentize(100%)
    )
  )
)

// Kolumnentitel oben rechts (ungerade Seite → Pagina rechts)
#place(top + right, dx: -margin-outer, dy: margin-top - 3mm,
  grid(
    columns: (1fr, auto),
    column-gutter: 2.5mm,
    align(left + horizon)[
      #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
      #if p-rubrik != "" { upper(p-rubrik) }
    ],
    box(width: 8mm, height: 5.5mm, fill: col-accent)[
      #place(center + horizon,
        text(size: 7.5pt, weight: "bold", fill: white)[#str(p-seite)]
      )
    ]
  )
)

// Schwebende Textbox — semi-transparent, unten auf dem Foto
#place(bottom + left,
  dx: 0mm, dy: 0mm,
  block(
    width: page-w,
    fill: rgb("#ffffff").transparentize(12%),
    inset: (x: margin-inner + 4mm, top: 10mm, bottom: margin-bottom + 6mm),
  )[
    #if p-intro != "" {
      columns(2, gutter: col-gutter)[
        // Einstieg: erste ~40 Wörter als Pull-Intro fett
        #let words = p-intro.split(" ")
        #let intro-words = words.slice(0, calc.min(40, words.len())).join(" ")
        #let body-words  = words.slice(calc.min(40, words.len())).join(" ")

        #if intro-words != "" {
          set text(size: 13pt, weight: "bold", fill: col-text, font: "Inter")
          set par(leading: 1.35em, justify: false)
          [#intro-words ]
        }
        #if body-words != "" {
          v(3mm)
          t-body[#body-words]
        }
      ]
    }
    // Pagina
    #place(bottom + right, dy: margin-bottom + 2mm,
      set text(size: 8pt, fill: col-caption, font: "Inter")
      [#str(p-seite)]
    )
  ]
)
