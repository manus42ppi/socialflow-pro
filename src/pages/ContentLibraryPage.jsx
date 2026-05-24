/**
 * ContentLibraryPage — Unified Content Hub
 *
 * COPE-Prinzip (Create Once Publish Everywhere):
 * Zeigt Artikel (Stories) und Posts in einer einzigen Liste.
 * Artikel sind Hubs, abgeleitete Posts sind Spokes — visuell eingerückt.
 *
 * Daten-Quellen:
 *   - stories[]  → contentType "article"
 *   - posts[]    → contentType "post"
 * Beziehung: story.derivatives[].postId verlinkt Post zu Story (Hub→Spoke).
 */
import { useState, useMemo, useRef, useEffect } from "react";
import {
  BookOpen, Send, Plus, Search, ChevronDown, ChevronRight,
  X, Sparkles, Globe, FileText, Link as LinkIcon, Layers,
} from "lucide-react";
import { C, T, FONT, IW, TYPO } from "../constants/colors.js";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Content type definitions ──────────────────────────────────────────────────
const CT = {
  article: { label:"Artikel",  Icon:BookOpen, color:"#3B82F6", bg:"#EFF6FF", border:"#BFDBFE" },
  post:    { label:"Post",     Icon:Send,     color:"#059669", bg:"#ECFDF5", border:"#A7F3D0" },
  page:    { label:"Seite",    Icon:Globe,    color:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE" },
};

// ── Status definitions ────────────────────────────────────────────────────────
const ST = {
  idea:      { label:"Idee",           dot:"#818CF8" },
  draft:     { label:"Entwurf",        dot:"#F59E0B" },
  ready:     { label:"Bereit",         dot:"#10B981" },
  pending:   { label:"Zur Freigabe",   dot:"#3B82F6" },
  scheduled: { label:"Geplant",        dot:"#0EA5E9" },
  published: { label:"Veröffentlicht", dot:"#7C3AED" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function blocksToPreview(blocks, max = 110) {
  if (!blocks?.length) return "";
  const text = blocks
    .flatMap(b => (b.content || []).filter(c => c.type === "text").map(c => c.text))
    .join(" ").trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function blocksToWordCount(blocks) {
  if (!blocks?.length) return 0;
  const text = blocks
    .flatMap(b => (b.content || []).filter(c => c.type === "text").map(c => c.text))
    .join(" ").trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-DE", { day:"numeric", month:"short" });
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const cfg = CT[type] || CT.post;
  const { Icon } = cfg;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"2px 7px", borderRadius:5,
      background:cfg.bg, color:cfg.color,
      fontSize:10.5, fontWeight:700, letterSpacing:".03em",
      fontFamily:FONT, border:`1px solid ${cfg.border}`,
      flexShrink:0,
    }}>
      <Icon size={9} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ── StatusDot ─────────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const cfg = ST[status] || { label:status, dot:T.gray400 };
  return (
    <span style={{ display:"flex", alignItems:"center", gap:4, ...TYPO.caption, color:T.gray500, flexShrink:0 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ── ChannelRow ────────────────────────────────────────────────────────────────
function ChannelRow({ channels, max = 5 }) {
  if (!channels?.length) return null;
  const visible = channels.slice(0, max);
  const rest    = channels.length - max;
  return (
    <span style={{ display:"flex", alignItems:"center", gap:3 }}>
      {visible.map(ch => <ChIco key={ch} id={ch} size={12} />)}
      {rest > 0 && <span style={{ ...TYPO.caption, color:C.textMute }}>+{rest}</span>}
    </span>
  );
}

// ── DerivativesToggle ─────────────────────────────────────────────────────────
function DerivativesToggle({ count, expanded, onToggle }) {
  if (!count) return null;
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      style={{
        display:"flex", alignItems:"center", gap:4,
        padding:"3px 8px", borderRadius:6, flexShrink:0,
        border:`1px solid ${expanded ? T.brand100 : C.borderLight}`,
        background: expanded ? T.brand25 : C.surface,
        color: expanded ? "#3B82F6" : C.textSoft,
        cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:FONT,
        transition:"all .15s",
      }}
    >
      {expanded
        ? <ChevronDown  size={10} strokeWidth={2.5} />
        : <ChevronRight size={10} strokeWidth={2.5} />}
      {count} {count === 1 ? "Ableitung" : "Ableitungen"}
    </button>
  );
}

// ── ContentRow ────────────────────────────────────────────────────────────────
function ContentRow({ item, type, isChild, onClick, derivCount, expanded, onToggle }) {
  const [hover, setHover] = useState(false);
  const cfg  = CT[type] || CT.post;
  const { Icon } = cfg;

  const channels  = item.targetChannels || item.channels || [];
  const updatedAt = item.updatedAt || item.createdAt;

  const preview = useMemo(() => {
    if (type === "article") return blocksToPreview(item.blocks);
    if (item.content) return item.content.slice(0, 110) + (item.content.length > 110 ? "…" : "");
    return "";
  }, [item, type]);

  const meta = useMemo(() => {
    if (type === "article") {
      const wc = blocksToWordCount(item.blocks);
      return wc > 0 ? `${wc} Wörter` : null;
    }
    if (item.content) return `${item.content.length} Zeichen`;
    return null;
  }, [item, type]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:"flex", alignItems:"flex-start", gap:12,
        padding: isChild ? "11px 16px 11px 52px" : "13px 16px",
        background: hover ? (isChild ? "#F8FAFF" : C.bg) : "transparent",
        cursor:"pointer", outline:"none",
        transition:"background .1s",
        position:"relative",
      }}
    >
      {/* ── Child indent guide ── */}
      {isChild && (
        <>
          <div style={{
            position:"absolute", left:32, top:0, bottom:0,
            width:1, background:T.brand100,
          }} />
          <div style={{
            position:"absolute", left:32, top:22,
            width:12, height:1, background:T.brand100,
          }} />
        </>
      )}

      {/* ── Type icon ── */}
      <div style={{
        width:34, height:34, borderRadius:9, flexShrink:0,
        background: isChild ? cfg.bg + "aa" : cfg.bg,
        border:`1.5px solid ${cfg.border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        marginTop:1,
      }}>
        <Icon size={14} color={cfg.color} strokeWidth={2} />
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1, minWidth:0 }}>
        {/* Title row */}
        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:3 }}>
          <span style={{
            fontSize: isChild ? 13 : 13.5,
            fontWeight: isChild ? 600 : 700,
            color: C.text,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            maxWidth:380,
          }}>
            {item.title || "Ohne Titel"}
          </span>
          <TypeBadge type={type} />
          <StatusDot status={item.status} />
        </div>

        {/* Preview text — only on hubs */}
        {!isChild && preview && (
          <div style={{
            ...TYPO.caption, color:C.textSoft, marginBottom:5,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            maxWidth:480,
          }}>
            {preview}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <ChannelRow channels={channels} />
          {meta     && <span style={{ ...TYPO.nano, color:C.textMute }}>{meta}</span>}
          {item.category && <span style={{ ...TYPO.nano, color:C.textMute }}>{item.category}</span>}
          {updatedAt && <span style={{ ...TYPO.nano, color:C.textMute }}>{fmtDate(updatedAt)}</span>}
          {item.campaignId && (
            <span style={{ ...TYPO.nano, color:"#6941C6" }}>Kampagne</span>
          )}
        </div>
      </div>

      {/* ── Derivatives toggle (hub only) ── */}
      {!isChild && (
        <div style={{ display:"flex", alignItems:"center", paddingTop:2 }}>
          <DerivativesToggle count={derivCount} expanded={expanded} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
}

// ── New content type picker ───────────────────────────────────────────────────
function TypePicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const options = [
    {
      type:"article",
      label:"Neuer Artikel",
      sub:"Langer Inhalt · BlockNote-Editor · SEO · Ableitungen",
      ...CT.article,
    },
    {
      type:"post",
      label:"Neuer Post",
      sub:"Social Media · Channel-Previews · Kanal-Varianten",
      ...CT.post,
    },
  ];

  return (
    <div ref={ref} style={{
      position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:200,
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:12, padding:8, boxShadow:T.shadowLg, minWidth:260,
      display:"flex", flexDirection:"column", gap:2,
    }}>
      {options.map(opt => {
        const { Icon } = opt;
        return (
          <button
            key={opt.type}
            onClick={() => { onSelect(opt.type); onClose(); }}
            style={{
              display:"flex", alignItems:"center", gap:11,
              padding:"9px 11px", borderRadius:8, border:"none",
              background:"transparent", cursor:"pointer", textAlign:"left",
              fontFamily:FONT, transition:"background .1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.bg}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{
              width:34, height:34, borderRadius:9, flexShrink:0,
              background:opt.bg, border:`1.5px solid ${opt.border}`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Icon size={15} color={opt.color} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:2 }}>
                {opt.label}
              </div>
              <div style={{ ...TYPO.caption, color:C.textMute }}>{opt.sub}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer",
        background: active ? C.accent + "18" : "transparent",
        color: active ? C.accent : C.textSoft,
        fontSize:12, fontWeight:600, fontFamily:FONT,
        transition:"all .12s",
      }}
    >
      {label}
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <div style={{ padding:"52px 24px", textAlign:"center" }}>
      <div style={{
        width:56, height:56, borderRadius:14, background:CT.article.bg,
        display:"flex", alignItems:"center", justifyContent:"center",
        margin:"0 auto 16px",
      }}>
        <Layers size={24} color={CT.article.color} strokeWidth={1.5} />
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>
        {filtered ? "Keine Treffer" : "Noch keine Inhalte"}
      </div>
      <div style={{ ...TYPO.caption, color:C.textMute, maxWidth:280, margin:"0 auto" }}>
        {filtered
          ? "Versuche einen anderen Filter oder lösche die Suche."
          : "Erstelle deinen ersten Artikel oder Post — alles an einem Ort."}
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionDivider({ label, count }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8,
      padding:"7px 16px",
      background:T.gray50,
      borderTop:`1px solid ${C.borderLight}`,
      borderBottom:`1px solid ${C.borderLight}`,
    }}>
      <span style={{ ...TYPO.nano, color:T.gray500 }}>{label}</span>
      <span style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:16, height:16, borderRadius:"50%",
        background:T.gray200, color:T.gray500,
        fontSize:9, fontWeight:800,
      }}>{count}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ContentLibraryPage() {
  const {
    stories, posts,
    setEdStory, setEdPost,
    newStory, newPost,
  } = useApp();

  const [typeFilter,   setTypeFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chFilter,     setChFilter]     = useState("all");
  const [search,       setSearch]       = useState("");
  const [expanded,     setExpanded]     = useState({});
  const [showPicker,   setShowPicker]   = useState(false);

  const allPosts = useMemo(() => posts.filter(p => !p.deleted), [posts]);

  // ── Build parent→child map ──────────────────────────────────────────────
  const childMap = useMemo(() => {
    const map = {};
    stories.forEach(s => {
      const ids = (s.derivatives || []).map(d => d.postId).filter(Boolean);
      map[s.id] = allPosts.filter(p => ids.includes(p.id));
    });
    return map;
  }, [stories, allPosts]);

  const derivedIds = useMemo(() => {
    return new Set(Object.values(childMap).flat().map(p => p.id));
  }, [childMap]);

  const standalonePosts = useMemo(
    () => allPosts.filter(p => !derivedIds.has(p.id)),
    [allPosts, derivedIds]
  );

  // ── All unique channels (for filter) ────────────────────────────────────
  const allChannels = useMemo(() => {
    const s = new Set();
    stories.forEach(x => (x.targetChannels || []).forEach(c => s.add(c)));
    allPosts.forEach(x => (x.channels || []).forEach(c => s.add(c)));
    return [...s];
  }, [stories, allPosts]);

  // ── Filter functions ─────────────────────────────────────────────────────
  const matchArticle = s => {
    if (typeFilter === "post") return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (chFilter !== "all" && !(s.targetChannels || []).includes(chFilter)) return false;
    if (search && !s.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };
  const matchPost = p => {
    if (typeFilter === "article") return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (chFilter !== "all" && !(p.channels || []).includes(chFilter)) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const filteredArticles  = useMemo(() => stories.filter(matchArticle), [stories, typeFilter, statusFilter, chFilter, search]);
  const filteredStandalone = useMemo(() => standalonePosts.filter(matchPost), [standalonePosts, typeFilter, statusFilter, chFilter, search]);

  const isFiltered = typeFilter !== "all" || statusFilter !== "all" || chFilter !== "all" || !!search;
  const isEmpty    = filteredArticles.length === 0 && filteredStandalone.length === 0;

  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCreate = type => {
    if (type === "article") newStory();
    else                    newPost();
  };

  const openItem = (item, type) => {
    if (type === "article") setEdStory(item);
    else                    setEdPost(item);
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalArticles   = stories.length;
  const totalPosts      = allPosts.length;
  const publishedCount  = [...stories, ...allPosts].filter(x => x.status === "published").length;

  return (
    <div style={{ flex:1, overflow:"auto", padding:"14px 18px", background:C.bg, fontFamily:FONT }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:C.text, margin:0, letterSpacing:"-.3px" }}>
            Inhalte
          </h1>
          <div style={{ ...TYPO.caption, color:C.textMute, marginTop:3 }}>
            {totalArticles} Artikel · {totalPosts} Posts · {publishedCount} veröffentlicht
          </div>
        </div>

        {/* Create button */}
        <div style={{ position:"relative" }}>
          <button
            onClick={() => setShowPicker(p => !p)}
            style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"8px 14px", borderRadius:8,
              background:C.accent, color:"#fff", border:"none",
              cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:FONT,
              boxShadow:`0 2px 8px ${C.accent}40`,
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Neuer Inhalt
          </button>
          {showPicker && (
            <TypePicker
              onSelect={handleCreate}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14,
      }}>
        {[
          { label:"Artikel", value:totalArticles, ...CT.article },
          { label:"Posts",   value:totalPosts,    ...CT.post    },
          { label:"Live",    value:publishedCount, color:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE", Icon:Sparkles },
        ].map(({ label, value, color, bg, border, Icon: Ico }) => (
          <div key={label} style={{
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"10px 14px",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background:bg, border:`1.5px solid ${border}`,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              <Ico size={14} color={color} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:C.text, lineHeight:1 }}>{value}</div>
              <div style={{ ...TYPO.caption, color:C.textMute, marginTop:1 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:10, padding:"9px 14px", marginBottom:12,
        display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
      }}>
        {/* Search */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:150 }}>
          <Search size={13} color={C.textMute} strokeWidth={IW} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Titel suchen …"
            style={{
              border:"none", background:"transparent", outline:"none",
              fontSize:12.5, color:C.text, fontFamily:FONT, width:"100%",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ border:"none", background:"none", cursor:"pointer", color:C.textMute, padding:0, display:"flex" }}>
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>

        <div style={{ width:1, height:18, background:C.borderLight, flexShrink:0 }} />

        {/* Type */}
        <div style={{ display:"flex", gap:2 }}>
          <FilterChip label="Alle"    active={typeFilter==="all"}     onClick={() => setTypeFilter("all")} />
          <FilterChip label="Artikel" active={typeFilter==="article"} onClick={() => setTypeFilter("article")} />
          <FilterChip label="Posts"   active={typeFilter==="post"}    onClick={() => setTypeFilter("post")} />
        </div>

        <div style={{ width:1, height:18, background:C.borderLight, flexShrink:0 }} />

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            border:"none", background:"transparent", outline:"none",
            fontSize:12, color:C.textSoft, fontFamily:FONT, cursor:"pointer",
          }}
        >
          <option value="all">Alle Status</option>
          <option value="idea">Idee</option>
          <option value="draft">Entwurf</option>
          <option value="ready">Bereit</option>
          <option value="pending">Zur Freigabe</option>
          <option value="scheduled">Geplant</option>
          <option value="published">Veröffentlicht</option>
        </select>

        {/* Channel filter */}
        {allChannels.length > 0 && (
          <>
            <div style={{ width:1, height:18, background:C.borderLight, flexShrink:0 }} />
            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
              <span style={{ ...TYPO.nano, color:C.textMute }}>KANAL</span>
              <button
                onClick={() => setChFilter("all")}
                style={{
                  padding:"2px 6px", borderRadius:4, border:"none", cursor:"pointer",
                  background: chFilter==="all" ? C.bg : "transparent",
                  color: chFilter==="all" ? C.text : C.textMute,
                  fontSize:11, fontWeight:600, fontFamily:FONT,
                }}
              >Alle</button>
              {allChannels.map(ch => (
                <button
                  key={ch}
                  title={ch}
                  onClick={() => setChFilter(chFilter===ch ? "all" : ch)}
                  style={{
                    padding:"2px 3px", borderRadius:4, border:"none", cursor:"pointer",
                    background: chFilter===ch ? C.bg : "transparent",
                    opacity: chFilter!=="all" && chFilter!==ch ? 0.35 : 1,
                    transition:"opacity .15s",
                  }}
                >
                  <ChIco id={ch} size={14} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Reset all */}
        {isFiltered && (
          <button
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setChFilter("all"); setSearch(""); }}
            style={{
              marginLeft:"auto", padding:"3px 8px", borderRadius:6,
              border:`1px solid ${C.borderLight}`, background:C.surface,
              color:C.textSoft, cursor:"pointer", fontSize:11, fontWeight:600,
              fontFamily:FONT, display:"flex", alignItems:"center", gap:4,
            }}
          >
            <X size={10} strokeWidth={2} />
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* ── Content count ── */}
      {!isEmpty && (
        <div style={{ ...TYPO.caption, color:C.textMute, marginBottom:6, paddingLeft:2 }}>
          {filteredArticles.length + filteredStandalone.length} Inhalte
          {isFiltered && " (gefiltert)"}
        </div>
      )}

      {/* ── Main list ── */}
      <div style={{
        background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:12, overflow:"hidden",
      }}>
        {isEmpty ? (
          <EmptyState filtered={isFiltered} />
        ) : (
          <>
            {/* Articles + their derivatives */}
            {filteredArticles.length > 0 && (
              <>
                {typeFilter === "all" && filteredStandalone.length > 0 && (
                  <SectionDivider label="ARTIKEL" count={filteredArticles.length} />
                )}
                {filteredArticles.map((article, idx) => {
                  const children = childMap[article.id] || [];
                  const isExp    = !!expanded[article.id];
                  const isLast   = idx === filteredArticles.length - 1 && filteredStandalone.length === 0;

                  return (
                    <div key={article.id}>
                      {idx > 0 && (
                        <div style={{ height:1, background:C.borderLight, margin:"0 16px" }} />
                      )}

                      {/* Hub row */}
                      <ContentRow
                        item={article}
                        type="article"
                        isChild={false}
                        derivCount={children.length}
                        expanded={isExp}
                        onToggle={() => toggleExpand(article.id)}
                        onClick={() => openItem(article, "article")}
                      />

                      {/* Spoke rows */}
                      {isExp && children.map(post => (
                        <div key={post.id} style={{ background:"#F8FAFF" }}>
                          <div style={{ height:1, background:T.brand100, margin:"0 16px 0 52px" }} />
                          <ContentRow
                            item={post}
                            type="post"
                            isChild={true}
                            derivCount={0}
                            expanded={false}
                            onToggle={() => {}}
                            onClick={e => { e?.stopPropagation(); openItem(post, "post"); }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}

            {/* Standalone posts */}
            {filteredStandalone.length > 0 && (
              <>
                {typeFilter === "all" && filteredArticles.length > 0 && (
                  <SectionDivider label="POSTS" count={filteredStandalone.length} />
                )}
                {filteredStandalone.map((post, idx) => (
                  <div key={post.id}>
                    {(typeFilter === "all" && filteredArticles.length === 0 && idx > 0) && (
                      <div style={{ height:1, background:C.borderLight, margin:"0 16px" }} />
                    )}
                    {(typeFilter !== "all" && idx > 0) && (
                      <div style={{ height:1, background:C.borderLight, margin:"0 16px" }} />
                    )}
                    <ContentRow
                      item={post}
                      type="post"
                      isChild={false}
                      derivCount={0}
                      expanded={false}
                      onToggle={() => {}}
                      onClick={() => openItem(post, "post")}
                    />
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* ── COPE hint ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:8, marginTop:12,
        padding:"8px 12px", borderRadius:8,
        background:"#FFFBEB", border:"1px solid #FDE68A",
        fontSize:11.5, color:"#92400E", fontFamily:FONT,
      }}>
        <Sparkles size={13} color="#D97706" strokeWidth={2} />
        <span>
          <strong>Hub & Spoke:</strong> Klicke auf "Ableitungen" bei einem Artikel um abgeleitete Posts zu sehen.
          Neue Ableitungen erstellst du im Story-Editor unter dem Tab "Info".
        </span>
      </div>
    </div>
  );
}
