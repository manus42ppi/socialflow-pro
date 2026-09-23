// ─────────────────────────────────────────────────────────────
// kurzmeldungen.typ — Kurzmeldungen-Seite
//
// Layout: Rubrikbalken + 3–5 kurze Meldungen, 2-spaltig
// Jede Meldung: Dachzeile + Headline (20pt) + 2–4 Sätze
// Seitentyp in Ausgabe-Plan: "kurzmeldungen"
// ─────────────────────────────────────────────────────────────

#import "base.typ": *

#let p-rubrik   = sys.inputs.at("rubrik",  default: "KURZMELDUNGEN")
#let p-seite    = int(sys.inputs.at("seite", default: "7"))
#let p-items    = sys.inputs.at("items",    default: "")

// items wird als JSON-ähnlicher String übergeben:
// "TITEL1||TEXT1||DACH1:::TITEL2||TEXT2||DACH2"
// Trennzeichen: ::: zwischen Meldungen, || zwischen Feldern

#let parse-items(raw) = {
  raw.split(":::").map(entry => {
    let parts = entry.split("||")
    (
      dach:    if parts.len() > 2 { parts.at(2).trim() } else { "" },
      titel:   if parts.len() > 0 { parts.at(0).trim() } else { "" },
      text:    if parts.len() > 1 { parts.at(1).trim() } else { "" },
    )
  }).filter(m => m.titel != "")
}

#let meldungen = parse-items(p-items)

#set page(
  width:  page-w,
  height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer),
  numbering: none,
)

// ── Rubrikbalken ───────────────────────────────────────────────
#block(width: 100%, inset: (top: 0pt, bottom: 0pt))[
  #rect(
    width: 100%, height: 7mm,
    fill: col-accent, radius: 0pt,
  )
  #place(left + horizon, dx: 4mm, dy: -5mm,
    text(size: 9pt, weight: "bold", fill: white, tracking: 2pt, font: "Inter")[
      #upper(p-rubrik)
    ]
  )
]

#v(7mm)
#kolumnentitel(rubrik: p-rubrik, seite: p-seite)
#v(2mm)

// ── Meldungen in 2 Spalten ─────────────────────────────────────
#columns(2, gutter: col-gutter)[
  #for m in meldungen {
    // Dachzeile
    if m.dach != "" {
      t-dachzeile(m.dach)
      v(1.5mm)
    }

    // Headline (kleiner als Feature, aber fett)
    block(width: 100%)[
      #set text(size: 20pt, weight: "bold", fill: col-text, font: "Inter")
      #set par(leading: 0.88em, justify: false)
      #m.titel
    ]

    v(2mm)
    hrule(thickness: 0.25pt)
    v(2.5mm)

    // Fließtext
    t-body[#m.text]

    v(5mm)
  }
]

// Pagina
#place(bottom + right, dy: 12mm, t-pagina(p-seite))
