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

import { aiCall, aiCallStream, parseJSON, uid } from "./store.js";
import { stockSearch, skGet } from "../components/StockSearch.jsx";

// ── Pre-built CSS design system ───────────────────────────────────────────────
// Injected into every generated page so the AI only writes HTML (~1800 tokens).
// Without this the model re-invents CSS from scratch, hits the 4000-token cap,
// and the page is truncated. The AI only overrides :root colour variables.
export const PAGE_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--p:#2563EB;--pd:#1E3A8A;--pl:#EFF6FF;--bg:#fff;--s:#F8FAFC;--t:#0f172a;--m:#64748b;--r:8px;--sh:0 2px 14px rgba(0,0,0,.08)}
body{font-family:system-ui,-apple-system,sans-serif;color:var(--t);background:var(--bg);line-height:1.65}
a{text-decoration:none;color:inherit}img{max-width:100%;height:auto;border-radius:6px}ul{list-style:none}
.w{max-width:1100px;margin:0 auto;padding:0 clamp(16px,4vw,28px)}
nav{position:sticky;top:0;z-index:9;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid #e2e8f0}
.ni{display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto;padding:14px clamp(16px,4vw,28px)}
.logo{font-weight:900;font-size:1.15rem;color:var(--p)}.nl{display:flex;gap:6px;align-items:center}
.nl a{padding:5px 12px;border-radius:6px;color:var(--m);font-size:.875rem;font-weight:500}.nl a:hover{background:#f1f5f9;color:var(--t)}
.nav-cta{padding:8px 16px!important;background:var(--p);color:#fff!important;border-radius:var(--r);font-weight:700!important}.nav-cta:hover{background:var(--pd)!important}
.hero{padding:clamp(60px,10vw,96px) clamp(16px,4vw,28px);text-align:center;background:linear-gradient(140deg,var(--pl)0%,#f0fdf4 100%)}
.hero h1{font-size:clamp(2.1rem,5vw,3.6rem);font-weight:900;line-height:1.08;letter-spacing:-.03em;margin-bottom:18px;color:var(--t)}
.hero p{font-size:clamp(1rem,2.2vw,1.18rem);color:var(--m);max-width:560px;margin:0 auto 32px}
.btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:12px 26px;border-radius:var(--r);font-weight:700;font-size:.97rem;cursor:pointer;transition:all .18s;border:2px solid transparent}
.btn-p{background:var(--p);color:#fff}.btn-p:hover{background:var(--pd);transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.3)}
.btn-o{border-color:var(--p);color:var(--p)}.btn-o:hover{background:var(--pl)}
section{padding:clamp(52px,8vw,80px) clamp(16px,4vw,28px)}.alt{background:var(--s)}
.lbl{font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--p);margin-bottom:10px}
h2{font-size:clamp(1.55rem,3.2vw,2.3rem);font-weight:800;line-height:1.15;margin-bottom:10px}
h3{font-size:1.02rem;font-weight:700;margin-bottom:6px}
.lead{color:var(--m);font-size:1rem;max-width:540px;margin-bottom:36px;line-height:1.7}
.g{display:grid;gap:20px}.g2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.g3{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.g4{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.card{background:#fff;border-radius:var(--r);padding:24px;box-shadow:var(--sh);border:1px solid #e8edf2}
.card .ico{font-size:1.7rem;margin-bottom:12px}.card p{color:var(--m);font-size:.9rem;margin-top:5px;line-height:1.6}
.stat{font-size:2.4rem;font-weight:900;color:var(--p);display:block;line-height:1}.stat-l{font-size:.82rem;color:var(--m);margin-top:3px}
.cta-b{background:linear-gradient(135deg,var(--p),var(--pd));color:#fff;border-radius:14px;padding:clamp(36px,6vw,56px) clamp(20px,4vw,40px);text-align:center}
.cta-b h2{color:#fff;margin-bottom:10px}.cta-b p{color:rgba(255,255,255,.82);margin-bottom:26px;max-width:480px;margin-left:auto;margin-right:auto}
.btn-w{background:#fff;color:var(--p)}.btn-w:hover{opacity:.9;transform:translateY(-1px)}
.img-r{display:grid;gap:24px;align-items:center}@media(min-width:768px){.img-r{grid-template-columns:1fr 1fr}}
.tag{display:inline-block;background:var(--pl);color:var(--p);border-radius:20px;padding:3px 11px;font-size:.78rem;font-weight:700;margin-right:6px;margin-bottom:6px}
footer{background:#0f172a;color:#94a3b8;padding:32px clamp(16px,4vw,28px);text-align:center;font-size:.85rem;line-height:2}
footer a{color:#94a3b8}.footer-g{display:flex;gap:32px;justify-content:center;flex-wrap:wrap;margin-bottom:20px}
@media(max-width:600px){.nl{display:none}}`;

// ── Link guard ────────────────────────────────────────────────────────────────
// Injected before </body> in every generated/refined page.
// Prevents the iframe from navigating away on non-anchor link clicks.
// Anchor (#section) links scroll normally. External URLs open in a new tab.
export const LINK_GUARD = `<script>
/* Spark link guard – keeps the preview inside the iframe */
document.addEventListener('click',function(e){
  var a=e.target.closest('a');if(!a)return;
  var h=a.getAttribute('href')||'';
  if(!h||h==='#'||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:'))return;
  e.preventDefault();
  if(/^https?:\\/\\//.test(h))window.open(h,'_blank','noopener');
},true);
</script>`;

// ── Anthropic web search tool ─────────────────────────────────────────────────
// Built-in server-side tool — Anthropic executes searches, no client roundtrip.
// The /ai CF Function already forwards the `tools` array to Anthropic as-is.
export const WEB_SEARCH_TOOL = { type: "web_search_20250305", name: "web_search", max_uses: 5 };

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

/**
 * Post-process raw AI HTML output into a safe, complete page.
 *
 * Steps performed (in order):
 *   1. Strip markdown ``` code fences (model sometimes wraps output)
 *   2. Inject LINK_GUARD before </body>  (or append if </body> missing)
 *   3. Ensure the document ends with </html>
 *
 * This is the single shared post-processor for both generate and refine.
 */
export function postProcessHtml(raw) {
  let html = (raw || "").trim();

  // 1. Strip code fences
  if (html.startsWith("```")) {
    html = html.replace(/^```[a-z]*\r?\n?/i, "").replace(/\r?\n?```\s*$/, "").trim();
  }

  // 2. Inject link guard
  if (html.includes("</body>")) {
    html = html.replace(/<\/body>/i, LINK_GUARD + "\n</body>");
  } else {
    html += "\n" + LINK_GUARD + "\n</body>";
  }

  // 3. Close document
  if (!html.includes("</html>")) html += "\n</html>";

  return html;
}

/**
 * Build the text context block that is fed to the AI.
 * Collects text from Stories (block content), Posts, Media descriptions,
 * and raw external URLs selected in the project.
 */
export function buildContext(form, stories, posts, items) {
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

  (form.mediaIds || []).forEach(id => {
    const m = items.find(x => x.id === id);
    if (!m) return;
    parts.push(`## Bild: "${m.name}"\nURL: ${m.url}\nBeschreibung: ${m.description || m.altText || ""}`);
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
    `Analysiere dieses Projekt für eine Landing Page und stelle genau 4 gezielte Rückfragen an den Auftraggeber.
Fokus: Zielgruppe, gewünschter Stil/Tonalität, wichtigste Conversion-Aktion, und ein Aspekt der in den Inhalten unklar ist.
Nutze type "choice" mit 3-4 Optionen wo sinnvoll, sonst type "text".

PROJEKT: ${projectName}
BESCHREIBUNG: ${description || "(keine)"}
INHALTE (Auszug): ${ctx.slice(0, 600)}

NUR JSON, kein Markdown:
{"questions":[{"id":"q1","question":"...","type":"text","choices":null},{"id":"q2","question":"...","type":"choice","choices":["A","B","C"]}]}`
  }], 600);

  return parseJSON(raw)?.questions || [];
}

/**
 * Search for images using the first available stock API key (Pexels > Unsplash > Pixabay).
 * Saves found images to the media library via uploadItem.
 * Returns an array of {url, alt} objects for use in the generation prompt.
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

    if (uploadItem && fresh.length > 0) {
      fresh.forEach(f => uploadItem({
        ...f,
        id: uid(),
        category: "Spark Auto",
        workspaceId: workspaceId || "ws-ppi-media",
        analyzing: false,
      }));
    }

    return fresh.map(f => ({ url: f.url, alt: f.description || f.tags || query }));
  } catch {
    return [];
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
export async function generatePage({ form, ctx, answers = {}, images = [], extraPrompt = "", preflightQ = [], onChunk }) {
  // Format preflight answers as readable context
  const answersText = preflightQ
    .map(q => answers[q.id] ? `${q.question}\n→ ${answers[q.id]}` : null)
    .filter(Boolean)
    .join("\n\n");

  const imagesText = images.length > 0
    ? `BILDER (genau diese verwenden – keine Platzhalter):\n${images.map((img, i) =>
        `Bild ${i + 1}: src="${img.url}" alt="${img.alt}"`).join("\n")}`
    : "BILDER: Keine verfügbar – setze Farbflächen, Verläufe oder CSS-Grafiken als visuelle Akzente.";

  const prompt =
`Du bist ein Elite-Webentwickler und Conversion-Designer mit 20 Jahren Erfahrung.
Nutze die integrierte Websuche um aktuelle Best-Practice-Beispiele, Farbwelten und Conversion-Patterns für das Thema "${form.name}" zu recherchieren und direkt anzuwenden.

LANDING PAGE ANATOMIE (ALLE 7 Sections vollständig):
• NAV   – sticky, Logo links, 3-4 interne #anchor-Links, CTA-Button rechts
• HERO  – starke emotionale H1 (Problem→Lösung), Subtext, 2 CTAs (.btn-p + .btn-o)
• BENEFITS – 3er-Grid (.g3) mit den 3 stärksten Vorteilen
• CONTENT  – Kerninhalt aus den Projektdaten, mit Bildunterstützung wenn vorhanden
• STATS    – 3-4 starke Kennzahlen (.g4 .stat + .stat-l)
• CTA-BLOCK – (.cta-b) letzter Conversion-Push mit prominentem Button
• FOOTER   – (.footer-g) gruppierte Links + Copyright

${answersText ? `AUFTRAGGEBER-VORGABEN:\n${answersText}\n` : ""}
${imagesText}

VERFÜGBARE CSS-KLASSEN (keine weiteren CSS-Regeln nötig):
Layout:   .w  .g .g2 .g3 .g4  .img-r
Nav:      nav  .ni  .logo  .nl  .nav-cta
Hero:     .hero  .btns
Buttons:  .btn  .btn-p  .btn-o  .btn-w
Content:  section  .alt  .lbl  h2  h3  .lead
Cards:    .card  .ico  .stat  .stat-l  .tag
CTA:      .cta-b
Footer:   footer  .footer-g

PROJEKT: ${form.name}
BESCHREIBUNG: ${form.description || "(keine)"}
INHALTE: ${ctx}
${extraPrompt ? `BESONDERE WÜNSCHE: ${extraPrompt}` : ""}

AUSGABE-FORMAT (exakt einhalten):
1. <!DOCTYPE html>
2. <head>: charset · viewport · <title> · <style>:root{--p:#XXX;--pd:#XXX;--pl:#XXX}</style>
3. <style>${PAGE_CSS}</style>
4. <body>: vollständiges semantisches HTML
5. </body></html>

QUALITÄTS-REGELN (keine Ausnahmen):
- KEIN zusätzliches CSS außer :root Farbvariablen
- KEINE Emoji-Icons als Grafik — nur monochrome SVG (stroke="currentColor") oder Textsymbole
- Navigation: AUSSCHLIESSLICH #anchor-Links — niemals href="/" oder externe URLs in der Nav
- KEIN opacity:0 oder display:none auf sichtbarem Content
- JS nur wenn unbedingt nötig, max 10 Zeilen, Content ohne JS vollständig sichtbar
- KEINE Platzhalter-Texte — nur echte Inhalte aus den Projektdaten
- Antworte NUR mit HTML (<!DOCTYPE html> … </html>) — kein Markdown`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    4000,
    onChunk,
    [WEB_SEARCH_TOOL],
  );

  return postProcessHtml(raw);
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
export async function refinePage({ html, instruction, onChunk }) {
  const SENTINEL = "/* PAGE_CSS_PLACEHOLDER */";
  const compactHtml = html.includes(PAGE_CSS)
    ? html.replace(PAGE_CSS, SENTINEL)
    : html; // fallback: page generated without our CSS (keep as-is)

  const prompt =
`Du bist ein Elite-Webentwickler und Conversion-Designer mit 20 Jahren Erfahrung.
Nutze die integrierte Websuche wenn die Anweisung aktuelle Design-Trends oder Marktrecherche erfordert.

LANDING PAGE ANATOMIE (alle 7 Sections müssen nach der Änderung vollständig vorhanden bleiben):
NAV → HERO → BENEFITS → CONTENT → STATS → CTA-BLOCK → FOOTER

BESTEHENDE SEITE:
${compactHtml}

ANWEISUNG: ${instruction}

PFLICHT-REGELN (keine Ausnahmen):
- Antworte NUR mit vollständigem, aktualisiertem HTML — kein Markdown
- Behalte "${SENTINEL}" EXAKT im <style>-Tag — CSS wird automatisch eingefügt
- Ändere NUR was die Anweisung verlangt — alle anderen Sections vollständig erhalten
- KEINE Emoji-Icons — nur monochrome SVG (stroke="currentColor") oder Textsymbole
- Navigation: AUSSCHLIESSLICH #anchor-Links — niemals href="/" in der Nav
- KEIN opacity:0 oder display:none auf sichtbarem Content
- KEIN zusätzliches CSS außer :root Farbvariablen
- JS nur wenn nötig, Content ohne JS vollständig sichtbar
- Alle 7 Sections müssen vorhanden sein`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    4000,
    onChunk,
    [WEB_SEARCH_TOOL],
  );

  // Re-inject CSS before post-processing
  const withCss = raw.includes(SENTINEL) ? raw.replace(SENTINEL, PAGE_CSS) : raw;
  return postProcessHtml(withCss);
}
