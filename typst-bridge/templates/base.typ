// ─────────────────────────────────────────────────────────────
// base.typ — Gemeinsame Definitionen für alle SocialFlow-Templates
// Alle Maße in mm, Farben als CMYK für Druckausgabe
// ─────────────────────────────────────────────────────────────

// Seitenmaße
#let page-w   = 210mm
#let page-h   = 297mm
#let bleed    = 3mm

// Standardränder (werden pro Template überschrieben)
#let margin-top    = 18.4mm
#let margin-bottom = 22.1mm
#let margin-inner  = 19.8mm
#let margin-outer  = 16.2mm

// Spaltenabstand
#let col-gutter = 4.8mm

// Grundlinienraster
#let baseline = 4.8mm

// Farben — werden vom Brand Style Guide überschrieben
#let col-accent  = cmyk(100%, 45%, 0%, 0%)   // ppi-Blau
#let col-text    = cmyk(0%, 0%, 0%, 92%)      // Fast-Schwarz
#let col-caption = cmyk(0%, 0%, 0%, 60%)      // Grau für Bildtexte
#let col-rule    = cmyk(0%, 0%, 0%, 20%)      // Helle Trennlinie

// Rich Black für große Flächen und Headlines
#let rich-black  = cmyk(40%, 30%, 30%, 100%)

// ── Typografie-Bausteine ───────────────────────────────────────

#let t-dachzeile(content, color: col-accent) = {
  set text(size: 8.5pt, weight: "bold", fill: color, tracking: 1.8pt, font: "Inter")
  upper(content)
}

#let t-headline(content) = {
  set text(size: 52pt, weight: "bold", fill: col-text, font: "Inter")
  set par(leading: 0.82em, justify: false)
  content
}

#let t-headline-lg(content) = {
  set text(size: 68pt, weight: "bold", fill: col-text, font: "Inter")
  set par(leading: 0.80em, justify: false)
  content
}

// Opener-Headline: sehr groß, für Vollbild-Foto-Eröffnungsseiten (80–100pt, weiß)
#let t-headline-opener(content, size: 88pt) = {
  set text(size: size, weight: "black", fill: white, font: "Inter")
  set par(leading: 0.78em, justify: false)
  content
}

#let t-unterzeile(content) = {
  set text(size: 15pt, weight: "light", fill: luma(40%), font: "Inter")
  set par(leading: 1.35em, justify: false)
  content
}

#let t-byline(content, color: col-accent) = {
  set text(size: 8pt, weight: "bold", fill: color, tracking: 0.8pt, font: "Inter")
  upper(content)
}

#let t-body(content) = {
  set text(size: 10pt, font: "Inter", fill: col-text, hyphenate: true, lang: "de")
  set par(justify: false, leading: 1.42em, first-line-indent: 0mm)
  content
}

// Fließtext Serif — für Feature-Artikel (Minion Pro / Hoefler Text / PT Serif)
#let t-body-serif(content) = {
  set text(size: 8.5pt,
    font: ("Minion Pro", "Hoefler Text", "PT Serif", "Inter"),
    fill: col-text, hyphenate: true, lang: "de")
  set par(justify: false, leading: 1.48em, first-line-indent: 0mm)
  content
}

// Drop Cap / Initiale für Artikel-Einstieg
#let t-dropcap(letter, body) = {
  grid(
    columns: (auto, 1fr),
    column-gutter: 2mm,
    align: (horizon, top),
    // Große Initiale — vertikal mittig zur ersten Textzeile
    text(size: 3.2em, weight: "black", fill: col-text, font: "Inter")[#letter],
    {
      set text(size: 8.5pt,
        font: ("Minion Pro", "Hoefler Text", "PT Serif", "Inter"),
        fill: col-text, hyphenate: true, lang: "de")
      set par(leading: 1.48em, justify: false)
      body
    }
  )
}

// Pull Quote — volle Spaltenbreite, atomic (breakable: false verhindert Seitenumbruch mittendrin)
#let t-pullquote-wide(content, color: col-accent) = {
  block(breakable: false, width: 100%)[
    #v(3mm)
    #line(length: 100%, stroke: 0.4pt + color)
    #v(3mm)
    #block(width: 100%, inset: (x: 6mm, y: 0mm))[
      #set text(size: 14pt, weight: "bold", style: "italic", fill: col-text, font: "Inter")
      #set par(justify: false, leading: 1.28em)
      #content
    ]
    #v(3mm)
    #line(length: 100%, stroke: 0.4pt + color)
    #v(3mm)
  ]
}

#let t-caption(content) = {
  set text(size: 8pt, style: "italic", fill: col-caption, font: "Inter")
  content
}

#let t-pagina(nr, color: col-caption) = {
  set text(size: 8pt, fill: color, font: "Inter")
  str(nr)
}

#let t-pullquote(content, color: col-accent) = {
  set text(size: 18pt, style: "italic", fill: col-text, font: "Inter")
  set par(leading: 1.3em, justify: false)
  line(length: 24mm, stroke: 2pt + color)
  v(3mm)
  content
  v(3mm)
  line(length: 24mm, stroke: 0.5pt + col-rule)
}

// ── Trennlinie ─────────────────────────────────────────────────

#let hrule(color: col-rule, thickness: 0.5pt) = {
  line(length: 100%, stroke: thickness + color)
}

// ── Kolumnentitel ──────────────────────────────────────────────
// Stil wie Bike Magazine: farbiges Kästchen mit Seitenzahl + Magazinname + Rubrik

#let kolumnentitel(magazin: "ppi Media", rubrik: "", seite: 0, gerade: auto) = {
  // gerade = true → Pagina links; false/auto → Pagina rechts
  let is-gerade = if gerade == auto { calc.rem(seite, 2) == 0 } else { gerade }
  let pagina-box = box(
    width: 8mm, height: 5.5mm,
    fill: col-accent,
    inset: (x: 0mm),
    baseline: 0pt,
  )[
    #place(center + horizon,
      text(size: 7.5pt, weight: "bold", fill: white, font: "Inter")[#str(seite)]
    )
  ]
  set text(size: 7pt, fill: col-caption, tracking: 0.4pt, font: "Inter")
  if is-gerade {
    grid(
      columns: (auto, 1fr, auto),
      column-gutter: 2.5mm,
      pagina-box,
      align(left + horizon)[#upper(magazin)],
      align(right + horizon)[#if rubrik != "" { upper(rubrik) }],
    )
  } else {
    grid(
      columns: (auto, 1fr, auto),
      column-gutter: 2.5mm,
      align(left + horizon)[#if rubrik != "" { upper(rubrik) }],
      align(right + horizon)[#upper(magazin)],
      pagina-box,
    )
  }
  v(1.5mm)
  hrule()
}
