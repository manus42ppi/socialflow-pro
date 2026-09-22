// ─────────────────────────────────────────────────────────────
// cover.typ — U1 Titelseite (Umschlagseite 1)
//
// Layout: Vollbild-Foto, Magazintitel oben, Teaserleiste unten
// Seitentyp in Ausgabe-Plan: "cover"
// ─────────────────────────────────────────────────────────────

#import "base.typ": *

#let p-magazin    = sys.inputs.at("magazin",    default: "ppi Cycling")
#let p-ausgabe    = sys.inputs.at("ausgabe",    default: "Oktober 2026")
#let p-preis      = sys.inputs.at("preis",      default: "9,80 €")
#let p-image      = sys.inputs.at("image",      default: "")
#let p-dachzeile  = sys.inputs.at("dachzeile",  default: "")
#let p-headline   = sys.inputs.at("headline",   default: "")
#let p-teasers    = sys.inputs.at("teasers",    default: "")
#let p-heft-nr    = sys.inputs.at("heft-nr",    default: "10/26")

// ── U1: Vollbild, randabfallend ────────────────────────────────
#set page(
  width:  page-w,
  height: page-h,
  margin: 0mm,
  numbering: none,
)

// Hintergrund: Foto oder Platzhalter-Verlauf
#if p-image != "" {
  place(top + left, image(p-image, width: page-w, height: page-h, fit: "cover"))
} else {
  place(top + left,
    rect(width: page-w, height: page-h,
      fill: gradient.linear(
        rgb("#0d1f2d"), rgb("#1a3a4a"), rgb("#2d5a6a"),
        angle: 160deg
      )
    )
  )
  // Strukturiertes Muster im Hintergrund
  place(center + horizon,
    text(size: 120pt, fill: white.transparentize(96%), font: "Inter", weight: "bold")[
      BIKE
    ]
  )
}

// Dunkler Gradient oben (für Lesbarkeit Magazinname)
place(top + left,
  rect(width: page-w, height: 55mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(15%),
      rgb("#000000").transparentize(100%),
    )
  )
)

// Dunkler Gradient unten (für Teaserleiste)
place(bottom + left,
  rect(width: page-w, height: 72mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(100%),
      rgb("#000000").transparentize(5%),
    )
  )
)

// ── Kopfzeile: Magazinname + Ausgabe ──────────────────────────
place(top + left, dx: margin-outer, dy: margin-top - 4mm, {
  set text(font: "Inter")
  stack(dir: ttb, spacing: 2mm,
    // Magazinname
    {
      set text(size: 28pt, weight: "bold", fill: white, tracking: -0.5pt)
      upper(p-magazin)
    },
    // Akzentlinie
    line(length: 38mm, stroke: 2pt + col-accent),
    // Ausgabedaten
    {
      set text(size: 8pt, fill: white.transparentize(30%), tracking: 0.8pt)
      upper(p-ausgabe + "  ·  " + p-heft-nr + "  ·  " + p-preis)
    },
  )
})

// ── Hauptheft-Thema (zentriert auf Bild) ─────────────────────
#if p-headline != "" {
  place(center + horizon, dy: -18mm,
    block(width: page-w - (margin-outer * 2), {
      if p-dachzeile != "" {
        set text(size: 8.5pt, weight: "bold", fill: col-accent, tracking: 1.8pt, font: "Inter")
        upper(p-dachzeile)
        v(3mm)
      }
      set text(size: 52pt, weight: "bold", fill: white, font: "Inter", tracking: -1pt)
      set par(leading: 0.8em, justify: false)
      p-headline
    })
  )
}

// ── Teaserleiste unten ─────────────────────────────────────────
#place(bottom + left, dx: margin-outer, dy: -(margin-bottom - 2mm), {
  set text(font: "Inter")
  // Horizontale Teaserpunkte
  let teasers-list = p-teasers.split("|")
  grid(
    columns: range(teasers-list.len()).map(_ => 1fr),
    column-gutter: 5mm,
    ..teasers-list.map(t => {
      stack(dir: ttb, spacing: 1.5mm,
        line(length: 100%, stroke: 0.4pt + col-accent),
        v(1.5mm),
        {
          set text(size: 8pt, fill: white.transparentize(20%), weight: "medium")
          t.trim()
        },
      )
    })
  )
})
