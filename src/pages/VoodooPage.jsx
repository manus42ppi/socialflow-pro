import { useState, useRef } from "react";
import {
  Wand2, Plus, Trash2, ExternalLink, Copy, Check, Loader,
  BookOpen, Send as SendIcon, Image as ImageIcon, Globe,
  ChevronRight, X, RefreshCw, Sparkles, Link as LinkIcon,
  FileText, Zap, MessageSquare, Search, ArrowRight, SkipForward,
} from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { uid, aiCall, aiCallStream, parseJSON } from "../utils/store.js";
import { stockSearch, skGet } from "../components/StockSearch.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Pre-built CSS foundation ─────────────────────────────────────────────────
// The AI gets this as a starting point so it doesn't waste tokens re-writing
// CSS from scratch. By using these classes the AI only needs to write HTML
// body content (~1000-1500 tokens) instead of CSS+HTML (3000-4000 tokens).
// The AI customises only the :root colour variables to match the topic.
const PAGE_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
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

// ── Link guard — injected into every generated page ──────────────────────────
// Prevents the iframe from navigating away when the user clicks a non-anchor
// link. Anchor (#...) links scroll normally. External URLs open in a new tab.
const LINK_GUARD = `<script>
/* Spark link guard – keeps the preview inside the iframe */
document.addEventListener('click',function(e){
  var a=e.target.closest('a');if(!a)return;
  var h=a.getAttribute('href')||'';
  if(!h||h==='#'||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:'))return;
  e.preventDefault();
  if(/^https?:\\/\\//.test(h))window.open(h,'_blank','noopener');
},true);
</script>`;

// ── Shared HTML post-processing ───────────────────────────────────────────────
function postProcessHtml(raw) {
  let html = raw.trim();
  // Strip markdown code fences if the model wraps in them
  if (html.startsWith("```")) {
    html = html.replace(/^```[a-z]*\r?\n?/i, "").replace(/\r?\n?```\s*$/, "").trim();
  }
  // Inject link guard before </body> (or append if </body> is missing)
  if (html.includes("</body>")) {
    html = html.replace(/<\/body>/i, LINK_GUARD + "\n</body>");
  } else {
    html += "\n" + LINK_GUARD + "\n</body>";
  }
  // Always close </html>
  if (!html.includes("</html>")) html += "\n</html>";
  return html;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[äÄ]/g,"ae").replace(/[öÖ]/g,"oe").replace(/[üÜ]/g,"ue").replace(/ß/g,"ss")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "projekt";
}

function blocksToPlain(blocks) {
  if (!blocks?.length) return "";
  const lines = [];
  for (const b of blocks) {
    const t = (b.content||[]).map(c=>c.text||"").join("");
    if (t.trim()) lines.push(t.trim());
    if (b.children?.length) lines.push(blocksToPlain(b.children));
  }
  return lines.join(" ");
}

// Dynamic — uses the same origin as the running app so the link always
// points to a deployment that has functions/site/[slug].js available.
const getSiteUrl = (slug) => `${window.location.origin}/site/${slug}`;

// ── sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, color:T.gray400, letterSpacing:".08em",
      textTransform:"uppercase", padding:"12px 16px 4px", fontFamily:FONT }}>
      {children}
    </div>
  );
}

function SourceChip({ icon: Icon, label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20,
      border:`1.5px solid ${active ? C.accent : T.gray200}`,
      background: active ? C.accent+"14" : "#fff",
      color: active ? C.accent : T.gray600, fontFamily:FONT,
      fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .12s",
    }}>
      <Icon size={13} strokeWidth={IW}/>
      {label}
      {count > 0 && (
        <span style={{ background: active ? C.accent : T.gray200,
          color: active ? "#fff" : T.gray500,
          borderRadius:10, fontSize:10, fontWeight:700, padding:"1px 6px" }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function VoodooPage() {
  const {
    projects, saveProject, delProject, stories, posts, items,
    currentWorkspaceId, voodooProjectId, setVoodooProjectId,
  } = useApp();

  const wsProjects = projects.filter(p =>
    !currentWorkspaceId || p.workspaceId === currentWorkspaceId
  );

  const project = wsProjects.find(p => p.id === voodooProjectId) || null;

  // ── Inline create form (shown when no project is selected) ─────────────────
  const [newName, setNewName] = useState("");
  const newNameRef = useRef(null);

  function createProject() {
    if (!newName.trim()) return;
    const id = uid();
    const slug = slugify(newName) + "-" + id.slice(0,4);
    const p = {
      id, slug, name: newName.trim(), description: "",
      storyIds: [], postIds: [], mediaIds: [], externalUrls: [],
      generatedHtml: null, lastGeneratedAt: null, status: "draft",
      workspaceId: currentWorkspaceId || "ws-ppi-media",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    saveProject(p);
    setVoodooProjectId(id);
    setNewName("");
  }

  if (!project) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:0, fontFamily:FONT, background:T.gray50 }}>
        <style>{CSS}</style>
        {/* Brand mark */}
        <div style={{ width:56, height:56, borderRadius:16, marginBottom:20,
          background:`linear-gradient(135deg, ${C.accent}, #7C3AED)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 8px 24px rgba(124,58,237,.25)" }}>
          <Wand2 size={26} strokeWidth={1.7} color="#fff"/>
        </div>
        <h2 style={{ fontSize:20, fontWeight:800, color:C.text, margin:"0 0 6px" }}>
          Creation Voodoo
        </h2>
        <p style={{ fontSize:13, color:T.gray500, margin:"0 0 28px", textAlign:"center", lineHeight:1.6, maxWidth:340 }}>
          Erstelle Landing Pages aus deinen Storys, Posts und Medien.
          Wähle ein Projekt in der Sidebar oder starte ein neues.
        </p>

        {/* New project card */}
        <div style={{ background:"#fff", borderRadius:14, border:`1.5px solid ${T.gray200}`,
          padding:"24px 28px", width:340, boxShadow:T.shadowXs }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.gray500, marginBottom:10,
            textTransform:"uppercase", letterSpacing:".06em" }}>
            Neues Projekt
          </div>
          <input
            ref={newNameRef}
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter") createProject(); }}
            placeholder="Projektname eingeben…"
            style={{
              width:"100%", padding:"10px 12px", borderRadius:8, boxSizing:"border-box",
              border:`1.5px solid ${newName ? C.accent+"66" : T.gray200}`,
              fontSize:14, fontFamily:FONT, outline:"none", color:C.text,
              transition:"border-color .15s", marginBottom:10,
            }}
          />
          <button
            onClick={createProject}
            disabled={!newName.trim()}
            style={{
              width:"100%", padding:"10px 0", borderRadius:8, border:"none",
              background: newName.trim() ? `linear-gradient(135deg, ${C.accent}, #7C3AED)` : T.gray200,
              color: newName.trim() ? "#fff" : T.gray400,
              fontSize:13, fontWeight:700, cursor: newName.trim() ? "pointer" : "default",
              fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              transition:"all .2s",
            }}>
            <Wand2 size={14} strokeWidth={2}/> Projekt erstellen
          </button>
        </div>

        {wsProjects.length > 0 && (
          <p style={{ marginTop:16, fontSize:11, color:T.gray400 }}>
            oder wähle ein bestehendes Projekt in der linken Sidebar
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", fontFamily:FONT }}>
      <style>{CSS}</style>
      <ProjectDetail
        key={project.id}
        project={project}
        stories={stories}
        posts={posts}
        items={items}
        onSave={saveProject}
        onDelete={() => { delProject(project.id); setVoodooProjectId(null); }}
      />
    </div>
  );
}

// ── Project detail view ───────────────────────────────────────────────────────
function ProjectDetail({ project, stories, posts, items, onSave, onDelete }) {
  const { uploadItem, currentWorkspaceId } = useApp();

  const [form, setForm] = useState({ ...project });
  const [tab, setTab] = useState("content"); // "content" | "site"
  const [sourceFilter, setSourceFilter] = useState("all");
  const [urlInput, setUrlInput] = useState("");
  const [urlLabel, setUrlLabel] = useState("");

  // ── Generation phase machine ──────────────────────────────────────────────
  // "idle" → "preflight-loading" → "preflight" → "searching" → "streaming"
  const [genPhase, setGenPhase] = useState("idle");
  const [genChars, setGenChars] = useState(0);
  const [genPrompt, setGenPrompt] = useState("");
  const genPromptRef = useRef("");

  // Pre-flight clarifying questions
  const [preflightQ, setPreflightQ] = useState([]); // [{id, question, type, choices}]
  const [preflightA, setPreflightA] = useState({}); // {id: answer}

  // Spark refinement
  const [sparkInput, setSparkInput] = useState("");
  const sparkInputRef = useRef("");
  const [sparkLoading, setSparkLoading] = useState(false);
  const [sparkChars, setSparkChars] = useState(0);
  const [copied, setCopied] = useState(false);
  const [refineMsg, setRefineMsg] = useState("");

  const busy = genPhase !== "idle";

  const isDirty = JSON.stringify(form) !== JSON.stringify(project);

  function upd(patch) { setForm(f => ({ ...f, ...patch })); }

  function save() { onSave(form); }

  // ── Content pickers ───────────────────────────────────────────────────────
  function toggleStory(id) {
    const ids = form.storyIds||[];
    upd({ storyIds: ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id] });
  }
  function togglePost(id) {
    const ids = form.postIds||[];
    upd({ postIds: ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id] });
  }
  function toggleMedia(id) {
    const ids = form.mediaIds||[];
    upd({ mediaIds: ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id] });
  }
  function addUrl() {
    if (!urlInput.trim()) return;
    const entry = { id:uid(), url:urlInput.trim(), label:urlLabel.trim()||urlInput.trim() };
    upd({ externalUrls: [...(form.externalUrls||[]), entry] });
    setUrlInput(""); setUrlLabel("");
  }
  function removeUrl(id) { upd({ externalUrls: (form.externalUrls||[]).filter(u=>u.id!==id) }); }

  // ── Collect content for AI ─────────────────────────────────────────────────
  function buildContext() {
    const parts = [];
    (form.storyIds||[]).forEach(id => {
      const s = stories.find(x=>x.id===id);
      if (!s) return;
      const text = blocksToPlain(s.blocks||[]).slice(0,1500);
      parts.push(`## Story: "${s.title}"\n${s.subtitle||""}\n${text}`);
    });
    (form.postIds||[]).forEach(id => {
      const p = posts.find(x=>x.id===id);
      if (!p) return;
      parts.push(`## Post: "${p.title}"\n${(p.content||"").slice(0,600)}`);
    });
    (form.mediaIds||[]).forEach(id => {
      const m = items.find(x=>x.id===id);
      if (!m) return;
      parts.push(`## Bild: "${m.name}"\nURL: ${m.url}\nBeschreibung: ${m.description||m.altText||""}`);
    });
    (form.externalUrls||[]).forEach(u => {
      parts.push(`## Externe URL: "${u.label}"\n${u.url}`);
    });
    return parts.join("\n\n---\n\n") || "(Noch keine Inhalte hinzugefügt)";
  }

  // ── Step 1: Pre-flight — Spark asks clarifying questions ─────────────────
  async function startPreflight() {
    if (busy || totalSources === 0) return;
    setGenPhase("preflight-loading");
    setPreflightA({});
    const ctx = buildContext();
    try {
      const raw = await aiCall([{ role:"user", content:
        `Analysiere dieses Projekt für eine Landing Page und stelle genau 4 gezielte Rückfragen an den Auftraggeber.
Fokus: Zielgruppe, gewünschter Stil/Tonalität, wichtigste Conversion-Aktion, und ein Aspekt der in den Inhalten unklar ist.
Nutze type "choice" mit 3-4 Optionen wo sinnvoll, sonst type "text".

PROJEKT: ${form.name}
BESCHREIBUNG: ${form.description || "(keine)"}
INHALTE (Auszug): ${ctx.slice(0,600)}

NUR JSON, kein Markdown:
{"questions":[{"id":"q1","question":"...","type":"text","choices":null},{"id":"q2","question":"...","type":"choice","choices":["A","B","C"]}]}`
      }], 600);
      const data = parseJSON(raw);
      if (data?.questions?.length) {
        setPreflightQ(data.questions);
        setGenPhase("preflight");
      } else {
        // No valid questions → skip directly to generation
        setGenPhase("idle");
        generate({});
      }
    } catch {
      // Preflight error → generate without answers
      setGenPhase("idle");
      generate({});
    }
  }

  // ── Step 2: Generate landing page (called after preflight or directly) ────
  async function generate(answers = {}) {
    setGenPhase("searching");
    setGenChars(0);

    // ── Auto image search from media library or stock APIs ─────────────────
    // 1. Use already-selected media items from the project
    const selectedMedia = (form.mediaIds||[]).map(id => items.find(x=>x.id===id)).filter(Boolean);
    let autoImages = selectedMedia.map(m => ({ url: m.url, alt: m.description||m.altText||m.name }));

    // 2. If fewer than 2 project images, search stock APIs
    if (autoImages.length < 2) {
      const searchQuery = `${form.name} ${form.description||""}`.trim();
      const src = skGet("pexels") ? "pexels" : skGet("unsplash") ? "unsplash" : skGet("pixabay") ? "pixabay" : null;
      if (src && searchQuery) {
        try {
          const found = await stockSearch(src, searchQuery, { type:"image", orientation:"landscape" });
          const fresh = found.slice(0, 4 - autoImages.length);
          autoImages = [...autoImages, ...fresh.map(f => ({ url: f.url, alt: f.description||f.tags||form.name }))];
          // Save to media library so user can reuse them
          fresh.forEach(f => uploadItem({
            ...f,
            id: uid(),
            category: "Spark Auto",
            workspaceId: currentWorkspaceId || "ws-ppi-media",
            analyzing: false,
          }));
        } catch {}
      }
    }

    setGenPhase("streaming");

    const ctx = buildContext();
    const extraPrompt = genPromptRef.current.trim();

    // Preflight answers formatted as readable context
    const answersText = preflightQ
      .map(q => answers[q.id] ? `${q.question}\n→ ${answers[q.id]}` : null)
      .filter(Boolean).join("\n\n");

    // Images section for the prompt
    const imagesText = autoImages.length > 0
      ? `BILDER (genau diese verwenden – keine Platzhalter-URLs):\n${autoImages.map((img,i) =>
          `Bild ${i+1}: src="${img.url}" alt="${img.alt}"`).join("\n")}`
      : "BILDER: Keine Bilder verfügbar – nutze Farbflächen, Verläufe oder CSS-Grafiken als Eyecatcher.";

    const prompt =
`Du bist ein Elite-Webentwickler und Conversion-Designer mit 20 Jahren Erfahrung.
Du kennst die erfolgreichsten Landing Pages und weißt, was für das Thema "${form.name}" am besten konvertiert.

DESIGN-RECHERCHE:
Wende dein Fachwissen über die besten Websites in diesem Bereich an: passende Farbpsychologie, Typografie-Persönlichkeit, Layout-Patterns und Conversion-Taktiken für diese Zielgruppe und Branche.

LANDING PAGE ANATOMIE (ALLE Sections müssen vollständig vorhanden sein):
• NAV: sticky, Logo links, 3-4 interne #anchor-Links, CTA-Button rechts
• HERO: Starke emotionale H1 (Problem→Lösung), knapper Subtext, 2 CTAs
• BENEFITS: 3er-Grid, die 3 stärksten Vorteile mit kurzem Text
• CONTENT: Kerninhalt mit Bildunterstützung wenn Bilder vorhanden
• STATS: 3-4 starke Kennzahlen die Vertrauen aufbauen
• CTA-BLOCK: Letzter Conversion-Push mit prominentem Button
• FOOTER: Gruppierte Links + Copyright

${answersText ? `AUFTRAGGEBER-VORGABEN:\n${answersText}\n` : ""}
${imagesText}

VERFÜGBARE CSS-KLASSEN (bereits definiert – kein weiteres CSS schreiben):
Layout: .w .g .g2 .g3 .g4 .img-r
Nav: nav .ni .logo .nl .nav-cta
Hero: .hero .btns
Buttons: .btn .btn-p .btn-o .btn-w
Content: section .alt .lbl h2 h3 .lead
Cards: .card .ico .stat .stat-l .tag
CTA: .cta-b
Footer: footer .footer-g

PROJEKT: ${form.name}
BESCHREIBUNG: ${form.description || "(keine)"}
INHALTE: ${ctx}
${extraPrompt ? `BESONDERE WÜNSCHE: ${extraPrompt}` : ""}

AUSGABE-FORMAT (EXAKT einhalten):
1. <!DOCTYPE html>
2. <head>: charset, viewport, title, <style>:root{--p:#XXX;--pd:#XXX;--pl:#XXX}</style> (nur Farbvariablen passend zum Thema)
3. <style>${PAGE_CSS}</style>
4. <body>: vollständiges semantisches HTML mit den CSS-Klassen
5. </body></html>

QUALITÄTS-REGELN (PFLICHT – keine Ausnahmen):
- KEIN zusätzliches CSS außer :root Farbvariablen
- KEIN opacity:0 oder display:none auf sichtbarem Content – alles sofort sichtbar
- KEINE Emoji-Icons als Design-Element. Nur monochrome SVG (stroke="currentColor") oder reine Textsymbole
- Navigation: AUSSCHLIESSLICH #anchor-Links – niemals href="/" oder externe URLs in der Nav
- JS nur wenn unbedingt nötig, max 10 Zeilen, Content OHNE JS vollständig sichtbar
- KEINE Platzhalter-Texte – nur echte Inhalte aus den Projektdaten
- Antworte NUR mit HTML (<!DOCTYPE html>…</html>) – KEIN Markdown`;

    try {
      const raw = await aiCallStream(
        [{ role:"user", content:prompt }],
        4000,
        (_chunk, full) => setGenChars(full.length),
      );

      const html = postProcessHtml(raw);
      if (!html.startsWith("<!")) {
        console.error("VoodooPage generate: unexpected response:", html.slice(0, 200));
        throw new Error("Die KI hat keine gültige HTML-Seite zurückgegeben. Bitte erneut versuchen.");
      }

      const res = await fetch("/deploy-site", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ slug:form.slug, html }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) throw new Error(data.error || "Deploy fehlgeschlagen");

      const updated = { ...form, generatedHtml: html, lastGeneratedAt: new Date().toISOString(), status:"live" };
      setForm(updated);
      onSave(updated);
      setTab("site");
    } catch(e) {
      console.error("VoodooPage generate error:", e);
      alert("Generierung fehlgeschlagen:\n" + e.message);
    }
    setGenPhase("idle");
    setGenChars(0);
  }

  // ── Spark page refinement ──────────────────────────────────────────────────
  async function sparkRefine() {
    const p = sparkInputRef.current.trim();
    if (!p || sparkLoading || !form.generatedHtml) return;
    setSparkInput(""); sparkInputRef.current = "";
    setSparkLoading(true);
    setSparkChars(0);
    setRefineMsg("");
    try {
      // Strip PAGE_CSS before sending to AI — it's ~3 KB that the AI would have
      // to read AND reproduce, eating ~2000 tokens in both directions.
      // We replace it with a sentinel the AI keeps verbatim, then inject it back.
      const SENTINEL = "/* PAGE_CSS_PLACEHOLDER */";
      const compactHtml = form.generatedHtml.includes(PAGE_CSS)
        ? form.generatedHtml.replace(PAGE_CSS, SENTINEL)
        : form.generatedHtml; // fallback: page was generated without our CSS

      const prompt = `Du bist ein Elite-Webentwickler und Conversion-Designer mit 20 Jahren Erfahrung.

LANDING PAGE ANATOMIE (ALLE Sections müssen nach der Änderung vollständig vorhanden bleiben):
• NAV → HERO → BENEFITS → CONTENT → STATS → CTA-BLOCK → FOOTER

BESTEHENDE SEITE:
${compactHtml}

ANWEISUNG: ${p}

PFLICHT-REGELN (gelten IMMER, egal was die Anweisung sagt):
- Antworte NUR mit vollständigem, aktualisierten HTML — KEIN Markdown
- Behalte "${SENTINEL}" EXAKT so im <style>-Tag — das CSS wird automatisch eingefügt
- Ändere NUR was die Anweisung verlangt — alle anderen Sections vollständig erhalten
- KEINE Emoji-Icons als Design-Element — nur monochrome SVG oder reine Textsymbole
- Navigation: AUSSCHLIESSLICH #anchor-Links — keine externen URLs oder href="/"
- KEIN opacity:0, display:none auf sichtbarem Content — alles sofort sichtbar
- KEIN zusätzliches CSS außer :root Farbvariablen
- JS nur wenn unbedingt nötig, Content ohne JS vollständig sichtbar
- Alle 7 Sections müssen vorhanden sein`;

      const raw = await aiCallStream(
        [{ role:"user", content: prompt }],
        4000,
        (_c, full) => setSparkChars(full.length),
      );

      // Re-inject full CSS, strip markdown, inject link guard, close tags
      let html = postProcessHtml(raw.includes(SENTINEL) ? raw.replace(SENTINEL, PAGE_CSS) : raw);
      if (!html.startsWith("<!")) throw new Error("Ungültige HTML-Antwort");

      await fetch("/deploy-site", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ slug:form.slug, html }),
      });

      const updated = { ...form, generatedHtml: html, lastGeneratedAt: new Date().toISOString() };
      setForm(updated);
      onSave(updated);
      setRefineMsg("✓ Seite aktualisiert");
      setTimeout(() => setRefineMsg(""), 3000);
    } catch(e) {
      console.error("VoodooPage sparkRefine error:", e);
      setRefineMsg("⚠️ Fehler – bitte erneut versuchen");
    }
    setSparkChars(0);
    setSparkLoading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(getSiteUrl(form.slug)).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalSources = (form.storyIds||[]).length+(form.postIds||[]).length+(form.mediaIds||[]).length+(form.externalUrls||[]).length;

  // Stories/posts/media available to pick (not filtered by workspace here so user can pick any)
  const availStories = stories.filter(s => !s.deleted);
  const availPosts   = posts.filter(p => !p.deleted);
  const availMedia   = items.filter(m => m.type==="image"||m.type==="video");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Header bar ───────────────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"center", gap:12, padding:"10px 20px",
        borderBottom:`1px solid ${T.gray200}`, background:"#fff", flexShrink:0,
      }}>
        <Wand2 size={16} strokeWidth={IW} color={C.accent}/>
        {/* Editable name */}
        <input
          value={form.name}
          onChange={e => upd({ name:e.target.value })}
          style={{
            fontSize:15, fontWeight:700, color:C.text, fontFamily:FONT,
            border:"none", outline:"none", background:"transparent", flex:1, minWidth:0,
          }}
        />
        {/* Slug */}
        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:T.gray400 }}>
          <LinkIcon size={11} strokeWidth={2}/>
          <code style={{ fontSize:11, color:T.gray500 }}>/site/{form.slug}</code>
        </div>

        {/* Status badge */}
        <span style={{
          fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:6,
          background: form.status==="live" ? "#DCFCE7" : T.gray100,
          color: form.status==="live" ? "#15803D" : T.gray500,
        }}>{form.status==="live" ? "● Live" : "Entwurf"}</span>

        {isDirty && (
          <button onClick={save} style={{
            padding:"6px 14px", borderRadius:7, border:"none",
            background:C.accent, color:"#fff", fontSize:12, fontWeight:700,
            cursor:"pointer", fontFamily:FONT,
          }}>Speichern</button>
        )}
        <button onClick={onDelete} style={{
          background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:4,
        }} title="Projekt löschen">
          <Trash2 size={14} strokeWidth={IW}/>
        </button>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div style={{ display:"flex", borderBottom:`1px solid ${T.gray200}`, background:"#fff", flexShrink:0 }}>
        {[
          { id:"content", label:"Inhalte", icon:FileText },
          { id:"site",    label:"Live-Seite", icon:Zap, badge: form.status==="live" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:"flex", alignItems:"center", gap:6, padding:"10px 18px",
            border:"none", borderBottom:`2px solid ${tab===t.id ? C.accent : "transparent"}`,
            background:"none", cursor:"pointer", fontFamily:FONT,
            fontSize:12, fontWeight:600, color: tab===t.id ? C.accent : T.gray500,
            transition:"all .12s",
          }}>
            <t.icon size={13} strokeWidth={IW}/>
            {t.label}
            {t.badge && <span style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E", display:"inline-block" }}/>}
          </button>
        ))}
      </div>

      {/* ── CONTENT TAB ──────────────────────────────────────────────── */}
      {tab === "content" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* Content main area */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

            {/* Description */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:T.gray500, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Beschreibung</label>
              <textarea
                value={form.description||""}
                onChange={e => upd({description:e.target.value})}
                placeholder="Worum geht es bei diesem Projekt?"
                rows={2}
                style={{ width:"100%", resize:"vertical", padding:"8px 10px", borderRadius:8, border:`1px solid ${T.gray200}`, fontSize:13, fontFamily:FONT, outline:"none", color:C.text, boxSizing:"border-box" }}
              />
            </div>

            {/* Source filters */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {[
                { id:"all",    label:"Alle",       icon:Wand2 },
                { id:"story",  label:"Storys",     icon:BookOpen },
                { id:"post",   label:"Posts",      icon:SendIcon },
                { id:"media",  label:"Medien",     icon:ImageIcon },
                { id:"url",    label:"URLs",        icon:Globe },
              ].map(s => (
                <SourceChip key={s.id} icon={s.icon} label={s.label}
                  active={sourceFilter===s.id}
                  count={s.id==="story"?(form.storyIds||[]).length:s.id==="post"?(form.postIds||[]).length:s.id==="media"?(form.mediaIds||[]).length:s.id==="url"?(form.externalUrls||[]).length:0}
                  onClick={() => setSourceFilter(s.id)}
                />
              ))}
            </div>

            {/* STORIES */}
            {(sourceFilter==="all"||sourceFilter==="story") && (
              <ContentSection
                title="Storys" icon={BookOpen}
                count={(form.storyIds||[]).length}
                total={availStories.length}
              >
                {availStories.length === 0 ? (
                  <EmptyHint>Noch keine Storys vorhanden.</EmptyHint>
                ) : availStories.map(s => (
                  <ContentRow
                    key={s.id}
                    checked={(form.storyIds||[]).includes(s.id)}
                    onChange={() => toggleStory(s.id)}
                    label={s.title||"Ohne Titel"}
                    sub={`${(s.blocks||[]).length} Blöcke · ${s.status}`}
                    color="#6941C6"
                  />
                ))}
              </ContentSection>
            )}

            {/* POSTS */}
            {(sourceFilter==="all"||sourceFilter==="post") && (
              <ContentSection
                title="Publisher-Posts" icon={SendIcon}
                count={(form.postIds||[]).length}
                total={availPosts.length}
              >
                {availPosts.length === 0 ? (
                  <EmptyHint>Noch keine Posts vorhanden.</EmptyHint>
                ) : availPosts.map(p => (
                  <ContentRow
                    key={p.id}
                    checked={(form.postIds||[]).includes(p.id)}
                    onChange={() => togglePost(p.id)}
                    label={p.title||"Ohne Titel"}
                    sub={`${p.channels?.join(", ")||""} · ${p.status}`}
                    color="#0077B5"
                  />
                ))}
              </ContentSection>
            )}

            {/* MEDIA */}
            {(sourceFilter==="all"||sourceFilter==="media") && (
              <ContentSection
                title="Medien" icon={ImageIcon}
                count={(form.mediaIds||[]).length}
                total={availMedia.length}
              >
                {availMedia.length === 0 ? (
                  <EmptyHint>Noch keine Medien vorhanden.</EmptyHint>
                ) : availMedia.map(m => (
                  <ContentRow
                    key={m.id}
                    checked={(form.mediaIds||[]).includes(m.id)}
                    onChange={() => toggleMedia(m.id)}
                    label={m.name}
                    sub={`${m.type} · ${m.width||0}×${m.height||0}`}
                    color="#E1306C"
                    thumb={m.url}
                  />
                ))}
              </ContentSection>
            )}

            {/* EXTERNAL URLS */}
            {(sourceFilter==="all"||sourceFilter==="url") && (
              <ContentSection title="Externe URLs" icon={Globe} count={(form.externalUrls||[]).length}>
                <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                  <input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if(e.key==="Enter") addUrl(); }}
                    placeholder="https://…"
                    style={{ flex:2, padding:"6px 9px", borderRadius:7, border:`1px solid ${T.gray200}`, fontSize:12, fontFamily:FONT, outline:"none" }}
                  />
                  <input
                    value={urlLabel}
                    onChange={e => setUrlLabel(e.target.value)}
                    onKeyDown={e => { if(e.key==="Enter") addUrl(); }}
                    placeholder="Bezeichnung"
                    style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${T.gray200}`, fontSize:12, fontFamily:FONT, outline:"none" }}
                  />
                  <button onClick={addUrl} style={{
                    padding:"6px 12px", borderRadius:7, border:"none",
                    background:C.accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
                  }}><Plus size={12} strokeWidth={2.5}/></button>
                </div>
                {(form.externalUrls||[]).map(u => (
                  <div key={u.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", background:T.gray50, borderRadius:7, marginBottom:4 }}>
                    <Globe size={12} strokeWidth={2} color={T.gray400}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.label}</div>
                      <div style={{ fontSize:10, color:T.gray400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.url}</div>
                    </div>
                    <button onClick={() => removeUrl(u.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:2 }}>
                      <X size={11} strokeWidth={2.5}/>
                    </button>
                  </div>
                ))}
                {(form.externalUrls||[]).length===0 && <EmptyHint>Füge externe Links als Contentquelle hinzu.</EmptyHint>}
              </ContentSection>
            )}
          </div>

          {/* ── Right: Spark panel (multi-phase) ────────────────────── */}
          <div style={{
            width:300, flexShrink:0, borderLeft:`1px solid ${T.gray200}`,
            background:"#fff", display:"flex", flexDirection:"column", overflow:"hidden",
          }}>
            <div style={{ overflowY:"auto", flex:1, display:"flex", flexDirection:"column" }}>

              {/* ── PHASE: idle ── */}
              {genPhase === "idle" && (
                <div style={{ padding:"16px", borderBottom:`1px solid ${T.gray100}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                    <Sparkles size={14} strokeWidth={IW} color={C.accent}/>
                    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Spark generiert</span>
                  </div>
                  <div style={{ fontSize:12, color:T.gray500, marginBottom:12, lineHeight:1.5 }}>
                    {totalSources===0
                      ? "Wähle links Inhalte aus, dann stellt Spark gezielte Rückfragen und erstellt deine Landing Page."
                      : `${totalSources} Quelle${totalSources!==1?"n":""} ausgewählt. Spark stellt dir kurze Rückfragen und generiert dann die optimale Seite.`}
                  </div>
                  <textarea
                    value={genPrompt}
                    onChange={e => { setGenPrompt(e.target.value); genPromptRef.current=e.target.value; }}
                    placeholder="Besondere Wünsche für die Seite (optional)…"
                    rows={2}
                    style={{
                      width:"100%", resize:"none", padding:"8px 10px", borderRadius:8,
                      border:`1.5px solid ${T.gray200}`, fontSize:12, fontFamily:FONT,
                      outline:"none", color:C.text, boxSizing:"border-box", marginBottom:10,
                    }}
                  />
                  <button
                    onClick={startPreflight}
                    disabled={totalSources===0}
                    style={{
                      width:"100%", padding:"10px 0", borderRadius:8, border:"none",
                      background: totalSources===0 ? T.gray200 : `linear-gradient(135deg, ${C.accent}, #7C3AED)`,
                      color: totalSources===0 ? T.gray400 : "#fff",
                      fontSize:13, fontWeight:700, cursor: totalSources===0 ? "default" : "pointer",
                      fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      transition:"all .2s",
                    }}>
                    <MessageSquare size={14} strokeWidth={2}/>
                    Spark starten
                  </button>
                  {form.status==="live" && (
                    <button onClick={() => setTab("site")} style={{
                      width:"100%", marginTop:8, padding:"8px 0", borderRadius:8,
                      border:`1px solid ${T.gray200}`, background:"#fff",
                      color:T.gray600, fontSize:12, fontWeight:600, cursor:"pointer",
                      fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    }}>
                      <Zap size={12} strokeWidth={2}/> Live-Seite ansehen
                    </button>
                  )}
                </div>
              )}

              {/* ── PHASE: preflight-loading ── */}
              {genPhase === "preflight-loading" && (
                <div style={{ padding:"24px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                  <Loader size={22} strokeWidth={1.5} color={C.accent} style={{animation:"spin .8s linear infinite"}}/>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>Spark analysiert dein Projekt…</div>
                    <div style={{ fontSize:11, color:T.gray400 }}>Gleich kommen ein paar kurze Fragen</div>
                  </div>
                </div>
              )}

              {/* ── PHASE: preflight — Q&A ── */}
              {genPhase === "preflight" && (
                <div style={{ padding:"16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <MessageSquare size={14} strokeWidth={IW} color={C.accent}/>
                    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Spark fragt nach</span>
                  </div>
                  <p style={{ fontSize:11, color:T.gray500, margin:"0 0 14px", lineHeight:1.5 }}>
                    Beantworte kurz diese Fragen für ein optimales Ergebnis.
                  </p>
                  {preflightQ.map((q, qi) => (
                    <div key={q.id} style={{ marginBottom:14 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:6, lineHeight:1.4 }}>
                        {qi+1}. {q.question}
                      </div>
                      {q.type === "choice" ? (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                          {(q.choices||[]).map(c => {
                            const sel = preflightA[q.id] === c;
                            return (
                              <button key={c} onClick={() => setPreflightA(prev => ({...prev, [q.id]: sel ? undefined : c}))} style={{
                                padding:"5px 10px", borderRadius:8, fontSize:11, fontWeight:600,
                                border:`1.5px solid ${sel ? C.accent : T.gray200}`,
                                background: sel ? C.accent+"14" : "#fff",
                                color: sel ? C.accent : T.gray600,
                                cursor:"pointer", fontFamily:FONT, transition:"all .12s",
                              }}>{c}</button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          value={preflightA[q.id]||""}
                          onChange={e => setPreflightA(prev => ({...prev, [q.id]: e.target.value}))}
                          placeholder="Antwort…"
                          style={{
                            width:"100%", padding:"6px 9px", borderRadius:7, boxSizing:"border-box",
                            border:`1.5px solid ${preflightA[q.id] ? C.accent+"55" : T.gray200}`,
                            fontSize:12, fontFamily:FONT, outline:"none", color:C.text,
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:6, marginTop:4 }}>
                    <button
                      onClick={() => generate(preflightA)}
                      style={{
                        flex:1, padding:"10px 0", borderRadius:8, border:"none",
                        background:`linear-gradient(135deg, ${C.accent}, #7C3AED)`,
                        color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
                        fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                      }}>
                      <ArrowRight size={14} strokeWidth={2.5}/> Generieren
                    </button>
                    <button
                      onClick={() => { generate({}); }}
                      title="Überspringen und ohne Antworten generieren"
                      style={{
                        padding:"10px 12px", borderRadius:8,
                        border:`1px solid ${T.gray200}`, background:"#fff",
                        color:T.gray500, fontSize:11, cursor:"pointer", fontFamily:FONT,
                      }}>
                      <SkipForward size={12} strokeWidth={2}/>
                    </button>
                  </div>
                </div>
              )}

              {/* ── PHASE: searching ── */}
              {genPhase === "searching" && (
                <div style={{ padding:"24px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                  <Search size={22} strokeWidth={1.5} color={C.accent} style={{animation:"pulse 1.4s ease-in-out infinite"}}/>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>Bilder werden gesucht…</div>
                    <div style={{ fontSize:11, color:T.gray400 }}>Spark recherchiert passende Fotos</div>
                  </div>
                </div>
              )}

              {/* ── PHASE: streaming ── */}
              {genPhase === "streaming" && (
                <div style={{ padding:"24px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                  <Loader size={22} strokeWidth={1.5} color={C.accent} style={{animation:"spin .8s linear infinite"}}/>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>
                      {genChars > 0 ? `${(genChars/1000).toFixed(1)} k Zeichen…` : "Spark schreibt…"}
                    </div>
                    <div style={{ fontSize:11, color:T.gray400 }}>Landing Page wird generiert</div>
                  </div>
                  {genChars > 0 && (
                    <div style={{ width:"100%", height:4, background:T.gray100, borderRadius:2, overflow:"hidden" }}>
                      <div style={{
                        height:"100%", borderRadius:2, transition:"width .3s",
                        background:`linear-gradient(90deg, ${C.accent}, #7C3AED)`,
                        width:`${Math.min(100, (genChars/4000)*100)}%`,
                      }}/>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Slug editor — always visible */}
            {genPhase === "idle" && (
              <div style={{ padding:"12px 16px", borderTop:`1px solid ${T.gray100}` }}>
                <label style={{ fontSize:10, fontWeight:700, color:T.gray400, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:4 }}>URL-Slug</label>
                <input
                  value={form.slug}
                  onChange={e => upd({ slug: slugify(e.target.value) })}
                  style={{ width:"100%", padding:"6px 9px", borderRadius:7, border:`1px solid ${T.gray200}`, fontSize:12, fontFamily:"monospace", outline:"none", boxSizing:"border-box" }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SITE TAB ─────────────────────────────────────────────────── */}
      {tab === "site" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* iframe preview */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:T.gray100 }}>
            {form.status==="live" ? (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", background:"#fff", borderBottom:`1px solid ${T.gray200}`, flexShrink:0 }}>
                  <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:T.gray50, border:`1px solid ${T.gray200}`, borderRadius:8, padding:"5px 12px" }}>
                    <Globe size={12} strokeWidth={2} color={T.gray400}/>
                    <span style={{ fontSize:12, color:T.gray500, fontFamily:"monospace" }}>{getSiteUrl(form.slug)}</span>
                  </div>
                  <button onClick={copyLink} style={{
                    display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:7,
                    border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray600,
                    fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT,
                  }}>
                    {copied ? <Check size={12} strokeWidth={3} color="#10B981"/> : <Copy size={12} strokeWidth={2}/>}
                    {copied ? "Kopiert!" : "Link kopieren"}
                  </button>
                  <a href={getSiteUrl(form.slug)} target="_blank" rel="noopener noreferrer" style={{
                    display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:7,
                    border:"none", background:C.accent, color:"#fff",
                    fontSize:12, fontWeight:700, textDecoration:"none", fontFamily:FONT,
                  }}>
                    <ExternalLink size={12} strokeWidth={2}/> Öffnen
                  </a>
                  <button onClick={() => setForm(f => ({ ...f, _previewKey: Date.now() }))} title="Vorschau neu laden" style={{ background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:4 }}>
                    <RefreshCw size={14} strokeWidth={2}/>
                  </button>
                </div>
                {/* srcDoc renders HTML directly — no server round-trip needed.
                    No sandbox: the generated HTML is our own content and needs
                    full JS access to render interactive elements correctly. */}
                <iframe
                  key={form._previewKey || form.lastGeneratedAt}
                  srcDoc={form.generatedHtml || ""}
                  style={{ flex:1, border:"none", width:"100%" }}
                  title="Landing Page Vorschau"
                />
              </>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:T.gray400 }}>
                <Wand2 size={48} strokeWidth={1} color={T.gray300}/>
                <p style={{ fontSize:13, textAlign:"center", margin:0 }}>
                  Noch keine Seite generiert.<br/>
                  Gehe zu "Inhalte" und klicke auf "Seite generieren".
                </p>
                <button onClick={() => setTab("content")} style={{
                  padding:"8px 18px", borderRadius:8, border:`1px solid ${T.gray200}`,
                  background:"#fff", color:T.gray600, fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:FONT,
                }}>Zu Inhalte wechseln</button>
              </div>
            )}
          </div>

          {/* Spark refinement panel */}
          {form.status==="live" && (
            <div style={{
              width:300, flexShrink:0, borderLeft:`1px solid ${T.gray200}`,
              background:"#fff", display:"flex", flexDirection:"column", overflow:"hidden",
            }}>
              <div style={{ padding:"16px", borderBottom:`1px solid ${T.gray100}`, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                  <Sparkles size={14} strokeWidth={IW} color={C.accent}/>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Spark verfeinert</span>
                </div>
                <p style={{ fontSize:12, color:T.gray500, margin:"0 0 12px", lineHeight:1.5 }}>
                  Gib Spark eine Anweisung um die Live-Seite zu verbessern.
                  Die Änderungen werden sofort deployed.
                </p>

                {/* Quick actions */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                  {[
                    "Mache den Hero-Bereich auffälliger",
                    "Füge einen FAQ-Bereich hinzu",
                    "Verbessere den CTA-Button",
                    "Mache das Design dunkler",
                    "Optimiere für Mobile",
                    "Füge mehr Bilder ein",
                  ].map(a => (
                    <button key={a}
                      onClick={() => { setSparkInput(a); sparkInputRef.current=a; }}
                      style={{
                        padding:"4px 10px", borderRadius:12, fontSize:11, fontWeight:600,
                        border:`1px solid ${T.gray200}`, background:T.gray50, color:T.gray600,
                        cursor:"pointer", fontFamily:FONT, transition:"all .12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background=C.accent+"14"; e.currentTarget.style.borderColor=C.accent+"66"; e.currentTarget.style.color=C.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.background=T.gray50; e.currentTarget.style.borderColor=T.gray200; e.currentTarget.style.color=T.gray600; }}
                    >{a}</button>
                  ))}
                </div>

                {sparkLoading && sparkChars > 0 && (
                  <div style={{ fontSize:11, color:C.accent, marginBottom:6, fontWeight:600 }}>
                    ⟳ {(sparkChars/1000).toFixed(1)} k Zeichen…
                  </div>
                )}
                {refineMsg && (
                  <div style={{ fontSize:12, color: refineMsg.startsWith("✓") ? "#15803D" : "#C4511E",
                    background: refineMsg.startsWith("✓") ? "#DCFCE7" : "#FFF7ED",
                    border: `1px solid ${refineMsg.startsWith("✓") ? "#86EFAC" : "#FED7AA"}`,
                    borderRadius:7, padding:"5px 10px", marginBottom:8 }}>
                    {refineMsg}
                  </div>
                )}

                <div style={{ display:"flex", gap:6, alignItems:"flex-end" }}>
                  <textarea
                    value={sparkInput}
                    onChange={e => { setSparkInput(e.target.value); sparkInputRef.current=e.target.value; }}
                    onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sparkRefine(); }}}
                    placeholder="Anweisung für Spark…"
                    rows={3}
                    style={{
                      flex:1, resize:"none", padding:"8px 10px", borderRadius:8,
                      border:`1.5px solid ${sparkInput ? C.accent+"55" : T.gray200}`,
                      fontSize:12, fontFamily:FONT, outline:"none", color:C.text,
                    }}
                  />
                  <button
                    onClick={sparkRefine}
                    disabled={!sparkInput.trim()||sparkLoading}
                    style={{
                      width:36, height:36, borderRadius:8, border:"none", flexShrink:0,
                      background: sparkInput.trim()&&!sparkLoading ? C.accent : T.gray200,
                      color:"#fff", cursor: sparkInput.trim()&&!sparkLoading ? "pointer" : "default",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}
                  >
                    {sparkLoading
                      ? <Loader size={14} strokeWidth={2} style={{animation:"spin .8s linear infinite"}}/>
                      : <Wand2 size={14} strokeWidth={2.5}/>}
                  </button>
                </div>
              </div>

              {/* Last generated info */}
              {form.lastGeneratedAt && (
                <div style={{ padding:"12px 16px", fontSize:11, color:T.gray400 }}>
                  Zuletzt generiert: {new Date(form.lastGeneratedAt).toLocaleString("de-DE")}
                </div>
              )}

              <div style={{ flex:1, padding:"0 16px 16px" }}>
                <p style={{ fontSize:11, color:T.gray400, lineHeight:1.5 }}>
                  Tipps:<br/>
                  • "Mach den Header-Bereich ansprechender"<br/>
                  • "Ändere die Primärfarbe zu Blau"<br/>
                  • "Füge Testimonials hinzu"<br/>
                  • "Mache den Footer vollständiger"
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────────────────────
function ContentSection({ title, icon:Icon, count, total, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom:16, background:"#fff", borderRadius:10, border:`1px solid ${T.gray200}`, overflow:"hidden" }}>
      <button onClick={() => setOpen(o=>!o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
        border:"none", background:T.gray50, cursor:"pointer", fontFamily:FONT,
      }}>
        <Icon size={13} strokeWidth={IW} color={T.gray500}/>
        <span style={{ flex:1, fontSize:12, fontWeight:700, color:T.gray600, textAlign:"left" }}>{title}</span>
        {count > 0 && (
          <span style={{ fontSize:10, fontWeight:700, background:C.accent+"22", color:C.accent, borderRadius:8, padding:"1px 7px" }}>
            {count}{total!=null?` / ${total}`:""}
          </span>
        )}
        <ChevronRight size={12} strokeWidth={2} color={T.gray400} style={{ transform: open?"rotate(90deg)":"rotate(0deg)", transition:"transform .15s" }}/>
      </button>
      {open && (
        <div style={{ padding:"8px 10px", display:"flex", flexDirection:"column", gap:3 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ContentRow({ checked, onChange, label, sub, color, thumb }) {
  return (
    <label style={{
      display:"flex", alignItems:"center", gap:10, padding:"6px 8px",
      borderRadius:7, cursor:"pointer", transition:"background .1s",
      background: checked ? color+"0D" : "transparent",
    }}
      onMouseEnter={e => { if(!checked) e.currentTarget.style.background=T.gray50; }}
      onMouseLeave={e => { if(!checked) e.currentTarget.style.background="transparent"; }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor:color, width:14, height:14, flexShrink:0 }}/>
      {thumb && (
        <img src={thumb} alt="" style={{ width:32, height:24, objectFit:"cover", borderRadius:4, flexShrink:0 }}/>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:T.gray400 }}>{sub}</div>}
      </div>
      {checked && <Check size={12} strokeWidth={3} color={color}/>}
    </label>
  );
}

function EmptyHint({ children }) {
  return <p style={{ fontSize:11, color:T.gray400, padding:"6px 8px", margin:0 }}>{children}</p>;
}
