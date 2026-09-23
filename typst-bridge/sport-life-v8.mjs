// sport-life-v8.mjs — SPORT & LIFE Magazin, Ausgabe Frühjahr 2027
// 16 Seiten aus corpus-1-2027.json · PIL Bildverarbeitung
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE_URL = "http://localhost:9000";
const OUTPUT_FILE = path.join(__dir, "sport-life-v8.pdf");
const SCRATCHPAD = "/private/tmp/sfp-v8-imgs";

const corpus = JSON.parse(fs.readFileSync(path.join(__dir, "corpus-1-2027.json"), "utf8"));
const A = Array.isArray(corpus) ? corpus : (corpus.articles || Object.values(corpus)[0]);

// ── PIL-Script ────────────────────────────────────────────────
function ensurePilScript() {
  if (!fs.existsSync(SCRATCHPAD)) fs.mkdirSync(SCRATCHPAD, { recursive: true });
  const p = path.join(SCRATCHPAD, "enhance.py");
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, `import sys
from PIL import Image, ImageEnhance
img = Image.open(sys.argv[1]).convert("RGB")
img = ImageEnhance.Contrast(img).enhance(1.25)
img = ImageEnhance.Color(img).enhance(1.15)
img = ImageEnhance.Brightness(img).enhance(1.05)
img.save(sys.argv[2], "JPEG", quality=92, optimize=True)
`);
  }
  return p;
}
async function processImage(rawBuf, scriptPath) {
  try {
    const tmpIn  = path.join(SCRATCHPAD, `in_${Date.now()}.jpg`);
    const tmpOut = path.join(SCRATCHPAD, `out_${Date.now()}.jpg`);
    fs.writeFileSync(tmpIn, rawBuf);
    execFileSync("python3", [scriptPath, tmpIn, tmpOut], { timeout: 15000 });
    const result = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpIn);
    fs.unlinkSync(tmpOut);
    return result;
  } catch { return rawBuf; }
}

// ── Bild-URLs ─────────────────────────────────────────────────
const IMAGE_URLS = {
  "cover-0":        "https://picsum.photos/id/669/900/1270",
  "leit-portrait":  "https://picsum.photos/id/1/500/700",
  "leit-action":    "https://picsum.photos/id/338/800/500",
  "rep1-bg":        "https://picsum.photos/id/1004/1400/900",
  "rep1-inline":    "https://picsum.photos/id/443/800/500",
  "feature1-hero":  "https://picsum.photos/id/142/1400/700",
  "special1-img":   "https://picsum.photos/id/157/700/500",
  "test1-0":        "https://picsum.photos/id/174/600/400",
  "test1-1":        "https://picsum.photos/id/28/600/400",
  "test1-2":        "https://picsum.photos/id/543/600/400",
  "test1-3":        "https://picsum.photos/id/399/600/400",
  "itw1-portrait":  "https://picsum.photos/id/64/500/700",
  "rep2-bg":        "https://picsum.photos/id/301/1400/900",
  "rep2-inline":    "https://picsum.photos/id/366/800/500",
  "feature2-hero":  "https://picsum.photos/id/403/1400/700",
  "test2-0":        "https://picsum.photos/id/244/600/400",
  "test2-1":        "https://picsum.photos/id/383/600/400",
  "test2-2":        "https://picsum.photos/id/201/600/400",
  "special2-img":   "https://picsum.photos/id/167/700/500",
  "news1-img":      "https://picsum.photos/id/96/600/400",
  "news2-img":      "https://picsum.photos/id/425/600/400",
};

async function loadImages() {
  const assets = {}, loaded = {};
  const total = Object.keys(IMAGE_URLS).length;
  let ok = 0;
  const pilScript = ensurePilScript();
  console.log(`  Lade und verarbeite ${total} Bilder…`);
  for (const [key, url] of Object.entries(IMAGE_URLS)) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw = Buffer.from(await r.arrayBuffer());
      const processed = await processImage(raw, pilScript);
      const filename = `imgs/${key}.jpg`;
      assets[filename] = processed.toString("base64");
      loaded[key] = filename;
      process.stdout.write(`  ✓ ${key}\n`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${key}: ${e.message}`);
      loaded[key] = null;
    }
  }
  console.log(`  Bilder: ${ok}/${total} geladen`);
  return { assets, loaded };
}

// ── Hilfsfunktionen ───────────────────────────────────────────
function esc(s = "") {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/#/g, "\\#")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/"/g, '\\"');
}
function truncate(body = "", maxWords = 380) {
  const words = body.split(/\s+/);
  if (words.length <= maxWords) return body;
  const cut = words.slice(0, maxWords).join(" ");
  const dot = cut.lastIndexOf(".");
  return (dot > cut.length * 0.7 ? cut.slice(0, dot + 1) : cut) + " …";
}
function imgTypst(key, loaded, w = "100%", h = "60mm") {
  const f = loaded[key];
  return f ? `#image("${f}", width: ${w}, height: ${h}, fit: "cover")`
           : `#rect(width: ${w}, height: ${h}, fill: luma(200))`;
}
function imgCode(key, loaded) {
  const f = loaded[key];
  return f ? `image("${f}", width: 100%, height: 100%, fit: "cover")`
           : `rect(width: 100%, height: 100%, fill: luma(60))`;
}
const CAT_COLORS = {
  REPORTAGE:"#C8341A", TEST:"#2563EB", INTERVIEW:"#7C3AED",
  RATGEBER:"#059669", SPEZIAL:"#0891B2", FEATURE:"#B45309",
  NEWS:"#374151", EDITORIAL:"#1A1F36",
};
function catPill(cat) {
  const c = CAT_COLORS[cat] || "#FF6B00";
  return `#box(inset: (x: 3.5mm, y: 1.5mm), fill: rgb("${c}"), radius: 2pt)[` +
    `#set text(size: 7.5pt, tracking: 2pt, fill: white, weight: "bold", font: "Inter"); ` +
    `#set par(justify: false); ${esc(cat)}]`;
}
function kolWei(magazin, rubrik, seite, gerade = false) {
  const cols = gerade
    ? `(8mm, 1fr, auto), column-gutter: 2.5mm, align: horizon,
    box(width: 8mm, height: 5.5mm, fill: col-accent, radius: 0.5pt)[#place(center + horizon)[#set text(size: 7pt, fill: white, weight: "bold"); ${seite}]],
    [#upper("${esc(magazin)}")],
    [#upper("${esc(rubrik)}")],`
    : `(auto, 1fr, 8mm), column-gutter: 2.5mm, align: horizon,
    [#upper("${esc(rubrik)}")],
    [#align(right)[#upper("${esc(magazin)}")]],
    box(width: 8mm, height: 5.5mm, fill: col-accent, radius: 0.5pt)[#place(center + horizon)[#set text(size: 7pt, fill: white, weight: "bold"); ${seite}]],`;
  return `#block(width: 100%, inset: (left: margin-outer, right: margin-inner, top: 6mm, bottom: 0mm))[
  #set text(size: 7pt, fill: white, tracking: 0.4pt, font: "Inter")
  #grid(columns: ${cols})
  #v(1.5mm)
  #line(length: 100%, stroke: 0.4pt + white.transparentize(40%))
]`;
}
const BODY = `#set text(size: 9.5pt, font: "Inter", fill: col-text, lang: "de")
  #set par(leading: 4.5pt, justify: true, first-line-indent: 3.5mm)`;
const HDR = `#import "templates/base.typ": *`;

// ── Hardcode-Daten für strukturierte Templates ────────────────

const TRAIL_SHOES = [
  { key:"test1-0", marke:"Hoka", modell:"Speedgoat 6", wertung:"4,3 / 5", preis:"169 €",
    desc:"Cushion-Klassiker mit Vibram-Megagrip. Beste Wahl auf langen Distanzen und feuchtem Terrain." },
  { key:"test1-1", marke:"Salomon", modell:"S/Lab Ultra 3", wertung:"4,4 / 5", preis:"189 €",
    desc:"Leicht, direkt, technisch. Contagrip auf Schotter exzellent. Testsieger für technischen Trail." },
  { key:"test1-2", marke:"Asics", modell:"Trabuco Max 3", wertung:"4,1 / 5", preis:"154 €",
    desc:"Gel-Dämpfung erstmals auf Trail. Stark auf Mischoberflächen, weniger Grip auf Singletrail." },
  { key:"test1-3", marke:"Brooks", modell:"Caldera 8", wertung:"4,2 / 5", preis:"145 €",
    desc:"Breit, komfortabel, stabil. Klare Empfehlung für lange Distanzen. Preis-Leistungs-Tipp." },
];
const WATCHES = [
  { key:"test2-0", marke:"Garmin", modell:"Forerunner 965", wertung:"4,6 / 5", preis:"549 €",
    desc:"Referenzgerät. Beste GPS-Genauigkeit im Test, 31 Stunden Akku, umfangreiche Analyse-Features." },
  { key:"test2-1", marke:"Coros", modell:"Pace 3", wertung:"4,4 / 5", preis:"249 €",
    desc:"30 Gramm, 38 Stunden GPS, Multi-Band GNSS. Bestes Preis-Leistungs-Verhältnis im Test." },
  { key:"test2-2", marke:"Polar", modell:"Vantage V3", wertung:"4,3 / 5", preis:"499 €",
    desc:"Stärkste Herzfrequenzmessung und klinisch validierte Schlafanalyse. GPS knapp unter Garmin." },
];
const FRANZI_QA = [
  { q:"Du trainierst ohne Coach und ohne Analyse-Software. Wie funktioniert das?",
    a:"Mit einem Notizbuch und viel Erfahrung. Ich schreibe nach jeder Einheit auf, wie es sich angefühlt hat. Keine Wattzahlen, keine Laktatkurve – einfach ehrliche Selbstbeobachtung." },
  { q:"Was hat dich das gelehrt?",
    a:"Eine Bänderrissverletzung 2022. Ich habe zu lange ignoriert, was mein Körper sagte, und bin mit entzündetem Sprunggelenk weitergelaufen. Das hat mich drei Monate gekostet. Seither respektiere ich das Nein meines Körpers sofort." },
  { q:"Was meinst du damit, auf den Körper statt auf Strava zu hören?",
    a:"Es gibt Tage, an denen der Plan sagt: langer Lauf. Und mein Körper sagt: nein. Dann gehe ich spazieren. Früher hatte ich das Gefühl zu versagen. Heute weiß ich: der Körper weiß mehr als der Plan." },
  { q:"Was rätst du Läufern in Übertraining?",
    a:"Aufhören. Sofort. Nicht eine Woche reduzieren – wirklich aufhören. Zwei Wochen keine Laufschuhe, kein Strava. Den Körper einfach atmen lassen. Die meisten haben vergessen, wie das geht." },
];
const VO2MAX_INFOS = [
  { titel:"Wie messen?", text:"Spiroergometrie im Labor ist der Goldstandard. GPS-Uhren schätzen algorithmisch – Abweichung bis 10 %." },
  { titel:"Wie verbessern?", text:"Intervalltraining in Zone 4–5 plus hohes Volumen in Zone 1–2. Auch ab 50 noch signifikant steigerbar." },
  { titel:"Richtwerte Männer 30–39", text:"Unter 40: schwach · 40–47: mittel · Über 47: gut · Über 55: exzellent" },
];
const HOEHENLUFT_INFOS = [
  { titel:"Das 3-Wochen-Fenster", text:"Maximale EPO-Anpassung nach 3–4 Wochen. Effekt hält 4–6 Wochen nach der Rückkehr ins Tal." },
  { titel:"Live High – Train Low", text:"Schlafen auf 2.000–2.500 m, trainieren auf Normalhöhe. Durchschnittlich 1–3 % Leistungsgewinn." },
  { titel:"Für Amateure", text:"Ab einer Woche Höhentrainingslager profitiert die aerobe Basis – auch ohne vollen EPO-Effekt." },
];
function parseNews(article) {
  try { return JSON.parse(article.body); } catch { return []; }
}

// ── SEITEN-BUILDER ────────────────────────────────────────────

function buildCover(loaded) {
  const teasers = [
    "UTMB 2027: 33 Stunden, eine Nacht, ein Leben",
    "Trail-Schuhe 2027: Hoka, Salomon, Asics, Brooks im Duell",
    "VO2max – was die Zahl wirklich über dich aussagt",
    "Franzi Koch: Ich höre auf meinen Körper, nicht auf Strava",
  ].map(t =>
    `#grid(columns: (5mm, 1fr), column-gutter: 2mm, align: top,
      [#box(width: 3.5pt, height: 3.5pt, fill: col-accent)],
      [#set text(size: 8pt, fill: white.transparentize(10%), tracking: 0.3pt, font: "Inter"); #set par(justify: false, leading: 3.5pt); ${esc(t)}]
    )`
  ).join("\n#v(4mm)\n");

  return `${HDR}
#set page(width: page-w, height: page-h, margin: 0mm, background: ${imgCode("cover-0", loaded)})
#place(top + left, block(width: 100%, height: 100%)[
  #place(bottom + left, block(width: 100%, height: 72%, fill: gradient.linear(rgb("#00000000"), rgb("#000000E5"), angle: 90deg)))
  #place(top + right, dx: -16.2mm, dy: 10mm,
    block(inset: (x: 4mm, y: 2mm), fill: col-accent)[
      #set text(size: 7.5pt, fill: white, weight: "bold", tracking: 1.5pt, font: "Inter")
      #set par(justify: false)
      #upper("Frühjahr 2027")
    ]
  )
  #place(top + left, block(width: 100%, inset: (left: 16.2mm, top: 12mm))[
    #set par(justify: false)
    #text(size: 28pt, weight: "black", fill: white, tracking: 4pt, font: "Inter")[#upper("SPORT & LIFE")]
    #h(3mm)
    #box(inset: (x: 3mm, y: 1mm), fill: col-accent)[
      #set text(size: 9pt, fill: white, weight: "bold", font: "Inter")
      Nr. 01 · 2027
    ]
  ])
  #place(bottom + left, block(width: 100%, inset: (left: 16.2mm, right: 16.2mm, bottom: 20mm))[
    #set par(justify: false)
    [${catPill("EDITORIAL")}]
    #v(6mm)
    #set text(size: 62pt, weight: "black", fill: white, tracking: -1pt, font: "Inter")
    #set par(leading: 0.78em)
    Was dein
    Körper
    wirklich kann
    #v(5mm)
    #set text(size: 14pt, weight: "light", fill: white.transparentize(20%), tracking: 0.5pt)
    #set par(leading: 1.4em, justify: false)
    Ausdauer · Leistung · Erholung
    #v(10mm)
    #line(length: 40mm, stroke: 0.5pt + white.transparentize(50%))
    #v(6mm)
    ${teasers}
  ])
])`;
}

function buildTOC() {
  const entries = [
    { seite: 3,  cat:"EDITORIAL",  title:"Warum wir alle langsamer werden müssen" },
    { seite: 4,  cat:"REPORTAGE",  title:"Jenseits des Lichts" },
    { seite: 6,  cat:"FEATURE",    title:"Die Entdeckung der Langsamkeit" },
    { seite: 7,  cat:"SPEZIAL",    title:"VO2max – der Schlüssel zur Ausdauer" },
    { seite: 8,  cat:"TEST",       title:"Vier Schuhe, vier Terrains" },
    { seite: 9,  cat:"INTERVIEW",  title:"Ich höre auf meinen Körper – nicht auf Strava" },
    { seite: 10, cat:"REPORTAGE",  title:"Was der Körper wirklich braucht" },
    { seite: 12, cat:"FEATURE",    title:"Die wichtigste Einheit des Tages" },
    { seite: 13, cat:"TEST",       title:"Drei Uhren im Härtetest" },
    { seite: 14, cat:"SPEZIAL",    title:"Höhenluft als Trainingsbooster" },
    { seite: 15, cat:"NEWS",       title:"Sport aktuell" },
    { seite: 16, cat:"NEWS",       title:"Termine & Events 2027" },
  ];
  function entry(e) {
    const c = CAT_COLORS[e.cat] || "#374151";
    return `#block(width: 100%, below: 0mm)[
  #grid(columns: (12mm, auto, 1fr), column-gutter: 3mm, align: top,
    [#set text(size: 24pt, weight: "black", fill: luma(220), font: "Inter"); #set par(justify: false); ${e.seite}],
    [#v(3mm); #box(inset: (x: 2.5mm, y: 1mm), fill: rgb("${c}"), radius: 1.5pt)[#set text(size: 6pt, tracking: 1.5pt, fill: white, weight: "bold", font: "Inter"); #set par(justify: false); #upper("${esc(e.cat)}")]],
    [#v(2mm); #set text(size: 9.5pt, fill: col-text, font: "Inter"); #set par(justify: false, leading: 4pt); ${esc(e.title)}],
  )
  #v(2mm)
  #line(length: 100%, stroke: 0.3pt + luma(220))
  #v(4.5mm)
]`;
  }
  const col1 = entries.slice(0, 6).map(entry).join("\n");
  const col2 = entries.slice(6).map(entry).join("\n");
  return `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: (top: margin-top, left: margin-outer, right: margin-inner, bottom: margin-bottom))
#set text(font: "Inter", fill: col-text, lang: "de")
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "INHALT", seite: 2, gerade: true)
#v(8mm)
#text(size: 62pt, weight: "black", fill: col-text, tracking: -2pt, font: "Inter")[INHALT]
#v(1mm)
#text(size: 11pt, fill: col-accent, weight: "bold", font: "Inter")[Ausgabe Frühjahr 2027 — Nr. 01]
#v(8mm)
#line(length: 100%, stroke: 1.5pt + col-accent)
#v(8mm)
#grid(columns: (1fr, 1fr), column-gutter: 10mm, align: top,
  [${col1}],
  [${col2}]
)`;
}

function buildLeitartikel(article, loaded) {
  const dropLetter = article.body[0];
  const dropRest   = esc(article.body.slice(1, 200));
  const body2      = esc(truncate(article.body.slice(200), 250));
  return `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: (top: margin-top, left: margin-outer, right: margin-inner, bottom: margin-bottom))
${BODY}
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "EDITORIAL", seite: 3)
#v(6mm)
#grid(columns: (52mm, 1fr), column-gutter: 8mm, align: top,
  [
    ${imgTypst("leit-portrait", loaded, "52mm", "68mm")}
    #v(5mm)
    #set text(size: 7.5pt, weight: "bold", fill: col-accent, tracking: 1pt, font: "Inter")
    #set par(justify: false)
    #upper("${esc(article.autor)}")
    #v(2mm)
    #set text(size: 8pt, fill: col-caption)
    Chefredakteur SPORT & LIFE
    #v(7mm)
    #line(length: 100%, stroke: 0.5pt + col-rule)
    #v(5mm)
    #set text(size: 12.5pt, style: "italic", fill: col-text, weight: "medium", font: "Inter")
    #set par(leading: 5.5pt, justify: false)
    \\u{201E}${esc(article.pullquote)}\\u{201C}
    #v(7mm)
    ${imgTypst("leit-action", loaded, "52mm", "44mm")}
  ],
  [
    [${catPill("EDITORIAL")}]
    #v(5mm)
    #set text(size: 34pt, weight: "black", fill: col-text, tracking: -0.5pt, font: "Inter")
    #set par(leading: 0.85em, justify: false)
    ${esc(article.headline)}
    #v(4mm)
    #set text(size: 12pt, weight: "light", fill: luma(55%))
    #set par(leading: 1.4em, justify: false)
    ${esc(article.subheadline)}
    #v(6mm)
    #line(length: 28mm, stroke: 2pt + col-accent)
    #v(6mm)
    ${BODY}
    #grid(columns: (auto, 1fr), column-gutter: 2mm, align: top,
      [#text(size: 68pt, weight: "black", fill: col-text, font: "Inter")[${dropLetter}]],
      [${dropRest}]
    )
    #v(3mm)
    ${body2}
  ]
)`;
}

function buildReportage(article, loaded, bgKey, inlineKey, seiteLinks) {
  const body = esc(truncate(article.body, 210));
  const leftPage = `${HDR}
#set page(width: page-w, height: page-h, margin: 0mm, background: ${imgCode(bgKey, loaded)})
#place(top + left, [${kolWei("SPORT & LIFE", "REPORTAGE", seiteLinks, true)}])
#place(bottom + left, block(width: 100%, height: 65%, fill: gradient.linear(rgb("#00000000"), rgb("#000000EA"), angle: 90deg)))
#place(bottom + left, block(width: 100%, inset: (left: margin-outer, right: margin-inner, bottom: 18mm))[
  #set par(justify: false)
  [${catPill("REPORTAGE")}]
  #v(6mm)
  #set text(size: 46pt, weight: "black", fill: white, tracking: -0.5pt, font: "Inter")
  #set par(leading: 0.82em)
  ${esc(article.headline)}
  #v(5mm)
  #set text(size: 13pt, weight: "light", fill: white.transparentize(15%))
  #set par(leading: 1.35em)
  ${esc(article.subheadline)}
  #v(5mm)
  #set text(size: 8pt, weight: "bold", fill: col-accent, tracking: 1.5pt)
  #upper("${esc(article.autor)}")
])`;
  const rightPage = `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: (top: margin-top, left: margin-inner, right: margin-outer, bottom: margin-bottom))
${BODY}
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "REPORTAGE", seite: ${seiteLinks + 1})
#v(5mm)
${imgTypst(inlineKey, loaded, "100%", "60mm")}
#v(2mm)
#set text(size: 7.5pt, style: "italic", fill: col-caption)
#set par(justify: false)
${esc(article.autor)} für SPORT & LIFE
#v(6mm)
#columns(2, gutter: col-gutter)[
  ${BODY}
  ${body}
  #colbreak()
  #v(1fr)
  #line(length: 22mm, stroke: 2pt + col-accent)
  #v(3mm)
  #set text(size: 14pt, style: "italic", fill: col-text, weight: "medium", font: "Inter")
  #set par(leading: 5.5pt, justify: false)
  \\u{201E}${esc(article.pullquote)}\\u{201C}
  #v(3mm)
  #line(length: 22mm, stroke: 0.5pt + col-rule)
]`;
  return leftPage + "\n#pagebreak()\n" + rightPage;
}

function buildFeature(article, loaded, heroKey, seite) {
  const body = esc(truncate(article.body, 200));
  const pullquote = esc(article.pullquote);
  const gerade = seite % 2 === 0;
  return `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: (top: 0mm, left: 0mm, right: 0mm, bottom: margin-bottom))
${imgTypst(heroKey, loaded, "100%", "90mm")}
#place(top + left, [${kolWei("SPORT & LIFE", "FEATURE", seite, gerade)}])
#block(width: 100%, inset: (left: margin-outer, right: margin-inner, top: 6mm))[
  ${BODY}
  [${catPill("FEATURE")}]
  #v(5mm)
  #set text(size: 32pt, weight: "black", fill: col-text, tracking: -0.5pt, font: "Inter")
  #set par(leading: 0.86em, justify: false)
  ${esc(article.headline)}
  #v(4mm)
  #set text(size: 11.5pt, weight: "light", fill: luma(50%))
  #set par(leading: 1.4em, justify: false)
  ${esc(article.subheadline)}
  #v(6mm)
  #grid(columns: (1fr, 50mm), column-gutter: 7mm, align: top,
    [${BODY}; ${body}],
    [
      #block(width: 100%, fill: luma(248), radius: 3pt, inset: (x: 5mm, y: 6mm))[
        #set text(size: 7.5pt, weight: "bold", fill: col-accent, tracking: 1pt, font: "Inter")
        #set par(justify: false)
        #upper("Merksatz")
        #v(3mm)
        #line(length: 100%, stroke: 0.4pt + col-rule)
        #v(4mm)
        #set text(size: 12.5pt, style: "italic", fill: col-text, weight: "medium", font: "Inter")
        #set par(leading: 5.5pt, justify: false)
        \\u{201E}${pullquote}\\u{201C}
      ]
    ]
  )
]`;
}

function buildSpecial(article, loaded, imgKey, ankerzahl, ankereinheit, infos, seite) {
  const gerade = seite % 2 === 0;
  const accentHex = CAT_COLORS["SPEZIAL"];
  function infoBox(ib) {
    return `#block(width: 100%, stroke: 0.5pt + luma(210), radius: 3pt, inset: (x: 5mm, y: 5mm))[
  #set text(size: 8pt, weight: "bold", fill: rgb("${accentHex}"), tracking: 0.8pt, font: "Inter")
  #set par(justify: false)
  #upper("${esc(ib.titel)}")
  #v(3mm)
  #line(length: 100%, stroke: 0.4pt + luma(220))
  #v(3mm)
  #set text(size: 8.5pt, fill: col-text, weight: "regular")
  #set par(leading: 4pt, justify: false)
  ${esc(ib.text)}
]`;
  }
  return `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: (top: margin-top, left: margin-outer, right: margin-inner, bottom: margin-bottom))
${BODY}
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "SPEZIAL", seite: ${seite}, gerade: ${gerade})
#v(6mm)
[${catPill("SPEZIAL")}]
#v(6mm)
#block(width: 100%, fill: rgb("${accentHex}"), radius: 3pt, inset: (x: 8mm, y: 8mm))[
  #grid(columns: (1fr, 55mm), column-gutter: 6mm, align: horizon,
    [
      #set par(justify: false)
      #text(size: 96pt, weight: "black", fill: white, font: "Inter")[${esc(ankerzahl)}]
      #h(3mm)
      #text(size: 16pt, fill: white.transparentize(20%), weight: "medium")[${esc(ankereinheit)}]
      #v(4mm)
      #set text(size: 11pt, style: "italic", fill: white.transparentize(15%))
      #set par(leading: 5pt, justify: false)
      \\u{201E}${esc(article.pullquote)}\\u{201C}
    ],
    [${imgTypst(imgKey, loaded, "55mm", "62mm")}]
  )
]
#v(7mm)
#set text(size: 26pt, weight: "black", fill: col-text, tracking: -0.3pt, font: "Inter")
#set par(leading: 0.88em, justify: false)
${esc(article.headline)}
#v(3mm)
#set text(size: 11pt, weight: "light", fill: luma(50%))
#set par(leading: 1.4em, justify: false)
${esc(article.subheadline)}
#v(8mm)
#grid(columns: (1fr, 1fr, 1fr), column-gutter: 5mm,
  [${infoBox(infos[0])}],
  [${infoBox(infos[1])}],
  [${infoBox(infos[2])}]
)`;
}

function buildTest(article, loaded, produkte, seite) {
  const gerade = seite % 2 === 0;
  const cols = produkte.length >= 4 ? "(1fr, 1fr)" : "(1fr, 1fr, 1fr)";
  function karte(p) {
    return `[#block(stroke: 0.5pt + luma(215), radius: 3pt, clip: true, width: 100%)[
  ${imgTypst(p.key, loaded, "100%", "24mm")}
  #block(inset: (x: 5mm, y: 5mm))[
    #set par(justify: false)
    #set text(size: 7pt, weight: "bold", fill: col-accent, tracking: 1pt, font: "Inter")
    #upper("${esc(p.marke)}")
    #v(1mm)
    #set text(size: 11pt, weight: "black", fill: col-text, font: "Inter")
    ${esc(p.modell)}
    #v(2mm)
    #set text(size: 8pt, fill: col-caption)
    ${esc(p.desc)}
    #v(3mm)
    #grid(columns: (1fr, auto), align: horizon,
      [#set text(size: 13pt, weight: "black", fill: col-text); ${esc(p.wertung)}],
      [#box(inset: (x: 3mm, y: 1.5mm), fill: rgb("#2563EB"), radius: 2pt)[#set text(size: 8pt, fill: white, weight: "bold"); ${esc(p.preis)}]]
    )
  ]
]]`;
  }
  const karten = produkte.map(karte).join(",\n");
  return `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: (top: margin-top, left: margin-outer, right: margin-inner, bottom: margin-bottom))
${BODY}
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "TEST", seite: ${seite}, gerade: ${gerade})
#v(6mm)
[${catPill("TEST")}]
#v(5mm)
#set text(size: 30pt, weight: "black", fill: col-text, tracking: -0.3pt, font: "Inter")
#set par(leading: 0.88em, justify: false)
${esc(article.headline)}
#v(3mm)
#set text(size: 11pt, weight: "light", fill: luma(50%))
#set par(leading: 1.4em, justify: false)
${esc(article.subheadline)}
#v(4mm)
#set text(size: 9pt, fill: col-text, font: "Inter")
#set par(justify: true, leading: 4pt)
${esc(truncate(article.body, 60))}
#v(6mm)
#grid(columns: ${cols}, column-gutter: 5mm, row-gutter: 5mm,
  ${karten}
)`;
}

function buildInterview(article, loaded, portraitKey, qa, seite) {
  const qaTypst = qa.map(({q, a}) =>
    `#v(4mm)
#set text(size: 9pt, weight: "bold", fill: col-text, font: "Inter")
#set par(justify: false, leading: 4pt)
${esc(q)}
#v(2.5mm)
#set text(size: 9.5pt, weight: "regular", fill: col-text)
#set par(justify: true, leading: 4.5pt, first-line-indent: 0mm)
${esc(a)}`
  ).join("\n");

  return `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: 0mm)
#grid(columns: (48%, 52%), rows: (page-h,), align: top,
  // Portrait
  block(width: 100%, height: 100%, clip: true)[
    ${imgTypst(portraitKey, loaded, "100%", "100%")}
    #place(top + left, [${kolWei("SPORT & LIFE", "INTERVIEW", seite, false)}])
    #place(bottom + left, block(width: 100%, height: 35%,
      fill: gradient.linear(rgb("#00000000"), rgb("#000000C0"), angle: 90deg)
    ))
    #place(bottom + left, block(width: 100%, inset: (left: margin-outer, bottom: 10mm))[
      #set par(justify: false)
      #set text(size: 18pt, weight: "black", fill: white, font: "Inter")
      ${esc(article.autor.split(",")[0].trim())}
      #v(1mm)
      #set text(size: 9pt, fill: white.transparentize(20%))
      Ultraläuferin & Sozialpädagogin
    ])
  ],
  // Rechte Spalte
  block(width: 100%, height: 100%, inset: (left: 8mm, right: margin-outer, top: margin-top, bottom: margin-bottom))[
    ${BODY}
    [${catPill("INTERVIEW")}]
    #v(5mm)
    #set text(size: 26pt, weight: "black", fill: col-text, font: "Inter", tracking: -0.3pt)
    #set par(leading: 0.88em, justify: false)
    ${esc(article.headline)}
    #v(4mm)
    #line(length: 28mm, stroke: 2pt + rgb("${CAT_COLORS["INTERVIEW"]}"))
    #v(5mm)
    #block(fill: rgb("#F5F3FF"), radius: 3pt, inset: (x: 5mm, y: 5mm), width: 100%)[
      #set text(size: 12pt, style: "italic", fill: col-text, weight: "medium", font: "Inter")
      #set par(leading: 5.5pt, justify: false)
      \\u{201E}${esc(article.pullquote)}\\u{201C}
    ]
    ${qaTypst}
  ]
)`;
}

function buildNews(meldungen, seiteNr, imgKey, loaded) {
  const n = meldungen.length;
  const perCol = Math.ceil(n / 3);
  const gerade = seiteNr % 2 === 0;
  const items = meldungen.map((m, i) => {
    const brk = (i + 1) % perCol === 0 && i < n - 1 ? "\n#colbreak()\n" : "";
    const img = (i === 0 && loaded && loaded[imgKey])
      ? `${imgTypst(imgKey, loaded, "100%", "32mm")}\n#v(3mm)\n`
      : "";
    return `${img}#block(below: 0mm, width: 100%)[
  #set text(size: 6.5pt, weight: "bold", fill: col-accent, tracking: 1.5pt, font: "Inter")
  #set par(justify: false)
  #upper("${esc(m.dachzeile || "NEWS")}")
  #v(1mm)
  #set text(size: 9.5pt, weight: "black", fill: col-text, font: "Inter")
  #set par(justify: false, leading: 4pt)
  ${esc(m.titel)}
  #v(2mm)
  #set text(size: 8.5pt, weight: "regular", fill: col-text)
  #set par(justify: false, leading: 4pt, first-line-indent: 0mm)
  ${esc(truncate(m.text, 55))}
]
#v(4mm)
#line(length: 100%, stroke: 0.3pt + luma(220))
#v(4mm)
${brk}`;
  }).join("\n");

  return `${HDR}
#set page(width: page-w, height: page-h, fill: white, background: none, margin: (top: margin-top, left: margin-outer, right: margin-inner, bottom: margin-bottom))
${BODY}
#kolumnentitel(magazin: "SPORT & LIFE", rubrik: "NEWS", seite: ${seiteNr}, gerade: ${gerade})
#v(6mm)
#grid(columns: (1fr, auto), align: horizon,
  [#set text(size: 24pt, weight: "black", fill: col-text, tracking: -0.5pt, font: "Inter"); #set par(justify: false); NEWS],
  [#box(inset: (x: 3mm, y: 1.5mm), fill: rgb("${CAT_COLORS["NEWS"]}"), radius: 2pt)[#set text(size: 8pt, fill: white, weight: "bold"); Frühjahr 2027]]
)
#v(3mm)
#line(length: 100%, stroke: 1pt + col-accent)
#v(6mm)
#columns(3, gutter: col-gutter)[
  ${items}
]`;
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log("🖨  SPORT & LIFE v8 — Frühjahr 2027 · 16 Seiten");
  const { assets, loaded } = await loadImages();

  const pages = [
    buildCover(loaded),
    buildTOC(),
    buildLeitartikel(A[0], loaded),
    buildReportage(A[2], loaded, "rep1-bg", "rep1-inline", 4),
    buildFeature(A[5], loaded, "feature1-hero", 6),
    buildSpecial(A[14], loaded, "special1-img", "90", "ml/min/kg", VO2MAX_INFOS, 7),
    buildTest(A[8], loaded, TRAIL_SHOES, 8),
    buildInterview(A[11], loaded, "itw1-portrait", FRANZI_QA, 9),
    buildReportage(A[3], loaded, "rep2-bg", "rep2-inline", 10),
    buildFeature(A[7], loaded, "feature2-hero", 12),
    buildTest(A[9], loaded, WATCHES, 13),
    buildSpecial(A[15], loaded, "special2-img", "2 500", "Meter Höhe", HOEHENLUFT_INFOS, 14),
    buildNews(parseNews(A[17]), 15, "news1-img", loaded),
    buildNews(parseNews(A[19]), 16, "news2-img", loaded),
  ].join("\n#pagebreak()\n");

  const baseTyp = fs.readFileSync(path.join(__dir, "templates", "base.typ"), "utf-8");
  console.log("  Compiliere mit Typst-Bridge…");
  const payload = { source: pages, assets, files: { "templates/base.typ": baseTyp } };
  const res = await fetch(`${BRIDGE_URL}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Bridge-Fehler:", err);
    process.exit(1);
  }
  const { pdf, error } = await res.json();
  if (error) { console.error("Typst-Fehler:\n", error); process.exit(1); }
  const buf = Buffer.from(pdf, "base64");
  fs.writeFileSync(OUTPUT_FILE, buf);
  console.log(`✓ PDF gespeichert: ${OUTPUT_FILE} (${Math.round(buf.length / 1024)} KB)`);
}
main().catch(e => { console.error(e); process.exit(1); });
