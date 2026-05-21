// ── src/utils/spark.js ────────────────────────────────────────────────────────
// Creation Voodoo — all Spark AI/generation logic in one testable module.
//
// MODULE LAYOUT:
//   Constants       PAGE_CSS, LINK_GUARD, WEB_SEARCH_TOOL
//   Pure functions  slugify · blocksToPlain · postProcessHtml · buildContext
//   Async AI        runPreflight · generatePage · refinePage · searchImages
//
// Pure functions are unit-testable without mocks (see spark.test.js).
// Async functions call /ai (via aiCall/aiCallStream) and stock-photo APIs.
// The /ai Cloudflare Function forwards any `tools` field to Anthropic as-is,
// so web search works transparently through the existing proxy.

import { aiCall, aiCallStream, parseJSON, uid, AI } from "./store.js";
import { stockSearch, skGet } from "../components/StockSearch.jsx";

// ── Pre-built CSS design system ───────────────────────────────────────────────
// Injected into every generated page so the AI only writes HTML (~1800 tokens).
// Without this the model re-invents CSS from scratch, hits the 4000-token cap,
// and the page is truncated. The AI only overrides :root colour variables.
export const PAGE_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--p:#2563EB;--pd:#1E3A8A;--pl:#EFF6FF;--bg:#fff;--s:#F8FAFC;--t:#0f172a;--m:#64748b;--r:8px;--sh:0 2px 14px rgba(0,0,0,.08)}
body{font-family:var(--font,system-ui,-apple-system,sans-serif);color:var(--t);background:var(--bg);line-height:1.65;font-size:16px}
a{text-decoration:none;color:inherit}img{max-width:100%;height:auto}ul{list-style:none}
.w{max-width:1100px;margin:0 auto;padding:0 clamp(16px,4vw,28px)}
nav{position:sticky;top:0;z-index:9;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid #e2e8f0}
.ni{display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto;padding:14px clamp(16px,4vw,28px)}
.logo{font-weight:900;font-size:1.15rem;color:var(--p)}.nl{display:flex;gap:6px;align-items:center}
.nl a{padding:5px 12px;border-radius:6px;color:var(--m);font-size:.875rem;font-weight:500}.nl a:hover{background:#f1f5f9;color:var(--t)}
.nav-cta{padding:8px 16px!important;background:var(--p);color:#fff!important;border-radius:var(--r);font-weight:700!important}.nav-cta:hover{background:var(--pd)!important}
.hero{padding:clamp(60px,10vw,96px) clamp(16px,4vw,28px);text-align:center;background:linear-gradient(140deg,var(--pl)0%,#f0fdf4 100%)}
.hero h1{font-size:clamp(2.2rem,5.5vw,3.8rem);font-weight:900;line-height:1.06;letter-spacing:-.035em;margin-bottom:18px;color:var(--t)}
.hero p{font-size:clamp(1rem,2.2vw,1.2rem);color:var(--m);max-width:580px;margin:0 auto 32px;line-height:1.7}
.hero-img{width:100%;max-height:460px;object-fit:cover;border-radius:12px;margin-top:28px;box-shadow:0 8px 32px rgba(0,0,0,.12);display:block}
.btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:13px 28px;border-radius:var(--r);font-weight:700;font-size:1rem;cursor:pointer;transition:all .18s;border:2px solid transparent;line-height:1}
.btn-p{background:var(--p);color:#fff}.btn-p:hover{background:var(--pd);transform:translateY(-2px);box-shadow:0 6px 20px rgba(37,99,235,.35)}
.btn-o{border-color:var(--p);color:var(--p)}.btn-o:hover{background:var(--pl);transform:translateY(-1px)}
section{padding:clamp(56px,9vw,88px) clamp(16px,4vw,28px)}.alt{background:var(--s)}
.lbl{font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--p);margin-bottom:12px;display:block}
h2{font-size:clamp(1.65rem,3.5vw,2.5rem);font-weight:800;line-height:1.12;margin-bottom:12px}
h3{font-size:1.05rem;font-weight:700;margin-bottom:7px}p{line-height:1.7}
.lead{color:var(--m);font-size:1.05rem;max-width:560px;margin-bottom:40px;line-height:1.75}
.g{display:grid;gap:22px}.g2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.g3{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.g4{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.card{background:#fff;border-radius:var(--r);padding:26px;box-shadow:var(--sh);border:1px solid #e8edf2;transition:transform .2s,box-shadow .2s}.card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.12)}
.card .ico{margin-bottom:14px}.card p{color:var(--m);font-size:.93rem;margin-top:6px;line-height:1.65}
.img-r{display:grid;gap:28px;align-items:center}@media(min-width:768px){.img-r{grid-template-columns:1fr 1fr}}
.img-r img{width:100%;border-radius:12px;box-shadow:var(--sh);aspect-ratio:16/10;object-fit:cover}
.stat{font-size:2.6rem;font-weight:900;color:var(--p);display:block;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.stat-l{font-size:.84rem;color:var(--m);margin-top:4px;display:block;line-height:1.4;max-width:18ch}
.quote{border-left:3px solid var(--p);padding:14px 20px;background:var(--s);border-radius:0 8px 8px 0;margin:16px 0;color:var(--m);line-height:1.7}
.quote cite{display:block;font-size:.82rem;font-weight:700;color:var(--p);margin-top:10px;font-style:normal}
.cta-b{background:linear-gradient(135deg,var(--p),var(--pd));color:#fff;border-radius:16px;padding:clamp(40px,7vw,64px) clamp(24px,5vw,48px);text-align:center}
.cta-b h2{color:#fff;margin-bottom:12px}.cta-b p{color:rgba(255,255,255,.85);margin-bottom:28px;max-width:520px;margin-left:auto;margin-right:auto}
.btn-w{background:#fff;color:var(--p);font-weight:800}.btn-w:hover{opacity:.93;transform:translateY(-2px)}
.tag{display:inline-block;background:var(--pl);color:var(--p);border-radius:20px;padding:4px 13px;font-size:.78rem;font-weight:700;margin-right:6px;margin-bottom:6px}
.hero-bg{background-color:#0f172a;background-size:cover;background-position:center;position:relative}.hero-bg::before{content:'';position:absolute;inset:0;background:linear-gradient(160deg,rgba(0,0,0,.62)0%,rgba(0,0,0,.38)100%);z-index:0}.hero-bg .w{position:relative;z-index:1}.hero-bg h1,.hero-bg .lbl{color:#fff!important}.hero-bg p.lead,.hero-bg .hero p{color:rgba(255,255,255,.87)!important}.hero-bg .btn-o{border-color:rgba(255,255,255,.65);color:#fff}.hero-bg .btn-o:hover{background:rgba(255,255,255,.15)}
footer{background:#0f172a;color:#94a3b8;padding:40px clamp(16px,4vw,28px);text-align:center;font-size:.875rem;line-height:2}
footer a{color:#94a3b8}.footer-g{display:flex;gap:32px;justify-content:center;flex-wrap:wrap;margin-bottom:22px}
@media(max-width:640px){.nl{display:none}.g3,.g4{grid-template-columns:1fr}.img-r{grid-template-columns:1fr}}`;

// ── Link guard v2 ─────────────────────────────────────────────────────────────
// Injected before </body> in every generated/refined page.
//
// Handles three cases:
//   #anchor where id exists   → normal browser scroll (no interference)
//   #anchor where id MISSING  → fuzzy-match nearest section, smooth-scroll to it
//   External http(s) links    → open in new tab (no iframe navigation)
//   mailto / tel              → pass through
export const LINK_GUARD = `<script>
/* Spark link guard v3 – anchor repair + iframe guard + relative-path block */
document.addEventListener('click',function(e){
  var a=e.target.closest('a');if(!a)return;
  var h=a.getAttribute('href')||'';
  if(!h||h==='#'||h.startsWith('javascript'))return;
  if(h.startsWith('#')){
    var target=h.slice(1);
    var el=document.getElementById(target);
    if(el){el.scrollIntoView({behavior:'smooth'});e.preventDefault();return;}
    /* Target ID missing — multi-strategy fuzzy-match */
    e.preventDefault();
    var txt=(a.textContent||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
    var nodes=Array.from(document.querySelectorAll('section[id],[id]'));
    var best=null;
    /* Strategy 1: exact ID or link-text contains target word */
    best=nodes.find(function(n){var s=(n.id||'').toLowerCase().replace(/[^a-z0-9]/g,'');return s&&txt&&(s===txt||s.includes(txt)||txt.includes(s));});
    /* Strategy 2: first 6 chars overlap */
    if(!best)best=nodes.find(function(n){var s=(n.id||'').toLowerCase().replace(/[^a-z0-9]/g,'');return s&&txt&&(s.slice(0,6)===txt.slice(0,6));});
    /* Strategy 3: target keyword found in ID */
    if(!best){var kw=target.replace(/[^a-z0-9]/gi,'').toLowerCase();best=nodes.find(function(n){var s=(n.id||'').toLowerCase();return s&&kw&&s.includes(kw.slice(0,6));});}
    /* Fallback: first section with an id */
    if(!best)best=nodes[0];
    if(best)best.scrollIntoView({behavior:'smooth'});
    return;
  }
  if(h.startsWith('mailto:')||h.startsWith('tel:'))return;
  e.preventDefault();
  /* Absolute external links → new tab */
  if(/^https?:\\/\\//.test(h)){window.open(h,'_blank','noopener');return;}
  /* Relative paths (e.g. href="/") → block silently; generated pages are self-contained */
},true);
</script>`;

// ── Anthropic web search tool ─────────────────────────────────────────────────
// Built-in server-side tool — Anthropic executes searches, no client roundtrip.
// The /ai CF Function already forwards the `tools` array to Anthropic as-is.
export const WEB_SEARCH_TOOL = { type: "web_search_20250305", name: "web_search", max_uses: 5 };

// ── Spark's combined expert persona ───────────────────────────────────────────
// Injected at the start of every generation and refinement prompt.
// Three disciplines that each add a distinct quality layer to every page:
//   Werbetexter  → persuasion, emotional triggers, conversion copy
//   Redakteur    → clarity, structure, scannability, consistency
//   Webdesigner  → visual hierarchy, typography, spacing, UX patterns
export const SPARK_PERSONA =
`Du bist vier Experten in einer Person — Werbetexter, Redakteur, Webdesigner und Webentwickler — mit je 20 Jahren Erfahrung.

ALS WERBETEXTER:
• Menschen kaufen Gefühle, keine Features — schreibe immer benefit-orientiert ("Du sparst 3 h täglich", nicht "Das Tool hat Automatisierung")
• Starke Headlines nutzen Kontrast, Neugier oder ein klares Versprechen — Zahlen, Fragen, Vorher/Nachher-Frames
• Setze mindestens 3 emotionale Trigger ein: Verlangen · Vertrauen · Neugier · Dringlichkeit · soziale Bestätigung
• Jede Section hat genau eine Aufgabe im Trichter: Aufmerksamkeit (Hero) → Verlangen (Benefits) → Beweis (Stats/Proof) → Aktion (CTA)
• Konkrete Zahlen schlagen Adjektive: "2.400 Kunden" überzeugt mehr als "viele zufriedene Kunden"
• CTAs sind nie generisch — immer handlungsgetrieben und benefit-klar: "Jetzt kostenlos starten", "Demo buchen", "14 Tage testen"
• Antizipiere Einwände und entkräfte sie, bevor der Leser sie denkt — direkt in den Texten, nicht als FAQ-Klotz

ALS REDAKTEUR:
• Inverted Pyramid: Kernbotschaft im H1, Belege darunter, Details ganz unten — das Wichtigste steht immer vorne
• Ein Gedanke, ein Satz — Füllwörter, Passiv und Nominalstil konsequent eliminiert
• Scannability ist Pflicht: jeder Abschnitt hat eine Überschrift, Bullets bevorzugen Listen über Fließtext
• "So-what?"-Test für jeden Satz: keine Relevanz für den Leser → raus
• Ton und Stimme bleiben von NAV bis FOOTER konsistent — kein Stilbruch, kein Fremdwort ohne Kontext
• Aktive Sprache erzeugt Energie: "Wir liefern in 24 h" statt "Die Lieferung erfolgt innerhalb von 24 Stunden"

ALS WEBDESIGNER:
• Visuelle Hierarchie entsteht durch Größe + Gewicht + Weißraum — nicht durch Farbe allein
• Above the Fold ist heilig: Hero transportiert Kernbotschaft, Nutzen und CTA ohne einen Scroll
• Blickfluss folgt F- und Z-Mustern — Headlines links, CTA rechts oder zentriert am Lesepfad-Ende
• Primärer CTA-Button hebt sich immer deutlich vom Hintergrund ab — Kontrast ist kein Kompromiss
• Spacing kommuniziert: enger Abstand = zusammengehörig, großer Abstand = neues Thema
• Bilder führen den Blick: Personen schauen zur CTA, Produkte zeigen relevante Details nah am Text
• Trust-Elemente (Logos, Bewertungen, Zertifikate, Kundenzahlen) stehen immer nah an der Conversion-Aktion
• Typografie hat Persönlichkeit: Geometric = modern/tech · Humanist = vertrauenswürdig · Slab = stark/direkt
• Responsive ist Pflicht: Grid-Breakpoints greifen, Touch-Targets ≥ 44 px, Lesebreite max 70 ch
• KEINE bunten Emoji-Icons als Dekorationselemente (🎯 ✅ 🚀 💡 usw.) — sie sind das sicherste Erkennungszeichen für KI-generierten Content und wirken billig. Stattdessen: monochrome SVG-Icons (stroke="currentColor"), einfache Aufzählungszeichen (–, •) oder gar keine Icons

ALS WEBENTWICKLER:
• CSS-Klassen sind semantisch — jede Klasse hat genau einen Zweck und darf nicht zweckentfremdet werden
• .stat/.stat-l sind AUSSCHLIESSLICH für isolierte Kennzahlen in der STATS-Section reserviert ("2.400", "98%", "14 Tage") — niemals für Labels, Lesezeiten, Kategorien oder sonstigen Fließtext; "Lesedauer 7 min" ist KEIN Stat
• .ico ist ein Icon-Container — NUR monochrome SVG mit stroke="currentColor", kein Emoji, kein Text
• Jeder nav href="#xyz" MUSS eine Section mit genau id="xyz" haben — prüfe vor der Ausgabe jeden einzelnen Anker gegen die tatsächlichen IDs im Dokument
• CTA-Buttons und alle Nav-Links: ausschließlich #anchor-Ziele — niemals relative Pfade (href="/") oder externe URLs ohne target="_blank" rel="noopener"
• Typografie-Hierarchie einhalten: h1 (Hero) → h2 (Section-Titel) → h3 (Card-Titel) — Größe entsteht durch das korrekte HTML-Tag, nicht durch Klassenm issbrauch
• Bilder immer in einem Container mit fester Höhe oder aspect-ratio einbetten — verhindert Layout-Shift beim Laden
• Alle Grids (.g2 .g3 .g4) mit auto-fit minmax müssen auf 320 px Breite kollabieren ohne horizontale Scrollbar oder Text-Überlauf`;


// ── Story-Editor persona ──────────────────────────────────────────────────────
// Subset of SPARK_PERSONA for the Story Editor's Spark chat panel.
// The Webdesigner section (grids, buttons, above-the-fold) is irrelevant for
// prose/article work and is intentionally omitted to save tokens.
export const STORY_PERSONA =
`Du bist zwei Experten in einer Person — Werbetexter und Redakteur — mit je 20 Jahren Erfahrung.

ALS WERBETEXTER:
• Menschen kaufen Gefühle, keine Features — schreibe immer benefit-orientiert ("Du sparst 3 h täglich", nicht "Das Tool hat Automatisierung")
• Starke Headlines nutzen Kontrast, Neugier oder ein klares Versprechen — Zahlen, Fragen, Vorher/Nachher-Frames
• Setze mindestens 3 emotionale Trigger ein: Verlangen · Vertrauen · Neugier · Dringlichkeit · soziale Bestätigung
• Jeder Abschnitt hat eine Aufgabe im Trichter: Aufmerksamkeit (Intro) → Verlangen (Argumente) → Beweis (Fakten/Belege) → Aktion (Fazit/CTA)
• Konkrete Zahlen schlagen Adjektive: "2.400 Leser" überzeugt mehr als "viele zufriedene Leser"
• Antizipiere Einwände und entkräfte sie, bevor der Leser sie denkt — direkt im Fließtext, nicht als FAQ-Klotz

ALS REDAKTEUR:
• Inverted Pyramid: Kernbotschaft im ersten Satz/Titel, Belege darunter, Details ganz unten — das Wichtigste steht immer vorne
• Ein Gedanke, ein Satz — Füllwörter, Passiv und Nominalstil konsequent eliminiert
• Scannability ist Pflicht: jeder Abschnitt hat eine Überschrift, Bullets bevorzugen Listen über Fließtext
• "So-what?"-Test für jeden Satz: keine Relevanz für den Leser → raus
• Ton und Stimme bleiben vom ersten bis zum letzten Absatz konsistent — kein Stilbruch, kein Fremdwort ohne Kontext
• Aktive Sprache erzeugt Energie: "Wir liefern in 24 h" statt "Die Lieferung erfolgt innerhalb von 24 Stunden"
• KEINE bunten Emoji-Icons im Text (🎯 ✅ 🚀 💡 usw.) — sie sind das sicherste Erkennungszeichen für KI-generierten Content. Struktur entsteht durch Überschriften, Absätze und Aufzählungszeichen (–, •), nicht durch Dekoration`;


// ═══════════════════════════════════════════════════════════════════════════════
// PURE FUNCTIONS — deterministic, no side effects, fully unit-testable
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert any string into a URL-safe slug.
 * Handles German umlauts, limits to 60 chars, falls back to "projekt".
 */
export function slugify(str) {
  return (str || "").toLowerCase().trim()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "projekt";
}

/**
 * Recursively flatten BlockNote blocks into a single plain-text string.
 * Used to extract searchable/summarisable content from Story blocks.
 */
export function blocksToPlain(blocks) {
  if (!blocks?.length) return "";
  const lines = [];
  for (const b of blocks) {
    const t = (b.content || []).map(c => c.text || "").join("");
    if (t.trim()) lines.push(t.trim());
    if (b.children?.length) lines.push(blocksToPlain(b.children));
  }
  return lines.join(" ");
}

// Matches any version of the Spark link guard script block.
// Used to strip stale guards before re-injecting the current version.
const GUARD_RE = /<script>\s*\/\*\s*Spark link guard[\s\S]*?<\/script>\s*/i;

// Inject an email-capture script that opens a PDF URL on form submit.
// Only called when dossierPdfUrl is configured on the project.
function injectEmailCapture(html, pdfUrl) {
  const script = `<script>
/* Spark email-capture — opens PDF on form submit */
(function(){
  var PDF_URL=${JSON.stringify(pdfUrl)};
  document.addEventListener('submit',function(e){
    if(!e.target.querySelector('input[type="email"]'))return;
    e.preventDefault();
    var btn=e.target.querySelector('button[type="submit"],input[type="submit"]');
    if(btn){btn.textContent='Wird vorbereitet…';btn.disabled=true;}
    setTimeout(function(){
      window.open(PDF_URL,'_blank');
      if(btn){btn.textContent='Dossier geöffnet ✔';btn.disabled=false;}
    },700);
  });
})();
</script>`;
  if (html.includes("</body>")) return html.replace(/<\/body>/i, script + "\n</body>");
  return html + "\n" + script;
}

// Sentinel used in both generatePage and refinePage.
// Replaces PAGE_CSS in prompts/output so the model copies a short token
// instead of ~3 KB of CSS. Both functions re-inject the real CSS afterwards.
const CSS_SENTINEL = "/* PAGE_CSS_PLACEHOLDER */";

/**
 * Post-process raw AI HTML output into a safe, complete page.
 *
 * Steps performed (in order):
 *   1. Strip markdown ``` code fences (model sometimes wraps output)
 *   2. Find the real HTML start — strip any prefix text the model emitted
 *      before <!DOCTYPE html> (e.g. introductory sentences, persona echoes)
 *   3. Remove any previously injected link guard (idempotent for refinements)
 *   4. Inject current LINK_GUARD before </body>  (or append if missing)
 *   5. Ensure the document ends with </html>
 *
 * This is the single shared post-processor for both generate and refine.
 */
export function postProcessHtml(raw) {
  let html = (raw || "").trim();

  // 1. Strip code fences
  if (html.startsWith("```")) {
    html = html.replace(/^```[a-z]*\r?\n?/i, "").replace(/\r?\n?```\s*$/, "").trim();
  }

  // 2. Find the real HTML start — model sometimes prepends explanation text.
  //    e.g. "Hier ist die überarbeitete Seite:\n\n<!DOCTYPE html>…"
  const doctypeIdx = html.search(/<!DOCTYPE\s+html/i);
  if (doctypeIdx > 0) {
    html = html.slice(doctypeIdx);
  }

  // 3. Remove any stale link guard so we never duplicate it
  html = html.replace(GUARD_RE, "");

  // 4. Inject current link guard
  if (html.includes("</body>")) {
    html = html.replace(/<\/body>/i, LINK_GUARD + "\n</body>");
  } else {
    html += "\n" + LINK_GUARD + "\n</body>";
  }

  // 5. Close document
  if (!html.includes("</html>")) html += "\n</html>";

  return html;
}

/**
 * Validate a generated HTML page for common Spark issues.
 * Returns an array of {type:"error"|"warn", msg:string}.
 * Empty array = all checks passed.
 *
 * Checks performed:
 *   1. Script code leaking into visible content (guard not inside <script> tag)
 *   2. Nav anchor → section ID consistency (broken #links)
 *   3. Minimum section count (≥ 5 of the expected 7)
 */
export function validatePage(html) {
  if (!html) return [];
  const issues = [];

  // 1. Script content visible as text (guard code outside <script> tags)
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "<!-- script -->");
  if (/document\.addEventListener|Spark link guard/.test(withoutScripts)) {
    issues.push({ type: "error", msg: "Script-Code als sichtbarer Text — Seite einmal neu verfeinern um den Fehler zu beheben" });
  }

  // 2. Nav anchor → section ID consistency
  const navHrefs = [...html.matchAll(/href="#([^"#\s]+)"/g)].map(m => m[1]);
  const pageIds  = new Set([...html.matchAll(/\s+id="([^"]+)"/g)].map(m => m[1]));
  const broken   = [...new Set(navHrefs)].filter(id => !pageIds.has(id));
  if (broken.length > 0) {
    issues.push({ type: "warn", msg: `${broken.length} Nav-Link(s) ohne passende Section-ID: ${broken.map(b => "#" + b).join(", ")}` });
  }

  // 3. Minimum section count (templates have 5-6, freeform targets 7+)
  const sectionCount = (html.match(/<section[\s>]/gi) || []).length;
  if (sectionCount < 4) {
    issues.push({ type: "warn", msg: `Nur ${sectionCount} Sections gefunden — Seite neu generieren` });
  }

  return issues;
}

/**
 * Build a targeted repair instruction from a validatePage() issues array.
 * The returned string is passed directly to refinePage() as the instruction.
 * This is a pure function so it can be tested without mocks.
 *
 * @param {Array<{type:string, msg:string}>} issues - output of validatePage()
 * @returns {string} instruction text for the AI
 */
export function buildRepairInstruction(issues) {
  if (!issues?.length) return "";
  const lines = [];

  for (const issue of issues) {
    if (issue.msg.includes("Nav-Link") && issue.msg.includes("Section-ID")) {
      // Extract the broken #ids from the message (e.g. "#neuron, #aeroad, #grail")
      const match = issue.msg.match(/(#[\w-]+(?:,\s*#[\w-]+)*)/);
      const ids = match ? match[1] : "(siehe Meldung)";
      lines.push(
        `– NAV-ANKER REPARIEREN: ${ids}. Jede Section die über ein Nav-Link erreichbar sein soll MUSS ` +
        `ein id-Attribut haben das exakt dem href entspricht. ` +
        `Wenn die Section fehlt → erstelle sie mit passendem Inhalt. ` +
        `Wenn die Section existiert aber das falsche id hat → korrigiere das id.`
      );
    } else if (issue.msg.includes("Sections gefunden")) {
      const match = issue.msg.match(/Nur (\d+)/);
      const found = match ? parseInt(match[1], 10) : 0;
      const missing = Math.max(0, 7 - found);
      lines.push(
        `– FEHLENDE SECTIONS ERGÄNZEN: Nur ${found} Sections vorhanden, mindestens 7 erwartet. ` +
        `Füge ${missing} sinnvolle Sections hinzu (z.B. Vorteile, Features, Testimonials, Statistiken, FAQ, CTA-Bereich). ` +
        `Jede neue Section braucht ein eindeutiges id-Attribut das zum Nav-Link passt.`
      );
    } else if (issue.msg.includes("Script-Code als sichtbarer Text")) {
      lines.push(
        `– SCRIPT-LEAK BEHEBEN: JavaScript-Code ist als sichtbarer Fließtext auf der Seite. ` +
        `Entferne diesen Text vollständig — Code darf nur innerhalb von <script>-Tags stehen, niemals als <p>- oder sonstiger Text.`
      );
    } else {
      lines.push(`– ${issue.msg}`);
    }
  }

  return (
    `AUTOMATISCHE QUALITÄTS-REPARATUR — behebe exakt folgende Fehler:\n\n` +
    lines.join("\n\n") +
    `\n\nREGELN:\n` +
    `• Alle bestehenden Inhalte, Farben und das Design bleiben vollständig erhalten\n` +
    `• Nur die oben genannten Punkte werden geändert\n` +
    `• Jeder Nav-Link href="#xyz" MUSS eine Section mit id="xyz" haben — keine Ausnahme\n` +
    `• Ausgabe: vollständige HTML-Seite, beginnt mit <!DOCTYPE html>`
  );
}

/**
 * Generate ONLY the missing <section> elements for an existing page.
 * Surgical alternative to a full-page refinement — ~3000 tokens instead of 6000+.
 *
 * OUTPUT FORMAT: plain HTML sections, NO JSON.
 * JSON was unreliable because the model had to escape HTML quotes inside JSON strings.
 * Plain HTML is parsed in the browser via DOMParser, which is much more robust.
 *
 * @param {string}   html       - Current page HTML (used for context extraction)
 * @param {string[]} missingIds - Section IDs that need to be created
 * @returns {Array<{id:string, html:string}>} Serialized outerHTML of each section
 */
export async function generateMissingSections({ html, missingIds }) {
  if (!missingIds?.length) return [];

  // Extract context from the existing page via regex
  const titleMatch = html.match(/<title>([^<]{1,80})<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : "Landing Page";

  // Nav links for label context: {id: "magazin", label: "Magazin"}
  const navLinks = [...html.matchAll(/href="#([\w-]+)"[^>]*>\s*([^<]{1,40})/g)]
    .map(m => ({ id: m[1], label: m[2].trim() }));

  // Color variables for visual continuity
  const rootMatch = html.match(/:root\s*\{([^}]{1,300})\}/);
  const rootVars = rootMatch ? rootMatch[1].trim() : "";

  const targets = missingIds.map(id => {
    const link = navLinks.find(l => l.id === id);
    return `• <section id="${id}">  ${link?.label ? `— Nav-Label: "${link.label}"` : ""}`;
  }).join("\n");

  // Plain-HTML output avoids JSON quote-escaping failures.
  // The model just outputs <section> tags directly; the browser DOMParser parses them.
  const prompt =
`Du bist Werbetexter und Webdesigner. Erstelle die folgenden fehlenden <section>-Elemente.
KEINE vollständige HTML-Seite. KEIN JSON. KEIN Markdown. Direkt die <section>-Tags ausgeben.

SEITE: "${pageTitle}"
DESIGN: :root{${rootVars}}

FEHLENDE SECTIONS (alle erstellen, in dieser Reihenfolge):
${targets}

CSS-KLASSEN (nur diese, kein eigenes CSS):
section .alt .w .lbl h2 h3 .lead .g .g2 .g3 .g4 .card .ico .stat .stat-l .btn .btn-p .tag

REGELN:
• Jede Section hat GENAU das id="" das oben spezifiziert ist — keine Abweichung
• Inhalt passend zu "${pageTitle}" — überzeugend, konkret, kein Platzhaltertext
• Kein JavaScript, keine Bild-URLs, keine externen Ressourcen
• Gib ausschließlich die <section>…</section>-Tags aus, direkt nacheinander`;

  const raw = await aiCall([{ role: "user", content: prompt }], 3000);

  // Parse with DOMParser — robust against any HTML the model produces
  // (DOMParser is available in both browser and jsdom/vitest environments)
  try {
    const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
    return [...doc.querySelectorAll("div > section[id]")]
      .filter(s => missingIds.includes(s.id))
      .map(s => ({ id: s.id, html: s.outerHTML }));
  } catch {
    return [];
  }
}

/**
 * Build the text context block that is fed to the AI.
 * Collects text from Stories (block content), Posts, Products, Media descriptions,
 * and raw external URLs selected in the project.
 */
export function buildContext(form, stories, posts, items, products = []) {
  const parts = [];

  (form.storyIds || []).forEach(id => {
    const s = stories.find(x => x.id === id);
    if (!s) return;
    const text = blocksToPlain(s.blocks || []).slice(0, 1500);
    parts.push(`## Story: "${s.title}"\n${s.subtitle || ""}\n${text}`);
  });

  (form.postIds || []).forEach(id => {
    const p = posts.find(x => x.id === id);
    if (!p) return;
    parts.push(`## Post: "${p.title}"\n${(p.content || "").slice(0, 600)}`);
  });

  (form.productIds || []).forEach(id => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const priceStr = p.price != null
      ? `${Number(p.price).toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${p.currency} / ${p.unit} (inkl. ${p.vatClass} MwSt.)`
      : "–";
    const attrsStr = (p.attributes || []).filter(a => a.key && a.value)
      .map(a => `${a.key}: ${a.value}`).join(" · ");
    const imgUrls = (p.mediaIds || []).map(mid => items.find(x => x.id === mid)?.url).filter(Boolean);
    parts.push(
      `## Produkt: "${p.name}"` +
      (p.sku ? `\nSKU: ${p.sku}` : "") +
      (p.category ? ` | Kategorie: ${p.category}` : "") +
      `\nPreis: ${priceStr}` +
      (p.shortDesc ? `\nKurztext: ${p.shortDesc}` : "") +
      (p.description ? `\nBeschreibung: ${p.description.slice(0, 1200)}` : "") +
      (attrsStr ? `\nAttribute: ${attrsStr}` : "") +
      (imgUrls.length ? `\nBilder: ${imgUrls.join(", ")}` : "")
    );
  });

  (form.mediaIds || []).forEach(id => {
    const m = items.find(x => x.id === id);
    if (!m) return;
    // Skip documents and data: URLs — base64 blobs are meaningless tokens for the AI
    if (m.type === "document" || (m.url || "").startsWith("data:application")) return;
    const url = (m.url || "").startsWith("data:") ? "(lokales Bild)" : m.url;
    parts.push(`## Bild: "${m.name}"\nURL: ${url}\nBeschreibung: ${m.description || m.altText || ""}`);
  });

  (form.externalUrls || []).forEach(u => {
    parts.push(`## Externe URL: "${u.label}"\n${u.url}`);
  });

  return parts.join("\n\n---\n\n") || "(Noch keine Inhalte hinzugefügt)";
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASYNC FUNCTIONS — require /ai and stock-photo API access
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-flight: ask Spark to generate 4 clarifying questions for this project.
 * Returns an array of question objects: [{id, question, type, choices}]
 * Returns [] if the AI response is invalid or the call fails.
 *
 * No web search needed here — this is a quick analytical call (~600 tokens).
 */
export async function runPreflight(projectName, description, ctx) {
  const raw = await aiCall([{ role: "user", content:
    `Analysiere dieses Projekt für eine Landing Page. Stelle GENAU EINE einzige Rückfrage — die wichtigste.
Die Frage muss type "choice" haben mit exakt 3 kurzen Antwort-Optionen (max. 5 Wörter je Option).
Fokus: Was ist das primäre Ziel der Seite?

PROJEKT: ${projectName}
BESCHREIBUNG: ${description || "(keine)"}
INHALTE (Auszug): ${ctx.slice(0, 400)}

NUR JSON, kein Markdown:
{"questions":[{"id":"q1","question":"...","type":"choice","choices":["Option A","Option B","Option C"]}]}`
  }], 200);

  return parseJSON(raw)?.questions || [];
}

/**
 * Search the workspace media library for images matching a query.
 * Pure function — no API calls, no side effects.
 *
 * Scoring: counts how many space-separated keywords appear in a concatenated
 * text field (name + description + altText + tags + mood + aiAnalysis.tags).
 * Items are sorted by descending score and the top `count` are returned.
 *
 * @param {Array}  items               - Media library items from AppContext
 * @param {string} query               - Free-text search terms
 * @param {object} [opts]
 * @param {number} [opts.count=4]       - Max results
 * @param {string} [opts.workspaceId]   - Restrict to this workspace (falsy = all)
 * @returns {Array<{url, alt, mediaId}>}
 */
export function searchMediaLibrary(items, query, { count = 4, workspaceId = null } = {}) {
  if (!items?.length || !query?.trim()) return [];

  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
  if (!keywords.length) return [];

  const scored = [];
  for (const item of items) {
    if (item.type !== "image") continue;
    if (workspaceId && item.workspaceId && item.workspaceId !== workspaceId) continue;

    const haystack = [
      item.name,
      item.description,
      item.altText,
      item.tags,
      item.mood,
      ...(Array.isArray(item.aiAnalysis?.tags) ? item.aiAnalysis.tags : []),
    ].join(" ").toLowerCase();

    const score = keywords.reduce((n, kw) => n + (haystack.includes(kw) ? 1 : 0), 0);
    if (score > 0) scored.push({ score, item });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ item }) => ({
      url: item.url,
      alt: item.description || item.altText || item.name,
      mediaId: item.id,
    }));
}

/**
 * Search for images using the first available stock API key (Pexels > Unsplash > Pixabay).
 * Saves found images to the media library via uploadItem with analyzing:true so the
 * caller (VoodooPage) can fire-and-forget the KI analysis.
 * Returns an array of {url, alt, mediaId, uploadedItem} objects.
 *
 * @param {string}   query       - Search terms (project name + description)
 * @param {number}   count       - Max images to return (default 4)
 * @param {Function} uploadItem  - AppContext uploadItem function (saves to media library)
 * @param {string}   workspaceId - Current workspace for saved items
 */
export async function searchImages(query, count = 4, uploadItem = null, workspaceId = null) {
  const src = skGet("pexels") ? "pexels"
    : skGet("unsplash") ? "unsplash"
    : skGet("pixabay") ? "pixabay"
    : null;

  if (!src || !query) return [];

  try {
    const found = await stockSearch(src, query.slice(0, 80), { type: "image", orientation: "landscape" });
    const fresh = found.slice(0, count);

    const results = [];
    for (const f of fresh) {
      const alt = f.description || f.tags || query;
      if (uploadItem) {
        const newId = uid();
        const uploadedItem = {
          ...f,
          id: newId,
          category: "Spark Auto",
          workspaceId: workspaceId || "ws-ppi-media",
          analyzing: true,   // caller fires AI analysis after upload
        };
        uploadItem(uploadedItem);
        results.push({ url: f.url, alt, mediaId: newId, uploadedItem });
      } else {
        results.push({ url: f.url, alt });
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Fire-and-forget KI analysis for a freshly uploaded image.
 * Shared by VoodooPage (stock images in generate()) and StoryEditorModal
 * (stock images in executeSparkPlan()).
 *
 * Stock images have HTTP URLs — we must fetch → blob → base64 before calling
 * AI.analyzeImg (which requires a data URL, not a raw HTTP URL).
 * Mirrors the MediaPage upload pattern; timeout: 30 s.
 *
 * @param {object}   item        - Media item already saved via uploadItem (analyzing:true)
 * @param {Function} updateItem  - AppContext updateItem to write analysis results back
 */
export async function analyzeUploadedImage(item, updateItem) {
  try {
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), 30000)
    );
    const dataUrl = await Promise.race([
      (async () => {
        const res  = await fetch(item.url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsDataURL(blob);
        });
      })(),
      timeout,
    ]);
    const r = await AI.analyzeImg(dataUrl);
    updateItem({
      ...item,
      analyzing:   false,
      tags:        Array.isArray(r.tags) ? r.tags.join(", ") : "",
      description: r.description  || "",
      altText:     r.suggestedAlt || "",
      mood:        r.mood         || "",
      focusPoint:  r.focalPoint   ? { x: r.focalPoint.x, y: r.focalPoint.y } : { x: 50, y: 50 },
      aiAnalysis:  r,
    });
  } catch {
    updateItem({ ...item, analyzing: false, aiError: true });
  }
}

/**
 * Generate a complete landing page HTML for the given project.
 *
 * Uses web search (WEB_SEARCH_TOOL) so the model can research industry-specific
 * design trends, colour palettes, and copy patterns before writing.
 *
 * @param {object} opts
 * @param {object}   opts.form         - Project form data (name, description, …)
 * @param {string}   opts.ctx          - buildContext() output
 * @param {object}   opts.answers      - Pre-flight Q&A answers {questionId: answer}
 * @param {Array}    opts.images        - [{url, alt}] from searchImages()
 * @param {string}   opts.extraPrompt  - Optional free-text wishes from user
 * @param {Array}    opts.preflightQ   - Original question objects (for label lookup)
 * @param {Function} opts.onChunk      - Streaming callback (chunk, fullSoFar)
 * @returns {string} Post-processed HTML string (includes LINK_GUARD)
 */
export async function generatePage({ form, ctx, answers = {}, images = [], extraPrompt = "", ctaUrl = "", dossierPdfUrl = "", preflightQ = [], onChunk }) {
  // Format preflight answers as readable context
  const answersText = preflightQ
    .map(q => answers[q.id] ? `${q.question}\n→ ${answers[q.id]}` : null)
    .filter(Boolean)
    .join("\n\n");

  const imagesText = images.length > 0
    ? `BILDER (genau diese verwenden – keine Platzhalter):\n${images.map((img, i) =>
        `Bild ${i + 1}: src="${img.url}" alt="${img.alt}"`).join("\n")}`
    : "BILDER: Keine verfügbar – setze Farbflächen, Verläufe oder CSS-Grafiken als visuelle Akzente.";

  // Build image instruction block — hero image must be used prominently if available
  const heroImg   = images[0];
  const extraImgs = images.slice(1);
  const imageBlock = images.length > 0
    ? `BILDER (PFLICHT – prominent einsetzen, keine Thumbnails):
• HERO: <img class="hero-img" src="${heroImg.url}" alt="${heroImg.alt}"> direkt nach .btns einsetzen${extraImgs.length > 0 ? `\n• CONTENT: ${extraImgs.map((img, i) => `Bild ${i+2}: src="${img.url}" alt="${img.alt}"`).join(" | ")} → in .img-r (links Text, rechts Bild) oder .card img (aspect-ratio:16/10;object-fit:cover)` : ""}`
    : "BILDER: Keine verfügbar – Farbflächen, SVG-Grafiken oder CSS-Muster als visuelle Akzente.";

  const prompt =
`${SPARK_PERSONA}

━━ SCHRITT 1 — SECTION-ID-CONTRACT (ZUERST, vor allem anderen) ━━
Schreibe als ALLERERSTE Zeile im <body>:
<!-- NAV_IDS: hero,[id2],[id3],[id4],stats,cta -->
Regeln für die IDs:
• Ersetze [id2]–[id4] durch kurze Begriffe ohne Sonderzeichen (z.B.: vorteile, leistungen, ablauf, team, faq)
• Diese IDs sind BINDEND — jeder nav href="#xyz" UND jede <section id="xyz"> MÜSSEN exakt aus dieser Liste stammen
• Kein ID darf abweichen (kein Bindestrich vs. Unterstrich, keine Großschreibung, kein Tippfehler)

━━ SCHRITT 2 — GOOGLE FONT (thematisch passend wählen) ━━
Füge im <head> 3 <link>-Tags + in :root --font ein:
• Modern/Tech/SaaS   → Plus Jakarta Sans: https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap
• Freundlich/Kinder  → DM Sans:          https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap
• Sport/Energie      → Outfit:           https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap
• Business/B2B       → Manrope:          https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap
• Universal/vertrauenswürdig → Inter:    https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap

━━ LANDING PAGE — 7 SECTIONS (alle PFLICHT, keine weglassen) ━━
• NAV       – sticky, Logo links, exakt die NAV_IDS-Ankerpunkte als Links, rechts .nav-cta
• HERO      – emotionale H1 (Problem→Lösung), 1-2 Sätze Subtext, .btns mit 2 CTAs${heroImg ? `, dann <img class="hero-img" src="${heroImg.url}" alt="${heroImg.alt}">` : ""}
• BENEFITS  – .g3 mit 3 starken Vorteilen (.card + monochrome SVG .ico + h3 + p)
• CONTENT   – Kerninhalt aus Projektdaten, mindestens 1 Bild in .img-r wenn Bilder vorhanden
• STATS     – .g4 mit 3-4 Kennzahlen (.stat nackte Zahl + .stat-l max 4-Wort-Label)
• CTA-BLOCK – .cta-b mit starker Headline, 1-2 Sätze und prominentem .btn-w
• FOOTER    – .footer-g mit gruppierten Links + Copyright-Zeile

VOLLSTÄNDIGKEITS-PFLICHT: Alle 7 Sections MÜSSEN im HTML erscheinen.
→ Wenn Token-Budget knapp: Inhalt kürzen, aber KEINE Section weglassen.

${answersText ? `━━ AUFTRAGGEBER-VORGABEN ━━\n${answersText}\n` : ""}
${imageBlock}

━━ CSS-KLASSEN (semantisch strikt, keine Zweckentfremdung) ━━
Layout:   .w | .g .g2 .g3 .g4 | .img-r (Text+Bild, Bild mit aspect-ratio:16/10)
Nav:      nav .ni .logo .nl .nav-cta
Hero:     .hero | .btns | .hero-img (Vollbreite-Bild, max-height:460px, border-radius:12px)
Buttons:  .btn-p (primär blau) | .btn-o (outline) | .btn-w (weiß, NUR in .cta-b)
Content:  section .alt(grau BG) | .lbl | h2 | h3 | .lead | .quote + cite (Zitate)
Cards:    .card (hover: translateY) | .ico (NUR SVG) | .tag (Badge)
Stats:    .stat = NUR die nackte Zahl/Kennzahl selbst (max ~6 Zeichen: "98%", "2.400", "14")
          .stat-l = kurzes Label darunter (max 4 Wörter: "Kundenzufriedenheit", "Aktive Nutzer")
          ⚠ REIHENFOLGE: .stat kommt ZUERST (die Zahl), .stat-l kommt DANACH (das Label)
CTA:      .cta-b | footer .footer-g

━━ STATS-SECTION: EXAKTES PFLICHT-FORMAT (nicht abweichen!) ━━
<section id="stats" class="alt"><div class="w">
  <span class="lbl">In Zahlen</span>
  <div class="g g4">
    <div><span class="stat">98%</span><span class="stat-l">Kundenzufriedenheit</span></div>
    <div><span class="stat">2.400</span><span class="stat-l">Aktive Nutzer täglich</span></div>
    <div><span class="stat">14</span><span class="stat-l">Tage kostenlos testen</span></div>
    <div><span class="stat">5★</span><span class="stat-l">Durchschnittsbewertung</span></div>
  </div>
</div></section>
VERBOTEN: <span class="stat">des deutschen Stroms soll bis 2030...</span> — das ist KEIN Stat!
Lange Beschreibungen gehören in <p> oder .stat-l mit max 4 Wörtern.

━━ PROJEKT-DATEN ━━
NAME: ${form.name}
BESCHREIBUNG: ${form.description || "(keine)"}
INHALTE: ${ctx}
${extraPrompt ? `BESONDERE WÜNSCHE: ${extraPrompt}\n` : ""}${ctaUrl && !dossierPdfUrl ? `CTA-ZIEL-URL (PFLICHT): Alle CTAs (.btn-p, .btn-w, .btn-o, .cta-b-Button) → href="${ctaUrl}" target="_blank" rel="noopener noreferrer"\n` : ""}${dossierPdfUrl ? `E-MAIL-CAPTURE-FORMULAR (PFLICHT — ersetzt den CTA-Button im .cta-b): Im CTA-BLOCK dieses Formular einsetzen: <form id="lead-form" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;max-width:500px;margin:0 auto"><input type="email" required placeholder="Ihre E-Mail-Adresse" style="flex:1;min-width:220px;padding:13px 18px;border-radius:8px;border:none;font-size:1rem;background:rgba(255,255,255,.15);color:#fff;outline:2px solid rgba(255,255,255,.4)"><button type="submit" class="btn btn-w">Dossier herunterladen</button></form> — kein onclick/href am Form nötig, JavaScript übernimmt den PDF-Download.\n` : ""}
━━ AUSGABE-FORMAT ━━
1. <!DOCTYPE html>
2. <head>: charset · viewport · <title> · 3× Google Font <link> · <style>:root{--p:#XXX;--pd:#XXX;--pl:#XXX;--font:'Name',system-ui,sans-serif}</style>
3. <style>${CSS_SENTINEL}</style>
4. <body>: Erste Zeile <!-- NAV_IDS: hero,... --> → dann vollständiges HTML
5. </body></html>

━━ QUALITÄTS-REGELN ━━
- EMOJI-VERBOT: Nur monochrome SVG erlaubt (stroke="currentColor") — null Emojis, null Unicode-Piktogramme
- STAT-VERBOT: .stat/.stat-l ausschließlich für nackte Zahlenwerte — niemals für Labels oder Texte
- ANCHOR-KONSISTENZ: Jeder href="#xyz" hat zwingend id="xyz" — vor Ausgabe alle Anker gegen IDs prüfen
- Nur echte Inhalte aus Projektdaten — null Platzhalter, null "Lorem ipsum"
- Antworte NUR mit HTML (<!DOCTYPE html>…</html>) — kein Markdown, kein Text davor`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    4500,   // No web search → full budget für HTML. 4500 reicht für 7 vollständige Sections.
    onChunk,
  );

  // Re-inject CSS (sentinel trick: model outputs placeholder, we fill it in)
  const withCss = raw.includes(CSS_SENTINEL) ? raw.replace(CSS_SENTINEL, PAGE_CSS) : raw;
  const processed = postProcessHtml(withCss);
  return dossierPdfUrl ? injectEmailCapture(processed, dossierPdfUrl) : processed;
}

/**
 * Refine an existing landing page according to a user instruction.
 *
 * Uses the sentinel trick: PAGE_CSS (~3 KB) is replaced with a short placeholder
 * before sending, saving ~2000 tokens in both input and output. The CSS is
 * re-injected after streaming completes.
 *
 * Uses web search so the model can look up current design trends when refining.
 *
 * @param {object} opts
 * @param {string}   opts.html        - Current generated HTML (from form.generatedHtml)
 * @param {string}   opts.instruction - User's refinement instruction
 * @param {Function} opts.onChunk     - Streaming callback
 * @returns {string} Post-processed updated HTML string
 */
export async function refinePage({ html, instruction, ctaUrl = "", dossierPdfUrl = "", onChunk }) {
  // Strip PAGE_CSS (sentinel trick) AND the link guard script — the AI must
  // never see the guard code, otherwise it can reproduce it as visible text content.
  // Both are re-injected by postProcessHtml() after the stream completes.
  const compactHtml = html
    .replace(PAGE_CSS, CSS_SENTINEL)
    .replace(GUARD_RE, "");

  // Dynamic token budget: 2× the compressed HTML size, capped between 4000–6000.
  // A page is typically 8–16 kB compressed → 2000–4000 tokens → budget 4000–6000.
  // Refinement rarely needs to produce MORE tokens than the input, so 6000 is safe.
  const max_tokens = Math.min(6000, Math.max(4000, Math.ceil(compactHtml.length / 4 * 2.2)));

  // ⚠️  Output-Pflicht steht ZUERST — bevor das Modell irgendetwas anderes liest.
  // Das verhindert, dass das Modell einen einleitenden Satz vor <!DOCTYPE html> ausgibt.
  // SPARK_PERSONA kommt NACH dem HTML, nicht davor — so bleibt die Aufgabe im Fokus.
  // max_tokens=8000: Die vollständige Seite kann bis zu 4000 Token lang sein; beim
  // Refinement muss das Modell sie komplett ausgeben + ggf. neue Sections ergänzen.
  // Kein WEB_SEARCH_TOOL: Refinement ist eine gezielte Änderungsoperation, keine
  // Recherche-Aufgabe — das Tool erhöht hier nur Latenz und Unberechenbarkeit.

  const prompt =
`AUSGABE-PFLICHT (absolut, keine Ausnahme):
Deine Antwort beginnt mit <!DOCTYPE html> — KEIN einleitender Satz, KEINE Erklärung, KEIN Markdown.
Die letzte Zeile ist </html>. Dazwischen steht ausschließlich vollständiges, valides HTML.

AUFGABE: Verfeinere die folgende Landing Page gemäß der Anweisung.
Ändere NUR was die Anweisung verlangt — alle anderen Sections bleiben vollständig erhalten.

BESTEHENDE SEITE:
${compactHtml}

ANWEISUNG: ${instruction}

DEIN EXPERTISE-PROFIL (wende es auf jede Änderung an):
${SPARK_PERSONA}

LANDING PAGE ANATOMIE (alle 7 Sections müssen vorhanden bleiben):
NAV → HERO → BENEFITS → CONTENT → STATS → CTA-BLOCK → FOOTER

TECHNISCHE REGELN (keine Ausnahmen):
- Behalte "${CSS_SENTINEL}" EXAKT im <style>-Tag — CSS wird automatisch eingefügt
- EMOJI-VERBOT (absolut): Niemals Emojis oder Unicode-Piktogramme — weder in <div class="ico">, noch in Überschriften, Listenpunkten oder Fließtext. Nur monochrome SVG mit stroke="currentColor" sind erlaubt.
- STAT-VERBOT: .stat/.stat-l NUR für nackte Zahlenwerte ("2.400", "98%") — niemals für Labels, Texte oder Lesezeiten
- Navigation: AUSSCHLIESSLICH #anchor-Links — niemals href="/" oder externe URLs in der Nav
- ANCHOR-KONSISTENZ (kritisch): Jeder href="#xyz" MUSS eine Section mit GENAU id="xyz" haben. Bei Änderungen an Nav-Links immer auch die Section-IDs anpassen — und umgekehrt
- KEIN opacity:0 oder display:none auf sichtbarem Content
- KEIN zusätzliches CSS außer :root Farbvariablen
- JS nur wenn nötig, Content ohne JS vollständig sichtbar${ctaUrl ? `\n- CTA-ZIEL-URL BEIBEHALTEN (Pflicht): Alle CTA-Buttons (.btn-p, .btn-w, .btn-o, .cta-b Buttons) behalten zwingend href="${ctaUrl}" — diese URL darf durch die Anweisung niemals verändert werden` : ""}`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    max_tokens,
    onChunk,
    // Kein WEB_SEARCH_TOOL: Refinement ist gezielte Änderung, keine Recherche-Aufgabe
  );

  // Re-inject CSS before post-processing
  const withCss = raw.includes(CSS_SENTINEL) ? raw.replace(CSS_SENTINEL, PAGE_CSS) : raw;
  const processed = postProcessHtml(withCss);
  return dossierPdfUrl ? injectEmailCapture(processed, dossierPdfUrl) : processed;
}
