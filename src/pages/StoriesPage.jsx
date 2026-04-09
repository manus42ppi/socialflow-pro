import { useState, useMemo } from "react";
import { Plus, Search, Trash2, BookOpen, Link as LinkIcon, StickyNote, Layers, Send, ArrowRight } from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { STORY_CHANNELS } from "../constants/demo.js";
import { fmtDate, uid } from "../utils/store.js";
import { Btn } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

const STATUSES = [
  { id:"idea",      label:"Idee",           color:"#6366F1", icon:"💡" },
  { id:"draft",     label:"Entwurf",        color:"#F59E0B", icon:"✏️" },
  { id:"ready",     label:"Bereit",         color:"#10B981", icon:"✅" },
  { id:"published", label:"Veröffentlicht", color:"#0EA5E9", icon:"🚀" },
];

const CAT_COLOR = {Marketing:"#E1306C",Tech:"#8B5CF6",Lifestyle:"#EC4899",Wirtschaft:"#10B981",Politik:"#3B82F6",Kultur:"#6366F1",Gesundheit:"#EF4444",Reise:"#14B8A6",Bildung:"#F97316",Andere:"#6B7280"};

function countWords(blocks) {
  if (!blocks?.length) return 0;
  const extract = (content) => {
    if (!content || !Array.isArray(content)) return "";
    return content.map(item => item.type === "text" ? (item.text || "") : "").join(" ");
  };
  const text = blocks.map(b => extract(b.content)).join(" ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Story Card ─────────────────────────────────────────────────────────────
function StoryCard({ story, onEdit, onDelete, posts, onOpenPost }) {
  const [hover, setHover] = useState(false);
  const status = STATUSES.find(s => s.id === story.status) || STATUSES[0];
  const catColor = CAT_COLOR[story.category] || C.textMid;
  const wordCount = useMemo(() => countWords(story.blocks), [story.blocks]);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const materialCount = story.materials?.length || 0;
  const derivCount = story.derivatives?.length || 0;
  const targetChs = (story.targetChannels || []).map(id => STORY_CHANNELS.find(c => c.id === id)).filter(Boolean);
  // Which channels already have a derivative post
  const derivedChannels = (story.derivatives || [])
    .map(d => ({ ...d, ch: STORY_CHANNELS.find(c => c.id === d.channel), post: posts?.find(p => p.id === d.postId && !p.deleted) }))
    .filter(d => d.ch);
  const linkCount = (story.materials || []).filter(m => m.type === "link").length;
  const noteCount = (story.materials || []).filter(m => m.type === "note").length;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(story)}
      style={{
        background: C.surface,
        border: `1px solid ${hover ? C.accent + "44" : C.border}`,
        borderRadius: 12, overflow: "hidden", cursor: "pointer",
        transition: "all .15s",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 8px 24px rgba(0,0,0,.1)" : "0 1px 3px rgba(0,0,0,.04)",
      }}
    >
      {/* Color accent bar */}
      <div style={{ height: 3, background: status.color }} />

      <div style={{ padding: "16px 18px" }}>
        {/* Header: category + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {story.category && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: catColor + "15", color: catColor, fontFamily: FONT,
            }}>{story.category}</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: status.color + "15", color: status.color, fontFamily: FONT,
            display: "flex", alignItems: "center", gap: 3,
          }}>
            {status.icon} {status.label}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={e => { e.stopPropagation(); if (window.confirm("Story löschen?")) onDelete(story.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute, padding: "2px 4px", opacity: hover ? 1 : 0, transition: "opacity .12s" }}>
            <Trash2 size={13} strokeWidth={IW} />
          </button>
        </div>

        {/* Title */}
        <h3 style={{
          margin: "0 0 4px", fontFamily: FONT, fontWeight: 800,
          fontSize: 15, color: C.text, lineHeight: 1.3,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {story.title || "Kein Titel"}
        </h3>
        {story.subtitle && (
          <p style={{
            margin: "0 0 12px", fontSize: 12, color: C.textMid, fontFamily: FONT, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{story.subtitle}</p>
        )}

        {/* Target channels */}
        {targetChs.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
            {targetChs.map(ch => (
              <div key={ch.id} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                borderRadius: 6, border: `1px solid ${ch.color}33`,
                background: ch.color + "0d",
              }}>
                <ChIco id={ch.id} size={11} color={ch.color} />
                <span style={{ fontSize: 10, color: ch.color, fontWeight: 600, fontFamily: FONT }}>{ch.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Derived channel badges */}
        {derivedChannels.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: C.textMute, fontFamily: FONT }}>Abgeleitet:</span>
            {derivedChannels.map(d => (
              <div key={d.id}
                onClick={e => { e.stopPropagation(); if (d.post) onOpenPost(d.post); }}
                title={d.post ? `${d.ch.label} – Post öffnen` : `${d.ch.label} – Post nicht gefunden`}
                style={{
                  display: "flex", alignItems: "center", gap: 3, padding: "2px 7px",
                  borderRadius: 6, background: "#ECFDF3", border: `1px solid #BBF7D0`,
                  cursor: d.post ? "pointer" : "default",
                  opacity: d.post ? 1 : 0.5,
                }}>
                <ChIco id={d.ch.id} size={10} color={C.success} />
                <span style={{ fontSize: 10, color: C.success, fontWeight: 700, fontFamily: FONT }}>{d.ch.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 14, fontSize: 11, color: C.textMute,
          fontFamily: FONT, paddingTop: 10, borderTop: `1px solid ${C.borderLight}`,
          flexWrap: "wrap",
        }}>
          <span title="Wörter" style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <BookOpen size={11} strokeWidth={IW} />
            {wordCount > 0 ? `${wordCount} Wörter · ${readingTime} Min.` : "Noch kein Text"}
          </span>
          {materialCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {linkCount > 0 && <><LinkIcon size={11} strokeWidth={IW} /> {linkCount}</>}
              {noteCount > 0 && <><StickyNote size={11} strokeWidth={IW} /> {noteCount}</>}
            </span>
          )}
          {derivCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Layers size={11} strokeWidth={IW} />
              {derivCount} Ableitungen
            </span>
          )}
          {story.updatedAt && (
            <span style={{ marginLeft: "auto", color: C.textMute }}>
              {new Date(story.updatedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
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
    const c = { all: stories.length };
    STATUSES.forEach(s => { c[s.id] = stories.filter(x => x.status === s.id).length; });
    return c;
  }, [stories]);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: C.text }}>
            Storys
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMid, fontFamily: FONT }}>
            Ideen sammeln, Inhalte schreiben, für alle Kanäle ableiten
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {/* Secondary: direct post shortcut */}
        <button onClick={() => { newPost(); goNav("publisher"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.textSoft, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT, transition: "all .12s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "66"; e.currentTarget.style.color = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSoft; }}
        >
          <Send size={13} strokeWidth={IW} /> Direktpost
        </button>
        <Btn onClick={onNew}>
          <Plus size={15} strokeWidth={IW} /> Neue Story
        </Btn>
      </div>

      {/* Workflow info banner */}
      <div style={{ margin: "16px 28px 0", padding: "12px 16px", borderRadius: 10, background: C.accent + "08", border: `1px solid ${C.accent}22`, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          {[
            { icon: "💡", label: "Recherche", sub: "Inspiration & Quellen" },
            { icon: "→" },
            { icon: "✍️", label: "Story schreiben", sub: "Artikel / Blogpost" },
            { icon: "→" },
            { icon: "📲", label: "Ableiten", sub: "Instagram · LinkedIn · Print …" },
            { icon: "→" },
            { icon: "📅", label: "Publisher", sub: "Planen & veröffentlichen" },
          ].map((step, i) => step.label ? (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 15 }}>{step.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: FONT }}>{step.label}</div>
                <div style={{ fontSize: 10, color: C.textMute, fontFamily: FONT }}>{step.sub}</div>
              </div>
            </div>
          ) : (
            <ArrowRight key={i} size={12} color={C.accent} strokeWidth={2} style={{ flexShrink: 0 }} />
          ))}
        </div>
        <button onClick={() => goNav("research")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.accent}33`, background: C.accent + "10", color: C.accent, fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>
          Zur Recherche <ArrowRight size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ padding: "16px 28px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "0 12px", minWidth: 220,
        }}>
          <Search size={14} strokeWidth={IW} color={C.textMute} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Suchen…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: FONT, color: C.text, padding: "8px 0", width: "100%" }}
          />
        </div>

        {/* Status filter pills */}
        {[["all", "Alle", null], ...STATUSES.map(s => [s.id, `${s.icon} ${s.label}`, s.color])].map(([id, label, color]) => (
          <button key={id} onClick={() => setFilt(id)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontFamily: FONT, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${filt === id ? (color || C.accent) : C.border}`,
              background: filt === id ? (color || C.accent) + "12" : "transparent",
              color: filt === id ? (color || C.accent) : C.textMid,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}>
            {label}
            <span style={{
              background: filt === id ? (color || C.accent) : C.borderLight,
              color: filt === id ? (color || C.accent) : C.textMute,
              borderRadius: 10, fontSize: 10, padding: "0 5px", fontWeight: 700,
            }}>{counts[id] || 0}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ padding: "0 28px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.textMute }}>
            <BookOpen size={48} strokeWidth={1.2} style={{ margin: "0 auto 16px", display: "block", color: C.border }} />
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.textSoft }}>
              {q || filt !== "all" ? "Keine Storys gefunden" : "Noch keine Storys"}
            </p>
            <p style={{ margin: "8px 0 20px", fontSize: 13, fontFamily: FONT }}>
              {q || filt !== "all" ? "Andere Filter probieren" : "Erstelle deine erste Story – schreibe einen Artikel und leite Social-Media-Posts ab."}
            </p>
            {!q && filt === "all" && <Btn onClick={onNew}><Plus size={14} strokeWidth={IW} /> Erste Story erstellen</Btn>}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}>
            {filtered.map(story => (
              <StoryCard key={story.id} story={story} onEdit={onEdit} onDelete={onDelete} posts={posts} onOpenPost={setEdPost} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
