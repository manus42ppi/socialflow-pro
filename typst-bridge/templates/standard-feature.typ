// ─────────────────────────────────────────────────────────────
// standard-feature.typ — Standard Feature-Seite
//
// Layout: Bild oben (~55% der Seite), Text darunter (2 Spalten)
// ─────────────────────────────────────────────────────────────

#import "base.typ": *

#let p-dachzeile  = sys.inputs.at("dachzeile",  default: "BERICHT")
#let p-headline   = sys.inputs.at("headline",   default: "Headline fehlt")
#let p-unterzeile = sys.inputs.at("unterzeile", default: "")
#let p-byline     = sys.inputs.at("byline",     default: "")
#let p-body       = sys.inputs.at("body",       default: "")
#let p-caption    = sys.inputs.at("caption",    default: "")
#let p-seite      = int(sys.inputs.at("seite",  default: "6"))
#let p-image      = sys.inputs.at("image",      default: "")
#let p-rubrik     = sys.inputs.at("rubrik",     default: "")
#let p-spalten    = int(sys.inputs.at("spalten", default: "3"))

#set page(
  width:  page-w,
  height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer),
  numbering: none,
)

// Kolumnentitel
#kolumnentitel(rubrik: p-rubrik, seite: p-seite)

#v(4mm)

// Bild (fullbleed mit negativem margin oder im Textbereich)
#let img-h = 148mm
#block(
  width: page-w - margin-inner - margin-outer,
  height: img-h,
  clip: true,
)[
  #if p-image != "" {
    image(p-image, width: 100%, height: 100%, fit: "cover")
  } else {
    rect(
      width: 100%, height: 100%,
      fill: gradient.linear(luma(70%), luma(50%), angle: 160deg)
    )
    place(center + horizon,
      text(size: 9pt, fill: luma(35%), font: "Inter")[FOTO]
    )
  }
}

// Bildunterschrift
#if p-caption != "" {
  v(1.5mm)
  t-caption(p-caption)
}

#v(5mm)

// Dachzeile
#t-dachzeile(p-dachzeile)
#v(2.5mm)

// Headline
#block(width: 100%)[
  #set text(size: 34pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.85em, justify: false)
  #p-headline
]

#v(3mm)

// Unterzeile
#if p-unterzeile != "" {
  t-unterzeile[#p-unterzeile]
  v(3mm)
}

// Byline
#if p-byline != "" {
  hrule(thickness: 0.3pt)
  v(2mm)
  t-byline(p-byline)
  v(2mm)
  hrule(thickness: 0.3pt)
  v(4mm)
}

// Fließtext
#columns(p-spalten, gutter: col-gutter)[
  #t-body(p-body)
]

// Pagina
#place(bottom + right, dy: 12mm,
  t-pagina(p-seite)
)
