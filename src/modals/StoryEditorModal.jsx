import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import "@blocknote/ariakit/style.css";
import { useCreateBlockNote, useBlockNoteEditor, FilePanelController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Save, Check, Link as LinkIcon, StickyNote,
  Trash2, Wand2, Loader, Image as ImageIcon,
  ChevronLeft, Settings2, AlignLeft,
} from "lucide-react";
import { C, FONT, IW, CSS } from "../constants/colors.js";
import { STORY_CHANNELS } from "../constants/demo.js";
import { uid, aiCall, fileToDataURL } from "../utils/store.js";
import { Btn } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CATS = ["","Marketing","Tech","Lifestyle","Wirtschaft","Politik","Kultur","Gesundheit","Reise","Bildung","Andere"];
const CAT_COLOR = {Marketing:"#E1306C",Tech:"#8B5CF6",Lifestyle:"#EC4899",Wirtschaft:"#10B981",Politik:"#3B82F6",Kultur:"#6366F1",Gesundheit:"#EF4444",Reise:"#14B8A6",Bildung:"#F97316",Andere:"#6B7280"};

const STATUSES = [
  { id:"idea",      label:"Idee",           color:"#6366F1", desc:"Ersten Gedanken sammeln" },
  { id:"draft",     label:"Entwurf",        color:"#F59E0B", desc:"Inhalt wird geschrieben" },
  { id:"ready",     label:"Bereit",         color:"#10B981", desc:"Bereit für Ableitungen" },
  { id:"published", label:"Veröffentlicht", color:"#0EA5E9", desc:"Story ist publiziert" },
];

const CH_LIMITS = { instagram:2200, twitter:280, linkedin:1300, facebook:500, whatsapp:800, website:100000, print:100000 };
const CH_ANGLE = {
  instagram: "Visueller Hook + kurze, emotionale Caption + Hashtags",
  twitter:   "Kernaussage als prägnanter Tweet, unter 280 Zeichen",
  linkedin:  "Professioneller Kontext, Mehrwert, 3–5 Absätze",
  facebook:  "Erzählerisch, Gemeinschaftsgefühl, Frage am Ende",
  whatsapp:  "Persönlich, direkt, kurze Nachricht",
  website:   "Vollständiger Artikel mit Einleitung, Hauptteil, Fazit",
  print:     "Druckreifer Artikel, Blocksatz, Quellen, Bildunterschriften",
};

// ── HELPERS ────────────────────────────────────────────────────────────────
function blocksToText(blocks) {
  if (!blocks?.length) return "";
  const extract = (content) => {
    if (!content) return "";
    if (Array.isArray(content)) return content.map(item => item.type === "text" ? (item.text || "") : "").join("");
    return "";
  };
  const lines = [];
  for (const block of blocks) {
    const t = extract(block.content);
    if (t.trim()) lines.push(t.trim());
    if (block.children?.length) lines.push(blocksToText(block.children));
  }
  return lines.filter(Boolean).join("\n\n");
}

function sectionsToBlocks(sections) {
  if (!sections?.length) return [];
  const blocks = [];
  for (const sec of sections) {
    if (sec.heading) blocks.push({ type:"heading", props:{level:2,textAlignment:"left"}, content:[{type:"text",text:sec.heading,styles:{}}], children:[] });
    if (sec.content) blocks.push({ type:"paragraph", props:{textAlignment:"left"}, content:[{type:"text",text:sec.content,styles:{}}], children:[] });
  }
  return blocks;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
}

// ── IMAGE PICKER MODAL (für Materialien-Tab) ──────────────────────────────
function ImagePicker({ items, onSelect, onClose }) {
  const images = items.filter(i => i.type === "image" && i.url);
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, width: 520, maxHeight: 480, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: C.text }}>Bild aus Medienbibliothek wählen</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute }}><X size={18} strokeWidth={2} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: 16 }}>
          {images.length === 0 ? (
            <p style={{ textAlign: "center", color: C.textMute, fontFamily: FONT, fontSize: 13, padding: "24px 0" }}>Keine Bilder in der Medienbibliothek.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {images.map(img => (
                <div key={img.id} onClick={() => onSelect(img)}
                  style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2px solid transparent`, transition: "border-color .12s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
                  <img src={img.url} alt={img.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CUSTOM BLOCKNOTE FILE PANEL (Medienbibliothek – Vollbild-Modal) ─────────
function MediaLibraryFilePanel({ blockId }) {
  const editor = useBlockNoteEditor();
  const { items, posts } = useApp();
  const [tab, setTab] = useState("library");
  const [hovId, setHovId] = useState(null);
  const [search, setSearch] = useState("");

  const images = useMemo(() => items.filter(i => i.type === "image" && i.url), [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return images;
    const q = search.toLowerCase();
    return images.filter(i => (i.name || "").toLowerCase().includes(q) || (i.tags || "").toLowerCase().includes(q));
  }, [images, search]);

  // Usage count: how many posts reference each image
  const usageMap = useMemo(() => {
    const map = {};
    posts.forEach(p => { if (p.mediaId) map[p.mediaId] = (map[p.mediaId] || 0) + 1; });
    return map;
  }, [posts]);

  const handleSelect = (img) => {
    editor.updateBlock(blockId, { props: { url: img.url, name: img.name || "", caption: img.name || "" } });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataURL(file);
    editor.updateBlock(blockId, { props: { url, name: file.name, caption: "" } });
  };

  // Render as a full-screen portal overlay so it appears above BlockNote
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
    }}>
      <div style={{
        background: C.surface, borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,.28)",
        width: "min(760px, 96vw)", maxHeight: "85vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Bild einfügen</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", background: C.bg, borderRadius: 8, padding: 2 }}>
              {[["library", "Medienbibliothek"], ["upload", "Hochladen"]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none",
                  background: tab === id ? C.accent : "transparent",
                  color: tab === id ? "#fff" : C.textMid,
                  cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 500,
                  fontFamily: FONT, transition: "background .15s",
                }}>{label}</button>
              ))}
            </div>
            {/* Close — clicking the backdrop also closes, but BlockNote handles that */}
          </div>
        </div>

        {tab === "library" ? (
          <>
            {/* Search */}
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Bilder suchen (Name, Tags)…"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8, boxSizing: "border-box",
                  border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                  fontSize: 13, fontFamily: FONT, outline: "none",
                }}
              />
            </div>

            {/* Grid */}
            <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.textMute, fontSize: 13 }}>
                  {images.length === 0
                    ? "Noch keine Bilder in der Medienbibliothek. Lade zuerst Bilder hoch."
                    : "Kein Bild gefunden."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {filtered.map(img => {
                    const count = usageMap[img.id] || 0;
                    const isHov = hovId === img.id;
                    return (
                      <div key={img.id}
                        onClick={() => handleSelect(img)}
                        onMouseEnter={() => setHovId(img.id)}
                        onMouseLeave={() => setHovId(null)}
                        style={{
                          position: "relative", borderRadius: 10, overflow: "hidden",
                          cursor: "pointer", aspectRatio: "1/1",
                          outline: isHov ? `3px solid ${C.accent}` : "3px solid transparent",
                          transition: "outline .12s",
                        }}>
                        <img src={img.url} alt={img.name || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        {/* Hover overlay */}
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 50%)",
                          opacity: isHov ? 1 : 0, transition: "opacity .15s",
                          display: "flex", flexDirection: "column", justifyContent: "flex-end",
                          padding: "6px 8px",
                        }}>
                          {img.name && (
                            <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, lineHeight: 1.3,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {img.name}
                            </span>
                          )}
                        </div>
                        {/* Usage badge */}
                        {count > 0 && (
                          <div style={{
                            position: "absolute", top: 6, left: 6,
                            background: "rgba(0,0,0,.7)", color: "#fff",
                            fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                            display: "flex", alignItems: "center", gap: 3,
                          }}>
                            <Check size={8} strokeWidth={3} /> {count}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Upload tab */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              padding: "48px 64px", borderRadius: 12, border: `2px dashed ${C.border}`,
              cursor: "pointer", color: C.textMute, fontSize: 13, fontFamily: FONT,
              transition: "border-color .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <ImageIcon size={36} strokeWidth={1.5} color={C.accent} />
              <span style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>Bild auswählen</span>
              <span style={{ fontSize: 12 }}>oder Datei hier ablegen</span>
              <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── MATERIAL CARD ───────────────────────────────────────────────────────────
function MaterialCard({ mat, onRemove }) {
  if (mat.type === "image") {
    return (
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        overflow: "hidden", position: "relative",
      }}>
        {mat.url && (
          <img src={mat.url} alt={mat.title || ""}
            style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
        )}
        <div style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <ImageIcon size={11} strokeWidth={IW} color={C.textMute} />
          <span style={{ fontSize: 11, color: C.textMid, fontFamily: FONT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mat.title || "Bild"}
          </span>
          <button onClick={() => onRemove(mat.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute, padding: 2 }}>
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  const isLink = mat.type === "link";
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start",
    }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        {isLink
          ? <LinkIcon size={13} strokeWidth={IW} color={C.accent} />
          : <StickyNote size={13} strokeWidth={IW} color="#F59E0B" />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: isLink ? C.accent : C.text,
          fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {isLink ? (
            <a href={mat.url} target="_blank" rel="noopener noreferrer"
              style={{ color: C.accent, textDecoration: "none" }}
              onClick={e => e.stopPropagation()}>
              {mat.title || mat.url}
            </a>
          ) : mat.title}
        </div>
        {isLink && (
          <div style={{ fontSize: 10, color: C.textMute, fontFamily: FONT, marginTop: 1 }}>
            {getDomain(mat.url)}
          </div>
        )}
      </div>
      <button onClick={() => onRemove(mat.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute, padding: 2, flexShrink: 0 }}>
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── DERIVATIVE ROW ──────────────────────────────────────────────────────────
function DerivativeRow({ channel, derivative, onCreate, hasContent, loading }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderRadius: 8,
        background: hover ? C.bg : "transparent",
        border: `1px solid ${hover ? C.border : "transparent"}`,
        transition: "all .12s",
      }}>
      <ChIco id={channel.id} size={16} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: FONT }}>{channel.label}</div>
        {!derivative && (
          <div style={{ fontSize: 10, color: C.textMute, fontFamily: FONT, lineHeight: 1.3 }}>{CH_ANGLE[channel.id]}</div>
        )}
      </div>
      {derivative ? (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: "#ECFDF3", color: C.success, display: "flex", alignItems: "center", gap: 3,
        }}>
          <Check size={9} strokeWidth={3} /> Entwurf erstellt
        </span>
      ) : loading ? (
        <span style={{
          fontSize: 10, color: C.textMute, fontFamily: FONT,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <Loader size={11} strokeWidth={IW} style={{ animation: "spin 1s linear infinite" }} />
          KI schreibt…
        </span>
      ) : (
        <button
          onClick={() => onCreate(channel.id)}
          disabled={!hasContent}
          title={!hasContent ? "Schreibe zuerst etwas im Editor" : `KI schreibt ${channel.label}-Entwurf`}
          style={{
            padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.accent}`,
            background: "transparent", color: C.accent, cursor: hasContent ? "pointer" : "default",
            fontSize: 11, fontWeight: 600, fontFamily: FONT,
            opacity: hasContent ? 1 : 0.4,
            display: "flex", alignItems: "center", gap: 4,
          }}>
          <Wand2 size={11} strokeWidth={IW} /> KI-Entwurf
        </button>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function StoryEditorModal() {
  const { edStory: story, items, posts, saveStory: onSave, updateStory, lockStory, unlockStory, setEdStory, setPosts, user } = useApp();
  const onClose = () => {
    if (story.id) unlockStory(story.id);
    setEdStory(null);
  };

  const initialBlocks = useMemo(() => {
    if (story.blocks?.length) return story.blocks;
    if (story.sections?.length) return sectionsToBlocks(story.sections);
    return undefined;
  }, []); // eslint-disable-line

  const [form, setForm] = useState({
    ...story,
    blocks: story.blocks || [],
    materials: story.materials || [],
    derivatives: story.derivatives || [],
    targetChannels: story.targetChannels || [],
    status: story.status || "idea",
    tags: story.tags || "",
    category: story.category || "",
    comments: story.comments || [],
    history: story.history || [],
  });

  const [rightTab, setRightTab] = useState("materials");
  const [commentInput, setCommentInput] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [deriving, setDeriving] = useState({}); // { [chId]: boolean }
  const [derivPreview, setDerivPreview] = useState(null); // { chId, content, channel }
  const [showSettings, setShowSettings] = useState(false);
  const [aiMenu, setAiMenu]     = useState(null); // { x, y, text }
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState(null);

  const asRef        = useRef();
  const formRef      = useRef(form);
  const titleRef     = useRef();
  const subtitleRef  = useRef();
  const aiSelRef     = useRef(null); // saved selection range for apply
  formRef.current = form;

  // ── BlockNote editor ──────────────────────────────────────────────────────
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
    uploadFile: async (file) => fileToDataURL(file),
  });

  // ── Live word count ───────────────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(() => {
    const text = blocksToText(initialBlocks || []);
    return text.trim().split(/\s+/).filter(Boolean).length;
  });

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const hasContent = wordCount > 5;

  // ── Mark unsaved on form change ───────────────────────────────────────────
  useEffect(() => {
    setHasUnsaved(true);
  }, [form.title, form.subtitle, form.status, form.category, form.tags, form.targetChannels]);

  // ── Concurrent edit lock ─────────────────────────────────────────────────
  const lockedByOther = useMemo(() => {
    const lb = story.lockedBy;
    if (!lb || lb.userId === user?.id) return null;
    const age = Date.now() - new Date(lb.since).getTime();
    if (age > 30 * 60 * 1000) return null;
    return lb;
  }, [story.lockedBy, user?.id]);

  useEffect(() => {
    if (!story.id || !user) return;
    lockStory(story.id, { userId: user.id, userName: user.name, since: new Date().toISOString() });
    return () => { unlockStory(story.id); };
  }, [story.id, user?.id]); // eslint-disable-line

  // ── Auto-save ─────────────────────────────────────────────────────────────
  // Uses updateStory (not saveStory/onSave) so the editor stays open
  useEffect(() => {
    clearTimeout(asRef.current);
    if (!form.title) return;
    asRef.current = setTimeout(() => {
      const f = formRef.current;
      const text = blocksToText(editor.document || []);
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      const saved = { ...f, id: f.id || uid(), blocks: editor.document, updatedAt: new Date().toISOString() };
      updateStory(saved);
      setEdStory(saved); // keep edStory in sync so story.id is set for locking
      setLastSaved(new Date());
      setHasUnsaved(false);
    }, 20000);
    return () => clearTimeout(asRef.current);
  }, [form.title]);

  // ── Cmd+S / Ctrl+S keyboard shortcut ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const f = formRef.current;
        const saved = { ...f, id: f.id || uid(), blocks: editor.document, updatedAt: new Date().toISOString() };
        updateStory(saved); // does NOT close the editor
        setEdStory({ ...saved });
        setLastSaved(new Date());
        setHasUnsaved(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line

  // ── Title/subtitle auto-expand on mount ──────────────────────────────────
  useEffect(() => {
    [titleRef, subtitleRef].forEach(r => {
      if (r.current) { r.current.style.height = "auto"; r.current.style.height = r.current.scrollHeight + "px"; }
    });
  }, []); // eslint-disable-line

  // ── AI selection menu ─────────────────────────────────────────────────────
  useEffect(() => {
    let timer = null;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;
        const text = sel.toString().trim();
        if (text.length < 5) { setAiMenu(null); return; }
        try {
          const range = sel.getRangeAt(0);
          const rect  = range.getBoundingClientRect();
          if (!rect.width) return;
          aiSelRef.current = range.cloneRange();
          setAiMenu({
            x: Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2)),
            y: rect.top,
            text,
          });
          setAiResult(null);
        } catch {}
      }, 300);
    };
    document.addEventListener("selectionchange", handler);
    return () => { document.removeEventListener("selectionchange", handler); clearTimeout(timer); };
  }, []);

  const runAIAction = async (type) => {
    if (!aiMenu) return;
    setAiLoading(true); setAiResult(null);
    const t = aiMenu.text;
    const PROMPTS = {
      improve:   `Verbessere diesen Text stilistisch (Klarheit, Fluss, Prägnanz). Gib NUR den verbesserten Text zurück:\n\n${t}`,
      shorten:   `Kürze diesen Text auf das Wesentliche, ohne wichtige Aussagen zu verlieren. Gib NUR den gekürzten Text zurück:\n\n${t}`,
      expand:    `Erweitere diesen Text mit mehr Details, Kontext und Beispielen. Gib NUR den erweiterten Text zurück:\n\n${t}`,
      spell:     `Korrigiere alle Rechtschreib- und Grammatikfehler in diesem Text. Gib NUR den korrigierten Text zurück:\n\n${t}`,
      formal:    `Schreibe diesen Text formeller und professioneller um. Gib NUR den Text zurück:\n\n${t}`,
      translate: `Übersetze diesen deutschen Text ins Englische. Gib NUR die englische Übersetzung zurück:\n\n${t}`,
    };
    try {
      const r = await aiCall([{ role: "user", content: PROMPTS[type] }], 900);
      setAiResult(r.trim());
    } catch { setAiResult("⚠ KI nicht verfügbar (nur auf der Live-Site)"); }
    setAiLoading(false);
  };

  const applyAIResult = () => {
    if (!aiResult || !aiSelRef.current) return;
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(aiSelRef.current);
      document.execCommand("insertText", false, aiResult);
    } catch {}
    setAiMenu(null); setAiResult(null);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSave = (status) => {
    const f = formRef.current;
    const text = blocksToText(editor.document || []);
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(wc);
    const historyEntry = {
      id: uid(), savedAt: new Date().toISOString(),
      savedBy: user?.name || "Unbekannt", wordCount: wc, title: f.title,
    };
    const newHistory = [...(f.history || []), historyEntry].slice(-20);
    setForm(prev => ({ ...prev, history: newHistory }));
    setLastSaved(new Date());
    onSave({
      ...f,
      id: f.id || uid(),
      status: status || f.status,
      blocks: editor.document,
      updatedAt: new Date().toISOString(),
      history: newHistory,
    });
    setLastSaved(new Date());
    setHasUnsaved(false);
  };

  // ── Comment actions ───────────────────────────────────────────────────────
  const addComment = () => {
    const text = commentInput.trim();
    if (!text) return;
    const comment = { id: uid(), text, authorId: user?.id, authorName: user?.name || "Ich",
      createdAt: new Date().toISOString(), resolved: false };
    setForm(f => ({ ...f, comments: [...(f.comments || []), comment] }));
    setCommentInput("");
  };

  const resolveComment = (id) => {
    setForm(f => ({ ...f, comments: f.comments.map(c => c.id === id ? { ...c, resolved: true } : c) }));
  };

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    setForm(f => ({
      ...f,
      materials: [...f.materials, {
        id: uid(), type: "link",
        url, title: linkTitle.trim() || url,
        description: "", addedAt: new Date().toISOString(),
      }],
    }));
    setLinkInput(""); setLinkTitle(""); setAddingLink(false);
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    setForm(f => ({
      ...f,
      materials: [...f.materials, {
        id: uid(), type: "note",
        url: "", title: noteInput.trim(),
        description: "", addedAt: new Date().toISOString(),
      }],
    }));
    setNoteInput(""); setAddingNote(false);
  };

  const addImage = (img) => {
    setForm(f => ({
      ...f,
      materials: [...f.materials, {
        id: uid(), type: "image",
        url: img.url, title: img.name || img.description || "Bild",
        mediaId: img.id, addedAt: new Date().toISOString(),
      }],
    }));
    setShowImagePicker(false);
  };

  const removeMaterial = useCallback((id) => {
    setForm(f => ({ ...f, materials: f.materials.filter(m => m.id !== id) }));
  }, []);

  const toggleChannel = (chId) => {
    setForm(f => ({
      ...f,
      targetChannels: f.targetChannels.includes(chId)
        ? f.targetChannels.filter(c => c !== chId)
        : [...f.targetChannels, chId],
    }));
  };

  // ── AI-powered derivation ─────────────────────────────────────────────────
  const createDerivative = useCallback(async (chId) => {
    const channel = STORY_CHANNELS.find(c => c.id === chId);
    const storyText = blocksToText(editor.document || []);
    const f = formRef.current;

    setDeriving(prev => ({ ...prev, [chId]: true }));
    setRightTab("derivatives");

    let content = storyText;
    try {
      const prompt = `Du bist Social-Media-Experte. Erstelle einen ${channel.label}-Post auf Basis dieses Artikels.

Kanal: ${channel.label}
Stil: ${CH_ANGLE[chId] || "Passend zur Plattform"}
Max. Zeichen: ${CH_LIMITS[chId] || 500}
Artikel-Titel: ${f.title || ""}

Artikel-Inhalt:
${storyText}

Schreibe NUR den fertigen Post-Text ohne Erklärungen oder Anmerkungen.`;

      content = await aiCall([{ role: "user", content: prompt }], 1200);
      content = content.trim();
    } catch {
      // Fallback: truncate story text
      const limit = CH_LIMITS[chId] || 500;
      content = storyText.length > limit ? storyText.slice(0, limit - 3).trimEnd() + "…" : storyText;
    } finally {
      setDeriving(prev => ({ ...prev, [chId]: false }));
    }

    // Show preview dialog before saving
    setDerivPreview({ chId, content, channel });
  }, [editor, setPosts]);

  const confirmDerivative = useCallback((chId, channel, editedContent) => {
    const f = formRef.current;
    const postId = uid();
    const post = {
      id: postId,
      title: f.title || "Story-Ableitung",
      content: editedContent,
      channels: chId === "website" || chId === "print" ? [] : [chId],
      status: "draft",
      scheduledDate: "", scheduledTime: "",
      mediaId: f.coverMediaId || null, campaignId: null, deleted: false, storyId: f.id || null,
    };
    setPosts(prev => [...prev, post]);
    setForm(f2 => ({
      ...f2,
      derivatives: [...f2.derivatives, { id: uid(), channel: chId, postId, createdAt: new Date().toISOString() }],
    }));
    setDerivPreview(null);
  }, [setPosts]);

  const currentStatus = STATUSES.find(s => s.id === form.status) || STATUSES[0];
  const catColor = CAT_COLOR[form.category] || C.textMid;

  // Cycle through statuses on click
  const cycleStatus = () => {
    const idx = STATUSES.findIndex(s => s.id === form.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    setForm(f => ({ ...f, status: next.id }));
  };

  const saveStatusLabel = hasUnsaved
    ? { text: "● Nicht gespeichert", color: "#F59E0B" }
    : lastSaved
      ? { text: `✓ Gespeichert ${lastSaved.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`, color: "#10B981" }
      : { text: "", color: C.textMute };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,.6)", display: "flex",
    }}>
      <style>{CSS}</style>
      <style>{`
        /* ── BlockNote base ── */
        .bn-container { font-family: ${FONT} !important; }
        .bn-editor {
          min-height: 400px;
          padding: 0 !important;
          font-size: 16px !important;
          line-height: 1.8 !important;
          color: ${C.text} !important;
        }
        /* Block layout */
        .bn-block-outer { margin: 0 !important; padding: 0 !important; }
        .bn-block-outer + .bn-block-outer { border-top: 1px solid rgba(0,0,0,0.045) !important; }
        .bn-block { border-radius: 4px !important; transition: background .1s !important; }
        .bn-block:hover { background: rgba(7,93,242,0.03) !important; }
        .bn-block-content { padding: 4px 2px !important; }

        /* Headings */
        .bn-block[data-content-type="heading"] h1 { font-size: 30px !important; font-weight: 800 !important; line-height: 1.2 !important; margin: 18px 0 2px !important; color: ${C.text} !important; font-family: ${FONT} !important; }
        .bn-block[data-content-type="heading"] h2 { font-size: 22px !important; font-weight: 700 !important; line-height: 1.3 !important; margin: 14px 0 2px !important; color: ${C.text} !important; font-family: ${FONT} !important; }
        .bn-block[data-content-type="heading"] h3 { font-size: 17px !important; font-weight: 600 !important; line-height: 1.4 !important; margin: 10px 0 1px !important; color: ${C.textMid} !important; font-family: ${FONT} !important; }

        /* Paragraph */
        .bn-block[data-content-type="paragraph"] p { margin: 0 !important; }

        /* Quote */
        .bn-block[data-content-type="quote"] { border-left: 3px solid ${C.accent}55 !important; padding-left: 16px !important; }
        .bn-block[data-content-type="quote"] p { font-style: italic !important; color: ${C.textMid} !important; }

        /* Lists */
        .bn-block[data-content-type="bulletListItem"],
        .bn-block[data-content-type="numberedListItem"] { padding-left: 4px !important; }

        /* Side menu — let BlockNote control visibility */
        .bn-side-menu button { color: ${C.textMute} !important; border-radius: 5px !important; }
        .bn-side-menu button:hover { color: ${C.text} !important; background: ${C.borderLight} !important; }

        /* Inline toolbar (bubble menu) */
        .bn-toolbar { background: ${C.text} !important; border-radius: 8px !important; box-shadow: 0 4px 20px rgba(0,0,0,.25) !important; border: none !important; padding: 4px !important; z-index: 1200 !important; }
        .bn-toolbar button { color: rgba(255,255,255,.75) !important; border-radius: 5px !important; }
        .bn-toolbar button:hover { background: rgba(255,255,255,.12) !important; color: #fff !important; }
        .bn-toolbar button[data-active="true"] { background: rgba(255,255,255,.2) !important; color: #fff !important; }

        /* Slash menu */
        .bn-suggestion-menu { background: ${C.surface} !important; border: 1px solid ${C.border} !important; border-radius: 10px !important; box-shadow: 0 8px 32px rgba(0,0,0,.14) !important; z-index: 1200 !important; }
        .bn-suggestion-menu-item { border-radius: 6px !important; }
        .bn-suggestion-menu-item:hover, .bn-suggestion-menu-item[data-selected="true"] { background: ${C.bg} !important; }

        /* Image */
        .bn-block[data-content-type="image"] img { border-radius: 6px !important; }

        /* Floating UI portals */
        .bn-image-toolbar { z-index: 1200 !important; }
        .bn-file-toolbar { z-index: 1200 !important; }
        [data-radix-popper-content-wrapper] { z-index: 1200 !important; }
        [data-floating-ui-portal] { z-index: 1200 !important; }
        .bn-slash-menu { z-index: 1200 !important; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {showImagePicker && (
        <ImagePicker items={items} onSelect={addImage} onClose={() => setShowImagePicker(false)} />
      )}

      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: C.surface,
      }}>

        {/* ── THIN TOP BAR (48px) ────────────────────────────────────────── */}
        <div style={{
          height: 48, display: "flex", alignItems: "center", gap: 0,
          borderBottom: `1px solid ${C.border}`, background: C.surface,
          flexShrink: 0, padding: "0 12px",
        }}>
          {/* Back button */}
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
              cursor: "pointer", color: C.textMid, padding: "6px 10px", borderRadius: 7,
              fontFamily: FONT, fontSize: 13, fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.borderLight; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; }}>
            <ChevronLeft size={15} strokeWidth={2} /> Zurück
          </button>

          <div style={{ width: 1, height: 20, background: C.border, margin: "0 8px" }} />

          {/* Document title (truncated) */}
          <span style={{
            flex: 1, fontSize: 13, color: C.textMute, fontFamily: FONT,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            minWidth: 0,
          }}>
            {form.title || "Unbenannte Story"}
          </span>

          {/* Auto-save status */}
          {lastSaved ? (
            <span style={{ fontSize: 10, color: C.success, fontFamily: FONT, display: "flex", alignItems: "center", gap: 3 }}>
              <Check size={9} strokeWidth={3}/> Gespeichert {lastSaved.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}
            </span>
          ) : saveStatusLabel?.text ? (
            <span style={{ fontSize: 11, fontFamily: FONT, color: saveStatusLabel.color, flexShrink: 0, marginRight: 12 }}>
              {saveStatusLabel.text}
            </span>
          ) : null}

          {/* Settings gear */}
          <button
            onClick={() => setShowSettings(v => !v)}
            title="Einstellungen"
            style={{
              display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 7,
              border: `1px solid ${showSettings ? C.accent + "55" : "transparent"}`,
              background: showSettings ? C.accentLight : "none",
              color: showSettings ? C.accent : C.textMute, cursor: "pointer", marginRight: 4,
            }}
            onMouseEnter={e => { if (!showSettings) { e.currentTarget.style.background = C.borderLight; e.currentTarget.style.color = C.textMid; } }}
            onMouseLeave={e => { if (!showSettings) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMute; } }}>
            <Settings2 size={15} strokeWidth={IW} />
          </button>

          {/* Status badge (clickable, cycles) */}
          <button
            onClick={cycleStatus}
            title="Status wechseln"
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
              borderRadius: 20, border: `1px solid ${currentStatus.color}44`,
              background: currentStatus.color + "12", color: currentStatus.color,
              fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer",
              flexShrink: 0,
            }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: currentStatus.color, flexShrink: 0 }} />
            {currentStatus.label}
          </button>

          <div style={{ width: 8 }} />

          {/* Save + Ready buttons */}
          <Btn variant="secondary" onClick={() => handleSave()} style={{ fontSize: 12, height: 32, padding: "0 12px" }}>
            <Save size={13} strokeWidth={IW} /> Speichern
          </Btn>
          <div style={{ width: 6 }} />
          <Btn onClick={() => handleSave("ready")} style={{ fontSize: 12, height: 32, padding: "0 12px" }}>
            <Check size={13} strokeWidth={2.5} /> Bereit
          </Btn>
        </div>

        {/* ── LOCK WARNING BANNER ───────────────────────────────────────── */}
        {lockedByOther && (
          <div style={{
            background: "#FFF9C4", borderBottom: `1px solid #F6E05E`,
            padding: "7px 20px", display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, fontFamily: FONT, color: "#744210", flexShrink: 0,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706", flexShrink: 0 }} />
            <strong>{lockedByOther.userName}</strong> bearbeitet gerade diese Story.
            Du kannst sie nur lesen, bis sie den Editor schließt.
          </div>
        )}

        {/* ── SETTINGS STRIP ────────────────────────────────────────────── */}
        {showSettings && (
          <div style={{
            borderBottom: `1px solid ${C.border}`,
            background: C.surface,
            padding: "10px 24px",
            display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap",
            flexShrink: 0,
          }}>
            {/* Status */}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Status</div>
              <div style={{ display: "flex", gap: 3, background: C.borderLight, borderRadius: 8, padding: 3 }}>
                {STATUSES.map(s => {
                  const on = form.status === s.id;
                  return (
                    <button key={s.id} onClick={() => setForm(f => ({ ...f, status: s.id }))} style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                      borderRadius: 6, border: "none", cursor: "pointer", fontFamily: FONT,
                      fontSize: 11.5, fontWeight: on ? 700 : 500,
                      background: on ? C.surface : "transparent",
                      color: on ? s.color : C.textSoft,
                      boxShadow: on ? "0 1px 3px rgba(0,0,0,.07)" : "none",
                      transition: "all .1s",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ width: 1, background: C.border, alignSelf: "stretch" }} />

            {/* Category */}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Kategorie</div>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, color: form.category ? C.text : C.textMute, fontSize: 12, fontFamily: FONT, outline: "none", cursor: "pointer" }}>
                {CATS.map(c => <option key={c} value={c}>{c || "Keine Kategorie"}</option>)}
              </select>
            </div>

            <div style={{ width: 1, background: C.border, alignSelf: "stretch" }} />

            {/* Target channels */}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Ziel-Kanäle</div>
              <div style={{ display: "flex", gap: 4 }}>
                {STORY_CHANNELS.map(ch => {
                  const active = form.targetChannels.includes(ch.id);
                  return (
                    <button key={ch.id} onClick={() => toggleChannel(ch.id)} title={ch.label}
                      style={{
                        width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1.5px solid ${active ? ch.color + "66" : C.border}`,
                        background: active ? ch.color + "14" : C.bg,
                        cursor: "pointer", transition: "all .12s",
                      }}>
                      <ChIco id={ch.id} size={14} color={active ? ch.color : C.textMute} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ width: 1, background: C.border, alignSelf: "stretch" }} />

            {/* Tags */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Tags</div>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3…"
                style={{ width: "100%", padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
        )}

        {/* ── BODY ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── CENTER: Title + Editor ─────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", position: "relative", background: C.surface }}>

            {/* Title + Subtitle area */}
            <div style={{ padding: "52px 0 0", maxWidth: 752, margin: "0 auto", width: "100%", boxSizing: "border-box", paddingLeft: 80, paddingRight: 32 }}>
              {/* Category + word count meta strip */}
              {(form.category || form.targetChannels.length > 0) && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  {form.category && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: (CAT_COLOR[form.category] || C.textMid) + "14", color: CAT_COLOR[form.category] || C.textMid }}>
                      {form.category}
                    </span>
                  )}
                  {form.targetChannels.map(chId => {
                    const ch = STORY_CHANNELS.find(c => c.id === chId);
                    return ch ? (
                      <span key={chId} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: ch.color + "10", color: ch.color }}>
                        <ChIco id={chId} size={9} color={ch.color} /> {ch.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <textarea
                ref={titleRef}
                value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value })); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                placeholder="Titel…"
                rows={1}
                style={{
                  width: "100%", resize: "none", border: "none", outline: "none",
                  fontSize: 36, fontFamily: FONT, fontWeight: 800,
                  color: C.text, background: "transparent", lineHeight: 1.2,
                  marginBottom: 10, padding: 0, fontStyle: "normal",
                  overflow: "hidden", display: "block",
                }}
              />
              <textarea
                ref={subtitleRef}
                value={form.subtitle || ""}
                onChange={e => { setForm(f => ({ ...f, subtitle: e.target.value })); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                placeholder="Untertitel oder Lead-Satz (optional)…"
                rows={1}
                style={{
                  width: "100%", resize: "none", border: "none", outline: "none",
                  fontFamily: FONT, fontSize: 19, color: C.textSoft,
                  background: "transparent", marginBottom: 32, padding: 0,
                  fontStyle: "normal", fontWeight: 400, lineHeight: 1.5, overflow: "hidden", display: "block",
                }}
              />
              <div style={{ borderTop: `1px solid ${C.borderLight}`, marginBottom: 24 }} />
            </div>

            {/* BlockNote Editor */}
            <div style={{ flex: 1, paddingBottom: 80, maxWidth: 752, margin: "0 auto", width: "100%", boxSizing: "border-box", paddingLeft: 80, paddingRight: 32 }}>
              <BlockNoteView
                editor={editor}
                theme="light"
                filePanel={false}
                style={{ fontSize: 16, lineHeight: 1.8 }}
                onChange={() => {
                  const text = blocksToText(editor.document || []);
                  setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
                  setHasUnsaved(true);
                }}
              >
                <FilePanelController filePanel={MediaLibraryFilePanel} />
              </BlockNoteView>
            </div>

            {/* Sticky word count bar */}
            <div style={{
              position: "sticky", bottom: 0,
              background: C.surface + "f0",
              backdropFilter: "blur(8px)",
              borderTop: `1px solid ${C.borderLight}`,
              padding: "6px 32px 6px 80px",
              display: "flex", alignItems: "center", gap: 12,
              fontSize: 11, color: C.textMute, fontFamily: FONT,
            }}>
              <AlignLeft size={11} strokeWidth={IW} />
              <span><strong style={{ color: C.textMid }}>{wordCount}</strong> Wörter</span>
              <span style={{ color: C.border }}>·</span>
              <span><strong style={{ color: C.textMid }}>{readingTime}</strong> Min. Lesezeit</span>
              {form.category && (
                <>
                  <span style={{ color: C.border }}>·</span>
                  <span style={{ color: catColor, fontWeight: 600 }}>{form.category}</span>
                </>
              )}
              <div style={{ flex: 1 }} />
              {/* Hint to open settings if no channels set */}
              {form.targetChannels.length === 0 && !showSettings && (
                <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.textMute, fontFamily: FONT, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                  <Settings2 size={11} strokeWidth={IW} /> Ziel-Kanäle festlegen
                </button>
              )}
              {form.targetChannels.length > 0 && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {form.targetChannels.map(chId => {
                    const ch = STORY_CHANNELS.find(c => c.id === chId);
                    return ch ? <ChIco key={chId} id={chId} size={13} color={C.textMute} /> : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Materials + Derivatives ──────────────────── */}
          <div style={{
            width: 272, borderLeft: `1px solid ${C.border}`,
            background: C.surface, display: "flex", flexDirection: "column", flexShrink: 0,
          }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {[
                ["materials", "Material", form.materials.length],
                ["derivatives", "Ableit.", form.derivatives.length],
                ["comments", "Komm.", (form.comments||[]).filter(c=>!c.resolved).length],
                ["history", "Verlauf", 0],
              ].map(([id, label, count]) => (
                <button key={id} onClick={() => setRightTab(id)}
                  style={{
                    flex: 1, padding: "10px 4px", border: "none", cursor: "pointer",
                    background: rightTab === id ? C.bg : "transparent",
                    borderBottom: rightTab === id ? `2px solid ${C.accent}` : "2px solid transparent",
                    color: rightTab === id ? C.accent : C.textMute,
                    fontFamily: FONT, fontSize: 11, fontWeight: rightTab === id ? 700 : 500,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    transition: "color .12s",
                  }}>
                  {label}
                  {count > 0 && (
                    <span style={{
                      background: rightTab === id ? C.accent : C.borderLight,
                      color: rightTab === id ? "#fff" : C.textMute,
                      borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px",
                    }}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>

              {/* ── MATERIALIEN TAB ──────────────────────────────────── */}
              {rightTab === "materials" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMute, fontFamily: FONT, lineHeight: 1.5 }}>
                    Sammle Links, Notizen und Bilder zu dieser Story.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {addingLink ? (
                      <div style={{ background: C.bg, border: `1px solid ${C.accent}44`, borderRadius: 9, padding: 12 }}>
                        <input
                          autoFocus
                          value={linkInput}
                          onChange={e => setLinkInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addLink(); if (e.key === "Escape") setAddingLink(false); }}
                          placeholder="https://…"
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 6 }}
                        />
                        <input
                          value={linkTitle}
                          onChange={e => setLinkTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addLink(); }}
                          placeholder="Titel (optional)"
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={addLink} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Hinzufügen</button>
                          <button onClick={() => { setAddingLink(false); setLinkInput(""); setLinkTitle(""); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT }}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingLink(true)}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                        <LinkIcon size={12} strokeWidth={IW} /> Link hinzufügen
                      </button>
                    )}

                    {addingNote ? (
                      <div style={{ background: C.bg, border: `1px solid #F59E0B44`, borderRadius: 9, padding: 12 }}>
                        <textarea
                          autoFocus
                          value={noteInput}
                          onChange={e => setNoteInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addNote(); if (e.key === "Escape") setAddingNote(false); }}
                          placeholder="Notiz, Idee oder Quellenangabe…"
                          rows={3}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", resize: "none", marginBottom: 8 }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={addNote} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Speichern</button>
                          <button onClick={() => { setAddingNote(false); setNoteInput(""); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT }}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingNote(true)}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                        <StickyNote size={12} strokeWidth={IW} /> Notiz hinzufügen
                      </button>
                    )}

                    <button onClick={() => setShowImagePicker(true)}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                      <ImageIcon size={12} strokeWidth={IW} /> Bild hinzufügen
                    </button>
                  </div>

                  {form.materials.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "12px 0", color: C.textMute, fontSize: 11, fontFamily: FONT }}>
                      Noch keine Materialien gesammelt.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {form.materials.map(mat => (
                        <MaterialCard key={mat.id} mat={mat} onRemove={removeMaterial} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ABLEITUNGEN TAB ──────────────────────────────────── */}
              {rightTab === "derivatives" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: C.textMute, fontFamily: FONT, lineHeight: 1.5 }}>
                    KI erstellt kanalspezifische Entwürfe aus dieser Story.
                    {!hasContent && <span style={{ color: "#F59E0B" }}> Schreibe zuerst Inhalt.</span>}
                  </p>

                  {(form.targetChannels.length > 0
                    ? STORY_CHANNELS.filter(c => form.targetChannels.includes(c.id))
                    : STORY_CHANNELS
                  ).map(ch => {
                    const derivative = form.derivatives.find(d => d.channel === ch.id);
                    return (
                      <DerivativeRow
                        key={ch.id}
                        channel={ch}
                        derivative={derivative}
                        onCreate={createDerivative}
                        hasContent={hasContent}
                        loading={!!deriving[ch.id]}
                      />
                    );
                  })}

                  {form.targetChannels.length === 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: 10, color: C.textMute, fontFamily: FONT, textAlign: "center" }}>
                      Wähle Ziel-Kanäle in der Sidebar um die Auswahl einzugrenzen.
                    </p>
                  )}
                </div>
              )}

              {/* ── KOMMENTARE TAB ────────────────────────────────────── */}
              {rightTab === "comments" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Input */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <textarea
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); addComment(); } }}
                      placeholder="Kommentar schreiben… (Cmd+Enter senden)"
                      rows={3}
                      style={{ width: "100%", boxSizing: "border-box", resize: "none", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: FONT, outline: "none", color: C.text }}
                    />
                    <button onClick={addComment} disabled={!commentInput.trim()}
                      style={{ alignSelf: "flex-end", background: commentInput.trim() ? C.accent : C.border, border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 12px", cursor: commentInput.trim() ? "pointer" : "default", fontFamily: FONT }}>
                      Senden
                    </button>
                  </div>
                  {/* Comment list */}
                  {(form.comments || []).length === 0 ? (
                    <p style={{ color: C.textMute, fontSize: 12, fontFamily: FONT, textAlign: "center", padding: "8px 0" }}>Noch keine Kommentare.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[...(form.comments || [])].reverse().map(c => (
                        <div key={c.id} style={{ background: c.resolved ? C.borderLight : C.bg, borderRadius: 8, padding: "8px 10px", opacity: c.resolved ? 0.5 : 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.accent, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {(c.authorName || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: FONT }}>{c.authorName}</span>
                            <span style={{ fontSize: 10, color: C.textMute, fontFamily: FONT, marginLeft: "auto" }}>
                              {new Date(c.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p style={{ margin: "0 0 6px", fontSize: 12, color: C.text, fontFamily: FONT, lineHeight: 1.5 }}>{c.text}</p>
                          {!c.resolved && (
                            <button onClick={() => resolveComment(c.id)}
                              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.textMute, fontSize: 10, fontWeight: 600, padding: "2px 8px", cursor: "pointer", fontFamily: FONT }}>
                              Erledigt
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── VERLAUF TAB ───────────────────────────────────────── */}
              {rightTab === "history" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(form.history || []).length === 0 ? (
                    <p style={{ color: C.textMute, fontSize: 12, fontFamily: FONT, textAlign: "center", padding: "8px 0" }}>Noch keine gespeicherten Versionen.</p>
                  ) : (
                    [...(form.history || [])].reverse().map((h, i) => (
                      <div key={h.id} style={{ background: i === 0 ? C.accentLight : C.bg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${i === 0 ? C.accent + "33" : C.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? C.accent : C.text, fontFamily: FONT }}>
                          {new Date(h.savedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })} · {new Date(h.savedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: 11, color: C.textMute, fontFamily: FONT, marginTop: 2 }}>
                          {h.savedBy} · {h.wordCount} Wörter
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI SELECTION BUBBLE ──────────────────────────────────────────────── */}
      {aiMenu && createPortal(
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: "fixed",
            left: aiMenu.x, top: aiMenu.y - 10,
            transform: "translateX(-50%) translateY(-100%)",
            zIndex: 9000,
            background: "#1a1a2e",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,.35)",
            padding: aiResult ? "12px 14px" : "6px",
            display: "flex", flexDirection: "column", gap: 6,
            minWidth: aiResult ? 300 : "auto",
            maxWidth: 380,
            fontFamily: FONT,
          }}
        >
          {/* Caret */}
          <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 12, height: 6, overflow: "hidden" }}>
            <div style={{ width: 12, height: 12, background: "#1a1a2e", transform: "rotate(45deg)", transformOrigin: "top left", marginLeft: 0, marginTop: 3 }} />
          </div>

          {!aiResult && !aiLoading && (
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {[
                ["improve",   "✦ Verbessern"],
                ["shorten",   "↓ Kürzen"],
                ["expand",    "↑ Erweitern"],
                ["spell",     "✓ Korrektur"],
                ["formal",    "≡ Formeller"],
                ["translate", "⇄ Übersetzen"],
              ].map(([type, label]) => (
                <button key={type}
                  onMouseDown={e => { e.preventDefault(); runAIAction(type); }}
                  style={{
                    padding: "5px 10px", borderRadius: 6, border: "none",
                    background: "rgba(255,255,255,.09)", color: "rgba(255,255,255,.88)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.09)"}
                >{label}</button>
              ))}
              <button onMouseDown={e => { e.preventDefault(); setAiMenu(null); }}
                style={{ marginLeft: 2, padding: "5px 8px", borderRadius: 6, border: "none", background: "transparent", color: "rgba(255,255,255,.3)", fontSize: 14, cursor: "pointer" }}>
                ✕
              </button>
            </div>
          )}

          {aiLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", color: "rgba(255,255,255,.8)", fontSize: 12 }}>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
              KI schreibt…
            </div>
          )}

          {aiResult && !aiLoading && (
            <>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.88)", lineHeight: 1.6, fontFamily: FONT, borderBottom: "1px solid rgba(255,255,255,.1)", paddingBottom: 10, marginBottom: 2, maxHeight: 180, overflowY: "auto" }}>
                {aiResult}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button onMouseDown={e => { e.preventDefault(); applyAIResult(); }}
                  style={{ flex: 1, padding: "7px 12px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                  Übernehmen
                </button>
                <button onMouseDown={e => { e.preventDefault(); setAiResult(null); }}
                  style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                  Neu
                </button>
                <button onMouseDown={e => { e.preventDefault(); setAiMenu(null); setAiResult(null); }}
                  style={{ padding: "7px 10px", borderRadius: 7, border: "none", background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", fontSize: 13, cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {/* ── DERIVATIVE PREVIEW MODAL ─────────────────────────────────────────── */}
      {derivPreview && <DerivativePreviewModal
        chId={derivPreview.chId}
        channel={derivPreview.channel}
        initialContent={derivPreview.content}
        onConfirm={(edited) => confirmDerivative(derivPreview.chId, derivPreview.channel, edited)}
        onDiscard={() => setDerivPreview(null)}
      />}
    </div>
  );
}

// ── DERIVATIVE PREVIEW MODAL ────────────────────────────────────────────────
function DerivativePreviewModal({ chId, channel, initialContent, onConfirm, onDiscard }) {
  const [text, setText] = useState(initialContent);
  const limit = CH_LIMITS[chId] || 500;
  const over = text.length > limit;
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,.28)",
        width: "min(640px, 96vw)", display: "flex", flexDirection: "column",
        overflow: "hidden", maxHeight: "85vh",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <ChIco id={chId} size={18} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{channel.label} – Entwurf prüfen</div>
            <div style={{ fontSize: 11, color: C.textMute }}>Bearbeite den Text bevor du ihn als Post speicherst.</div>
          </div>
        </div>
        {/* Textarea */}
        <div style={{ padding: "16px 20px", flex: 1, overflow: "auto" }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            style={{
              width: "100%", minHeight: 220, resize: "vertical", boxSizing: "border-box",
              padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${over ? "#e53e3e" : C.border}`,
              fontSize: 13, fontFamily: FONT, lineHeight: 1.7, color: C.text,
              outline: "none", transition: "border-color .15s",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: over ? "#e53e3e" : C.textMute }}>
              {text.length} / {limit.toLocaleString("de")}
            </span>
          </div>
        </div>
        {/* Footer */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 20px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onDiscard} style={{
            background: "none", border: `1.5px solid ${C.border}`, borderRadius: 8,
            color: C.textSoft, fontWeight: 600, fontSize: 13, padding: "8px 18px",
            cursor: "pointer", fontFamily: FONT,
          }}>Verwerfen</button>
          <button onClick={() => onConfirm(text)} style={{
            background: C.accent, border: "none", borderRadius: 8,
            color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 20px",
            cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6,
          }}>
            <Check size={13} strokeWidth={2.5} /> Als Post erstellen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
