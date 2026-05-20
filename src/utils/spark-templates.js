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

// ── HTML helpers ───────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || "")
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
    // Support both old schema (value/label) and new (num/desc) to stay backward-compatible
    const number = s.num  ?? s.value ?? "";
    const desc   = s.desc ?? s.label ?? "";
    return `<div><span class="stat">${esc(number)}</span><span class="stat-l">${esc(desc)}</span></div>`;
  }).join("\n");
}

function quote(c) {
  if (!c?.text) return "";
  return `<section class="alt"><div class="w">
  <blockquote class="quote">${esc(c.text)}<cite>${esc(c.author)}${c.role ? ` — ${esc(c.role)}` : ""}</cite></blockquote>
</div></section>`;
}

function ctaSection(cta, dossierPdfUrl) {
  const action = dossierPdfUrl
    ? `<form id="lead-form" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;max-width:500px;margin:0 auto">
        <input type="email" required placeholder="Ihre E-Mail-Adresse" style="flex:1;min-width:220px;padding:13px 18px;border-radius:8px;border:none;font-size:1rem;background:rgba(255,255,255,.15);color:#fff;outline:2px solid rgba(255,255,255,.4)">
        <button type="submit" class="btn btn-w">${esc(cta?.buttonText || "Jetzt sichern")}</button>
      </form>`
    : `<div class="btns"><a href="#" class="btn btn-w">${esc(cta?.buttonText || "Jetzt lesen")}</a></div>`;

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

function emailScript(pdfUrl) {
  return `<script>
/* Spark email-capture */
(function(){
  var U=${JSON.stringify(pdfUrl)};
  document.addEventListener('submit',function(e){
    if(!e.target.querySelector('input[type="email"]'))return;
    e.preventDefault();
    var b=e.target.querySelector('button[type="submit"]');
    if(b){b.textContent='Wird vorbereitet…';b.disabled=true;}
    setTimeout(function(){window.open(U,'_blank');if(b){b.textContent='Dossier geöffnet ✔';b.disabled=false;}},700);
  });
})();
</script>`;
}

function wrap(c, body, dossierPdfUrl) {
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
export function tEditorial(c, dossierPdfUrl = "") {
  const heroImg = c.hero?.image?.url
    ? `<img class="hero-img" src="${esc(c.hero.image.url)}" alt="${esc(c.hero.image.alt || "")}">`
    : "";
  const introImg = c.intro?.image?.url
    ? `<img src="${esc(c.intro.image.url)}" alt="${esc(c.intro.image.alt || "")}" style="width:100%;border-radius:12px;aspect-ratio:16/10;object-fit:cover">`
    : "";

  const body = `
<!-- NAV_IDS: hero,themen,zahlen,intro,cta -->
${nav(c)}

<section id="hero" class="hero"><div class="w">
  ${c.hero?.label ? `<span class="lbl">${esc(c.hero.label)}</span>` : ""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns">
    <a href="#cta" class="btn btn-p">${esc(c.hero?.cta1 || "Jetzt lesen")}</a>
    ${c.hero?.cta2 ? `<a href="#intro" class="btn btn-o">${esc(c.hero.cta2)}</a>` : ""}
  </div>
  ${heroImg}
</div></section>

<section id="themen" class="alt"><div class="w">
  ${c.themes?.label ? `<span class="lbl">${esc(c.themes.label)}</span>` : ""}
  <h2>${esc(c.themes?.headline)}</h2>
  <div class="g g3">${cards(c.themes?.items)}</div>
</div></section>

<section id="zahlen"><div class="w">
  <span class="lbl">In Zahlen</span>
  <div class="g g4">${stats(c.stats)}</div>
</div></section>

<section id="intro" class="alt"><div class="w">
  <span class="lbl">${esc(c.intro?.label || "Hintergrund")}</span>
  <div class="img-r">
    <div>
      <h2>${esc(c.intro?.headline)}</h2>
      <p class="lead">${esc(c.intro?.text)}</p>
    </div>
    ${introImg}
  </div>
</div></section>

${quote(c.quote)}

${ctaSection(c.cta, dossierPdfUrl)}

${footer(c)}`;

  return wrap(c, body, dossierPdfUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE #2 — Event & Erlebnis
// Use for: reader journeys, travel packages, events, experiences
// Default colors: forest green / deep earth / warm beige
// ═══════════════════════════════════════════════════════════════════════════════
export function tEvent(c, dossierPdfUrl = "") {
  const heroImg = c.hero?.image?.url
    ? `<img class="hero-img" src="${esc(c.hero.image.url)}" alt="${esc(c.hero.image.alt || "")}">`
    : "";
  const introImg = c.intro?.image?.url
    ? `<img src="${esc(c.intro.image.url)}" alt="${esc(c.intro.image.alt || "")}" style="width:100%;border-radius:12px;aspect-ratio:16/10;object-fit:cover">`
    : "";

  const body = `
<!-- NAV_IDS: hero,themen,zahlen,intro,cta -->
${nav(c)}

<section id="hero" class="hero"><div class="w">
  ${c.hero?.label ? `<span class="lbl">${esc(c.hero.label)}</span>` : ""}
  <h1>${esc(c.hero?.headline)}</h1>
  <p>${esc(c.hero?.subtext)}</p>
  <div class="btns">
    <a href="#cta" class="btn btn-p">${esc(c.hero?.cta1 || "Jetzt anmelden")}</a>
    ${c.hero?.cta2 ? `<a href="#intro" class="btn btn-o">${esc(c.hero.cta2)}</a>` : ""}
  </div>
  ${heroImg}
</div></section>

<section id="themen"><div class="w">
  ${c.themes?.label ? `<span class="lbl">${esc(c.themes.label)}</span>` : ""}
  <h2>${esc(c.themes?.headline)}</h2>
  <div class="g g3">${cards(c.themes?.items)}</div>
</div></section>

<section id="zahlen" class="alt"><div class="w">
  <span class="lbl">Auf einen Blick</span>
  <div class="g g4">${stats(c.stats)}</div>
</div></section>

<section id="intro"><div class="w">
  <span class="lbl">${esc(c.intro?.label || "Das Erlebnis")}</span>
  <div class="img-r">
    ${introImg}
    <div>
      <h2>${esc(c.intro?.headline)}</h2>
      <p class="lead">${esc(c.intro?.text)}</p>
    </div>
  </div>
</div></section>

${quote(c.quote)}

${ctaSection(c.cta, dossierPdfUrl)}

${footer(c)}`;

  return wrap(c, body, dossierPdfUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const TEMPLATES = [
  {
    id:          "editorial",
    name:        "Editorial Dossier",
    description: "News-Specials · Hintergrundberichte · Verlags-Content",
    icon:        "📰",
    fn:          tEditorial,
  },
  {
    id:          "event",
    name:        "Event & Erlebnis",
    description: "Leserreisen · Events · Erlebnisangebote",
    icon:        "✈️",
    fn:          tEvent,
  },
];

export function renderTemplate(templateId, content, dossierPdfUrl = "") {
  const tmpl = TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) throw new Error(`Unbekanntes Template: ${templateId}`);
  return tmpl.fn(content, dossierPdfUrl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT GENERATION
// Asks AI for a small content JSON (~700 tokens) and renders it via the template.
// ~5× faster than full HTML generation and structurally guaranteed.
// ═══════════════════════════════════════════════════════════════════════════════

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
  "nav": {"logo": "...", "links": [{"label": "...", "anchor": "intro"}, {"label": "...", "anchor": "themen"}, {"label": "...", "anchor": "zahlen"}]},
  "hero": {"label": "...", "headline": "...", "subtext": "...", "cta1": "...", "cta2": "...", "image": {"url": "...", "alt": "..."}},
  "intro": {"label": "...", "headline": "...", "text": "...", "image": {"url": "...", "alt": "..."}},
  "themes": {"label": "...", "headline": "...", "items": [{"title": "...", "text": "..."}, {"title": "...", "text": "..."}, {"title": "...", "text": "..."}]},
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
• nav.links[].anchor NUR aus: "intro", "themen", "zahlen"
• Bilder: hero.image.url und intro.image.url aus den gegebenen Bild-URLs wählen — bei 2+ Bildern verschiedene verwenden
• Wenn keine Bilder: hero.image und intro.image als null${dossierPdfUrl ? `\n• cta.buttonText: "Dossier herunterladen"` : ""}`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    1400,   // JSON ~500 Tokens; 1400 = sicherer Puffer (2.5×). 900 war zu knapp.
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
