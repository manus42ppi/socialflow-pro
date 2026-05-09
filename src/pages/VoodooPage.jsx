import { useState, useRef, useCallback } from "react";
import {
  Wand2, Plus, Trash2, ExternalLink, Copy, Check, Loader,
  BookOpen, Send as SendIcon, Image as ImageIcon, Globe,
  ChevronRight, X, RefreshCw, Sparkles, Link as LinkIcon,
  FileText, Zap,
} from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { uid, aiCall } from "../utils/store.js";
import { useApp } from "../context/AppContext.jsx";

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

const SITE_BASE = "https://socialflow-pro.pages.dev/site/";

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
  const { projects, saveProject, delProject, stories, posts, items, currentWorkspaceId } = useApp();

  // Filter projects to current workspace
  const wsProjects = projects.filter(p =>
    !currentWorkspaceId || p.workspaceId === currentWorkspaceId
  );

  const [selected, setSelected] = useState(null); // project id
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const project = wsProjects.find(p => p.id === selected) || null;

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
    setSelected(id);
    setCreating(false);
    setNewName("");
  }

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", fontFamily:FONT }}>
      <style>{CSS}</style>

      {/* ── LEFT: Project list ───────────────────────────────────────── */}
      <div style={{
        width:240, flexShrink:0, borderRight:`1px solid ${T.gray200}`,
        background:T.gray50, display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        <div style={{ padding:"16px 16px 8px", borderBottom:`1px solid ${T.gray100}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <Wand2 size={16} strokeWidth={IW} color={C.accent}/>
            <span style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>
              Projekte
            </span>
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
              gap:6, padding:"7px 0", borderRadius:8, border:`1.5px dashed ${T.gray300}`,
              background:"#fff", color:T.gray500, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:FONT, transition:"all .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.gray300; e.currentTarget.style.color=T.gray500; }}
          >
            <Plus size={13} strokeWidth={2.5}/> Neues Projekt
          </button>

          {creating && (
            <div style={{ marginTop:8, display:"flex", gap:5 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") createProject(); if(e.key==="Escape"){ setCreating(false); setNewName(""); }}}
                placeholder="Projektname…"
                style={{
                  flex:1, padding:"6px 9px", borderRadius:7, border:`1.5px solid ${C.accent}55`,
                  fontSize:12, fontFamily:FONT, outline:"none", color:C.text, background:"#fff",
                }}
              />
              <button onClick={createProject} style={{
                padding:"6px 10px", borderRadius:7, border:"none",
                background:C.accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
              }}>OK</button>
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {wsProjects.length === 0 && !creating && (
            <div style={{ padding:"24px 16px", textAlign:"center", color:T.gray400, fontSize:12 }}>
              Noch keine Projekte.<br/>Erstelle dein erstes Projekt.
            </div>
          )}
          {wsProjects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:8,
                padding:"10px 14px", border:"none", background:"none", cursor:"pointer",
                borderLeft:`3px solid ${selected===p.id ? C.accent : "transparent"}`,
                background: selected===p.id ? C.accent+"10" : "transparent",
                textAlign:"left", transition:"all .1s",
              }}
              onMouseEnter={e => { if(selected!==p.id) e.currentTarget.style.background=T.gray100; }}
              onMouseLeave={e => { if(selected!==p.id) e.currentTarget.style.background="transparent"; }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {p.name}
                </div>
                <div style={{ fontSize:10, color:T.gray400, display:"flex", gap:6, marginTop:2 }}>
                  <span style={{
                    background: p.status==="live" ? "#DCFCE7" : T.gray100,
                    color: p.status==="live" ? "#15803D" : T.gray500,
                    borderRadius:4, padding:"1px 5px", fontWeight:700,
                  }}>{p.status==="live" ? "Live" : "Entwurf"}</span>
                  <span>{(p.storyIds||[]).length+(p.postIds||[]).length+(p.mediaIds||[]).length+(p.externalUrls||[]).length} Quellen</span>
                </div>
              </div>
              <ChevronRight size={12} strokeWidth={2} color={T.gray400}/>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN: Project detail ─────────────────────────────────────── */}
      {!project ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, color:T.gray400 }}>
          <Wand2 size={48} strokeWidth={1} color={T.gray300}/>
          <p style={{ fontSize:14, color:T.gray400, fontFamily:FONT, textAlign:"center", margin:0 }}>
            Wähle ein Projekt oder erstelle ein neues,<br/>um mit Creation Voodoo zu beginnen.
          </p>
        </div>
      ) : (
        <ProjectDetail
          key={project.id}
          project={project}
          stories={stories}
          posts={posts}
          items={items}
          onSave={saveProject}
          onDelete={() => { delProject(project.id); setSelected(null); }}
        />
      )}
    </div>
  );
}

// ── Project detail view ───────────────────────────────────────────────────────
function ProjectDetail({ project, stories, posts, items, onSave, onDelete }) {
  const [form, setForm] = useState({ ...project });
  const [tab, setTab] = useState("content"); // "content" | "site"
  const [sourceFilter, setSourceFilter] = useState("all");
  const [urlInput, setUrlInput] = useState("");
  const [urlLabel, setUrlLabel] = useState("");

  // Spark / generation state
  const [generating, setGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const genPromptRef = useRef("");
  const [sparkInput, setSparkInput] = useState("");
  const sparkInputRef = useRef("");
  const [sparkLoading, setSparkLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refineMsg, setRefineMsg] = useState("");

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

  // ── Generate landing page ──────────────────────────────────────────────────
  async function generate() {
    setGenerating(true);
    const ctx = buildContext();
    const extraPrompt = genPrompt.trim();
    const sys = `Du bist ein professioneller Web-Designer und Developer. Erstelle eine vollständige, moderne, mobilresponsive Landing Page als einzelne selbst-enthaltene HTML-Datei.

PROJEKTNAME: ${form.name}
BESCHREIBUNG: ${form.description || "(keine Beschreibung)"}
SLUG/URL: ${SITE_BASE}${form.slug}

INHALTE FÜR DIE SEITE:
${ctx}

${extraPrompt ? `ZUSÄTZLICHE WÜNSCHE:\n${extraPrompt}\n\n` : ""}ANFORDERUNGEN:
- Vollständig inline-CSS (kein externes Stylesheet, kein CDN)
- Kein JavaScript erforderlich (optionales vanilla JS für Hamburger-Menü ist OK)
- Mobile-first responsive Design
- Modernes, professionelles Design mit Farben passend zum Projektthema
- Navigation mit Anchor-Links zu Abschnitten
- Hero-Bereich mit Headline und CTA
- Alle Bilder aus den Inhalten einbinden (img src direkt)
- Footer mit Copyright
- Keine Platzhalter – alle echten Inhalte aus den Projektdaten einbauen
- Antworte NUR mit dem HTML-Code (beginnend mit <!DOCTYPE html>) – kein Markdown-Codeblock`;

    try {
      const html = await aiCall([{ role:"user", content:sys }], 4000);
      if (!html?.trim().startsWith("<!")) throw new Error("bad response");

      // Deploy to KV via Cloudflare Function
      const res = await fetch("/deploy-site", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ slug:form.slug, html }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "deploy failed");

      const updated = { ...form, generatedHtml: html, lastGeneratedAt: new Date().toISOString(), status:"live" };
      setForm(updated);
      onSave(updated);
      setTab("site");
    } catch(e) {
      alert("Generierung fehlgeschlagen: " + e.message);
    }
    setGenerating(false);
  }

  // ── Spark page refinement ──────────────────────────────────────────────────
  async function sparkRefine() {
    const p = sparkInputRef.current.trim();
    if (!p || sparkLoading || !form.generatedHtml) return;
    setSparkInput(""); sparkInputRef.current = "";
    setSparkLoading(true);
    setRefineMsg("");
    try {
      const sys = `Du bist ein professioneller Web-Developer. Hier ist eine bestehende Landing Page als HTML. Verbessere sie gemäß der Anweisung des Users. Antworte NUR mit dem vollständigen aktualisierten HTML (beginnend mit <!DOCTYPE html>).`;
      const html = await aiCall([
        { role:"user", content: sys },
        { role:"assistant", content: form.generatedHtml },
        { role:"user", content: p },
      ], 4000);
      if (!html?.trim().startsWith("<!")) throw new Error("bad response");

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
    } catch {
      setRefineMsg("⚠️ Fehler – bitte erneut versuchen");
    }
    setSparkLoading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(SITE_BASE + form.slug).catch(()=>{});
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

          {/* ── Right: Generate panel ─────────────────────────────────── */}
          <div style={{
            width:300, flexShrink:0, borderLeft:`1px solid ${T.gray200}`,
            background:"#fff", display:"flex", flexDirection:"column", overflow:"hidden",
          }}>
            <div style={{ padding:"16px", borderBottom:`1px solid ${T.gray100}`, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
                <Sparkles size={14} strokeWidth={IW} color={C.accent}/>
                <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Spark generiert</span>
              </div>
              <div style={{ fontSize:12, color:T.gray500, marginBottom:12, lineHeight:1.5 }}>
                {totalSources} Quelle{totalSources!==1?"n":""} ausgewählt.{" "}
                {totalSources===0 ? "Wähle oben Inhalte aus." : "Spark erstellt daraus eine vollständige Landing Page."}
              </div>

              <textarea
                value={genPrompt}
                onChange={e => { setGenPrompt(e.target.value); genPromptRef.current=e.target.value; }}
                placeholder="Zusätzliche Wünsche für die Seite (optional)…"
                rows={3}
                style={{
                  width:"100%", resize:"none", padding:"8px 10px", borderRadius:8,
                  border:`1.5px solid ${T.gray200}`, fontSize:12, fontFamily:FONT,
                  outline:"none", color:C.text, boxSizing:"border-box", marginBottom:10,
                }}
              />

              <button
                onClick={generate}
                disabled={generating || totalSources===0}
                style={{
                  width:"100%", padding:"10px 0", borderRadius:8, border:"none",
                  background: generating||totalSources===0 ? T.gray200 : `linear-gradient(135deg, ${C.accent}, #7C3AED)`,
                  color: generating||totalSources===0 ? T.gray400 : "#fff",
                  fontSize:13, fontWeight:700, cursor: generating||totalSources===0 ? "default" : "pointer",
                  fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  transition:"all .2s",
                }}
              >
                {generating ? (
                  <><Loader size={14} strokeWidth={2} style={{animation:"spin .8s linear infinite"}}/> Generiert…</>
                ) : (
                  <><Wand2 size={14} strokeWidth={2}/> Seite generieren</>
                )}
              </button>

              {form.status==="live" && (
                <button
                  onClick={() => setTab("site")}
                  style={{
                    width:"100%", marginTop:8, padding:"8px 0", borderRadius:8,
                    border:`1px solid ${T.gray200}`, background:"#fff",
                    color:T.gray600, fontSize:12, fontWeight:600, cursor:"pointer",
                    fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  }}
                >
                  <ExternalLink size={12} strokeWidth={2}/> Live-Seite ansehen
                </button>
              )}
            </div>

            {/* Slug editor */}
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.gray100}` }}>
              <label style={{ fontSize:10, fontWeight:700, color:T.gray400, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:4 }}>URL-Slug</label>
              <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:T.gray400, marginBottom:6 }}>
                <code style={{ fontSize:11 }}>…/site/</code>
              </div>
              <input
                value={form.slug}
                onChange={e => upd({ slug: slugify(e.target.value) })}
                style={{ width:"100%", padding:"6px 9px", borderRadius:7, border:`1px solid ${T.gray200}`, fontSize:12, fontFamily:"monospace", outline:"none", boxSizing:"border-box" }}
              />
            </div>

            <div style={{ padding:"12px 16px", flex:1 }}>
              <p style={{ fontSize:11, color:T.gray400, lineHeight:1.5, margin:0 }}>
                <strong style={{ color:T.gray600 }}>Wie es funktioniert:</strong><br/>
                1. Inhalte aus Storys, Posts und Medien auswählen.<br/>
                2. Optionale Wünsche eintragen.<br/>
                3. Spark generiert eine vollständige Landing Page.<br/>
                4. Die Seite wird sofort live unter deinem Slug deployed.<br/>
                5. Im Tab "Live-Seite" kannst du sie weiter verfeinern.
              </p>
            </div>
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
                    <span style={{ fontSize:12, color:T.gray500, fontFamily:"monospace" }}>{SITE_BASE}{form.slug}</span>
                  </div>
                  <button onClick={copyLink} style={{
                    display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:7,
                    border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray600,
                    fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT,
                  }}>
                    {copied ? <Check size={12} strokeWidth={3} color="#10B981"/> : <Copy size={12} strokeWidth={2}/>}
                    {copied ? "Kopiert!" : "Link kopieren"}
                  </button>
                  <a href={SITE_BASE+form.slug} target="_blank" rel="noopener noreferrer" style={{
                    display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:7,
                    border:"none", background:C.accent, color:"#fff",
                    fontSize:12, fontWeight:700, textDecoration:"none", fontFamily:FONT,
                  }}>
                    <ExternalLink size={12} strokeWidth={2}/> Öffnen
                  </a>
                  <button onClick={() => { const u={...form,lastGeneratedAt:null}; setForm(u); }} title="Vorschau neu laden" style={{ background:"none", border:"none", cursor:"pointer", color:T.gray400, padding:4 }}>
                    <RefreshCw size={14} strokeWidth={2}/>
                  </button>
                </div>
                <iframe
                  key={form.lastGeneratedAt}
                  src={SITE_BASE + form.slug}
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
