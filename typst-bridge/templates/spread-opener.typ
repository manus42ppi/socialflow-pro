// ─────────────────────────────────────────────────────────────
// spread-opener.typ — Aufmacher-Doppelseite
//
// Layout: Linke Seite = Vollbild, Rechte Seite = Text
// Aufruf über main.typ mit Parametern als Variablen
// ─────────────────────────────────────────────────────────────

#import "base.typ": *

// ── Parameter (werden durch main.typ gesetzt) ──────────────────
#let p-dachzeile  = sys.inputs.at("dachzeile",  default: "REPORTAGE")
#let p-headline   = sys.inputs.at("headline",   default: "Headline fehlt")
#let p-unterzeile = sys.inputs.at("unterzeile", default: "")
#let p-byline     = sys.inputs.at("byline",     default: "")
#let p-body       = sys.inputs.at("body",       default: "")
#let p-seite-l    = int(sys.inputs.at("seite-l", default: "4"))
#let p-seite-r    = int(sys.inputs.at("seite-r", default: "5"))
#let p-image      = sys.inputs.at("image",      default: "")
#let p-rubrik     = sys.inputs.at("rubrik",     default: "")

// ── Seite 1 (Links / Verso) — Vollbild ────────────────────────

#set page(
  width:  page-w,
  height: page-h,
  margin: 0mm,
  numbering: none,
)

// Bild-Hintergrund (fullbleed)
#if p-image != "" {
  place(top + left, image(p-image, width: page-w, height: page-h, fit: "cover"))
} else {
  // Platzhalter: Farbverlauf-ähnliche Fläche
  place(top + left,
    rect(width: page-w, height: page-h,
      fill: gradient.linear(
        luma(30%), luma(15%),
        angle: 135deg
      )
    )
  )
  // Platzhalter-Label
  place(center + horizon,
    text(size: 11pt, fill: white.transparentize(50%), font: "Inter")[
      FOTO · #upper(p-rubrik)
    ]
  )
}

// Pagina unten links (weiß auf Bild)
#place(bottom + left, dx: margin-outer, dy: -10mm,
  text(size: 8pt, fill: white.transparentize(30%), font: "Inter")[#p-seite-l]
)

#pagebreak()

// ── Seite 2 (Rechts / Recto) — Text ───────────────────────────

#set page(
  width:  page-w,
  height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer),
  numbering: none,
)

// Kolumnentitel
#kolumnentitel(rubrik: p-rubrik, seite: p-seite-r)

#v(8mm)

// Dachzeile
#t-dachzeile(p-dachzeile)

#v(4mm)

// Headline
#t-headline(p-headline)

#v(5mm)

// Trennlinie unter Headline
#line(length: 28mm, stroke: 2.5pt + col-accent)

#v(5mm)

// Unterzeile
#if p-unterzeile != "" {
  t-unterzeile(p-unterzeile)
  v(5mm)
}

// Byline
#if p-byline != "" {
  hrule(thickness: 0.3pt)
  v(2.5mm)
  t-byline(p-byline)
  v(2.5mm)
  hrule(thickness: 0.3pt)
  v(6mm)
}

// Fließtext — zweispaltig
#columns(2, gutter: col-gutter)[
  #t-body(p-body)
]

// Pagina unten rechts
#place(bottom + right, dy: 12mm,
  t-pagina(p-seite-r)
)
