// test-opener.typ — Testet opener-solo + intro-page + kolumnentitel-update
// Kompilieren: typst compile test-opener.typ test-opener.pdf --font-path fonts/

#import "templates/base.typ": *

// ══════════════════════════════════════════════════════════════
// SEITE 1: opener-solo (gerade Seite = links)
// ══════════════════════════════════════════════════════════════

#set page(width: page-w, height: page-h, margin: 0mm, numbering: none)

// Foto-Placeholder
#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#0d1f2d"), rgb("#1e3650"), rgb("#2a4a6a"), angle: 155deg)
  )
)

// Gradient unten
#place(bottom + left,
  rect(width: page-w, height: 110mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(100%),
      rgb("#000000").transparentize(10%)
    )
  )
)

// Kolumnentitel oben (gerade Seite = Pagina links)
#place(top + left, dx: margin-inner, dy: margin-top - 3mm,
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
    #grid(columns: (auto, 1fr), column-gutter: 2.5mm,
      box(width: 8mm, height: 5.5mm, fill: col-accent)[
        #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[4])
      ],
      align(right + horizon)[#upper("Gravel · Reportage")]
    )
  ]
)

// Headline unten links
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 8mm),
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 11pt, weight: "bold", fill: col-accent, font: "Inter", tracking: 0.3pt)
    #set par(justify: false)
    #upper("Gravel Cycling · Reportage")
    #v(3mm)
    #set text(size: 88pt, weight: "black", fill: white, font: "Inter")
    #set par(leading: 0.78em, justify: false)
    Schotter,\ Staub,\ Freiheit
    #v(4mm)
    #set text(size: 8pt, weight: "bold", fill: white.transparentize(30%), tracking: 0.6pt)
    #upper("Von Max Mustermann · Fotos: Anna Beispiel")
  ]
)

#pagebreak()

// ══════════════════════════════════════════════════════════════
// SEITE 2: intro-page (ungerade Seite = rechts)
// ══════════════════════════════════════════════════════════════

#set page(width: page-w, height: page-h, margin: 0mm, numbering: none)

#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#1a2a3a"), rgb("#2e4a5e"), rgb("#4a708a"), angle: 135deg)
  )
)
#place(top + left,
  rect(width: page-w, height: 30mm,
    fill: gradient.linear(rgb("#000000").transparentize(40%), rgb("#000000").transparentize(100%))
  )
)

// Kolumnentitel oben rechts (ungerade = Pagina rechts)
#place(top + right, dx: -margin-outer, dy: margin-top - 3mm,
  grid(columns: (1fr, auto), column-gutter: 2.5mm,
    align(left + horizon)[
      #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
      #upper("Gravel · Reportage")
    ],
    box(width: 8mm, height: 5.5mm, fill: col-accent)[
      #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[5])
    ]
  )
)

// Schwebende Textbox
#place(bottom + left,
  block(width: page-w, fill: rgb("#ffffff").transparentize(12%),
    inset: (x: margin-inner + 4mm, top: 10mm, bottom: margin-bottom + 6mm),
  )[
    #columns(2, gutter: col-gutter)[
      #set text(size: 13pt, weight: "bold", fill: col-text, font: "Inter")
      #set par(leading: 1.35em, justify: false)
      Der Morgen beginnt mit Nebel. Noch bevor die Sonne die Kämme des Allgäus erreicht, sind wir schon auf dem Schotter — die Reifen zischend über feuchten Kies, die Lungen voll kalter Bergluft.
      #v(3mm)
      #t-body[
        Was vor drei Jahren als Randphänomen galt, ist heute Mainstream: Gravel Cycling boomt. Doch wer glaubt, es gehe nur ums Fahren, versteht das Konzept nur halb. Gravel ist Haltung. Es ist die bewusste Abkehr von Asphalt, Streckenrekorden und Strava-Segmenten — zugunsten von Abenteuern, die man nicht auf Maps einzeichnen kann.
      ]
    ]
  ]
)

#pagebreak()

// ══════════════════════════════════════════════════════════════
// SEITE 3: standard-feature mit neuem kolumnentitel (3 Spalten)
// ══════════════════════════════════════════════════════════════

#set page(
  width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer),
  numbering: none,
)

#kolumnentitel(rubrik: "TEST", seite: 6)
#v(4mm)

// Foto-Placeholder
#block(width: 100%, height: 138mm, clip: true)[
  #rect(width: 100%, height: 100%,
    fill: gradient.linear(rgb("#b8c8d8"), rgb("#7899aa"), angle: 175deg))
  #place(center + horizon, text(size: 9pt, fill: white.transparentize(40%), font: "Inter")[FOTO])
]
#v(4mm)
#t-dachzeile("TEST")
#v(2mm)
#block(width: 100%)[
  #set text(size: 30pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.87em, justify: false)
  Specialized Diverge: Der Maßstab
]
#v(3mm)
#t-unterzeile[800 km Schotter im Härtetest]
#v(3mm)
#hrule(thickness: 0.3pt)
#v(2mm)
#t-byline("Test: Johanna Keller")
#v(2mm)
#hrule(thickness: 0.3pt)
#v(5mm)
#columns(3, gutter: col-gutter)[
  #t-body[
    Das Specialized Diverge ist seit Jahren der Gradmesser für Gravel-Bikes — die Referenz, an der sich alle anderen messen lassen müssen. Mit der neuen Generation verspricht Specialized Verbesserungen beim Future Shock-System, eine neue Lenkergeometrie und einen überarbeiteten Rahmen. Wir haben das Rad auf 800 Kilometer Schotter geprüft.

    Im Allgäu, auf nassem Kies und über Waldwege die eigentlich für Mountainbikes gedacht sind, zeigt das Diverge seine Stärken: Die Gabel-Dämpfung schluckt Schläge, die sonst Handgelenke und Konzentration kosten würden. Der Rahmen bleibt steif genug um Kraft sauber zu übertragen.
  ]
]
#place(bottom + right, dy: 12mm, t-pagina(6))
