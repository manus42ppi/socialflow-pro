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

// ── Link guard v2 ─────────────────────────────────────────────────────────────
// Injected before </body> in every generated/refined page.
//
// Handles three cases:
//   #anchor where id exists   → normal browser scroll (no interference)
//   #anchor where id MISSING  → fuzzy-match nearest section, smooth-scroll to it
//   External http(s) links    → open in new tab (no iframe navigation)
//   mailto / tel              → pass through
export const LINK_GUARD = `<script>
/* Spark link guard v2 – anchor repair + iframe guard */
document.addEventListener('click',function(e){
  var a=e.target.closest('a');if(!a)return;
  var h=a.getAttribute('href')||'';
  if(!h||h==='#')return;
  if(h.startsWith('#')){
    var el=document.getElementById(h.slice(1));
    if(!el){
      /* Target ID missing — fuzzy-match by comparing link text with section IDs */
      e.preventDefault();
      var txt=(a.textContent||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
      var nodes=document.querySelectorAll('section[id],[id]');
      var best=null;
      for(var i=0;i<nodes.length;i++){
        var sid=(nodes[i].id||'').toLowerCase().replace(/[^a-z0-9]/g,'');
        if(sid&&txt&&(sid.includes(txt.slice(0,5))||txt.includes(sid.slice(0,5)))){best=nodes[i];break;}
      }
      if(best)best.scrollIntoView({behavior:'smooth'});
    }
    return;
  }
  if(h.startsWith('mailto:')||h.startsWith('tel:'))return;
  e.preventDefault();
  if(/^https?:\\/\\//.test(h))window.open(h,'_blank','noopener');
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
`Du bist drei Experten in einer Person — Werbetexter, Redakteur und Webdesigner — mit je 20 Jahren Erfahrung.

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
• Responsive ist Pflicht: Grid-Breakpoints greifen, Touch-Targets ≥ 44 px, Lesebreite max 70 ch`;


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

  // 3. Minimum section count
  const sectionCount = (html.match(/<section[\s>]/gi) || []).length;
  if (sectionCount < 5) {
    issues.push({ type: "warn", msg: `Nur ${sectionCount} Sections gefunden — mindestens 7 erwartet` });
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
`${SPARK_PERSONA}

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
3. <style>${CSS_SENTINEL}</style>   ← EXAKT SO schreiben — CSS wird automatisch eingefügt
4. <body>: vollständiges semantisches HTML
5. </body></html>

QUALITÄTS-REGELN (keine Ausnahmen):
- KEIN zusätzliches CSS außer :root Farbvariablen in Schritt 2
- KEINE Emoji-Icons als Grafik — nur monochrome SVG (stroke="currentColor") oder Textsymbole
- Navigation: AUSSCHLIESSLICH #anchor-Links — niemals href="/" oder externe URLs in der Nav
- ANCHOR-KONSISTENZ (kritisch): Jeder Nav-Link href="#xyz" MUSS eine Section oder ein Element mit GENAU id="xyz" im Body haben. Prüfe jeden einzelnen #anchor gegen die Section-IDs bevor du ausgibst — kein #anchor ohne passendes id=""
- KEIN opacity:0 oder display:none auf sichtbarem Content
- JS nur wenn unbedingt nötig, max 10 Zeilen, Content ohne JS vollständig sichtbar
- KEINE Platzhalter-Texte — nur echte Inhalte aus den Projektdaten
- Antworte NUR mit HTML (<!DOCTYPE html> … </html>) — kein Markdown`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    6000,   // +2000 vs before: web search consumes 1000-2500 tokens before HTML starts
    onChunk,
    [WEB_SEARCH_TOOL],
  );

  // Re-inject CSS (sentinel trick: model outputs placeholder, we fill it in)
  const withCss = raw.includes(CSS_SENTINEL) ? raw.replace(CSS_SENTINEL, PAGE_CSS) : raw;
  return postProcessHtml(withCss);
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
- Behalte "${SENTINEL}" EXAKT im <style>-Tag — CSS wird automatisch eingefügt
- KEINE Emoji-Icons — nur monochrome SVG (stroke="currentColor") oder Textsymbole
- Navigation: AUSSCHLIESSLICH #anchor-Links — niemals href="/" in der Nav
- ANCHOR-KONSISTENZ (kritisch): Jeder Nav-Link href="#xyz" MUSS eine Section mit GENAU id="xyz" im Body haben. Beim Refinement: wenn du Nav-Links änderst, passe auch die Section-IDs an — und umgekehrt. Kein #anchor ohne passendes id=""
- KEIN opacity:0 oder display:none auf sichtbarem Content
- KEIN zusätzliches CSS außer :root Farbvariablen
- JS nur wenn nötig, Content ohne JS vollständig sichtbar`;

  const raw = await aiCallStream(
    [{ role: "user", content: prompt }],
    max_tokens,
    onChunk,
    // Kein WEB_SEARCH_TOOL: Refinement ist gezielte Änderung, keine Recherche-Aufgabe
  );

  // Re-inject CSS before post-processing
  const withCss = raw.includes(CSS_SENTINEL) ? raw.replace(CSS_SENTINEL, PAGE_CSS) : raw;
  return postProcessHtml(withCss);
}
