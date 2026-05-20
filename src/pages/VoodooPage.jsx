import { useState, useRef, useEffect } from "react";
import {
  Wand2, Plus, Trash2, ExternalLink, Copy, Check, Loader,
  BookOpen, Send as SendIcon, Image as ImageIcon, Globe,
  ChevronRight, X, RefreshCw, Sparkles, Link as LinkIcon,
  FileText, Zap, MessageSquare, Search, ArrowRight, SkipForward,
  Package, Calendar, Mail, ShoppingCart, Briefcase, Monitor,
  GraduationCap, MapPin, BarChart2, Play,
} from "lucide-react";

// Monochrome Lucide icon per template-id (no colored emojis)
const TMPL_ICONS = {
  editorial:  FileText,
  event:      Calendar,
  lead:       Mail,
  product:    ShoppingCart,
  service:    Briefcase,
  saas:       Monitor,
  kurs:       GraduationCap,
  local:      MapPin,
  casestudy:  BarChart2,
  video:      Play,
  freeform:   Wand2,
};
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { uid } from "../utils/store.js";
import {
  slugify, buildContext, runPreflight, searchImages, searchMediaLibrary,
  analyzeUploadedImage,
  generatePage, refinePage, validatePage, postProcessHtml,
  buildRepairInstruction, generateMissingSections,
} from "../utils/spark.js";
import { useApp } from "../context/AppContext.jsx";
import { TEMPLATES, generateContent } from "../utils/spark-templates.js";

// Dynamic — uses the same origin as the running app so the link always
// points to a deployment that has functions/site/[slug].js available.
const getSiteUrl = (slug) => `${window.location.origin}/site/${slug}`;

// ── Post-generation HTML repair ───────────────────────────────────────────────
// Uses the browser's DOMParser to fix structural problems programmatically.
// Zero AI tokens — pure DOM manipulation.
//
// Repairs performed (in order):
//   1. Script-leak: text nodes containing JS code (e.g. guard reproduced as text)
//      are removed from the DOM.
//   2. Broken nav anchors: href="#xyz" with no matching id="xyz".
//      Strategy A — content matching: find a section whose heading text contains
//        the target keyword (e.g. "#neuron" → section with "Neuron" in h2).
//      Strategy B — fallback: assign the id to the next section without one.
//   3. Re-runs postProcessHtml (idempotent) for fresh LINK_GUARD + closing tags.
//
// Falls back to postProcessHtml(html) on any parse error (safe, never throws).
function repairPage(html) {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // 1. Remove script-leak text nodes (JS code rendered as visible text)
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    const leaks = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent || "";
      if (t.includes("document.addEventListener") || t.includes("Spark link guard")) {
        leaks.push(node);
      }
    }
    leaks.forEach(n => n.parentNode?.removeChild(n));

    // 1b. Extract the <!-- NAV_IDS: hero,vorteile,... --> manifest written by the model.
    // When present, it gives us the authoritative ordered list of intended section IDs,
    // making anchor repair positional (Strategy 0) instead of relying on fuzzy text matching.
    const manifestMatch = html.match(/<!--\s*NAV_IDS:\s*([^-\n>]+)/i);
    const declaredIds = manifestMatch
      ? manifestMatch[1].split(",").map(s => s.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "")).filter(Boolean)
      : null;

    // 2. Fix broken nav anchors
    const anchors  = [...doc.querySelectorAll('a[href^="#"]')];
    const sections = [...doc.querySelectorAll("section")];

    anchors.forEach(a => {
      const id = a.getAttribute("href").slice(1);
      if (!id || doc.getElementById(id)) return; // already valid

      // Strategy 0 (manifest-based): look up the declared position of this ID,
      // then assign it to the section at the same index that still lacks an id.
      if (declaredIds) {
        const pos = declaredIds.indexOf(id.toLowerCase());
        if (pos >= 0) {
          // Try the section at the same ordinal position first
          const byPos = sections[pos];
          if (byPos && !byPos.id) { byPos.id = id; return; }
          // Fall back to any section without an id
          const anyEmpty = sections.find(s => !s.id);
          if (anyEmpty) { anyEmpty.id = id; return; }
        }
      }

      // Strategy A: find a section whose heading text fuzzy-matches the id
      const keyword = id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
      const match = sections.find(s => {
        const heading = (s.querySelector("h1,h2,h3")?.textContent || "").toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        return keyword && heading.includes(keyword);
      });
      if (match) { match.id = id; return; }

      // Strategy B: assign to next section without an id
      const empty = sections.find(s => !s.id);
      if (empty) empty.id = id;
    });

    const serialized = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    return postProcessHtml(serialized);
  } catch {
    return postProcessHtml(html);
  }
}

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
    projects, saveProject, delProject, stories, posts, items, products,
    currentWorkspaceId, voodooProjectId, setVoodooProjectId,
  } = useApp();

  // Workspace-filtered list for the project chooser / create flow
  const wsProjects = projects.filter(p =>
    !currentWorkspaceId || p.workspaceId === currentWorkspaceId
  );

  // The active project is looked up across ALL projects — not just the current
  // workspace — so navigating to a different Mandant while Spark is running does
  // NOT unmount ProjectDetail and lose the in-progress generation or form state.
  const project = projects.find(p => p.id === voodooProjectId) || null;

  // ── Inline create form (shown when no project is selected) ─────────────────
  const [newName, setNewName] = useState("");
  const newNameRef = useRef(null);

  function createProject() {
    if (!newName.trim()) return;
    const id = uid();
    const slug = slugify(newName) + "-" + id.slice(0,4);
    const p = {
      id, slug, name: newName.trim(), description: "", ctaUrl: "", templateId: "editorial",
      storyIds: [], postIds: [], mediaIds: [], productIds: [], externalUrls: [],
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
        products={products}
        onSave={saveProject}
        onDelete={() => { delProject(project.id); setVoodooProjectId(null); }}
      />
    </div>
  );
}

// ── Project detail view ───────────────────────────────────────────────────────
function ProjectDetail({ project, stories, posts, items, products, onSave, onDelete }) {
  const { uploadItem, updateItem, currentWorkspaceId, setSparkJob } = useApp();

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
  const [pageIssues, setPageIssues] = useState(() =>
    project.generatedHtml ? validatePage(project.generatedHtml) : []
  );
  // Shown during the auto-repair loop ("Repariere... 1/2")
  const [repairStatus, setRepairStatus] = useState("");

  // ── Sync from AppContext when background generation completes ─────────────
  // generate() and sparkRefine() call onSave() even when this component is
  // mounted but the user has navigated away and back. When AppContext updates
  // the project (new generatedHtml, status, lastGeneratedAt), we need to pull
  // those changes into local form state — useState() only reads the initial
  // value, so we must sync explicitly on prop change.
  useEffect(() => {
    if (!project.generatedHtml) return;
    setForm(f => {
      // Only sync AI-pipeline fields, never overwrite user edits in other fields
      if (f.generatedHtml === project.generatedHtml) return f; // already up-to-date
      return { ...f,
        generatedHtml:   project.generatedHtml,
        lastGeneratedAt: project.lastGeneratedAt,
        status:          project.status,
      };
    });
    setPageIssues(validatePage(project.generatedHtml));
    setTab("site"); // jump to preview when result arrives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.generatedHtml]);

  const busy = genPhase !== "idle";

  const isDirty = JSON.stringify(form) !== JSON.stringify(project);

  function upd(patch) { setForm(f => ({ ...f, ...patch })); }

  function save() { onSave(form); }

  // ── Auto-repair loop ──────────────────────────────────────────────────────
  // Three-tier strategy (cheapest first):
  //
  //  Tier 1 — DOM repair (0 tokens, always runs first)
  //    repairPage() fixes script-leak text nodes and anchor-ID mismatches via
  //    content-based heading matching. Covers ~80% of structural issues.
  //
  //  Tier 2 — Section injection (~3000 tokens, runs up to 2 times)
  //    generateMissingSections() asks the AI for only the missing <section> tags
  //    as plain HTML (no JSON — avoids quote-escaping failures). Sections are
  //    injected via DOMParser before the CTA block for correct document order.
  //
  //  Tier 3 — Full refinePage fallback (~6000 tokens, runs once if needed)
  //    Last resort: asks for a full page re-output with explicit repair instruction.
  //    Only triggered when Tier 1+2 still leave issues after all attempts.
  //
  // Always returns a valid HTML string; never throws.
  async function autoRepairLoop(html, maxAttempts = 2, maxTier = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // ── Tier 1: DOM repair (0 tokens) ──────────────────────────────────
      const domFixed = repairPage(html);
      const issuesAfterDom = validatePage(domFixed);
      html = domFixed;

      if (issuesAfterDom.length === 0) break; // all clean

      const sectionIssue = issuesAfterDom.find(i => i.msg.includes("Sections gefunden"));
      const anchorIssue  = issuesAfterDom.find(i => i.msg.includes("Nav-Link"));
      if (!sectionIssue && !anchorIssue) break; // only unknown issue types remain

      // Collect IDs that nav links reference but no element provides
      const navHrefs  = [...html.matchAll(/href="#([\w-]+)"/g)].map(m => m[1]);
      const pageIds   = new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m => m[1]));
      const missingIds = [...new Set(navHrefs)].filter(id => !pageIds.has(id));

      if (missingIds.length === 0 && !sectionIssue) break;

      // ── Tier 2: Section injection (~3000 tokens) ────────────────────────
      setRepairStatus(`Automatische Reparatur… (${attempt}/${maxAttempts})`);
      setSparkJob(j => j ? { ...j, status: "running", chars: 0 } : j);

      try {
        const newSections = await generateMissingSections({ html, missingIds });

        if (newSections.length > 0) {
          // Inject via DOMParser — reliable, handles edge cases regex can't
          const doc = new DOMParser().parseFromString(html, "text/html");
          const ctaEl = doc.querySelector(".cta-b, [class*='cta-b']");
          const footer = doc.querySelector("footer");
          const anchor = ctaEl || footer || null;

          for (const sec of newSections) {
            const tpl = document.createElement("template");
            tpl.innerHTML = sec.html;
            const el = tpl.content.firstElementChild;
            if (!el) continue;
            if (anchor) anchor.parentNode.insertBefore(el.cloneNode(true), anchor);
            else doc.body.appendChild(el.cloneNode(true));
          }

          html = postProcessHtml("<!DOCTYPE html>\n" + doc.documentElement.outerHTML);
        }
      } catch(e) {
        console.error(`autoRepairLoop tier-2 attempt ${attempt}:`, e);
      }

      if (validatePage(html).length === 0) break;
    }

    // ── Tier 3: refinePage fallback (≤6000 tokens, runs once) ─────────────
    // Only if DOM + section injection still left issues AND caller allows it.
    // sparkRefine() passes maxTier=2 to avoid a nested refinePage call inside
    // a refinePage call — which would double tokens and risk rate-limit errors.
    const remaining = validatePage(html);
    if (remaining.length > 0 && maxTier >= 3) {
      const instruction = buildRepairInstruction(remaining);
      if (instruction) {
        setRepairStatus("Qualitätsprüfung – finale Korrektur…");
        setSparkJob(j => j ? { ...j, status: "running", chars: 0 } : j);
        try {
          const rawHtml = await refinePage({
            html,
            instruction,
            dossierPdfUrl: (form.dossierPdfUrl||"").trim(),
            onChunk: (_c, full) => {
              setSparkChars(full.length);
              setSparkJob(j => j ? { ...j, chars: full.length } : j);
            },
          });
          const fixed = repairPage(rawHtml);
          if (fixed.startsWith("<!")) html = fixed;
        } catch(e) {
          console.error("autoRepairLoop tier-3 fallback:", e);
        }
      }
    }

    setRepairStatus("");
    return html;
  }

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
  function toggleProduct(id) {
    const ids = form.productIds||[];
    upd({ productIds: ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id] });
  }
  function addUrl() {
    if (!urlInput.trim()) return;
    const entry = { id:uid(), url:urlInput.trim(), label:urlLabel.trim()||urlInput.trim() };
    upd({ externalUrls: [...(form.externalUrls||[]), entry] });
    setUrlInput(""); setUrlLabel("");
  }
  function removeUrl(id) { upd({ externalUrls: (form.externalUrls||[]).filter(u=>u.id!==id) }); }

  // ── Step 1: Pre-flight — Spark asks clarifying questions ─────────────────
  async function startPreflight() {
    if (busy || totalSources === 0) return;

    // Template mode: structure is predetermined → preflight skipped entirely.
    // Saves ~20-30 s AI call + user interaction time.
    const useTemplate = form.templateId && form.templateId !== "freeform";
    if (useTemplate) {
      generate({});
      return;
    }

    setGenPhase("preflight-loading");
    setPreflightA({});
    const ctx = buildContext(form, stories, posts, items, products);
    try {
      const questions = await runPreflight(form.name, form.description, ctx);
      if (questions.length) {
        setPreflightQ(questions);
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
    // Announce to global sparkJob so the Sidebar pill appears even when
    // the user navigates away — the async work continues regardless.
    setSparkJob({ projectId: form.id, projectName: form.name, workspaceId: form.workspaceId, type: "generate", chars: 0, status: "running" });

    // ── 3-phase image strategy ────────────────────────────────────────────
    // Phase 1: project-selected media (user explicitly picked these)
    const selectedMedia = (form.mediaIds||[]).map(id => items.find(x=>x.id===id)).filter(Boolean);
    let autoImages = selectedMedia.map(m => ({ url: m.url, alt: m.description||m.altText||m.name }));

    // Phase 2: workspace media library keyword search — free, instant, no API
    if (autoImages.length < 4) {
      const searchQuery = `${form.name} ${form.description||""}`.trim();
      const libraryHits = searchMediaLibrary(items, searchQuery, {
        count: 4 - autoImages.length,
        workspaceId: currentWorkspaceId,
      });
      // Deduplicate against already-selected images
      const usedUrls = new Set(autoImages.map(i => i.url));
      const freshLib = libraryHits.filter(i => !usedUrls.has(i.url));
      autoImages = [...autoImages, ...freshLib];
    }

    // Phase 3: stock API — only if still under 2 images after library search
    if (autoImages.length < 2) {
      const searchQuery = `${form.name} ${form.description||""}`.trim();
      const found = await searchImages(
        searchQuery,
        4 - autoImages.length,
        uploadItem,
        currentWorkspaceId,
      );
      // Fire-and-forget KI analysis for each newly uploaded stock image
      found.forEach(img => {
        if (img.uploadedItem) analyzeUploadedImage(img.uploadedItem, updateItem);
      });
      autoImages = [...autoImages, ...found.map(img => ({ url: img.url, alt: img.alt }))];
    }

    setGenPhase("streaming");

    const ctx = buildContext(form, stories, posts, items, products);

    const useTemplate = form.templateId && form.templateId !== "freeform";

    try {
      let rawHtml;
      if (useTemplate) {
        // Template flow: AI generates small content JSON (~700 tokens) → rendered locally.
        // No repair loop needed — structure is guaranteed by the template function.
        rawHtml = await generateContent({
          templateId: form.templateId,
          form,
          ctx,
          answers,
          images: autoImages,
          extraPrompt: genPromptRef.current.trim(),
          dossierPdfUrl: (form.dossierPdfUrl||"").trim(),
          preflightQ,
          onChunk: (_chunk, full) => {
            setGenChars(full.length);
            setSparkJob(j => j ? { ...j, chars: full.length } : j);
          },
        });
      } else {
        // Freeform flow: AI generates full HTML (~4500 tokens). Slower but unrestricted.
        rawHtml = await generatePage({
          form,
          ctx,
          answers,
          images: autoImages,
          extraPrompt: genPromptRef.current.trim(),
          ctaUrl: (form.ctaUrl||"").trim(),
          dossierPdfUrl: (form.dossierPdfUrl||"").trim(),
          preflightQ,
          onChunk: (_chunk, full) => {
            setGenChars(full.length);
            setSparkJob(j => j ? { ...j, chars: full.length } : j);
          },
        });
      }

      // Always repair — removes script-leak text nodes + fixes broken anchors
      const domFixed = repairPage(rawHtml);

      if (!domFixed.startsWith("<!")) {
        console.error("VoodooPage generate: unexpected response:", rawHtml.slice(0, 200));
        throw new Error("Die KI hat keine gültige HTML-Seite zurückgegeben. Bitte erneut versuchen.");
      }

      const html = useTemplate ? domFixed : await autoRepairLoop(domFixed, 1, 2);

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
      setPageIssues(validatePage(html));
      setTab("site");
      // Signal success — Sidebar pill shows "Fertig" then fades
      setSparkJob(j => j ? { ...j, status: "done", chars: html.length } : j);
      setTimeout(() => setSparkJob(j => j?.status === "done" ? null : j), 5000);
    } catch(e) {
      console.error("VoodooPage generate error:", e);
      setSparkJob(j => j ? { ...j, status: "error" } : j);
      setTimeout(() => setSparkJob(j => j?.status === "error" ? null : j), 7000);
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
    // Global sparkJob — persists across navigation
    setSparkJob({ projectId: form.id, projectName: form.name, workspaceId: form.workspaceId, type: "refine", chars: 0, status: "running" });
    try {
      // Streaming callback shared across initial attempt + retry
      const onChunkCb = (_c, full) => {
        setSparkChars(full.length);
        setSparkJob(j => j ? { ...j, chars: full.length } : j);
      };

      // One automatic retry for transient errors (server overload, rate limit)
      let rawHtml;
      try {
        rawHtml = await refinePage({ html: form.generatedHtml, instruction: p, ctaUrl: (form.ctaUrl||"").trim(), dossierPdfUrl: (form.dossierPdfUrl||"").trim(), onChunk: onChunkCb });
      } catch (firstErr) {
        // Short pause then retry — handles 529 overload / momentary network blips
        setRefineMsg("⏳ Kurze Pause – erneuter Versuch…");
        await new Promise(r => setTimeout(r, 2500));
        setRefineMsg("");
        setSparkChars(0);
        rawHtml = await refinePage({ html: form.generatedHtml, instruction: p, ctaUrl: (form.ctaUrl||"").trim(), dossierPdfUrl: (form.dossierPdfUrl||"").trim(), onChunk: onChunkCb });
      }

      // 1. DOM repair: structural anchor fixes via DOMParser (0 tokens)
      const domFixed = repairPage(rawHtml);

      if (!domFixed.startsWith("<!")) throw new Error("Ungültige HTML-Antwort vom KI-Server");

      // 2. AI repair loop: Tier 1 (DOM) + Tier 2 (section injection) only.
      //    Tier 3 (full refinePage fallback) is skipped here via maxTier=2,
      //    because sparkRefine() itself already IS a refinePage call — nesting
      //    would double the token cost and risk triggering rate-limit errors.
      const html = await autoRepairLoop(domFixed, 2, 2);

      const deployRes  = await fetch("/deploy-site", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ slug:form.slug, html }),
      });
      const deployData = await deployRes.json().catch(() => ({}));
      if (!deployData.ok) throw new Error(deployData.error || "Deploy fehlgeschlagen");

      const updated = { ...form, generatedHtml: html, lastGeneratedAt: new Date().toISOString() };
      setForm(updated);
      onSave(updated);
      setPageIssues(validatePage(html));
      setRefineMsg("✓ Seite aktualisiert");
      setTimeout(() => setRefineMsg(""), 3000);
      // Signal success to Sidebar pill
      setSparkJob(j => j ? { ...j, status: "done", chars: html.length } : j);
      setTimeout(() => setSparkJob(j => j?.status === "done" ? null : j), 5000);
    } catch(e) {
      console.error("VoodooPage sparkRefine error:", e);
      // Give the user an actionable error message instead of a generic one
      const msg = (e?.message || "").toLowerCase();
      const userMsg =
        msg.includes("529") || msg.includes("overload") || msg.includes("rate") || msg.includes("limit")
          ? "⚠️ KI-Server überlastet — bitte 30 Sekunden warten"
          : msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")
          ? "⚠️ Netzwerkfehler — bitte erneut versuchen"
          : msg.includes("ungültige") || msg.includes("invalid")
          ? "⚠️ Ungültige Antwort — Seite neu generieren"
          : "⚠️ Fehler — bitte erneut versuchen";
      setRefineMsg(userMsg);
      setSparkJob(j => j ? { ...j, status: "error" } : j);
      setTimeout(() => setSparkJob(j => j?.status === "error" ? null : j), 7000);
    }
    setSparkChars(0);
    setSparkLoading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(getSiteUrl(form.slug)).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalSources = (form.storyIds||[]).length+(form.postIds||[]).length+(form.mediaIds||[]).length+(form.productIds||[]).length+(form.externalUrls||[]).length;

  // Content available to pick (not filtered by workspace so user can pick across Mandanten)
  const availStories  = stories.filter(s => !s.deleted);
  const availPosts    = posts.filter(p => !p.deleted);
  const availMedia    = items.filter(m => m.type==="image"||m.type==="video");
  const availProducts = (products||[]).filter(p => p.status !== "archived");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Header bar ───────────────────────────────────────────────── */}
      {/* ── Row 1: Project header ────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"8px 16px",
        borderBottom:`1px solid ${T.gray100}`, background:"#fff", flexShrink:0, minHeight:48,
      }}>
        <Wand2 size={15} strokeWidth={IW} color={C.accent} style={{ flexShrink:0 }}/>

        {/* Editable project name */}
        <input
          value={form.name}
          onChange={e => upd({ name:e.target.value })}
          style={{
            fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT,
            border:"none", outline:"none", background:"transparent", minWidth:60, width: Math.max(80, form.name.length * 8.5),
          }}
        />

        {/* Status badge */}
        <span style={{
          fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:20, flexShrink:0,
          background: form.status==="live" ? "#DCFCE7" : T.gray100,
          color: form.status==="live" ? "#15803D" : T.gray400,
          letterSpacing:".04em", textTransform:"uppercase",
        }}>{form.status==="live" ? "● Live" : "Entwurf"}</span>

        {/* URL pill — only when live */}
        {form.status==="live" && (
          <div style={{
            flex:1, display:"flex", alignItems:"center", gap:6, minWidth:0,
            background:T.gray50, border:`1px solid ${T.gray200}`, borderRadius:8, padding:"4px 10px",
          }}>
            <Globe size={11} strokeWidth={2} color={T.gray400} style={{ flexShrink:0 }}/>
            <span style={{ fontSize:11, color:T.gray500, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {getSiteUrl(form.slug)}
            </span>
          </div>
        )}
        {form.status!=="live" && <div style={{ flex:1 }}/>}

        {/* Action buttons */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {form.status==="live" && (<>
            <button onClick={copyLink} title="Link kopieren" style={{
              display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:7,
              border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray600,
              fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:FONT, whiteSpace:"nowrap",
            }}>
              {copied ? <Check size={11} strokeWidth={3} color="#10B981"/> : <Copy size={11} strokeWidth={2}/>}
              {copied ? "Kopiert!" : "Kopieren"}
            </button>
            <a href={getSiteUrl(form.slug)} target="_blank" rel="noopener noreferrer" style={{
              display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:7,
              border:"none", background:C.accent, color:"#fff",
              fontSize:11, fontWeight:700, textDecoration:"none", fontFamily:FONT, whiteSpace:"nowrap",
            }}>
              <ExternalLink size={11} strokeWidth={2}/> Öffnen
            </a>
          </>)}
          {isDirty && (
            <button onClick={save} style={{
              padding:"5px 12px", borderRadius:7, border:"none",
              background:C.accent, color:"#fff", fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:FONT, whiteSpace:"nowrap",
            }}>Speichern</button>
          )}
          <button onClick={onDelete} title="Projekt löschen" style={{
            background:"none", border:"none", cursor:"pointer", color:T.gray300, padding:"4px 6px",
            borderRadius:6, transition:"color .12s",
          }} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color=T.gray300}>
            <Trash2 size={13} strokeWidth={IW}/>
          </button>
        </div>
      </div>

      {/* ── Row 2: Tabs ──────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", borderBottom:`1px solid ${T.gray200}`, background:"#fff", flexShrink:0, paddingRight:8 }}>
        <div style={{ display:"flex", flex:1 }}>
          {[
            { id:"content", label:"Inhalte", icon:FileText },
            { id:"site",    label:"Live-Seite", icon:Zap, badge: form.status==="live" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
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
        {/* Refresh — only on Live tab */}
        {tab==="site" && form.status==="live" && (
          <button onClick={() => setForm(f => ({ ...f, _previewKey: Date.now() }))} title="Vorschau neu laden"
            style={{ background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:"6px 8px", borderRadius:6 }}>
            <RefreshCw size={13} strokeWidth={2}/>
          </button>
        )}
      </div>

      {/* ── CONTENT TAB ──────────────────────────────────────────────── */}
      {tab === "content" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* Content main area */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

            {/* Template selector — 2-column grid */}
            {(() => {
              const allTmpls = [...TEMPLATES, { id:"freeform", name:"Freie Generierung", description:"KI erstellt Seite komplett selbst — langsamer, maximale Freiheit", icon:"✏️" }];
              const activeTmpl = allTmpls.find(t => t.id === (form.templateId || "editorial"));
              return (
                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:T.gray500, display:"block", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>
                    Seiten-Template
                  </label>
                  {/* Grid: SCHNELL templates 2-col, Freie Generierung full-width */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, marginBottom:5 }}>
                    {TEMPLATES.map(tmpl => {
                      const active = (form.templateId || "editorial") === tmpl.id;
                      const TIcon = TMPL_ICONS[tmpl.id] || FileText;
                      return (
                        <div key={tmpl.id} onClick={() => upd({ templateId: tmpl.id })}
                          title={tmpl.description}
                          style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px",
                            borderRadius:7, cursor:"pointer", transition:"all .12s",
                            border:`1.5px solid ${active ? C.accent : T.gray200}`,
                            background: active ? C.accent+"0F" : "#fff",
                          }}>
                          <TIcon size={13} strokeWidth={IW} color={active ? C.accent : T.gray400} style={{ flexShrink:0 }}/>
                          <span style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? C.accent : C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {tmpl.name}
                          </span>
                          <span style={{ marginLeft:"auto", fontSize:9, fontWeight:800, flexShrink:0,
                            background: active ? C.accent : T.gray100,
                            color: active ? "#fff" : T.gray400,
                            borderRadius:3, padding:"1px 4px", letterSpacing:".04em",
                          }}>SCHNELL</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Freie Generierung — full width */}
                  {(() => {
                    const ff = allTmpls.find(t => t.id === "freeform");
                    const active = (form.templateId || "editorial") === "freeform";
                    return (
                      <div onClick={() => upd({ templateId: "freeform" })}
                        style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px",
                          borderRadius:7, cursor:"pointer", transition:"all .12s",
                          border:`1.5px solid ${active ? C.accent : T.gray200}`,
                          background: active ? C.accent+"0F" : "#fff",
                        }}>
                        <Wand2 size={13} strokeWidth={IW} color={active ? C.accent : T.gray400} style={{ flexShrink:0 }}/>
                        <span style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? C.accent : C.text }}>
                          {ff.name}
                        </span>
                        <span style={{ fontSize:11, color:T.gray400, marginLeft:4 }}>— langsamer, maximale Freiheit</span>
                      </div>
                    );
                  })()}
                  {/* Active template description */}
                  {activeTmpl && (
                    <div style={{ marginTop:6, fontSize:11, color:T.gray400, paddingLeft:2 }}>
                      {activeTmpl.description}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Description */}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:T.gray500, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Beschreibung</label>
              <textarea
                value={form.description||""}
                onChange={e => upd({description:e.target.value})}
                placeholder="Worum geht es bei diesem Projekt? Zielgruppe, Ton, Ziel der Seite…"
                rows={2}
                style={{ width:"100%", resize:"vertical", padding:"8px 10px", borderRadius:8, border:`1px solid ${T.gray200}`, fontSize:13, fontFamily:FONT, outline:"none", color:C.text, boxSizing:"border-box" }}
              />
            </div>

            {/* CTA URL */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:T.gray500, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>
                CTA-Button Ziel-URL
              </label>
              <div style={{ display:"flex", alignItems:"center", gap:8, background: form.ctaUrl ? C.accent+"0A" : "#fff",
                border:`1.5px solid ${form.ctaUrl ? C.accent+"55" : T.gray200}`,
                borderRadius:8, padding:"6px 10px", transition:"all .15s" }}>
                <ExternalLink size={14} strokeWidth={IW} color={form.ctaUrl ? C.accent : T.gray400} style={{ flexShrink:0 }}/>
                <input
                  type="url"
                  value={form.ctaUrl||""}
                  onChange={e => upd({ ctaUrl: e.target.value })}
                  placeholder="https://dein-shop.de/produkt  oder  https://cal.com/…"
                  style={{
                    flex:1, border:"none", outline:"none", fontSize:13,
                    fontFamily:FONT, color:C.text, background:"transparent",
                    minWidth:0,
                  }}
                />
                {form.ctaUrl && (
                  <button onClick={() => upd({ ctaUrl:"" })} style={{ background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:0, lineHeight:1 }}>
                    <X size={12} strokeWidth={2.5}/>
                  </button>
                )}
              </div>
              <div style={{ fontSize:10, color:T.gray400, marginTop:4, paddingLeft:2 }}>
                Spark setzt diese URL hinter alle CTA-Buttons der generierten Seite.
              </div>
            </div>

            {/* Dossier PDF */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:T.gray500, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>
                Dossier PDF{" "}
                <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:T.gray400 }}>(optional — aktiviert Email-Formular als CTA)</span>
              </label>
              <div style={{ display:"flex", alignItems:"center", gap:8,
                background: form.dossierPdfUrl ? "#f0fdf4" : "#fff",
                border:`1.5px solid ${form.dossierPdfUrl ? "#22c55e55" : T.gray200}`,
                borderRadius:8, padding:"6px 10px", transition:"all .15s" }}>
                <FileText size={14} strokeWidth={IW} color={form.dossierPdfUrl ? "#16a34a" : T.gray400} style={{ flexShrink:0 }}/>
                <input
                  type="url"
                  value={form.dossierPdfUrl||""}
                  onChange={e => upd({ dossierPdfUrl: e.target.value })}
                  placeholder="https://example.com/dossier.pdf"
                  style={{ flex:1, border:"none", outline:"none", fontSize:13,
                    fontFamily:FONT, color:C.text, background:"transparent", minWidth:0 }}
                />
                {form.dossierPdfUrl && (
                  <button onClick={() => upd({ dossierPdfUrl:"" })}
                    style={{ background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:0, lineHeight:1 }}>
                    <X size={12} strokeWidth={2.5}/>
                  </button>
                )}
              </div>
              <div style={{ fontSize:10, color:T.gray400, marginTop:4, paddingLeft:2 }}>
                Wenn gesetzt, ersetzt Spark den CTA-Button durch ein Email-Eingabe-Formular. Bei Absenden öffnet sich die PDF-URL automatisch.
              </div>
            </div>

            {/* Source filters */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {[
                { id:"all",      label:"Alle",      icon:Wand2    },
                { id:"story",    label:"Storys",    icon:BookOpen },
                { id:"post",     label:"Posts",     icon:SendIcon },
                { id:"media",    label:"Medien",    icon:ImageIcon },
                { id:"product",  label:"Produkte",  icon:Package  },
                { id:"url",      label:"URLs",      icon:Globe    },
              ].map(s => (
                <SourceChip key={s.id} icon={s.icon} label={s.label}
                  active={sourceFilter===s.id}
                  count={
                    s.id==="story"   ? (form.storyIds||[]).length :
                    s.id==="post"    ? (form.postIds||[]).length :
                    s.id==="media"   ? (form.mediaIds||[]).length :
                    s.id==="product" ? (form.productIds||[]).length :
                    s.id==="url"     ? (form.externalUrls||[]).length : 0
                  }
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
                items={availStories}
                emptyText="Noch keine Storys vorhanden."
                getSearchText={s => `${s.title||""} ${s.status||""} ${s.category||""}`}
                renderItem={s => (
                  <ContentRow
                    checked={(form.storyIds||[]).includes(s.id)}
                    onChange={() => toggleStory(s.id)}
                    label={s.title||"Ohne Titel"}
                    sub={`${(s.blocks||[]).length} Blöcke · ${s.status}`}
                    color="#6941C6"
                  />
                )}
              />
            )}

            {/* POSTS */}
            {(sourceFilter==="all"||sourceFilter==="post") && (
              <ContentSection
                title="Publisher-Posts" icon={SendIcon}
                count={(form.postIds||[]).length}
                total={availPosts.length}
                items={availPosts}
                emptyText="Noch keine Posts vorhanden."
                getSearchText={p => `${p.title||""} ${p.channels?.join(" ")||""} ${p.status||""}`}
                renderItem={p => (
                  <ContentRow
                    checked={(form.postIds||[]).includes(p.id)}
                    onChange={() => togglePost(p.id)}
                    label={p.title||"Ohne Titel"}
                    sub={`${p.channels?.join(", ")||""} · ${p.status}`}
                    color="#0077B5"
                  />
                )}
              />
            )}

            {/* MEDIA */}
            {(sourceFilter==="all"||sourceFilter==="media") && (
              <ContentSection
                title="Medien" icon={ImageIcon}
                count={(form.mediaIds||[]).length}
                total={availMedia.length}
                items={availMedia}
                emptyText="Noch keine Medien vorhanden."
                getSearchText={m => `${m.name||""} ${m.type||""} ${m.tags||""} ${m.description||""}`}
                renderItem={m => (
                  <ContentRow
                    checked={(form.mediaIds||[]).includes(m.id)}
                    onChange={() => toggleMedia(m.id)}
                    label={m.name}
                    sub={`${m.type} · ${m.width||0}×${m.height||0}`}
                    color="#E1306C"
                    thumb={m.url}
                  />
                )}
              />
            )}

            {/* PRODUKTE */}
            {(sourceFilter==="all"||sourceFilter==="product") && (
              <ContentSection
                title="Produkte" icon={Package}
                count={(form.productIds||[]).length}
                total={availProducts.length}
                items={availProducts}
                emptyText="Noch keine Produkte vorhanden."
                getSearchText={p => `${p.name||""} ${p.sku||""} ${p.category||""}`}
                renderItem={p => (
                  <ContentRow
                    checked={(form.productIds||[]).includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    label={p.name}
                    sub={[
                      p.sku ? `SKU ${p.sku}` : null,
                      p.price != null ? `${Number(p.price).toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 })} ${p.currency||"EUR"}` : null,
                      p.category || null,
                    ].filter(Boolean).join(" · ")}
                    color="#F59E0B"
                  />
                )}
              />
            )}

            {/* EXTERNAL URLS */}
            {(sourceFilter==="all"||sourceFilter==="url") && (
              <ContentSection title="Externe URLs" icon={Globe} count={(form.externalUrls||[]).length} total={(form.externalUrls||[]).length||null}>
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
                  <Loader size={22} strokeWidth={1.5}
                    color={repairStatus ? "#7C3AED" : C.accent}
                    style={{animation:"spin .8s linear infinite"}}/>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>
                      {repairStatus
                        ? repairStatus
                        : genChars > 0 ? `${(genChars/1000).toFixed(1)} k Zeichen…` : "Spark schreibt…"}
                    </div>
                    <div style={{ fontSize:11, color:T.gray400 }}>
                      {repairStatus ? "Qualitätsprüfung & Reparatur" : "Landing Page wird generiert"}
                    </div>
                  </div>
                  {(genChars > 0 || sparkChars > 0) && (
                    <div style={{ width:"100%", height:4, background:T.gray100, borderRadius:2, overflow:"hidden" }}>
                      <div style={{
                        height:"100%", borderRadius:2, transition:"width .3s",
                        background: repairStatus
                          ? "linear-gradient(90deg, #7C3AED, #4F46E5)"
                          : `linear-gradient(90deg, ${C.accent}, #7C3AED)`,
                        width:`${Math.min(100, ((genChars||sparkChars)/4000)*100)}%`,
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
                {/* Validation banner — shown when validatePage() found issues */}
                {pageIssues.length > 0 && (
                  <div style={{ flexShrink:0, borderBottom:`1px solid ${T.gray200}` }}>
                    {pageIssues.map((issue, i) => (
                      <div key={i} style={{
                        display:"flex", alignItems:"flex-start", gap:8,
                        padding:"7px 16px",
                        background: issue.type === "error" ? "#FFF1F0" : "#FFFBEB",
                        borderLeft: `3px solid ${issue.type === "error" ? "#EF4444" : "#F59E0B"}`,
                        fontFamily:FONT, fontSize:12, color: issue.type === "error" ? "#B91C1C" : "#92400E",
                        lineHeight:1.4,
                      }}>
                        <span style={{ flexShrink:0, marginTop:1 }}>{issue.type === "error" ? "✕" : "⚠"}</span>
                        <span>{issue.msg}</span>
                        {i === pageIssues.length - 1 && (
                          <button onClick={() => setPageIssues([])} style={{
                            marginLeft:"auto", flexShrink:0, background:"none", border:"none",
                            cursor:"pointer", color:"inherit", opacity:.6, padding:"0 2px", fontSize:14,
                          }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

                {sparkLoading && sparkChars > 0 && !repairStatus && (
                  <div style={{ fontSize:11, color:C.accent, marginBottom:6, fontWeight:600 }}>
                    ⟳ {(sparkChars/1000).toFixed(1)} k Zeichen…
                  </div>
                )}
                {repairStatus && (
                  <div style={{ fontSize:11, color:"#6D28D9", background:"#EDE9FE",
                    border:"1px solid #C4B5FD", borderRadius:7, padding:"5px 10px",
                    marginBottom:6, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ display:"inline-block", animation:"spin 1s linear infinite" }}>⚙</span>
                    {repairStatus}
                    {sparkChars > 0 && <span style={{ color:"#8B5CF6", fontWeight:400 }}>
                      · {(sparkChars/1000).toFixed(1)} k Zeichen
                    </span>}
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
function ContentSection({ title, icon:Icon, count, total, items, renderItem, getSearchText, emptyText="Keine Einträge.", children }) {
  const [open, setOpen] = useState(false); // collapsed by default
  const [q, setQ] = useState("");
  const useItems = items != null && renderItem != null;

  const filtered = useItems
    ? (q.trim()
        ? items.filter(item => {
            const txt = getSearchText
              ? getSearchText(item)
              : [item.title, item.name, item.tags, item.description, item.status].filter(Boolean).join(" ");
            return txt.toLowerCase().includes(q.toLowerCase());
          })
        : items)
    : [];
  const limited = filtered.slice(0, 10);
  const overflow = filtered.length > 10;

  return (
    <div style={{ marginBottom:10, background:"#fff", borderRadius:10, border:`1px solid ${T.gray200}`, overflow:"hidden" }}>
      {/* Header row */}
      <button onClick={() => setOpen(o=>!o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 14px",
        border:"none", background:T.gray50, cursor:"pointer", fontFamily:FONT,
      }}>
        <Icon size={13} strokeWidth={IW} color={T.gray500}/>
        <span style={{ flex:1, fontSize:12, fontWeight:700, color:T.gray600, textAlign:"left" }}>{title}</span>
        {total != null && (
          <span style={{ fontSize:10, color:T.gray400, marginRight:2 }}>{total}</span>
        )}
        {count > 0 && (
          <span style={{ fontSize:10, fontWeight:700, background:C.accent+"22", color:C.accent, borderRadius:8, padding:"1px 7px" }}>
            {count}
          </span>
        )}
        <ChevronRight size={12} strokeWidth={2} color={T.gray400} style={{ transform: open?"rotate(90deg)":"rotate(0deg)", transition:"transform .15s", flexShrink:0 }}/>
      </button>

      {open && (
        <div>
          {/* Search bar — only when items mode and list has entries */}
          {useItems && items.length > 3 && (
            <div style={{ padding:"6px 10px 0", position:"relative" }}>
              <Search size={11} strokeWidth={IW} color={T.gray400}
                style={{ position:"absolute", left:18, top:"50%", transform:"translateY(-40%)", pointerEvents:"none" }}/>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`${title} durchsuchen…`}
                style={{ width:"100%", padding:"5px 8px 5px 26px", borderRadius:6,
                  border:`1px solid ${T.gray200}`, fontSize:11, fontFamily:FONT,
                  outline:"none", boxSizing:"border-box", background:T.gray50, color:C.text }}
              />
              {q && (
                <button onClick={() => setQ("")} style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-40%)", background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:2, lineHeight:1 }}>
                  <X size={10} strokeWidth={2.5}/>
                </button>
              )}
            </div>
          )}

          {/* Item list with scroll cap */}
          {useItems && (
            <div style={{ padding:"6px 10px", display:"flex", flexDirection:"column", gap:2,
              maxHeight: overflow ? 360 : "none",
              overflowY: overflow ? "auto" : "visible",
            }}>
              {limited.length === 0
                ? <EmptyHint>{q.trim() ? "Keine Treffer." : emptyText}</EmptyHint>
                : limited.map((item, i) => {
                    const el = renderItem(item);
                    return el ? <el.type key={item.id || i} {...el.props}/> : null;
                  })
              }
              {overflow && (
                <div style={{ fontSize:10, color:T.gray400, padding:"4px 8px", textAlign:"center", borderTop:`1px solid ${T.gray100}`, marginTop:2 }}>
                  + {filtered.length - 10} weitere (Suche verfeinern)
                </div>
              )}
            </div>
          )}

          {/* Custom children slot (URLs section etc.) */}
          {children && (
            <div style={{ padding:"8px 10px", display:"flex", flexDirection:"column", gap:3 }}>
              {children}
            </div>
          )}
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
