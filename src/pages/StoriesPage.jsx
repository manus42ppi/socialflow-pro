import { useState, useMemo } from "react";
import { Plus, Search, Trash2, BookOpen, Link as LinkIcon, StickyNote, Layers,
         Send, Compass, PenLine, Share2, ChevronRight, X, Clock, Edit2 } from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { STORY_CHANNELS } from "../constants/demo.js";
import { Btn } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Status config (no emojis) ────────────────────────────────────────────────
const STATUSES = [
  { id:"idea",      label:"Idee",           color:"#6366F1" },
  { id:"draft",     label:"Entwurf",        color:"#F59E0B" },
  { id:"ready",     label:"Bereit",         color:"#10B981" },
  { id:"published", label:"Veröffentlicht", color:"#0EA5E9" },
];

const CAT_COLOR = {
  Marketing:"#E1306C", Tech:"#8B5CF6", Lifestyle:"#EC4899", Wirtschaft:"#10B981",
  Politik:"#3B82F6", Kultur:"#6366F1", Gesundheit:"#EF4444", Reise:"#14B8A6",
  Bildung:"#F97316", Andere:"#6B7280",
};

// Extract plain-text preview from BlockNote blocks
function extractPreview(blocks, maxChars = 160) {
  if (!blocks?.length) return "";
  const parts = [];
  for (const b of blocks) {
    if (!b.content) continue;
    for (const c of b.content) {
      if (c.type === "text" && c.text) parts.push(c.text);
    }
    if (parts.join(" ").length > maxChars) break;
  }
  const text = parts.join(" ").trim();
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

function countWords(blocks) {
  if (!blocks?.length) return 0;
  const text = blocks.map(b =>
    (b.content || []).filter(c => c.type === "text").map(c => c.text || "").join(" ")
  ).join(" ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Status dot + label ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUSES.find(x => x.id === status) || STATUSES[0];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, color: s.color,
      background: s.color + "12", padding: "3px 9px", borderRadius: 6,
      fontFamily: FONT, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// Column layout: title(1fr) | status(110px) | channels(150px) | derivatives(90px) | words(80px) | date(76px) | actions(72px)
const COL = "1fr 110px 150px 90px 80px 76px 72px";

// ── Table header ─────────────────────────────────────────────────────────────
function TableHeader() {
  const cell = (label, align = "left") => (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".06em", textAlign: align, fontFamily: FONT }}>
      {label}
    </div>
  );
  return (
    <div style={{
      display: "grid", gridTemplateColumns: COL,
      padding: "0 16px 0 20px", gap: 12, alignItems: "center",
      height: 34, borderBottom: `1px solid ${C.border}`,
      background: C.bg,
    }}>
      {cell("Titel")}
      {cell("Status")}
      {cell("Kanäle")}
      {cell("Ableitungen", "center")}
      {cell("Wörter", "center")}
      {cell("Datum", "center")}
      <div />
    </div>
  );
}

// ── Story table row ───────────────────────────────────────────────────────────
function StoryRow({ story, onEdit, onDelete, posts, onOpenPost }) {
  const [hover, setHover] = useState(false);
  const status    = STATUSES.find(s => s.id === story.status) || STATUSES[0];
  const catColor  = CAT_COLOR[story.category] || C.textMid;
  const wordCount = useMemo(() => countWords(story.blocks), [story.blocks]);
  const preview   = useMemo(() => extractPreview(story.blocks, 100), [story.blocks]);
  const derivCount = story.derivatives?.length || 0;
  const targetChs  = (story.targetChannels || []).map(id => STORY_CHANNELS.find(c => c.id === id)).filter(Boolean);
  const derivedChs = (story.derivatives || [])
    .map(d => ({ ...d, ch: STORY_CHANNELS.find(c => c.id === d.channel), post: posts?.find(p => p.id === d.postId && !p.deleted) }))
    .filter(d => d.ch);
  const updatedLabel = story.updatedAt
    ? new Date(story.updatedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })
    : "–";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(story)}
      style={{
        display: "grid", gridTemplateColumns: COL, gap: 12,
        alignItems: "center", padding: "0 16px 0 0",
        background: hover ? T.brand25 : C.surface,
        borderBottom: `1px solid ${C.borderLight}`,
        cursor: "pointer", transition: "background .1s",
        minHeight: 60,
      }}
    >
      {/* ── Col 1: Status stripe + Title + preview ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 0 }}>
        {/* Status color stripe */}
        <div style={{ width: 3, alignSelf: "stretch", background: status.color, flexShrink: 0, borderRadius: "2px 0 0 2px" }} />
        <div style={{ padding: "12px 12px 12px 14px", minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            {story.category && (
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: catColor + "14", color: catColor, fontFamily: FONT, flexShrink: 0 }}>
                {story.category}
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {story.title || "Kein Titel"}
            </span>
          </div>
          {(story.subtitle || preview) && (
            <div style={{ fontSize: 11.5, color: C.textSoft, fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {story.subtitle || preview}
            </div>
          )}
        </div>
      </div>

      {/* ── Col 2: Status badge ── */}
      <div><StatusBadge status={story.status} /></div>

      {/* ── Col 3: Target channels ── */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {targetChs.length > 0 ? targetChs.map(ch => (
          <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 4, border: `1px solid ${ch.color}28`, background: ch.color + "0c" }}>
            <ChIco id={ch.id} size={10} color={ch.color} />
            <span style={{ fontSize: 10, color: ch.color, fontWeight: 600, fontFamily: FONT }}>{ch.label}</span>
          </div>
        )) : <span style={{ fontSize: 11, color: C.textMute, fontFamily: FONT }}>–</span>}
      </div>

      {/* ── Col 4: Derivatives ── */}
      <div style={{ textAlign: "center" }}>
        {derivedChs.length > 0 ? (
          <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
            {derivedChs.map(d => (
              <div key={d.id}
                onClick={e => { e.stopPropagation(); if (d.post) onOpenPost(d.post); }}
                style={{ display: "flex", alignItems: "center", gap: 2, padding: "2px 5px", borderRadius: 4, background: C.success + "12", border: `1px solid ${C.success}28`, cursor: d.post ? "pointer" : "default", opacity: d.post ? 1 : 0.5 }}>
                <ChIco id={d.ch.id} size={9} color={C.success} />
              </div>
            ))}
          </div>
        ) : derivCount > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{derivCount}</span>
        ) : (
          <span style={{ fontSize: 11, color: C.borderLight }}>–</span>
        )}
      </div>

      {/* ── Col 5: Word count ── */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: 12, color: wordCount > 0 ? C.textSoft : C.border, fontFamily: FONT, fontWeight: wordCount > 0 ? 500 : 400 }}>
          {wordCount > 0 ? wordCount.toLocaleString("de") : "–"}
        </span>
      </div>

      {/* ── Col 6: Date ── */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: 11.5, color: C.textMute, fontFamily: FONT }}>{updatedLabel}</span>
      </div>

      {/* ── Col 7: Actions ── */}
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", opacity: hover ? 1 : 0, transition: "opacity .12s" }}>
        <button
          onClick={e => { e.stopPropagation(); onEdit(story); }}
          style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textSoft, cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + "44"; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textSoft; e.currentTarget.style.borderColor = C.border; }}
        >
          <Edit2 size={12} strokeWidth={IW} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); if (window.confirm("Story löschen?")) onDelete(story.id); }}
          style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textMute, cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#e53e3e"; e.currentTarget.style.borderColor = "#e53e3e44"; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textMute; e.currentTarget.style.borderColor = C.border; }}
        >
          <Trash2 size={12} strokeWidth={IW} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StoriesPage() {
  const { stories, setEdStory: onEdit, newStory: onNew, delStory: onDelete, posts, goNav } = useApp();
  const [filt, setFilt] = useState("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => stories.filter(s => {
    const fOk = filt === "all" || s.status === filt;
    const qOk = !q.trim() || (s.title || "").toLowerCase().includes(q.toLowerCase()) || (s.tags || "").toLowerCase().includes(q.toLowerCase());
    return fOk && qOk && !s.deleted;
  }), [stories, filt, q]);

  const counts = useMemo(() => {
    const c = { all: stories.filter(s => !s.deleted).length };
    STATUSES.forEach(s => { c[s.id] = stories.filter(x => x.status === s.id && !x.deleted).length; });
    return c;
  }, [stories]);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
      <style>{CSS}</style>

      {/* ── Top bar ── */}
      <div style={{ padding: "20px 28px 0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 700, fontSize: 20, color: C.text }}>Storys</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.textSoft, fontFamily: FONT }}>
            Inhalte schreiben und für alle Kanäle ableiten
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Btn onClick={onNew}><Plus size={14} strokeWidth={IW} /> Neue Story</Btn>
      </div>

      {/* ── Workflow banner ── */}
      <div style={{ margin: "14px 28px 0", padding: "11px 16px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {[
          { Icon: Compass,  label: "Recherche",      sub: "Inspiration" },
          null,
          { Icon: PenLine,  label: "Story schreiben", sub: "Artikel / Blog" },
          null,
          { Icon: Share2,   label: "Ableiten",        sub: "Alle Kanäle" },
          null,
          { Icon: Send,     label: "Publisher",       sub: "Planen & publizieren" },
        ].map((step, i) => step ? (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <step.Icon size={13} strokeWidth={IW} color={C.textSoft} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.2 }}>{step.label}</div>
              <div style={{ fontSize: 10, color: C.textMute, fontFamily: FONT }}>{step.sub}</div>
            </div>
          </div>
        ) : (
          <ChevronRight key={i} size={12} strokeWidth={2} color={C.border} style={{ flexShrink: 0 }} />
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => goNav("research")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, border: `1px solid ${C.border}`, background: "none", color: C.textSoft, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}
          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + "44"; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textSoft; e.currentTarget.style.borderColor = C.border; }}
        >
          Zur Recherche <ChevronRight size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ padding: "14px 28px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", minWidth: 220 }}>
          <Search size={13} color={C.textMute} strokeWidth={IW} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Suchen…"
            style={{ padding: "7px 30px 7px 30px", borderRadius: 8, border: `1.5px solid ${q ? C.accent : C.border}`, fontSize: 12.5, outline: "none", fontFamily: FONT, background: C.surface, color: C.text, width: "100%", boxSizing: "border-box" }}
          />
          {q && (
            <button onClick={() => setQ("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMute, padding: 2, display: "flex", alignItems: "center" }}>
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Status filter — consistent pill style */}
        <div style={{ display: "flex", gap: 2, background: C.borderLight, borderRadius: 8, padding: 3 }}>
          {[{ id: "all", label: "Alle", color: null }, ...STATUSES].map(s => {
            const on = filt === s.id;
            return (
              <button key={s.id} onClick={() => setFilt(s.id)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6,
                border: "none", fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: on ? C.surface : "transparent",
                color: on ? (s.color || C.text) : C.textSoft,
                boxShadow: on ? "0 1px 3px rgba(0,0,0,.07)" : "none",
                transition: "all .1s",
              }}>
                {s.color && <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />}
                {s.label}
                <span style={{ fontSize: 10, fontWeight: 700, opacity: .65 }}>{counts[s.id] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Story list ── */}
      <div style={{ padding: "0 28px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <BookOpen size={40} strokeWidth={1.2} color={C.border} style={{ margin: "0 auto 14px", display: "block" }} />
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.textSoft }}>
              {q || filt !== "all" ? "Keine Storys gefunden" : "Noch keine Storys"}
            </p>
            <p style={{ margin: "8px 0 20px", fontSize: 13, color: C.textMute, fontFamily: FONT }}>
              {q || filt !== "all" ? "Filter anpassen oder Suche ändern" : "Schreibe deine erste Story und leite Posts für alle Kanäle ab."}
            </p>
            {!q && filt === "all" && <Btn onClick={onNew}><Plus size={14} strokeWidth={IW} /> Erste Story erstellen</Btn>}
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <TableHeader />
            {filtered.map((story, i) => (
              <StoryRow key={story.id} story={story} onEdit={onEdit} onDelete={onDelete} posts={posts} onOpenPost={setEdPost} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
