// ─────────────────────────────────────────────────────────────
// test-pipeline.mjs — Lokaler End-to-End-Test der Print-Pipeline
//
// Simuliert was print-generate.js tut, OHNE Cloudflare-Function:
//   1. Artikel-Daten (MTB-Stories) definieren
//   2. Layout-Plan vordefinieren (überspringt Claude-Call)
//   3. Bilder von Picsum fetchen → base64 Assets
//   4. Typst-Quellcode generieren (mit echten Bildern)
//   5. Bridge-Server auf localhost:9000 aufrufen
//   6. PDF speichern → test-magazine-mtb.pdf
//
// Voraussetzung: Bridge-Server läuft (node server.js)
// Starten mit: node test-pipeline.mjs
// ─────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE_URL = "http://localhost:9000";

// ── Fix 8: Bild-URLs nach Picsum-ID (besser als seed, nature/outdoor) ──
// ID 291 = Berglandschaft, 1039 = Outdoor-Abenteuer, 432 = Outdoor-Person,
// 1043 = Wald/Natur, 1027 = Portrait, 436 = Outdoor, 167 = Landscape
const IMAGE_URLS = {
  "story-mtb-1": [
    "https://picsum.photos/id/1039/1400/900",   // hero: Outdoor Abenteuer
    "https://picsum.photos/id/164/1400/900",    // action: Wasser/Outdoor
  ],
  "story-mtb-2": [
    "https://picsum.photos/id/1043/1400/900",   // Scott Spark: Technik/Outdoor
  ],
  "story-mtb-3": [
    "https://picsum.photos/id/1027/900/1100",   // Portrait-Format
  ],
  "story-mtb-4": [
    "https://picsum.photos/id/436/1200/800",    // Sicherheit/Outdoor
  ],
  "cover": [
    "https://picsum.photos/id/291/900/1270",    // Berglandschaft Hochformat
  ],
};

// ── Pull Quotes pro Artikel ────────────────────────────────────
const PULL_QUOTES = {
  "story-mtb-1": "Bergauf kämpft man gegen die Schwerkraft. Bergab macht man Frieden. Irgendwo dazwischen ist man am lebendigsten.",
  "story-mtb-2": "9.999 Euro. 9,8 Kilogramm. Ein Bike das auch als Skulptur funktionieren würde.",
  "story-mtb-3": "Erfahrung schlägt oft pure Kraft. Mit 40 fahre ich klüger – nicht langsamer.",
  "story-mtb-4": "Die meisten schweren Knieverletzungen passieren auf mittelschweren Trails – oft bei Müdigkeit.",
};

// ── Artikel-Daten ─────────────────────────────────────────────
const ARTICLES = [
  {
    id: "story-mtb-1",
    title: "Schwerkraft ist relativ: 5 Tage Alpencross mit dem Fully",
    wordCount: 620,
    category: "reportage",
    hasHeroImage: true,
    content: `Der Wecker geht um 4:47 Uhr. Draußen ist es noch dunkel, der Parkplatz an der Nebelhorn-Talstation leer bis auf zwei andere Verrückte mit randvoll gepackten Bikes. Wir nicken uns kurz zu – der universelle Gruß unter Leuten, die wissen, was sie sich gerade antun. Fünf Tage, 380 Kilometer, 14.000 Höhenmeter. Oberstdorf nach Meran, quer durch die Alpen, mit dem Fully. Klingt nach einem Abenteuer. Ist es auch. Klingt aber auch nach einem vernünftigen Plan. Das ist es weniger. Die ersten 30 Kilometer sind Forstweg. Monoton, steil, Schotter der ins Gesicht spritzt wenn der Vordermann zu locker fährt. Meine Rahmentasche drückt gegen den Innenoberschenkel bei jedem Pedalzug, die Lenkertasche macht das Bike träge wie eine beladene Fähre. Es dauert zwei Stunden bis ich aufgehört habe dagegen anzukämpfen. Beim Lichtenstein-Haus, 1978 Meter, gibt es Eier, Speck und Kaffee. Der Wirt schaut kurz auf unsere Bikes, dann auf uns, dann sagt er: Ihr Gondelfahrer? Nein, sagen wir. Er grinst. Na dann. Der erste Aufstieg des Tages kostet 1.200 Höhenmeter. Die Beine sind noch nicht warm, die Seele schon. Der Abstieg ins Lechtal ist das erste Highlight. Wurzeln, nasse Felsen, ein Bach der sich quer durch den Singletrail schneidet. Mein Hinterrad bricht aus, ich korrigiere, das Bike schluckt die Kurve und spuckt mich sauber auf der nächsten Geraden aus. Das Trek Fuel EX 9.9 schluckt alles klaglos. 140 mm vorn, 130 mm hinten, Geometrie die bergab stabil ist und bergauf nicht bestraft. Das Bike ist kein leichtes – 13,8 kg mit Gepäcksystem – aber es ist das richtige Werkzeug für diesen Job.`,
  },
  {
    id: "story-mtb-2",
    title: "Scott Spark RC 900 World Cup: Wenn jedes Gramm zählt",
    wordCount: 280,
    category: "test",
    hasHeroImage: true,
    content: `9.999 Euro. 9,8 Kilogramm. Das sind die zwei Zahlen die das Scott Spark RC 900 World Cup definieren. Die erste macht nachdenklich, die zweite macht neidisch. Man hebt das Spark aus dem Karton und hält kurz inne. Der Rahmen aus 900er HMX-Carbon ist so dünn, dass man sich fragt, ob er wirklich trägt. Die Gabel, Fox 32 SC Factory, wiegt gefühlt nichts. Die Shimano XTR-Gruppe ist so sauber verbaut dass kein Kabel, kein Zug irritiert. Es ist ein Bike das auch als Skulptur funktionieren würde. Cross Country Bikes sind keine Enduro-Bikes. Wer das Spark mit dieser Erwartung kauft, wird enttäuscht. Wer es als Präzisionswerkzeug für Tempo, Technik und Effizienz nimmt, wird belohnt. Unser Testgebiet rund um Bad Tölz: gemischt aus Xco-tauglichem Singletrail und rockigen Abfahrten die eigentlich zu grob sind für das Bike. Das Spark meistert sie – aber mit der Nervosität eines Athleten außerhalb seiner Komfortzone. Fazit: Für ambitionierte Hobbyfahrer mit Wettkampfambitionen das richtige Werkzeug.`,
  },
  {
    id: "story-mtb-3",
    title: "Nino Schurter: \"Mit 40 fahre ich klüger, nicht langsamer\"",
    wordCount: 210,
    category: "interview",
    hasHeroImage: true,
    content: `Nino Schurter sitzt entspannt im Teamzelt am Fuß des Weltcup-Parcours in Lenzerheide. Er ist 40 Jahre alt, hat 9 Weltmeistertitel und fährt auf Rang 3 der Weltrangliste. Ich fahre klüger. Nicht langsamer, aber klüger. Ich spare Energie wo ich sie früher verbrannt habe, ich kenne jeden Parcours nach einer Runde besser als früher nach drei. Das ist kein Trost – das ist ein echter Vorteil. Erfahrung schlägt oft pure Kraft. Auf die Frage nach dem Training: Recovery ist inzwischen genauso wichtig wie das Training selbst. Mit 25 konnte ich jeden Tag volles Programm fahren. Mit 40 brauche ich Tage wo ich nichts tue außer schlafen, essen und vielleicht 45 Minuten locker rollen. Das ist kein Schwächezeichen – das ist Professionalität. Wann ist Schluss? Er lächelt. So lange wie ich das Gefühl habe, dass es mich vorwärts treibt und nicht rückwärts hält. Dieser Tag ist noch nicht gekommen.`,
  },
  {
    id: "story-mtb-4",
    title: "Helm, Protektoren, Trails: Die Sicherheitsfrage beim Mountainbiken",
    wordCount: 240,
    category: "ratgeber",
    hasHeroImage: false,
    content: `Mountainbiking ist ein Risikosport. Die Verletzungsrate liegt bei etwa 0,6 Verletzungen pro 1.000 Fahrstunden – niedriger als Skifahren, aber messbar. Was bedeutet das für die Ausrüstung? Beim Helm ist die Frage nicht ob, sondern welcher. Full-Face-Helme bieten maximalen Schutz, sind aber schwer und heiß – geeignet für Downhill, technisches Enduro, Flow-Trails mit Speed. Trail-Helme mit MIPS-System sind der Kompromiss für die meisten Hobbyfahrer. Knieschoner werden von vielen Mountainbikern nur auf Enduro-Touren getragen. Das ist falsch. Die meisten schweren Knieverletzungen passieren auf mittelschweren Trails, oft bei Müdigkeit. Schoner wie der POC VPD System wiegen unter 400g und schränken die Pedalbewegung kaum ein. Rückenprotektoren nach EN 1621-2 Level 2 reduzieren Kraftübertragung um mindestens 9,33 kN. Wer regelmäßig auf anspruchsvollen Trails fährt: Level 2, kein Kompromiss. Die Wahl des Trails selbst ist ebenfalls Sicherheitsplanung. Schwierigkeitsgrade werden von Betreibern vergeben – aber die eigene Einschätzung bleibt entscheidend.`,
  },
  {
    id: "story-mtb-news",
    title: "News: Canyon, Shimano EP-801 und der Worldcup-Kalender 2027",
    wordCount: 90,
    category: "news",
    hasHeroImage: false,
    content: `Canyon Strive neu: komplett neue Geometrie, Reach 480 mm (L), Head-Tube-Winkel 63,5 Grad. Ab November, ab 3.299 Euro. Shimano EP-801: Neuer E-MTB-Motor, 85 Nm, überarbeitetes Di2-Interface. Gewicht 2,95 kg. Erste Bikes: Trek Rail und Specialized Kenevo. UCI Worldcup 2027: Neu dabei Bogotá und Kapstadt. Gestrichen: Albstadt. 9 Stop-Rennen plus 3 Marathon-Events.`,
  },
];

// ── Layout-Plan ───────────────────────────────────────────────
// Fix 4: Cover-Teasers auf max ~26 Zeichen gekürzt
const LAYOUT_PLAN = {
  seiten: [
    {
      nr: 1,
      typ: "cover",
      magazin: "ppi Cycling",
      ausgabe: "Oktober 2026",
      preis: "9,80 €",
      headline: "Schwerkraft\nist relativ",
      bildKey: "cover-0",
      teasers: [
        "Alpencross: 5 Tage Alpen",
        "Scott Spark RC 900 WC",
        "Nino Schurter mit 40",
        "Sicherheit: Was schützt",
      ],
    },
    {
      nr: 4,
      typ: "opener-solo",
      artikel_id: "story-mtb-1",
      bildKey: "story-mtb-1-0",
      headline: "Schwerkraft\nist relativ",
      unterzeile: "Reportage",
      byline: "Text: Tobias R. · Fotos: Stefan M.",
      rubrik: "REPORTAGE",
    },
    {
      nr: 5,
      typ: "intro-page",
      artikel_id: "story-mtb-1",
      bildKey: "story-mtb-1-1",
      rubrik: "REPORTAGE",
    },
    {
      nr: 6,
      typ: "standard-feature",
      artikel_id: "story-mtb-1",
      bildKey: "story-mtb-1-0",
      dachzeile: "REPORTAGE",
      headline: "380 km. 5 Tage.\n14.000 Hm.",
      unterzeile: "Von Oberstdorf nach Meran",
      byline: "Tobias R.",
      rubrik: "REPORTAGE",
    },
    {
      nr: 7,
      typ: "standard-feature",
      artikel_id: "story-mtb-2",
      bildKey: "story-mtb-2-0",
      dachzeile: "TEST",
      headline: "Scott Spark\nRC 900",
      unterzeile: "Wenn jedes Gramm zählt",
      byline: "Test: Johanna K.",
      rubrik: "TEST",
    },
    {
      nr: 8,
      typ: "standard-feature",
      artikel_id: "story-mtb-3",
      bildKey: "story-mtb-3-0",
      dachzeile: "INTERVIEW",
      headline: "\"Mit 40 fahre\nich klüger\"",
      unterzeile: "Nino Schurter über Erfahrung und Ehrgeiz",
      byline: "Interview: Max B.",
      rubrik: "INTERVIEW",
    },
    {
      nr: 9,
      typ: "standard-feature",
      artikel_id: "story-mtb-4",
      bildKey: "story-mtb-4-0",
      dachzeile: "RATGEBER",
      headline: "Was wirklich\nschützt",
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
          titel: "MIPS-Studie: bis 42 % weniger Rotation",
          text: "Neue Studie der Stanford University: MIPS-Helme reduzieren Rotationskräfte bei Sturz um bis zu 42% gegenüber konventionellen Helmen.",
        },
        {
          dachzeile: "MARKT",
          titel: "Bontrager wird Trek",
          text: "Trek gibt Bontrager als eigenständige Marke auf – alle Produkte laufen ab 2027 unter dem Trek-Label. Händler erhalten Bestandsgarantie bis Ende 2026.",
        },
        {
          dachzeile: "EVENT",
          titel: "Riva Trophy: Anmeldung offen",
          text: "180 Plätze, 145 km, 4.200 Hm rund um den Gardasee. Anmeldungen für die Riva Trophy 2027 sind ab sofort möglich.",
        },
      ],
    },
  ],
};

// ── Hilfsfunktionen ───────────────────────────────────────────

// Text für Typst escapen (innerhalb content blocks [])
function esc(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/#/g, "\\#")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ");
}

// Intro-Text: max maxChars Zeichen, an Satzgrenze kürzen (Fix 3)
function introText(text, maxChars = 280) {
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastDot = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastDot > maxChars * 0.5 ? text.slice(0, lastDot + 1) : sub + "…";
}

// Text für Drop-Cap-Block: max 500 Zeichen an Satzgrenze kürzen
function featureText(text, maxChars = 500) {
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastDot = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return lastDot > maxChars * 0.5 ? text.slice(0, lastDot + 1) : sub + "…";
}

// ── Bilder fetchen ─────────────────────────────────────────────
async function fetchImages() {
  const assets = {};
  const allUrls = [];

  IMAGE_URLS["cover"].forEach((url, i) => {
    allUrls.push({ key: `cover-${i}.jpg`, url });
  });

  for (const [articleId, urls] of Object.entries(IMAGE_URLS)) {
    if (articleId === "cover") continue;
    urls.forEach((url, i) => {
      allUrls.push({ key: `${articleId}-${i}.jpg`, url });
    });
  }

  console.log(`   → Fetche ${allUrls.length} Bilder von Picsum…`);

  await Promise.all(
    allUrls.map(async ({ key, url }) => {
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        assets[key] = Buffer.from(buf).toString("base64");
        const kb = Math.round(buf.byteLength / 1024);
        console.log(`   ✓ ${key.padEnd(30)} ${kb} KB`);
      } catch (err) {
        console.warn(`   ⚠ ${key}: ${err.message} — Platzhalter-Gradient wird verwendet`);
      }
    })
  );

  return assets;
}

// ── seiteToTypst() ─────────────────────────────────────────────

// Fix 9: box statt block (kein unsichtbarer Stroke/Fill)
function imgBox(bildKey, assets, w = "100%", h = "80mm", fit = "cover") {
  const filename = `${bildKey}.jpg`;
  if (assets[filename]) {
    return `#box(width: ${w}, height: ${h}, clip: true)[
  #image("${filename}", width: 100%, height: 100%, fit: "${fit}")
]`;
  }
  return `#box(width: ${w}, height: ${h})[
  #rect(width: 100%, height: 100%,
    fill: gradient.linear(rgb("#1a2a3a"), rgb("#2e4560"), rgb("#4a6080"), angle: 175deg))
]`;
}

function imgTypst(bildKey, assets, w = "page-w", h = "page-h", fit = "cover") {
  const filename = `${bildKey}.jpg`;
  if (assets[filename]) {
    return `image("${filename}", width: ${w}, height: ${h}, fit: "${fit}")`;
  }
  return `rect(width: ${w}, height: ${h},
    fill: gradient.linear(rgb("#0d1f2d"), rgb("#1e3650"), rgb("#2a4a6a"), angle: 155deg))`;
}

function seiteToTypst(seite, assets) {
  const art = ARTICLES.find((a) => a.id === seite.artikel_id) ?? {};
  const body = art.content ?? "(Kein Inhalt)";
  const bk = seite.bildKey ?? "";

  // ── Cover ──────────────────────────────────────────────────
  if (seite.typ === "cover") {
    const hasBild = assets[`${bk}.jpg`];
    // Fix 4: Teasers bereits im LAYOUT_PLAN auf ~26 Zeichen begrenzt
    const teaserStr = (seite.teasers ?? []).join("|");
    const bgBlock = hasBild
      ? `#place(top + left, image("${bk}.jpg", width: page-w, height: page-h, fit: "cover"))
#place(top + left,
  rect(width: page-w, height: page-h, fill: rgb("#000000").transparentize(42%))
)`
      : `#place(top + left,
  rect(width: page-w, height: page-h,
    fill: gradient.linear(rgb("#0a1520"), rgb("#1a3040"), rgb("#0a1520"), angle: 160deg)
  )
)`;
    const headlineLines = (seite.headline ?? "").split("\n");
    return `
// ── U1 Titelseite ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
${bgBlock}
#place(top + left,
  polygon(
    fill: rgb("#0077b5").transparentize(75%),
    (0mm, 0mm), (page-w, 0mm), (page-w, 100mm), (0mm, 180mm)
  )
)
#place(bottom + left,
  rect(width: page-w, height: 80mm,
    fill: gradient.linear(rgb("#000000").transparentize(100%), rgb("#000000").transparentize(10%)))
)
#place(top + left,
  rect(width: page-w, height: 60mm,
    fill: gradient.linear(rgb("#000000").transparentize(20%), rgb("#000000").transparentize(100%)))
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
#place(center + horizon, dy: -20mm,
  block(width: page-w - (margin-outer * 2), {
    set text(size: 68pt, weight: "black", fill: white, font: "Inter", tracking: -2pt)
    set par(leading: 0.78em, justify: false)
    [${headlineLines.join(" \\\n    ")}]
  })
)
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

  // ── Opener-Solo ────────────────────────────────────────────
  if (seite.typ === "opener-solo") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const headlineLines = (seite.headline ?? "").split("\n");
    return `
// ── Feature-Opener: ${seite.headline?.replace(/\n/g, " ")} (Seite ${nr}) ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left, ${imgTypst(bk, assets)})
#place(bottom + left,
  rect(width: page-w, height: 140mm,
    fill: gradient.linear(
      rgb("#000000").transparentize(100%),
      rgb("#000000").transparentize(5%)
    )
  )
)
#place(top + left,
  rect(width: page-w, height: 22mm,
    fill: gradient.linear(rgb("#000000").transparentize(30%), rgb("#000000").transparentize(100%)))
)
#place(top + left, dx: margin-inner, dy: margin-top - 3mm,
  block(width: page-w - margin-inner - margin-outer)[
    #set text(size: 7pt, fill: white.transparentize(35%), tracking: 0.5pt, font: "Inter")
    #grid(columns: (auto, 1fr), column-gutter: 2.5mm,
      box(width: 8mm, height: 5.5mm, fill: col-accent)[
        #place(center + horizon, text(size: 7.5pt, weight: "bold", fill: white)[${nr}])
      ],
      align(right + horizon)[${seite.rubrik ? `#upper("${seite.rubrik}")` : ""}]
    )
  ]
)
#place(bottom + left, dx: margin-inner, dy: -(margin-bottom + 8mm),
  block(width: page-w - margin-inner - margin-outer)[
    ${seite.unterzeile
      ? `// Fix 11: Dachzeile auf 8pt (war 11pt)
    #set text(size: 8pt, weight: "bold", fill: col-accent, font: "Inter", tracking: 1.8pt)
    #set par(justify: false)
    #upper("${seite.unterzeile}")
    #v(3mm)`
      : ""}
    #set text(size: 72pt, weight: "black", fill: white, font: "Inter")
    #set par(leading: 0.80em, justify: false)
    ${headlineLines.join(" \\\n    ")}
    ${seite.byline
      ? `#v(5mm)
    #set text(size: 8pt, weight: "bold", fill: white.transparentize(30%), tracking: 0.6pt, font: "Inter")
    #upper("${seite.byline}")`
      : ""}
  ]
)
`;
  }

  // ── Intro-Page ─────────────────────────────────────────────
  if (seite.typ === "intro-page") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    // Fix 3: 10pt regular, max 280 Zeichen an Satzgrenze
    const intro = esc(introText(body, 280));
    return `
// ── Intro-Seite: Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h, margin: 0mm)
#place(top + left, ${imgTypst(bk, assets)})
#place(top + left,
  rect(width: page-w, height: 24mm,
    fill: gradient.linear(rgb("#000000").transparentize(30%), rgb("#000000").transparentize(100%)))
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
// Fix 3: 10pt regular statt 12.5pt bold
#place(bottom + left,
  block(width: page-w, fill: rgb("#ffffff").transparentize(10%),
    inset: (x: margin-inner + 4mm, top: 10mm, bottom: margin-bottom + 6mm),
  )[
    #columns(2, gutter: col-gutter)[
      #set text(size: 10pt, weight: "regular", fill: rgb("#1a1a1a"), font: "Inter")
      #set par(leading: 1.45em, justify: false)
      ${intro}
    ]
  ]
)
`;
  }

  // ── Standard-Feature ───────────────────────────────────────
  if (seite.typ === "standard-feature") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const pullQuote = PULL_QUOTES[seite.artikel_id] ?? "";

    // Drop Cap: nur bei Buchstaben, Text auf 500 Zeichen begrenzt (kein Overflow)
    const featureBody = featureText(body, 500);
    const firstChar = featureBody.slice(0, 1);
    const isLetter = /[a-zA-ZäöüÄÖÜß]/.test(firstChar);
    const bodyRest = esc(isLetter ? featureBody.slice(1) : featureBody);

    const headlineLines = (seite.headline ?? "").split("\n");

    return `
// ── Standard Feature: ${seite.headline?.replace(/\n/g, " ")} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#kolumnentitel(rubrik: "${seite.rubrik ?? ""}", seite: ${nr})
#v(3mm)
// Fix 9: box ohne Stroke (kein sichtbarer Rahmen)
${imgBox(bk, assets, "100%", "80mm")}
#v(3mm)
#t-dachzeile("${seite.dachzeile ?? ""}")
#v(1.5mm)
#block(width: 100%)[
  #set text(size: 26pt, weight: "bold", fill: col-text, font: "Inter")
  #set par(leading: 0.87em, justify: false)
  ${headlineLines.join(" \\\n  ")}
]
${seite.unterzeile ? `#v(1.5mm)\n#t-unterzeile[${seite.unterzeile}]` : ""}
${seite.byline ? `#v(2mm)\n#hrule(thickness: 0.3pt)\n#v(1.5mm)\n#t-byline[${seite.byline}]\n#v(1.5mm)\n#hrule(thickness: 0.3pt)` : ""}
#v(3mm)
// Fix 5+6: Serif-Einleitungstext, Drop Cap nur bei Buchstaben (kein columns-Overflow)
#block(breakable: false)[
  ${isLetter ? `#t-dropcap("${firstChar}")[${bodyRest}]` : `#t-body-serif[${bodyRest}]`}
]
${pullQuote ? `#t-pullquote-wide[${esc(pullQuote)}]` : ""}
`;
  }

  // ── Kurzmeldungen ──────────────────────────────────────────
  if (seite.typ === "kurzmeldungen") {
    const nr = Array.isArray(seite.nr) ? seite.nr[0] : seite.nr;
    const meldungen = seite.meldungen ?? [];
    // Fix 10: #colbreak() nach erster Meldung für gleichmäßige Spalten
    const meldungenTypst = meldungen
      .map((m, i) => {
        const block = `  #t-dachzeile("${m.dachzeile ?? ""}")
  #v(1.5mm)
  #block(width: 100%)[
    #set text(size: 17pt, weight: "bold", fill: col-text, font: "Inter")
    #set par(leading: 0.88em, justify: false)
    ${m.titel}
  ]
  #v(2mm)
  #hrule(thickness: 0.25pt)
  #v(2.5mm)
  #t-body[${esc(m.text)}]
  #v(6mm)`;
        // colbreak nach erster Meldung für bessere Spaltenbalance
        return i === 0 ? block + "\n  #colbreak()" : block;
      })
      .join("\n");

    return `
// ── Kurzmeldungen Seite ${nr} ──
#import "templates/base.typ": *
#set page(width: page-w, height: page-h,
  margin: (top: margin-top, bottom: margin-bottom,
           left: margin-inner, right: margin-outer))
#block(width: 100%)[
  #box(width: 100%, height: 7mm, fill: col-accent)
  #place(left + horizon, dx: 4mm, dy: -5mm,
    text(size: 9pt, weight: "bold", fill: white, tracking: 2pt, font: "Inter")[${(seite.rubrik ?? "NEWS").toUpperCase()}]
  )
]
#v(3mm)
#kolumnentitel(rubrik: "${seite.rubrik ?? "NEWS"}", seite: ${nr})
#v(4mm)
#columns(2, gutter: col-gutter)[
${meldungenTypst}
]
`;
  }

  return `// Unbekannter Typ: ${seite.typ}\n`;
}

function layoutToTypst(layoutPlan, assets) {
  const seiten = layoutPlan.seiten ?? [];
  const blocks = seiten.map((s) => seiteToTypst(s, assets));
  const combined = blocks.join("\n#pagebreak()\n");
  // Dedupliziere #import — nur der erste bleibt
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
  console.log("🏔️  ppi Cycling Magazin — Design-Fix Pipeline (v2)");
  console.log("=".repeat(55));

  console.log("\n🖼  Lade Bilder von Picsum…");
  const assets = await fetchImages();
  console.log(`   → ${Object.keys(assets).length} Bilder geladen`);

  console.log("\n📐 Generiere Typst-Quellcode…");
  const source = layoutToTypst(LAYOUT_PLAN, assets);
  fs.writeFileSync(path.join(__dir, "test-magazine-mtb.typ"), source);
  console.log(`   → ${source.split("\n").length} Zeilen`);
  console.log(`   → ${LAYOUT_PLAN.seiten.length} Seiten`);

  const templatesDir = path.join(__dir, "templates");
  const templateFiles = [
    "base.typ", "cover.typ", "opener-solo.typ", "intro-page.typ",
    "standard-feature.typ", "kurzmeldungen.typ", "spread-opener.typ",
  ];
  const files = {};
  for (const fname of templateFiles) {
    const fpath = path.join(templatesDir, fname);
    if (fs.existsSync(fpath)) {
      files[`templates/${fname}`] = fs.readFileSync(fpath, "utf-8");
    }
  }
  console.log(`   → ${Object.keys(files).length} Template-Dateien`);

  console.log("\n🔧 Rufe Bridge-Server auf…");
  let res;
  try {
    res = await fetch(`${BRIDGE_URL}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, files, assets }),
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

  const pdfPath = path.join(__dir, "test-magazine-mtb.pdf");
  const bytes = Buffer.from(data.pdf, "base64");
  fs.writeFileSync(pdfPath, bytes);

  const sizekb = Math.round(bytes.length / 1024);
  console.log(`\n✅ PDF generiert: ${sizekb} KB → ${pdfPath}`);
  console.log(`\n📖 Seiten:`);
  LAYOUT_PLAN.seiten.forEach((s) => {
    const nr = Array.isArray(s.nr) ? s.nr.join("–") : s.nr;
    const bildInfo = s.bildKey && assets[`${s.bildKey}.jpg`] ? "📷" : "🎨";
    console.log(`   S.${String(nr).padEnd(3)} ${s.typ.padEnd(20)} ${bildInfo}  ${s.headline?.replace(/\n/g, " ") ?? s.rubrik ?? ""}`);
  });
  console.log("\n🎉 Pipeline-Test erfolgreich abgeschlossen!");
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
