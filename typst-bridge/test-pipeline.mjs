// ─────────────────────────────────────────────────────────────
// test-pipeline.mjs — Lokaler End-to-End-Test der Print-Pipeline
//
// Simuliert was print-generate.js tut, OHNE Cloudflare-Function:
//   1. Artikel-Daten (MTB-Stories) definieren
//   2. Layout-Plan vordefinieren (überspringt Claude-Call)
//   3. Typst-Quellcode generieren
//   4. Bridge-Server auf localhost:9000 aufrufen
//   5. PDF speichern → test-magazine-mtb.pdf
//
// Voraussetzung: Bridge-Server läuft (node server.js)
// Starten mit: node test-pipeline.mjs
// ─────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE_URL = "http://localhost:9000";

// ── Artikel-Daten (entspricht DEMO_STORIES MTB-Inhalte) ──────

const ARTICLES = [
  {
    id: "story-mtb-1",
    title: "Schwerkraft ist relativ: 5 Tage Alpencross mit dem Fully",
    wordCount: 620,
    category: "reportage",
    hasHeroImage: true,
    content: `Der Wecker geht um 4:47 Uhr. Draußen ist es noch dunkel, der Parkplatz am Nebelhorn-Talstation leer bis auf zwei andere Verrückte mit randvoll gepackten Bikes. Wir nicken uns kurz zu – der universelle Gruß unter Leuten, die wissen, was sie sich gerade antun.

Fünf Tage, 380 Kilometer, 14.000 Höhenmeter. Oberstdorf nach Meran, quer durch die Alpen, mit dem Fully. Klingt nach einem Abenteuer. Ist es auch. Klingt aber auch nach einem vernünftigen Plan. Das ist es weniger.

Die ersten 30 Kilometer sind Forstweg. Monoton, steil, Schotter der ins Gesicht spritzt wenn der Vordermann etwas zu locker fährt. Meine Rahmentasche drückt gegen den Innenoberschenkel bei jedem Pedalzug, die Lenkertasche macht das Bike träge wie eine beladene Fähre. Es dauert zwei Stunden bis ich aufgehört habe dagegen anzukämpfen.

Beim Lichtenstein-Haus, 1978 Meter, gibt es Eier, Speck und Kaffee. Der Wirt schaut kurz auf unsere Bikes, dann auf uns, dann sagt er: Ihr Gondelfahrer? Nein, sagen wir. Er grinst. Na dann. Der erste Aufstieg des Tages kostet 1.200 Höhenmeter. Die Beine sind noch nicht warm, die Seele schon.

Der Abstieg ins Lechtal ist das erste Highlight. Wurzeln, nasse Felsen, ein Bach der sich quer durch den Singletrail schneidet. Mein Hinterrad bricht aus, ich korrigiere, das Bike schluckt die Kurve und spuckt mich sauber auf der nächsten Geraden aus. So soll das sein.

Technisch ist dieser Alpencross anders als sein Ruf. Man erwartet stundenlange Schubepassagen – die gibt es. Aber man bekommt auch Trails, die man in den Alpen nicht erwartet: schnell, flowend, mit jenem Rhythmus den man auf einem guten Fully einfach fühlt.

Das Trek Fuel EX 9.9 schluckt alles klaglos. 140 mm vorn, 130 mm hinten, Geometrie die bergab stabil ist und bergauf nicht bestraft. Das Bike ist kein leichtes – 13,8 kg mit Gepäcksystem – aber es ist das richtige Werkzeug für diesen Job.

Abend zwei, Reschenpass. Das Licht stirbt hinter dem Vinschgau, orange übergehend in tiefes Blau. Wir kochen Pasta auf einem kleinen Gaskocher, der Wind trägt Aroma von Heu und Tannenwald. Solche Momente rechtfertigen jeden schmerzenden Muskel.

Am fünften Tag rollen wir um 14:23 Uhr in die Meraner Innenstadt. Die Füße schmerzen, die Hände auch. Wir lehnen die Bikes an eine Steinmauer, kaufen Eis und sagen nichts. Was man bei einem Alpencross wirklich lernt: fünf Tage ohne Netz, Notifications und Terminkalender pusten den Kopf auf eine Art frei, die kein Urlaub am Strand schafft. Schwerkraft ist relativ. Bergauf kämpft man gegen sie. Bergab macht man Frieden. Und irgendwo dazwischen ist man am lebendigsten.`,
  },
  {
    id: "story-mtb-2",
    title: "Scott Spark RC 900 World Cup: Wenn jedes Gramm zählt",
    wordCount: 280,
    category: "test",
    hasHeroImage: true,
    content: `9.999 Euro. 9,8 Kilogramm. Das sind die zwei Zahlen die das Scott Spark RC 900 World Cup definieren. Die erste macht nachdenklich, die zweite macht neidisch.

Man hebt das Spark aus dem Karton und hält kurz inne. Der Rahmen aus 900er HMX-Carbon ist so dünn, dass man sich fragt, ob er wirklich trägt. Die Gabel, Fox 32 SC Factory, wiegt gefühlt nichts. Die Shimano XTR-Gruppe ist so sauber verbaut dass kein Kabel, kein Zug irritiert. Es ist ein Bike das auch als Skulptur funktionieren würde.

Cross Country Bikes sind keine Enduro-Bikes. Wer das Spark mit dieser Erwartung kauft, wird enttäuscht. Wer es als Präzisionswerkzeug für Tempo, Technik und Effizienz nimmt, wird belohnt. Unser Testgebiet rund um Bad Tölz: gemischt aus Xco-tauglichem Singletrail und rockigen Abfahrten die eigentlich zu grob sind für das Bike. Das Spark meistert sie – aber mit der Nervosität eines Athleten außerhalb seiner Komfortzone.

Fazit: Für ambitionierte Hobbyfahrer mit Wettkampfambitionen. Für alle anderen: Das Spark RC 900 Team (6.299 Euro) bietet 90% des Fahrgefühls.`,
  },
  {
    id: "story-mtb-3",
    title: "Nino Schurter: \"Mit 40 fahre ich klüger, nicht langsamer\"",
    wordCount: 210,
    category: "interview",
    hasHeroImage: true,
    content: `Nino Schurter sitzt entspannt im Teamzelt am Fuß des Weltcup-Parcours in Lenzerheide. Er ist 40 Jahre alt, hat 9 Weltmeistertitel und fährt auf Rang 3 der Weltrangliste.

„Ich fahre klüger. Nicht langsamer, aber klüger. Ich spare Energie wo ich sie früher verbrannt habe, ich kenne jeden Parcours nach einer Runde besser als früher nach drei. Das ist kein Trost – das ist ein echter Vorteil. Erfahrung schlägt oft pure Kraft."

Auf die Frage nach dem Training: „Recovery ist inzwischen genauso wichtig wie das Training selbst. Mit 25 konnte ich jeden Tag volles Programm fahren. Mit 40 brauche ich Tage wo ich nichts tue außer schlafen, essen und vielleicht 45 Minuten locker rollen. Das ist kein Schwächezeichen – das ist Professionalität."

Wann ist Schluss? Er lächelt. „So lange wie ich das Gefühl habe, dass es mich vorwärts treibt und nicht rückwärts hält. Dieser Tag ist noch nicht gekommen."`,
  },
  {
    id: "story-mtb-4",
    title: "Helm, Protektoren, Trails: Die Sicherheitsfrage beim Mountainbiken",
    wordCount: 240,
    category: "ratgeber",
    hasHeroImage: false,
    content: `Mountainbiking ist ein Risikosport. Die Verletzungsrate liegt bei etwa 0,6 Verletzungen pro 1.000 Fahrstunden – niedriger als Skifahren, aber messbar. Was bedeutet das für die Ausrüstung?

Beim Helm ist die Frage nicht ob, sondern welcher. Full-Face-Helme bieten maximalen Schutz, sind aber schwer und heiß – geeignet für Downhill, technisches Enduro, Flow-Trails mit Speed. Trail-Helme mit MIPS-System sind der Kompromiss für die meisten Hobbyfahrer.

Knieschoner werden von vielen Mountainbikern nur auf Enduro-Touren getragen. Das ist falsch. Die meisten schweren Knieverletzungen passieren auf mittelschweren Trails, oft bei Müdigkeit. Schoner wie der POC VPD System wiegen unter 400g und schränken die Pedalbewegung kaum ein.

Rückenprotektoren nach EN 1621-2 Level 2 reduzieren Kraftübertragung um mindestens 9,33 kN. Wer regelmäßig auf anspruchsvollen Trails fährt: Level 2, kein Kompromiss.`,
  },
  {
    id: "story-mtb-news",
    title: "News: Canyon, Shimano EP-801 und der Worldcup-Kalender 2027",
    wordCount: 90,
    category: "news",
    hasHeroImage: false,
    content: `Canyon Strive neu: komplett neue Geometrie, Reach 480 mm (L), Head-Tube-Winkel 63,5 Grad. Ab November, ab 3.299 Euro.

Shimano EP-801: Neuer E-MTB-Motor, 85 Nm, überarbeitetes Di2-Interface. Gewicht 2,95 kg. Erste Bikes: Trek Rail und Specialized Kenevo.

UCI Worldcup 2027: Neu dabei Bogotá und Kapstadt. Gestrichen: Albstadt. 9 Stop-Rennen plus 3 Marathon-Events.`,
  },
];

// ── Layout-Plan (was Claude generieren würde) ─────────────────

const LAYOUT_PLAN = {
  seiten: [
    {
      nr: 1,
      typ: "cover",
      magazin: "ppi Cycling",
      ausgabe: "Oktober 2026",
      preis: "9,80 €",
      headline: "Schwerkraft ist relativ",
      teasers: [
        "Alpencross: 380 km, 5 Tage, 14.000 Hm",
        "Scott Spark RC 900 WC im Test",
        "Nino Schurter: Mit 40 noch am Podium",
        "Sicherheit: Was wirklich schützt",
      ],
    },
    {
      nr: 4,
      typ: "opener-solo",
      artikel_id: "story-mtb-1",
      headline: "Schwerkraft\nist relativ",
      unterzeile: "Alpencross · Reportage",
      byline: "Text: Tobias R. · Fotos: Stefan M.",
      rubrik: "REPORTAGE",
      bild_empfehlung: "Dramatisches Bergpanorama, Biker als Silhouette",
    },
    {
      nr: 5,
      typ: "intro-page",
      artikel_id: "story-mtb-1",
      rubrik: "REPORTAGE",
      bild_empfehlung: "Action-Shot Singletrail Abstieg",
    },
    {
      nr: 6,
      typ: "standard-feature",
      artikel_id: "story-mtb-1",
      dachzeile: "REPORTAGE",
      headline: "380 km. 5 Tage. 14.000 Hm.",
      unterzeile: "Von Oberstdorf nach Meran – der Bericht",
      byline: "Tobias R.",
      rubrik: "REPORTAGE",
    },
    {
      nr: 7,
      typ: "standard-feature",
      artikel_id: "story-mtb-2",
      dachzeile: "TEST",
      headline: "Scott Spark RC 900",
      unterzeile: "Wenn jedes Gramm zählt",
      byline: "Test: Johanna K.",
      rubrik: "TEST",
    },
    {
      nr: 8,
      typ: "standard-feature",
      artikel_id: "story-mtb-3",
      dachzeile: "INTERVIEW",
      headline: "\"Mit 40 fahre ich klüger\"",
      unterzeile: "Nino Schurter über Erfahrung und Ehrgeiz",
      byline: "Interview: Max B.",
      rubrik: "INTERVIEW",
    },
    {
      nr: 9,
      typ: "standard-feature",
      artikel_id: "story-mtb-4",
      dachzeile: "RATGEBER",
      headline: "Was wirklich schützt",
      unterzeile: "Helm, Protektoren und die Sicherheitsfrage",
      byline: "Redaktion",
      rubrik: "RATGEBER",
    },
    {
      nr: 10,
      typ: "kurzmeldungen",
      rubrik: "NEWS",
      meldungen: [
        {
          dachzeile: "NEUHEIT",
          titel: "Canyon Strive Neudesign",
          text: "Komplett neue Geometrie: Reach 480 mm (Größe L), Head-Tube-Winkel 63,5 Grad. Ab November, Einstieg ab 3.299 Euro.",
        },
        {
          dachzeile: "TECHNIK",
          titel: "Shimano EP-801",
          text: "Neuer E-MTB-Motor mit 85 Nm und überarbeitetem Di2-Interface. Gewicht 2,95 kg. Erste Bikes: Trek Rail und Specialized Kenevo.",
        },
        {
          dachzeile: "SPORT",
          titel: "Worldcup 2027: Bogotá & Kapstadt neu",
          text: "UCI-Kalender steht: Bogotá (April) und Kapstadt (Oktober) ersetzen Albstadt. 9 Stop-Rennen, 3 Marathon-Events.",
        },
      ],
    },
    {
      nr: 11,
      typ: "kurzmeldungen",
      rubrik: "NEWS",
      meldungen: [
        {
          dachzeile: "SICHERHEIT",
          titel: "MIPS-Studie bestätigt Wirksamkeit",
          text: "Neue Studie der Stanford University: MIPS-Helme reduzieren Rotationskräfte bei Sturz um bis zu 42% gegenüber konventionellen Helmen.",
        },
        {
          dachzeile: "MARKT",
          titel: "Trek übernimmt Bontrager",
          text: "Trek gibt Bontrager als eigenständige Marke auf – alle Produkte laufen ab 2027 unter dem Trek-Label. Händler erhalten Bestandsgarantie bis Ende 2026.",
        },
        {
          dachzeile: "EVENT",
          titel: "Riva Trophy: Anmeldung offen",
          text: "Die Riva Trophy 2027 nimmt Anmeldungen entgegen. 180 Teilnehmerplätze, Strecke 145 km mit 4.200 Hm rund um den Gardasee.",
        },
      ],
    },
  ],
};

// ── seiteToTypst() – identisch zu print-generate.js ──────────

function seiteToTypst(seite) {
  const art = ARTICLES.find((a) => a.id === seite.artikel_id) ?? {};
  const body = art.content ?? "(Kein Inhalt)";

  if (seite.typ === "opener-solo") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    return `
// ── Feature-Opener: ${seite.headline} (Seite ${nr}, gerade/links) ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)

#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#0d1f2d"), rgb("#1e3650"), rgb("#2a4a6a"), angle: 155deg)
  )
)
#place(bottom + left,
  rect(width: page-w, height: 110mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(100%),
      rgb("#000000").transparentize(10%)
    )
  )
)
#place(top + left, dx: margin-inner, dy: margin-top - 3mm,
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
    #grid(columns: (auto, 1fr), column-gutter: 2.5mm,
      box(width: 8mm, height: 5.5mm, fill: col-accent)[
        #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[${nr}])
      ],
      align(right + horizon)[${seite.rubrik ? `upper("${seite.rubrik}")` : ""}]
    )
  ]
)
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 8mm),
  block(width: page-w - margin-inner - margin-outer)[
    ${seite.unterzeile ? `#set text(size: 11pt, weight: "bold", fill: col-accent, font: "Inter", tracking: 0.3pt)\n    #set par(justify: false)\n    #upper("${seite.unterzeile}")\n    #v(3mm)` : ""}
    #set text(size: 72pt, weight: "black", fill: white, font: "Inter")
    #set par(leading: 0.80em, justify: false)
    ${seite.headline.replace(/\n/g, "\\\n    ")}
    ${seite.byline ? `#v(4mm)\n    #set text(size: 8pt, weight: "bold", fill: white.transparentize(30%), tracking: 0.6pt, font: "Inter")\n    #upper("${seite.byline}")` : ""}
  ]
)
`;
  }

  if (seite.typ === "intro-page") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const intro = body.slice(0, 500);
    return `
// ── Intro-Seite: Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)

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
#place(top + right, dx: -margin-outer, dy: margin-top - 3mm,
  grid(columns: (1fr, auto), column-gutter: 2.5mm,
    align(left + horizon)[
      #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
      ${seite.rubrik ? `#upper("${seite.rubrik}")` : ""}
    ],
    box(width: 8mm, height: 5.5mm, fill: col-accent)[
      #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[${nr}])
    ]
  )
)
#place(bottom + left,
  block(width: page-w, fill: rgb("#ffffff").transparentize(12%),
    inset: (x: margin-inner + 4mm, top: 10mm, bottom: margin-bottom + 6mm),
  )[
    #columns(2, gutter: col-gutter)[
      #set text(size: 12pt, weight: "bold", fill: col-text, font: "Inter")
      #set par(leading: 1.38em, justify: false)
      ${intro.replace(/"/g, "\\\"").replace(/\n/g, " ")}
    ]
  ]
)
`;
  }

  if (seite.typ === "standard-feature") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    return `
// ── Standard Feature: ${seite.headline} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "${seite.rubrik ?? ""}", seite: ${nr})
#v(4mm)
#block(width: page-w - margin-inner - margin-outer, height: 128mm, clip: true)[
  #rect(width: 100%, height: 100%,
    fill: gradient.linear(rgb("#1a2a3a"), rgb("#2e4560"), rgb("#4a6080"), angle: 175deg))
  #place(center + horizon,
    text(size: 10pt, fill: white.transparentize(40%), font: "Inter")[FOTO])
]
#v(4mm)
#t-dachzeile("${seite.dachzeile ?? ""}")
#v(2mm)
#block(width: 100%)[
  #set text(size: 28pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.87em, justify: false)
  ${seite.headline}
]
${seite.unterzeile ? `#v(2mm)\n#t-unterzeile[${seite.unterzeile}]` : ""}
${seite.byline ? `#v(3mm)\n#hrule(thickness: 0.3pt)\n#v(2mm)\n#t-byline[${seite.byline}]\n#v(2mm)\n#hrule(thickness: 0.3pt)` : ""}
#v(4mm)
#columns(3, gutter: col-gutter)[
  #t-body[${body.slice(0, 1200).replace(/"/g, '\\"')}]
]
#place(bottom + right, dy: 12mm, t-pagina(${nr}))
`;
  }

  if (seite.typ === "cover") {
    const teaserStr = (seite.teasers ?? []).join("|");
    return `
// ── U1 Titelseite ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#0a1520"), rgb("#1a3040"), rgb("#0a1520"), angle: 160deg)
  )
)
// Schräg-Highlight
#place(top + left,
  polygon(
    fill: rgb("#0077b5").transparentize(70%),
    (0mm, 0mm), (page-w, 0mm), (page-w, 120mm), (0mm, 200mm)
  )
)
#place(top + left,
  rect(width: page-w, height: 55mm,
    fill: gradient.linear(rgb("#000000").transparentize(15%), rgb("#000000").transparentize(100%))
  )
)
#place(bottom + left,
  rect(width: page-w, height: 72mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(5%))
  )
)
#place(top + left, dx: margin-outer, dy: margin-top - 4mm, {
  set text(font: "Inter")
  stack(dir: ttb, spacing: 2mm,
    { set text(size: 32pt, weight: "black", fill: white, tracking: -0.5pt); upper("${seite.magazin ?? "ppi Cycling"}") },
    line(length: 42mm, stroke: 2.5pt + col-accent),
    { set text(size: 8pt, fill: white.transparentize(30%), tracking: 0.8pt)
      upper("${seite.ausgabe ?? ""}  ·  ${seite.preis ?? "9,80 €"}") },
  )
})
${seite.headline ? `#place(center + horizon, dy: -20mm,
  block(width: page-w - (margin-outer * 2), {
    set text(size: 68pt, weight: "black", fill: white, font: "Inter", tracking: -2pt)
    set par(leading: 0.78em, justify: false)
    [${seite.headline}]
  })
)` : ""}
${teaserStr ? `#place(bottom + left, dx: margin-outer, dy: -(margin-bottom - 2mm), {
  let ts = "${teaserStr}".split("|")
  set text(font: "Inter")
  grid(columns: range(ts.len()).map(_ => 1fr), column-gutter: 5mm,
    ..ts.map(t => stack(dir: ttb, spacing: 1.5mm,
      line(length: 100%, stroke: 0.4pt + col-accent),
      v(1.5mm),
      { set text(size: 7.5pt, fill: white.transparentize(20%)); t.trim() },
    ))
  )
})` : ""}
`;
  }

  if (seite.typ === "kurzmeldungen") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    return `
// ── Kurzmeldungen Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#block(width: 100%)[
  #rect(width: 100%, height: 7mm, fill: col-accent)
  #place(left + horizon, dx: 4mm, dy: -5mm,
    text(size: 9pt, weight: "bold", fill: white, tracking: 2pt, font: "Inter")[${(seite.rubrik ?? "NEWS").toUpperCase()}]
  )
]
#v(5mm)
#kolumnentitel(rubrik: "${seite.rubrik ?? "NEWS"}", seite: ${nr})
#v(2mm)
#columns(2, gutter: col-gutter)[
${(seite.meldungen ?? [])
  .map(
    (m) => `
  #t-dachzeile("${m.dachzeile ?? ""}")
  #v(1.5mm)
  #block(width: 100%)[
    #set text(size: 19pt, weight: "bold", fill: col-text, font: "Inter")
    #set par(leading: 0.88em, justify: false)
    ${m.titel}
  ]
  #v(2mm)
  #hrule(thickness: 0.25pt)
  #v(2.5mm)
  #t-body[${m.text}]
  #v(5mm)
`,
  )
  .join("\n")}
]
#place(bottom + right, dy: 12mm, t-pagina(${nr}))
`;
  }

  return `// Unbekannter Typ: ${seite.typ}\n`;
}

function layoutToTypst(layoutPlan) {
  const seiten = layoutPlan.seiten ?? [];
  const blocks = seiten.map((s) => seiteToTypst(s));
  const combined = blocks.join("\n#pagebreak()\n");
  const lines = combined.split("\n");
  let importSeen = false;
  return lines
    .filter((line) => {
      if (line.startsWith("#import")) {
        if (importSeen) return false;
        importSeen = true;
      }
      return true;
    })
    .join("\n");
}

// ── Hauptprogramm ─────────────────────────────────────────────

async function main() {
  console.log("🏔️  ppi Cycling Magazin — Pipeline-Test");
  console.log("=".repeat(45));

  // 1. Typst-Quellcode generieren
  console.log("\n📐 Generiere Typst-Quellcode…");
  const source = layoutToTypst(LAYOUT_PLAN);
  fs.writeFileSync(path.join(__dir, "test-magazine-mtb.typ"), source);
  console.log(`   → ${source.split("\n").length} Zeilen Quellcode`);
  console.log(`   → ${LAYOUT_PLAN.seiten.length} Seiten im Plan`);

  // 2. Template-Dateien einlesen (werden mit ins Temp-Dir kopiert)
  const templatesDir = path.join(__dir, "templates");
  const templateFiles = ["base.typ", "cover.typ", "opener-solo.typ", "intro-page.typ",
                         "standard-feature.typ", "kurzmeldungen.typ", "spread-opener.typ"];
  const files = {};
  for (const fname of templateFiles) {
    const fpath = path.join(templatesDir, fname);
    if (fs.existsSync(fpath)) {
      files[`templates/${fname}`] = fs.readFileSync(fpath, "utf-8");
    }
  }
  console.log(`   → ${Object.keys(files).length} Template-Dateien eingelesen`);

  // 3. Bridge aufrufen
  console.log("\n🔧 Rufe Bridge-Server auf…");
  let res;
  try {
    res = await fetch(`${BRIDGE_URL}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, files }),
    });
  } catch (err) {
    console.error(`\n❌ Bridge nicht erreichbar: ${err.message}`);
    console.error("   Starte den Bridge-Server mit: node server.js");
    process.exit(1);
  }

  const data = await res.json();
  if (!data.ok) {
    console.error(`\n❌ Typst-Fehler:\n${data.error}`);
    process.exit(1);
  }

  // 4. PDF speichern
  const pdfPath = path.join(__dir, "test-magazine-mtb.pdf");
  const bytes = Buffer.from(data.pdf, "base64");
  fs.writeFileSync(pdfPath, bytes);

  const sizekb = Math.round(bytes.length / 1024);
  console.log(`\n✅ PDF generiert: ${sizekb} KB`);
  console.log(`   → ${pdfPath}`);
  console.log(`\n📖 Inhalt:`);
  LAYOUT_PLAN.seiten.forEach((s) => {
    const nr = Array.isArray(s.nr) ? s.nr.join("–") : s.nr;
    console.log(`   Seite ${String(nr).padEnd(4)} ${s.typ.padEnd(20)} ${s.headline ?? s.rubrik ?? ""}`);
  });
  console.log("\n🎉 Pipeline-Test erfolgreich abgeschlossen!");
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
