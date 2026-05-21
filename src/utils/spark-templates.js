// ── src/utils/spark-templates.js ──────────────────────────────────────────────
// Pre-built HTML templates for Creation Voodoo.
//
// Each template is a pure function: (content, dossierPdfUrl?) => HTML string.
// The AI generates only a small content JSON (~700 tokens) instead of full HTML
// (~4500 tokens) → ~5× faster generation with guaranteed structure.
//
// Templates use PAGE_CSS as their base design system. :root colour variables
// are the only per-project override — the AI picks them from the topic.
//
// All async logic (AI call → JSON → render) lives in generateContent() at the
// bottom of this file.

import { PAGE_CSS, LINK_GUARD } from "./spark.js";
import { aiCallStream } from "./store.js";

// Robuste JSON-Extraktion mit Bracket-Counter.
// Probleme die der naive lastIndexOf-Ansatz NICHT löst:
//  - Modell schreibt nach dem JSON noch Erklärtext mit {} (z.B. CSS-Snippets)
//  - lastIndexOf("}") findet dann den falschen schließenden Bracket
//  - Unescaped " in deutschen Texten (»"tolles" Produkt«) bricht JSON.parse
// Diese Version zählt Brackets unter Berücksichtigung von Strings + Escape-Chars.
function extractJSON(raw) {
  // 1. Markdown-Codeblöcke entfernen
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // 2. Direkter Parse-Versuch (perfekter Output)
  try { return JSON.parse(s); } catch {}

  // 3. Bracket-counting: findet das ERSTE vollständige {...} Objekt
  const startIdx = s.indexOf("{");
  if (startIdx === -1) return null;

  let depth = 0, inStr = false, escaped = false, endIdx = -1;
  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];
    if (escaped)          { escaped = false; continue; }
    if (ch === "\\" && inStr) { escaped = true;  continue; }
    if (ch === '"')        { inStr = !inStr;  continue; }
    if (inStr)             continue;
    if (ch === "{")        depth++;
    else if (ch === "}") { depth--; if (depth === 0) { endIdx = i; break; } }
  }

  if (endIdx > startIdx) {
    let json = s.slice(startIdx, endIdx + 1);
    // 4. Direkter Parse auf extrahiertem JSON
    try { return JSON.parse(json); } catch {}
    // 5. Häufige LLM-Fehler reparieren:
    //    a) Trailing commas vor ] oder }
    //    b) Unescaped " innerhalb von Strings → durch ' ersetzen
    json = json
      .replace(/,\s*([}\]])/g, "$1")             // trailing comma
      .replace(/"([^"]*)"([^"]*)"([^"]*)"/g,     // "word "inner" word" → "word 'inner' word"
               (_, a, b, c) => `"${a}'${b}'${c}"`);
    try { return JSON.parse(json); } catch {}
  }
  return null;
}

// ── Image helpers — focus-point aware ─────────────────────────────────────────
// objectPosition comes from media item's focusPoint (injected before renderTemplate())

/** style attr for a hero <section> with background-image */
function imgBg(img) {
  if (!img?.url) return "";
  const pos = img.objectPosition || "center";
  return ` style="background-image:url('${esc(img.url)}');background-position:${esc(pos)}"`;
}

/** class attr value for a hero <section> (with or without bg image) */
function imgCls(img) {
  return `"hero${img?.url ? " hero-bg" : ""}"`;
}

/** Renders a responsive <img> with correct focus-point object-position */
function imgEl(img, ratio = "16/10") {
  if (!img?.url) return "";
  const pos = img.objectPosition || "center";
  return `<img src="${esc(img.url)}" alt="${esc(img.alt||"")}" style="width:100%;border-radius:12px;aspect-ratio:${ratio};object-fit:cover;object-position:${esc(pos)}">`;
}

// ── HTML helpers ───────────────────────────────────────────────────────────────

// Strip emoji/unicode pictographs before HTML-escaping — prevents AI emoji from showing
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F900}-\u{1F9FF}]/gu;

function esc(s) {
  return String(s || "")
    .replace(EMOJI_RE, "")   // strip any emoji the AI snuck in
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nav(c) {
  const links = (c.nav?.links || [])
    .map(l => `<a href="#${esc(l.anchor)}">${esc(l.label)}</a>`)
    .join("");
  return `<nav><div class="ni">
  <span class="logo">${esc(c.nav?.logo)}</span>
  <div class="nl">${links}<a href="#cta" class="nav-cta">${esc(c.hero?.cta1 || "Mehr erfahren")}</a></div>
</div></nav>`;
}

function cards(items) {
  return (items || []).map(item =>
    `<div class="card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>`
  ).join("\n");
}

function stats(items) {
  return (items || []).map(s => {
    let number = String(s.num  ?? s.value ?? "");
    let desc   = String(s.desc ?? s.label ?? "");
    // Auto-correct: AI frequently swaps fields. num must be the short value (max ~10 chars).
    if (number.length > 10 && (desc.length === 0 || desc.length < number.length)) {
      [number, desc] = [desc, number];
    }
    // Safety clamp: stat slot is styled for short strings
    if (number.length > 12) number = number.slice(0, 10) + "…";
    return `<div><span class="stat">${esc(number)}</span><span class="stat-l">${esc(desc)}</span></div>`;
  }).join("\n");
}

function quote(c) {
  if (!c?.text) return "";
  return `<section class="alt"><div class="w">
  <blockquote class="quote">${esc(c.text)}<cite>${esc(c.author)}${c.role ? ` — ${esc(c.role)}` : ""}</cite></blockquote>
</div></section>`;
}

function ctaSection(cta, dossierPdfUrl, ctaUrl = "") {
  let action;
  if (dossierPdfUrl) {
    // Email-capture form: enter email → PDF opens in new tab
    action = `<div style="max-width:520px;margin:0 auto">
      <p style="color:rgba(255,255,255,.75);font-size:.88rem;margin-bottom:14px">
        Jetzt E-Mail eingeben und das Dossier kostenlos herunterladen.
      </p>
      <form id="lead-form" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <input type="email" required placeholder="Ihre E-Mail-Adresse" style="flex:1;min-width:220px;padding:13px 18px;border-radius:8px;border:none;font-size:1rem;background:rgba(255,255,255,.15);color:#fff;outline:2px solid rgba(255,255,255,.4)">
        <button type="submit" class="btn btn-w">${esc(cta?.buttonText || "Dossier herunterladen")}</button>
      </form>
    </div>`;
  } else if (ctaUrl) {
    action = `<div class="btns"><a href="${esc(ctaUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-w">${esc(cta?.buttonText || "Jetzt starten")}</a></div>`;
  } else {
    action = `<div class="btns"><a href="#" class="btn btn-w">${esc(cta?.buttonText || "Jetzt starten")}</a></div>`;
  }

  return `<section id="cta" class="cta-b"><div class="w">
  ${cta?.label ? `<span class="lbl" style="color:rgba(255,255,255,.7)">${esc(cta.label)}</span>` : ""}
  <h2>${esc(cta?.headline)}</h2>
  <p>${esc(cta?.subtext)}</p>
  ${action}
</div></section>`;
}

function footer(c) {
  const groups = (c.footer?.groups || []).map(g =>
    `<div><strong style="color:#fff;display:block;margin-bottom:8px">${esc(g.title)}</strong>${
      (g.links || []).map(l => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join(" · ")
    }</div>`
  ).join("");
  return `<footer><div class="w">
  <div class="footer-g">${groups}</div>
  <div>${esc(c.footer?.copyright || `© ${new Date().getFullYear()} ${c.nav?.logo || ""}`)}</div>
</div></footer>`;
}

/**
 * Generates the email-capture JavaScript block.
 * Exported so freeform pages can inject it too (not just template pages).
 */
export function buildEmailScript(pdfUrl) {
  if (!pdfUrl) return "";
  return `<script>
/* Spark email-capture v2 */
(function(){
  var U=${JSON.stringify(pdfUrl)};
  if(!U){return;}
  document.addEventListener('submit',function(e){
    var form=e.target;
    if(!form.querySelector('input[type="email"]'))return;
    e.preventDefault();
    var email=form.querySelector('input[type="email"]').value||'';
    var b=form.querySelector('button[type="submit"]');
    if(b){b.textContent='Wird geoeffnet…';b.disabled=true;}
    setTimeout(function(){
      window.open(U,'_blank','noopener');
      var wrap=form.closest('div')||form.parentNode;
      if(wrap){
        wrap.innerHTML='<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:24px 32px;text-align:center">'
          +'<div style="font-size:1.5rem;margin-bottom:8px;color:#fff">OK</div>'
          +'<div style="color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:6px">Dossier wird geoeffnet!</div>'
          +'<div style="color:rgba(255,255,255,.75);font-size:.9rem">Das PDF oeffnet sich in einem neuen Tab.</div>'
          +'</div>';
      }
    },600);
  });
})();
</script>`;
}
// Internal alias for wrap()
function emailScript(pdfUrl) { return buildEmailScript(pdfUrl); }

function wrap(c, body, dossierPdfUrl, _ctaUrl) {
  const p = c.colors?.primary || "#2563EB";
  const d = c.colors?.dark    || "#1E3A8A";
  const l = c.colors?.light   || "#EFF6FF";
  const f = c.colors?.font    || "Inter";
  const script = dossierPdfUrl ? emailScript(dossierPdfUrl) : "";
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.meta?.title || "Landing Page")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${f.replace(/ /g,"+")}:ital,wght@0,400;0,600;0,700;0,900;1,400&display=swap" rel="stylesheet">
<style>:root{--p:${p};--pd:${d};--pl:${l};--font:'${f}',system-ui,sans-serif}</style>
<style>${PAGE_CSS}</style>
</head>
<body>
${body}
${LINK_GUARD}
${script}
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE #1 — Editorial Dossier
// Use for: news specials, publisher deep-dives, background reports
// Default colors: newspaper red / dark navy / warm cream
// ═══════════════════════════════════════════════════════════════════════════════
export function tEditorial(c, dossierPdfUrl = "", ctaUrl = "") {
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  // Support both old schema (intro) and new (about)
  const aboutSrc = c.about || c.intro;
  const introImg = imgEl(aboutSrc?.image, "16/10");

  const body = `
<!-- NAV_IDS: hero,themen,zahlen,intro,cta -->
${nav(c)}

<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label ? `<span class="lbl">${esc(c.hero.label)}</span>` : ""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns">
    <a href="#cta" class="btn btn-p">${esc(c.hero?.cta1 || "Jetzt lesen")}</a>
    ${c.hero?.cta2 ? `<a href="#intro" class="btn btn-o">${esc(c.hero.cta2)}</a>` : ""}
  </div>
</div></section>

<section id="themen" class="alt"><div class="w">
  ${(c.features||c.themes)?.label ? `<span class="lbl">${esc((c.features||c.themes).label)}</span>` : ""}
  <h2>${esc((c.features||c.themes)?.headline)}</h2>
  <div class="g g3">${cards((c.features||c.themes)?.items)}</div>
</div></section>

<section id="zahlen"><div class="w">
  <span class="lbl">In Zahlen</span>
  <div class="g g4">${stats(c.stats)}</div>
</div></section>

<section id="intro" class="alt"><div class="w">
  <span class="lbl">${esc(aboutSrc?.label || "Hintergrund")}</span>
  <div class="img-r">
    <div>
      <h2>${esc(aboutSrc?.headline)}</h2>
      <p class="lead">${esc(aboutSrc?.text)}</p>
    </div>
    ${introImg}
  </div>
</div></section>

${quote(c.quote)}

${ctaSection(c.cta, dossierPdfUrl, ctaUrl)}

${footer(c)}`;

  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE #2 — Event & Erlebnis
// Use for: reader journeys, travel packages, events, experiences
// Default colors: forest green / deep earth / warm beige
// ═══════════════════════════════════════════════════════════════════════════════
export function tEvent(c, dossierPdfUrl = "", ctaUrl = "") {
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutSrc = c.about || c.intro;
  const introImg = imgEl(aboutSrc?.image, "16/10");

  const body = `
<!-- NAV_IDS: hero,themen,zahlen,intro,cta -->
${nav(c)}

<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label ? `<span class="lbl">${esc(c.hero.label)}</span>` : ""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns">
    <a href="#cta" class="btn btn-p">${esc(c.hero?.cta1 || "Jetzt anmelden")}</a>
    ${c.hero?.cta2 ? `<a href="#intro" class="btn btn-o">${esc(c.hero.cta2)}</a>` : ""}
  </div>
</div></section>

<section id="themen"><div class="w">
  ${(c.features||c.themes)?.label ? `<span class="lbl">${esc((c.features||c.themes).label)}</span>` : ""}
  <h2>${esc((c.features||c.themes)?.headline)}</h2>
  <div class="g g3">${cards((c.features||c.themes)?.items)}</div>
</div></section>

<section id="zahlen" class="alt"><div class="w">
  <span class="lbl">Auf einen Blick</span>
  <div class="g g4">${stats(c.stats)}</div>
</div></section>

<section id="intro"><div class="w">
  <span class="lbl">${esc(aboutSrc?.label || "Das Erlebnis")}</span>
  <div class="img-r">
    ${introImg}
    <div>
      <h2>${esc(aboutSrc?.headline)}</h2>
      <p class="lead">${esc(aboutSrc?.text)}</p>
    </div>
  </div>
</div></section>

${quote(c.quote)}
${ctaSection(c.cta, dossierPdfUrl, ctaUrl)}
${footer(c)}`;

  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES #3–#10
// All share: nav · hero · features(g3) · about(img-r) · stats(g4) · quote · cta · footer
// Only section IDs, .alt alternation, img position, and color defaults differ.
// ═══════════════════════════════════════════════════════════════════════════════

// ── #3 Lead Capture ───────────────────────────────────────────────────────────
export function tLeadCapture(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutImg = imgEl(c.about?.image, "4/3");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#7C3AED", dark:"#4C1D95", light:"#EDE9FE", font:"Manrope", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,vorteile,inhalt,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label ? `<span class="lbl">${esc(c.hero.label)}</span>` : ""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Kostenlos herunterladen")}</a>${c.hero?.cta2?`<a href="#vorteile" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
</div></section>
<section id="vorteile" class="alt"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="inhalt"><div class="w">
  <span class="lbl">${esc(c.about?.label||"Was dich erwartet")}</span>
  <div class="img-r"><div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div>${aboutImg}</div>
</div></section>
<section id="zahlen" class="alt"><div class="w"><span class="lbl">Auf einen Blick</span><div class="g g4">${stats(c.stats)}</div></div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ── #4 Product Launch ─────────────────────────────────────────────────────────
export function tProductLaunch(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutImg = imgEl(c.about?.image, "4/3");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#E65100", dark:"#BF360C", light:"#FFF3E0", font:"Outfit", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,features,produkt,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label?`<span class="lbl">${esc(c.hero.label)}</span>`:""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Jetzt kaufen")}</a>${c.hero?.cta2?`<a href="#features" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
</div></section>
<section id="features"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="zahlen" class="alt"><div class="w"><span class="lbl">Kennzahlen</span><div class="g g4">${stats(c.stats)}</div></div></section>
<section id="produkt"><div class="w">
  <span class="lbl">${esc(c.about?.label||"Das Produkt")}</span>
  <div class="img-r">${aboutImg}<div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div></div>
</div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ── #5 Service / Agentur ──────────────────────────────────────────────────────
export function tService(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutImg = imgEl(c.about?.image, "4/3");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#1A237E", dark:"#0D1B6E", light:"#E8EAF6", font:"Manrope", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,leistungen,ueber,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label?`<span class="lbl">${esc(c.hero.label)}</span>`:""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Beratung anfragen")}</a>${c.hero?.cta2?`<a href="#leistungen" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
</div></section>
<section id="leistungen" class="alt"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="ueber"><div class="w">
  <span class="lbl">${esc(c.about?.label||"Über uns")}</span>
  <div class="img-r"><div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div>${aboutImg}</div>
</div></section>
<section id="zahlen" class="alt"><div class="w"><span class="lbl">Unsere Zahlen</span><div class="g g4">${stats(c.stats)}</div></div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ── #6 App / SaaS ─────────────────────────────────────────────────────────────
export function tAppSaas(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutImg = imgEl(c.about?.image, "16/9");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#0EA5E9", dark:"#0369A1", light:"#E0F2FE", font:"DM Sans", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,features,howto,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label?`<span class="lbl">${esc(c.hero.label)}</span>`:""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Kostenlos testen")}</a>${c.hero?.cta2?`<a href="#features" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
</div></section>
<section id="features"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="howto" class="alt"><div class="w">
  <span class="lbl">${esc(c.about?.label||"So funktioniert es")}</span>
  <div class="img-r">${aboutImg}<div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div></div>
</div></section>
<section id="zahlen"><div class="w"><span class="lbl">Das sagen die Zahlen</span><div class="g g4">${stats(c.stats)}</div></div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ── #7 Kurs / Webinar ─────────────────────────────────────────────────────────
export function tKurs(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutImg = imgEl(c.about?.image, "1/1");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#0D9488", dark:"#0F766E", light:"#CCFBF1", font:"DM Sans", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,inhalte,trainer,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label?`<span class="lbl">${esc(c.hero.label)}</span>`:""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Jetzt anmelden")}</a>${c.hero?.cta2?`<a href="#inhalte" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
</div></section>
<section id="inhalte" class="alt"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="trainer"><div class="w">
  <span class="lbl">${esc(c.about?.label||"Der Trainer")}</span>
  <div class="img-r"><div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div>${aboutImg}</div>
</div></section>
<section id="zahlen" class="alt"><div class="w"><span class="lbl">Auf einen Blick</span><div class="g g4">${stats(c.stats)}</div></div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ── #8 Local Business ─────────────────────────────────────────────────────────
export function tLocalBusiness(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutImg = imgEl(c.about?.image, "4/3");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#B45309", dark:"#92400E", light:"#FEF3C7", font:"Merriweather", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,angebot,ueber,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label?`<span class="lbl">${esc(c.hero.label)}</span>`:""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Jetzt besuchen")}</a>${c.hero?.cta2?`<a href="#angebot" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
</div></section>
<section id="angebot"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="ueber" class="alt"><div class="w">
  <span class="lbl">${esc(c.about?.label||"Unsere Geschichte")}</span>
  <div class="img-r"><div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div>${aboutImg}</div>
</div></section>
<section id="zahlen"><div class="w"><span class="lbl">Das sind wir</span><div class="g g4">${stats(c.stats)}</div></div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ── #9 Case Study ─────────────────────────────────────────────────────────────
export function tCaseStudy(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  const aboutImg = imgEl(c.about?.image, "16/10");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#1D4ED8", dark:"#1E3A8A", light:"#EFF6FF", font:"Manrope", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,loesung,ergebnis,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label?`<span class="lbl">${esc(c.hero.label)}</span>`:""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Ähnliche Ergebnisse")}</a>${c.hero?.cta2?`<a href="#loesung" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
</div></section>
<section id="ergebnis" class="alt"><div class="w">
  <span class="lbl">${esc(c.about?.label||"Die Herausforderung")}</span>
  <div class="img-r"><div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div>${aboutImg}</div>
</div></section>
<section id="loesung"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="zahlen" class="alt"><div class="w"><span class="lbl">Messbare Ergebnisse</span><div class="g g4">${stats(c.stats)}</div></div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ── #10 Video Hero ────────────────────────────────────────────────────────────
export function tVideoHero(c, dossierPdfUrl = "", ctaUrl = "") {
  const feat = c.features || c.themes;
  const heroBg = imgBg(c.hero?.image);
  const heroClass = imgCls(c.hero?.image);
  // Video placeholder (16:9 ratio with play button overlay)
  const videoBox = `<div style="width:100%;max-width:800px;margin:28px auto 0;border-radius:12px;overflow:hidden;position:relative;aspect-ratio:16/9;background:#000;box-shadow:0 12px 40px rgba(0,0,0,.3)">
  ${c.hero?.image?.url ? `<img src="${esc(c.hero.image.url)}" alt="Video Thumbnail" style="width:100%;height:100%;object-fit:cover;object-position:${esc(c.hero.image.objectPosition||"center")};opacity:.8">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e)"></div>`}
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
    <a href="${esc(c.cta?.videoUrl||"#cta")}" target="_blank" rel="noopener" style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.4);text-decoration:none">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--p)"><polygon points="5,3 19,12 5,21"/></svg>
    </a>
  </div>
</div>`;
  const aboutImg = imgEl(c.about?.image, "4/3");
  if (!c.colors?.primary) { c = { ...c, colors: { primary:"#DC2626", dark:"#991B1B", light:"#FEF2F2", font:"DM Sans", ...c.colors } }; }
  const body = `<!-- NAV_IDS: hero,highlights,ueber,zahlen,cta -->
${nav(c)}
<section id="hero" class=${heroClass}${heroBg}><div class="w">
  ${c.hero?.label?`<span class="lbl">${esc(c.hero.label)}</span>`:""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns"><a href="#cta" class="btn btn-p">${esc(c.hero?.cta1||"Jetzt ansehen")}</a>${c.hero?.cta2?`<a href="#highlights" class="btn btn-o">${esc(c.hero.cta2)}</a>`:""}</div>
  ${videoBox}
</div></section>
<section id="highlights" class="alt"><div class="w">
  ${feat?.label?`<span class="lbl">${esc(feat.label)}</span>`:""}
  <h2>${esc(feat?.headline)}</h2>
  <div class="g g3">${cards(feat?.items)}</div>
</div></section>
<section id="ueber"><div class="w">
  <span class="lbl">${esc(c.about?.label||"Über den Creator")}</span>
  <div class="img-r"><div><h2>${esc(c.about?.headline)}</h2><p class="lead">${esc(c.about?.text)}</p></div>${aboutImg}</div>
</div></section>
<section id="zahlen" class="alt"><div class="w"><span class="lbl">Die Community</span><div class="g g4">${stats(c.stats)}</div></div></section>
${quote(c.quote)}${ctaSection(c.cta,dossierPdfUrl,ctaUrl)}${footer(c)}`;
  return wrap(c, body, dossierPdfUrl, ctaUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const TEMPLATES = [
  { id:"editorial",  name:"Editorial Dossier",  description:"News-Specials · Hintergrundberichte · Verlags-Content", icon:"📰", fn:tEditorial },
  { id:"event",      name:"Event & Erlebnis",    description:"Leserreisen · Events · Erlebnisangebote",               icon:"✈️", fn:tEvent },
  { id:"lead",       name:"Lead Capture",        description:"E-Mail-Listen · Freebies · Downloads",                  icon:"🎁", fn:tLeadCapture },
  { id:"product",    name:"Product Launch",      description:"Neue Produkte · E-Commerce · Shop",                     icon:"🛍️", fn:tProductLaunch },
  { id:"service",    name:"Service / Agentur",   description:"B2B · Dienstleistungen · Beratung",                     icon:"💼", fn:tService },
  { id:"saas",       name:"App / SaaS",          description:"Software · Tools · Webapps",                            icon:"💻", fn:tAppSaas },
  { id:"kurs",       name:"Kurs / Webinar",      description:"Weiterbildung · Online-Kurse · Webinare",               icon:"🎓", fn:tKurs },
  { id:"local",      name:"Local Business",      description:"Restaurant · Shop · Praxis · Handwerk",                 icon:"📍", fn:tLocalBusiness },
  { id:"casestudy",  name:"Case Study",          description:"Portfolio · Referenzen · Erfolgsgeschichten",           icon:"📊", fn:tCaseStudy },
  { id:"video",      name:"Video Hero",          description:"Video-Storytelling · Creator · Kanal",                  icon:"🎬", fn:tVideoHero },
];

export function renderTemplate(templateId, content, dossierPdfUrl = "", ctaUrl = "") {
  const tmpl = TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) throw new Error(`Unbekanntes Template: ${templateId}`);
  return tmpl.fn(content, dossierPdfUrl, ctaUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT GENERATION
// Asks AI for a small content JSON (~700 tokens) and renders it via the template.
// ~5× faster than full HTML generation and structurally guaranteed.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AI call only — returns parsed content JSON without rendering.
 * Images are NOT included in the prompt; inject them into the returned
 * object before calling renderTemplate().
 */
export async function generateContentJSON({
  templateId, form, ctx, answers = {}, extraPrompt = "", preflightQ = [], onChunk,
}) {
  const tmpl = TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) throw new Error(`Unbekanntes Template: ${templateId}`);

  const answersText = preflightQ
    .map(q => answers[q.id] ? `${q.question}\n→ ${answers[q.id]}` : null)
    .filter(Boolean).join("\n\n");

  const prompt =
`Landing-Page-Content-JSON für Template "${tmpl.name}".
Antworte NUR mit dem JSON-Objekt (kein Text, kein Markdown, direkt mit { beginnen).

PROJEKT: ${form.name}
BESCHREIBUNG: ${form.description || "(keine)"}
INHALTE:
${ctx.slice(0, 1200)}
${extraPrompt ? `WÜNSCHE: ${extraPrompt}\n` : ""}${answersText ? `VORGABEN:\n${answersText}\n` : ""}
JSON-Schema (exakt dieses Format, alle Felder befüllen):
{"meta":{"title":""},"colors":{"primary":"#hex","dark":"#hex","light":"#hex","font":"Name"},"nav":{"logo":"","links":[{"label":"","anchor":"features"},{"label":"","anchor":"zahlen"},{"label":"","anchor":"cta"}]},"hero":{"label":"","headline":"","subtext":"","cta1":"","cta2":"","image":null},"features":{"label":"","headline":"","items":[{"title":"","text":""},{"title":"","text":""},{"title":"","text":""}]},"about":{"label":"","headline":"","text":"","image":null},"stats":[{"num":"35+","desc":"Jahre"},{"num":"98%","desc":"Zufriedenheit"},{"num":"14","desc":"Länder"},{"num":"2.4k","desc":"Nutzer"}],"quote":{"text":"","author":"","role":""},"cta":{"label":"","headline":"","subtext":"","buttonText":""},"footer":{"groups":[{"title":"","links":[{"label":"","href":"#"},{"label":"","href":"#"}]},{"title":"","links":[{"label":"","href":"#"},{"label":"","href":"#"}]}],"copyright":""}}

REGELN:
• KEIN Emoji in KEINEM Feld — weder in title, text, desc, buttonText noch elsewhere
• Nur ' (Apostroph) in String-Werten — niemals "
• Echte Inhalte aus Projektdaten — kein Lorem ipsum
• headline ≤8 Wörter | subtext/text ≤20 Wörter | card.text ≤12 Wörter
• stats.num: NUR Zahl/Kennzahl max.6 Zeichen ("35+","98%","5 Mio.") — KEIN Satz
• stats.desc: max.3 Wörter | features.items: GENAU 3 | stats: GENAU 4
• hero.image + about.image: MÜSSEN null bleiben (werden separat eingesetzt)
• colors.primary: Nachrichten→#C41230 | Reise→#2E7D32 | Business→#1A237E | Sport→#E65100 | Tech→#0EA5E9 | Kultur→#4A148C
• colors.font: Merriweather=Editorial | DM Sans=Reise/Tech | Manrope=B2B | Outfit=Sport | Poppins=App${tmpl.id === "kurs" || tmpl.id === "local" ? "\n• nav.links[].anchor nur: \"features\",\"zahlen\",\"cta\"" : ""}
• cta.buttonText: "${answersText || extraPrompt ? "passend zum Kontext" : "Jetzt starten"}"`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    750,
    onChunk,
  );

  const content = extractJSON(raw);
  if (!content) {
    const preview = raw.slice(0, 400).replace(/\n/g, "↵");
    console.error("[Spark] JSON-Parse fehlgeschlagen. Raw-Anfang:", preview);
    throw new Error(`KI-Antwort konnte nicht geparst werden (${raw.length} Zeichen). Bitte erneut versuchen.`);
  }

  return content;
}

/**
 * Generate a landing page via template + AI content JSON.
 *
 * @param {object} opts
 * @param {string}   opts.templateId    - One of TEMPLATES[].id
 * @param {object}   opts.form          - Project form (name, description, …)
 * @param {string}   opts.ctx           - buildContext() output
 * @param {object}   opts.answers       - Pre-flight Q&A {questionId: answer}
 * @param {Array}    opts.images        - [{url, alt}] from searchImages()
 * @param {string}   opts.extraPrompt   - Optional free-text from user
 * @param {Array}    opts.preflightQ    - Original question objects
 * @param {string}   opts.dossierPdfUrl - Optional PDF URL (activates email form)
 * @param {Function} opts.onChunk       - Streaming progress callback
 * @returns {string} Complete HTML string, ready to deploy
 */
export async function generateContent({
  templateId, form, ctx, answers = {}, images = [],
  extraPrompt = "", preflightQ = [], dossierPdfUrl = "", onChunk,
}) {
  const tmpl = TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) throw new Error(`Unbekanntes Template: ${templateId}`);

  const answersText = preflightQ
    .map(q => answers[q.id] ? `${q.question}\n→ ${answers[q.id]}` : null)
    .filter(Boolean).join("\n\n");

  const imagesText = images.length
    ? images.map((img, i) => `Bild ${i + 1}: url="${img.url}" alt="${img.alt}"`).join(" | ")
    : "keine verfügbar";

  const prompt =
`Du bist Redakteur, Texter und Webdesigner. Analysiere die Projektdaten und erstelle strukturierten Inhalt für eine Landing Page.

WICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt. Kein erklärender Text, kein Markdown, keine Codeblöcke. Fange direkt mit { an.

TEMPLATE: ${tmpl.name}
PROJEKT: ${form.name}
BESCHREIBUNG: ${form.description || "(keine)"}
INHALTE (Auszug, max. 1500 Zeichen):
${ctx.slice(0, 1500)}
${extraPrompt ? `BESONDERE WÜNSCHE: ${extraPrompt}\n` : ""}${answersText ? `AUFTRAGGEBER-VORGABEN:\n${answersText}\n` : ""}BILDER (exakt diese URLs verwenden, nicht erfinden):
${imagesText}

Erstelle NUR das folgende JSON (kein Markdown, kein Text davor oder danach):
{
  "meta": {"title": "..."},
  "colors": {"primary": "#...", "dark": "#...", "light": "#...", "font": "..."},
  "nav": {"logo": "...", "links": [{"label": "...", "anchor": "features"}, {"label": "...", "anchor": "zahlen"}, {"label": "...", "anchor": "cta"}]},
  "hero": {"label": "...", "headline": "...", "subtext": "...", "cta1": "...", "cta2": "...", "image": {"url": "...", "alt": "..."}},
  "features": {"label": "...", "headline": "...", "items": [{"title": "...", "text": "..."}, {"title": "...", "text": "..."}, {"title": "...", "text": "..."}]},
  "about": {"label": "...", "headline": "...", "text": "...", "image": {"url": "...", "alt": "..."}},
  "stats": [{"num": "35+", "desc": "Jahre Erfahrung"}, {"num": "98%", "desc": "Kundenzufriedenheit"}, {"num": "14", "desc": "Länder"}, {"num": "2.400", "desc": "Aktive Nutzer"}],
  "quote": {"text": "...", "author": "...", "role": "..."},
  "cta": {"label": "...", "headline": "...", "subtext": "...", "buttonText": "..."},
  "footer": {"groups": [{"title": "...", "links": [{"label": "...", "href": "#"}, {"label": "...", "href": "#"}, {"label": "...", "href": "#"}]}, {"title": "...", "links": [{"label": "...", "href": "#"}, {"label": "...", "href": "#"}]}], "copyright": "..."}
}

PFLICHT-REGELN:
• Antworte NUR mit dem JSON — kein Text davor, kein Text danach, keine Codeblöcke, kein Markdown
• NIEMALS Anführungszeichen (") innerhalb von JSON-String-Werten — stattdessen Apostroph (') verwenden
• Nur echte Inhalte aus den Projektdaten — kein Platzhalter, kein Lorem ipsum
• Texte kurz halten: headline max. 8 Wörter, subtext/text max. 20 Wörter, card-text max. 15 Wörter
• stats.num: AUSSCHLIESSLICH die nackte Zahl/Kennzahl (max 6 Zeichen: "35+", "98%", "5 Mio.", "695 g") — niemals ein Satz oder Label!
• stats.desc: kurzes Label, max. 3 Wörter ("Jahre Erfahrung", "Kundenzufriedenheit", "Aktive Nutzer")
• colors.primary: thematisch passend — Nachrichten/Politik → #C41230 | Reise/Natur → #2E7D32 | Business → #1A237E | Sport/Bike → #E65100 | Kultur → #4A148C
• colors.dark: deutlich dunkler als primary
• colors.light: sehr heller Akzent (fast weiß)
• colors.font: Merriweather (Editorial) | DM Sans (Reise) | Manrope (Business/B2B) | Outfit (Sport/Bike)
• hero.headline: max. 8 Wörter — emotional, direkt, konkret
• themes.items: GENAU 3 Einträge
• stats: GENAU 4 Einträge
• nav.links[].anchor NUR aus: "features", "zahlen", "cta"
• Bilder: hero.image.url und intro.image.url aus den gegebenen Bild-URLs wählen — bei 2+ Bildern verschiedene verwenden
• Wenn keine Bilder: hero.image und intro.image als null${dossierPdfUrl ? `\n• cta.buttonText: "Dossier herunterladen"` : ""}`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    1000,   // JSON ~450 Tokens; 1000 = 2× Sicherheit. extractJSON fängt Reste ab.
    onChunk,
  );

  const content = extractJSON(raw);
  if (!content) {
    // Debug: ersten 400 Zeichen des Raw-Output im Error zeigen
    const preview = raw.slice(0, 400).replace(/\n/g, "↵");
    console.error("[Spark] JSON-Parse fehlgeschlagen. Raw-Anfang:", preview);
    throw new Error(`KI-Antwort konnte nicht geparst werden (${raw.length} Zeichen). Bitte erneut versuchen.`);
  }

  return renderTemplate(templateId, content, dossierPdfUrl);
}
