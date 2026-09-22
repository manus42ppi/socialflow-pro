// ─────────────────────────────────────────────────────────────
// opener-solo.typ — Vollbild-Eröffnungsseite (Feature Opener)
//
// Layout: Vollbild-Foto (bleed bis Kante), Rubrik im Kolumnentitel,
//         sehr große Headline unten links (80–100pt, weiß, condensed).
//
// Regel aus Magazin-Analyse:
//   - Beginnt IMMER auf gerader Seite (links/verso)
//   - Kein Dachzeile-Label auf der Seite selbst — nur Rubrik im Kolumnentitel
//   - Gefolgt von intro-page (nächste, ungerade Seite)
//
// Seitentyp in Layout-Plan: "opener-solo"
// ─────────────────────────────────────────────────────────────

#import "base.typ": *

#let p-headline   = sys.inputs.at("headline",  default: "Headline fehlt")
#let p-unterzeile = sys.inputs.at("unterzeile", default: "")
#let p-rubrik     = sys.inputs.at("rubrik",    default: "")
#let p-byline     = sys.inputs.at("byline",    default: "")
#let p-image      = sys.inputs.at("image",     default: "")
#let p-seite      = int(sys.inputs.at("seite", default: "6"))
#let p-size       = int(sys.inputs.at("size",  default: "88"))

#set page(
  width: page-w, height: page-h,
  margin: 0mm,
  numbering: none,
)

// Vollbild-Hintergrund (Foto oder Farbverlauf-Placeholder)
#place(top + left,
  if p-image != "" {
    image(p-image, width: page-w, height: page-h, fit: "cover")
  } else {
    rect(
      width: page-w, height: page-h,
      fill: gradient.linear(
        rgb("#0d1f2d"), rgb("#1e3a50"), rgb("#2d5570"), angle: 155deg
      )
    )
  }
)

// Gradient unten für Lesbarkeit der Headline
#place(bottom + left,
  rect(
    width: page-w, height: 110mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(100%),
      rgb("#000000").transparentize(10%)
    )
  )
)

// Kolumnentitel oben (über dem Foto, mit gefärbtem Kästchen)
// Eigenes kleines Kolumnentitel-Strip oben
#place(top + left, dx: margin-inner, dy: margin-top - 3mm,
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
    #grid(
      columns: (auto, 1fr),
      column-gutter: 2.5mm,
      // Seitenzahl-Kästchen
      box(width: 8mm, height: 5.5mm, fill: col-accent)[
        #place(center + horizon,
          text(size: 7.5pt, weight: "bold", fill: white)[#str(p-seite)]
        )
      ],
      // Magazinname + Rubrik rechts
      align(right + horizon)[
        #if p-rubrik != "" {
          upper(p-rubrik)
        }
      ]
    )
  ]
)

// Headline unten links — sehr groß, weiß
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 8mm),
  block(width: page-w - margin-inner - margin-outer)[
    // Unterzeile / Dachzeile-Ersatz
    #if p-unterzeile != "" {
      set text(size: 11pt, weight: "bold", fill: col-accent, font: "Inter", tracking: 0.3pt)
      set par(justify: false)
      upper(p-unterzeile)
      v(3mm)
    }
    // Hauptheadline
    #set text(size: p-size * 1pt, weight: "black", fill: white, font: "Inter")
    #set par(leading: 0.78em, justify: false)
    #p-headline
    // Byline
    #if p-byline != "" {
      v(4mm)
      set text(size: 8pt, weight: "bold", fill: white.transparentize(30%), tracking: 0.6pt, font: "Inter")
      set par(leading: 1.3em, justify: false)
      upper(p-byline)
    }
  ]
)
