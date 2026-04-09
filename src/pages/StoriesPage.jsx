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

// ── Story list row ───────────────────────────────────────────────────────────
function StoryRow({ story, onEdit, onDelete, posts, onOpenPost }) {
  const [hover, setHover] = useState(false);
  const status  = STATUSES.find(s => s.id === story.status) || STATUSES[0];
  const catColor = CAT_COLOR[story.category] || C.textMid;
  const wordCount = useMemo(() => countWords(story.blocks), [story.blocks]);
  const preview   = useMemo(() => extractPreview(story.blocks), [story.blocks]);
  const derivCount  = story.derivatives?.length || 0;
  const linkCount   = (story.materials || []).filter(m => m.type === "link").length;
  const noteCount   = (story.materials || []).filter(m => m.type === "note").length;
  const targetChs   = (story.targetChannels || []).map(id => STORY_CHANNELS.find(c => c.id === id)).filter(Boolean);
  const derivedChs  = (story.derivatives || [])
    .map(d => ({ ...d, ch: STORY_CHANNELS.find(c => c.id === d.channel), post: posts?.find(p => p.id === d.postId && !p.deleted) }))
    .filter(d => d.ch);

  const updatedLabel = story.updatedAt
    ? new Date(story.updatedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })
    : null;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(story)}
      style={{
        display: "flex", alignItems: "stretch",
        background: C.surface,
        border: `1px solid ${hover ? C.accent + "44" : C.border}`,
        borderRadius: 10, overflow: "hidden", cursor: "pointer",
        transition: "box-shadow .15s, border-color .15s",
        boxShadow: hover ? T.shadowSm : "none",
      }}
    >
      {/* Status stripe */}
      <div style={{ width: 4, flexShrink: 0, background: status.color }} />

      {/* Main content */}
      <div style={{ flex: 1, padding: "14px 18px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Category + title row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              {story.category && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4,
                  background: catColor + "14", color: catColor, fontFamily: FONT,
                }}>
                  {story.category}
                </span>
              )}
              <h3 style={{
                margin: 0, fontFamily: FONT, fontWeight: 700,
                fontSize: 14, color: C.text, lineHeight: 1.4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                flex: 1, minWidth: 0,
              }}>
                {story.title || "Kein Titel"}
              </h3>
            </div>

            {/* Subtitle or preview text */}
            {(story.subtitle || preview) && (
              <p style={{
                margin: "0 0 10px", fontSize: 12.5, color: C.textSoft, fontFamily: FONT, lineHeight: 1.55,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {story.subtitle || preview}
              </p>
            )}

            {/* Meta row */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {/* Word count */}
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textMute, fontFamily: FONT }}>
                <BookOpen size={11} strokeWidth={IW} />
                {wordCount > 0 ? `${wordCount} Wörter` : "Leer"}
              </span>

              {/* Materials */}
              {linkCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: C.textMute }}>
                  <LinkIcon size={11} strokeWidth={IW} /> {linkCount} Link{linkCount !== 1 ? "s" : ""}
                </span>
              )}
              {noteCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: C.textMute }}>
                  <StickyNote size={11} strokeWidth={IW} /> {noteCount}
                </span>
              )}

              {/* Derivatives */}
              {derivCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.accent, fontWeight: 600 }}>
                  <Layers size={11} strokeWidth={IW} />
                  {derivCount} Ableit{derivCount !== 1 ? "ungen" : "ung"}
                </span>
              )}

              {/* Date */}
              {updatedLabel && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: C.textMute }}>
                  <Clock size={10} strokeWidth={IW} /> {updatedLabel}
                </span>
              )}
            </div>
          </div>

          {/* Right: status + channels + actions */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
            <StatusBadge status={story.status} />

            {/* Target channels */}
            {targetChs.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {targetChs.map(ch => (
                  <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5, border: `1px solid ${ch.color}30`, background: ch.color + "0c" }}>
                    <ChIco id={ch.id} size={10} color={ch.color} />
                    <span style={{ fontSize: 10, color: ch.color, fontWeight: 600, fontFamily: FONT }}>{ch.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Derived channel pills */}
            {derivedChs.length > 0 && (
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {derivedChs.map(d => (
                  <div key={d.id}
                    onClick={e => { e.stopPropagation(); if (d.post) onOpenPost(d.post); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 3, padding: "2px 6px",
                      borderRadius: 5, background: C.success + "12", border: `1px solid ${C.success}30`,
                      cursor: d.post ? "pointer" : "default", opacity: d.post ? 1 : 0.5,
                    }}>
                    <ChIco id={d.ch.id} size={9} color={C.success} />
                    <span style={{ fontSize: 9.5, color: C.success, fontWeight: 700, fontFamily: FONT }}>{d.ch.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 4, opacity: hover ? 1 : 0, transition: "opacity .12s" }}>
              <button
                onClick={e => { e.stopPropagation(); onEdit(story); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textSoft, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "55"; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSoft; }}
              >
                <Edit2 size={11} strokeWidth={IW} /> Öffnen
              </button>
              <button
                onClick={e => { e.stopPropagation(); if (window.confirm("Story löschen?")) onDelete(story.id); }}
                style={{ display: "flex", alignItems: "center", padding: "4px 7px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textMute, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#e53e3e"; e.currentTarget.style.borderColor = "#e53e3e44"; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textMute; e.currentTarget.style.borderColor = C.border; }}
              >
                <Trash2 size={11} strokeWidth={IW} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StoriesPage() {
  const { stories, setEdStory: onEdit, newStory: onNew, delStory: onDelete, posts, setEdPost, newPost, goNav } = useApp();
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
        <button
          onClick={() => { newPost(); goNav("publisher"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.textSoft, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT, transition: "all .12s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "55"; e.currentTarget.style.color = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSoft; }}
        >
          <Send size={13} strokeWidth={IW} /> Direktpost
        </button>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(story => (
              <StoryRow key={story.id} story={story} onEdit={onEdit} onDelete={onDelete} posts={posts} onOpenPost={setEdPost} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
