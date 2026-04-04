import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import "@blocknote/ariakit/style.css";
import { useCreateBlockNote, useBlockNoteEditor, FilePanelController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X, Save, Check, BookOpen, Link as LinkIcon, StickyNote,
  Trash2, Wand2, Loader, Hash, PenLine, Image as ImageIcon,
} from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW, CSS } from "../constants/colors.js";
import { STORY_CHANNELS } from "../constants/demo.js";
import { uid, aiCall, fileToDataURL } from "../utils/store.js";
import { Btn } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CATS = ["","Marketing","Tech","Lifestyle","Wirtschaft","Politik","Kultur","Gesundheit","Reise","Bildung","Andere"];
const CAT_COLOR = {Marketing:"#E1306C",Tech:"#8B5CF6",Lifestyle:"#EC4899",Wirtschaft:"#10B981",Politik:"#3B82F6",Kultur:"#6366F1",Gesundheit:"#EF4444",Reise:"#14B8A6",Bildung:"#F97316",Andere:"#6B7280"};

const STATUSES = [
  { id:"idea",      label:"Idee",           color:"#6366F1", icon:"💡", desc:"Ersten Gedanken sammeln" },
  { id:"draft",     label:"Entwurf",        color:"#F59E0B", icon:"✏️", desc:"Inhalt wird geschrieben" },
  { id:"ready",     label:"Bereit",         color:"#10B981", icon:"✅", desc:"Bereit für Ableitungen" },
  { id:"published", label:"Veröffentlicht", color:"#0EA5E9", icon:"🚀", desc:"Story ist publiziert" },
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

// ── CUSTOM BLOCKNOTE FILE PANEL (Medienbibliothek) ─────────────────────────
function MediaLibraryFilePanel({ blockId }) {
  const editor = useBlockNoteEditor();
  const { items, posts } = useApp();
  const [tab, setTab] = useState("library");
  const [hovId, setHovId] = useState(null);

  const images = useMemo(() => items.filter(i => i.type === "image" && i.url), [items]);

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

  return (
    <div style={{ padding: "14px 16px", minWidth: 420, fontFamily: FONT }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
        {[["library", "Medienbibliothek"], ["upload", "Datei hochladen"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "4px 12px", borderRadius: 6, border: "none",
            background: tab === id ? C.accent : "transparent",
            color: tab === id ? "#fff" : C.textMid,
            cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400, fontFamily: FONT,
          }}>{label}</button>
        ))}
      </div>

      {tab === "library" ? (
        images.length === 0 ? (
          <p style={{ color: C.textMute, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
            Keine Bilder in der Medienbibliothek.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {images.map(img => {
              const count = usageMap[img.id] || 0;
              return (
                <div key={img.id} onClick={() => handleSelect(img)}
                  onMouseEnter={() => setHovId(img.id)}
                  onMouseLeave={() => setHovId(null)}
                  style={{
                    position: "relative", borderRadius: 8, overflow: "hidden",
                    cursor: "pointer", outline: hovId === img.id ? `2px solid ${C.accent}` : `2px solid transparent`,
                    transition: "outline .1s",
                  }}>
                  <img src={img.url} alt={img.name || ""}
                    style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
                  {count > 0 && (
                    <div style={{
                      position: "absolute", bottom: 4, left: 4,
                      background: "rgba(0,0,0,.65)", color: "#fff",
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                      display: "flex", alignItems: "center", gap: 3,
                    }}>
                      <Check size={8} strokeWidth={3} /> {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          padding: 28, borderRadius: 10, border: `2px dashed ${C.border}`,
          cursor: "pointer", color: C.textMute, fontSize: 12, fontFamily: FONT,
        }}>
          <ImageIcon size={28} strokeWidth={1.5} color={C.textMute} />
          <span>Bild oder Video auswählen</span>
          <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileUpload} />
        </label>
      )}
    </div>
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
  const { edStory: story, items, posts, saveStory: onSave, setEdStory, setPosts } = useApp();
  const onClose = () => setEdStory(null);

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
  });

  const [rightTab, setRightTab] = useState("materials");
  const [linkInput, setLinkInput] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [autoSaved, setAutoSaved] = useState(null);
  const [deriving, setDeriving] = useState({}); // { [chId]: boolean }

  const asRef = useRef();
  const formRef = useRef(form);
  formRef.current = form;

  // ── BlockNote editor ──────────────────────────────────────────────────────
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
    // Enables image/video/file blocks: converts file → data URL (local/demo)
    uploadFile: async (file) => fileToDataURL(file),
  });

  // ── Live word count ───────────────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(() => {
    const text = blocksToText(initialBlocks || []);
    return text.trim().split(/\s+/).filter(Boolean).length;
  });

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const hasContent = wordCount > 5;

  // ── Auto-save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(asRef.current);
    if (!form.title) return;
    asRef.current = setTimeout(() => {
      const f = formRef.current;
      const text = blocksToText(editor.document || []);
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      onSave({ ...f, id: f.id || uid(), blocks: editor.document, updatedAt: new Date().toISOString() });
      setAutoSaved(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    }, 20000);
    return () => clearTimeout(asRef.current);
  }, [form.title]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSave = (status) => {
    const f = formRef.current;
    const text = blocksToText(editor.document || []);
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(wc);
    onSave({
      ...f,
      id: f.id || uid(),
      status: status || f.status,
      blocks: editor.document,
      updatedAt: new Date().toISOString(),
    });
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

    const postId = uid();
    const post = {
      id: postId,
      title: f.title || "Story-Ableitung",
      content,
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
  }, [editor, setPosts]);

  const currentStatus = STATUSES.find(s => s.id === form.status) || STATUSES[0];
  const catColor = CAT_COLOR[form.category] || C.textMid;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,.6)", display: "flex",
    }}>
      <style>{CSS}</style>
      <style>{`
        .bn-container { font-family: ${FONT}; }
        .bn-editor { min-height: 300px; padding: 0 !important; }
        .bn-block-outer { margin: 0 !important; }
        /* Floating UI elements must appear above the modal (z:1000) */
        .bn-toolbar { z-index: 1200 !important; }
        .bn-suggestion-menu { z-index: 1200 !important; }
        .bn-side-menu { z-index: 1200 !important; }
        .bn-image-toolbar { z-index: 1200 !important; }
        .bn-file-toolbar { z-index: 1200 !important; }
        [data-radix-popper-content-wrapper] { z-index: 1200 !important; }
        [data-floating-ui-portal] { z-index: 1200 !important; }
        /* Slash-menu and formatting toolbar text */
        .bn-slash-menu { z-index: 1200 !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {showImagePicker && (
        <ImagePicker items={items} onSelect={addImage} onClose={() => setShowImagePicker(false)} />
      )}

      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: C.bg,
      }}>

        {/* ── TOP BAR ───────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
          borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0,
        }}>
          <BookOpen size={16} strokeWidth={IW} color={C.accent} />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, color: C.text }}>
            Story-Editor
          </span>
          {form.category && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: catColor + "18", color: catColor, fontFamily: FONT,
            }}>{form.category}</span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: currentStatus.color + "15", color: currentStatus.color, fontFamily: FONT,
          }}>
            {currentStatus.icon} {currentStatus.label}
          </span>
          {autoSaved && (
            <span style={{ fontSize: 10, color: C.textMute, fontFamily: FONT }}>
              · Auto-gespeichert {autoSaved}
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Stats */}
          <div style={{
            display: "flex", gap: 12, fontSize: 11, color: C.textMute, fontFamily: FONT,
            background: C.borderLight, border: `1px solid ${C.border}`,
            padding: "5px 12px", borderRadius: 6,
          }}>
            <span><strong style={{ color: C.text }}>{wordCount}</strong> Wörter</span>
            <span style={{ color: C.border }}>·</span>
            <span><strong style={{ color: C.text }}>{readingTime}</strong> Min. Lesezeit</span>
            <span style={{ color: C.border }}>·</span>
            <span><strong style={{ color: C.text }}>{form.materials.length}</strong> Materialien</span>
            <span style={{ color: C.border }}>·</span>
            <span><strong style={{ color: C.text }}>{form.derivatives.length}</strong> Ableitungen</span>
          </div>

          <Btn variant="secondary" onClick={() => handleSave()} style={{ fontSize: 12 }}>
            <Save size={13} strokeWidth={IW} /> Speichern
          </Btn>
          <Btn onClick={() => handleSave("ready")} style={{ fontSize: 12 }}>
            <Check size={13} strokeWidth={2.5} /> Bereit markieren
          </Btn>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute, padding: 4 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* ── BODY ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── LEFT PANEL: Metadata ──────────────────────────────────── */}
          <div style={{
            width: 230, borderRight: `1px solid ${C.border}`,
            background: C.surface, overflowY: "auto", padding: "20px 16px",
            display: "flex", flexDirection: "column", gap: 20, flexShrink: 0,
          }}>
            {/* Status */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Status</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {STATUSES.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, status: s.id }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                      borderRadius: 7, border: `1.5px solid ${form.status === s.id ? s.color : C.border}`,
                      background: form.status === s.id ? s.color + "12" : "transparent",
                      cursor: "pointer", textAlign: "left",
                    }}>
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: form.status === s.id ? s.color : C.text, fontFamily: FONT }}>{s.label}</div>
                      <div style={{ fontSize: 9, color: C.textMute, fontFamily: FONT }}>{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Kategorie</div>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 7,
                  border: `1px solid ${C.border}`, background: C.bg,
                  color: C.text, fontSize: 12, fontFamily: FONT, outline: "none",
                }}>
                {CATS.map(c => <option key={c} value={c}>{c || "Keine Kategorie"}</option>)}
              </select>
            </div>

            {/* Target channels */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Ziel-Kanäle</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {STORY_CHANNELS.map(ch => {
                  const active = form.targetChannels.includes(ch.id);
                  return (
                    <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 10px", borderRadius: 7,
                        border: `1.5px solid ${active ? ch.color : C.border}`,
                        background: active ? ch.color + "12" : "transparent",
                        cursor: "pointer",
                      }}>
                      <ChIco id={ch.id} size={14} color={active ? ch.color : C.textMute} />
                      <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? ch.color : C.textMid, fontFamily: FONT }}>{ch.label}</span>
                      {active && <Check size={11} strokeWidth={2.5} style={{ marginLeft: "auto", color: ch.color }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                <Hash size={10} strokeWidth={2} style={{ display: "inline", marginRight: 3 }} />Tags
              </div>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 7,
                  border: `1px solid ${C.border}`, background: C.bg,
                  color: C.text, fontSize: 12, fontFamily: FONT, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* ── CENTER: Title + Editor ─────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "32px 48px 0", maxWidth: 800, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titel deiner Story…"
                style={{
                  width: "100%", border: "none", outline: "none",
                  fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32,
                  color: C.text, background: "transparent", marginBottom: 8,
                  lineHeight: 1.2,
                }}
              />
              <input
                value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                placeholder="Untertitel oder Lead-Satz (optional)…"
                style={{
                  width: "100%", border: "none", outline: "none",
                  fontFamily: FONT, fontSize: 16, color: C.textMid,
                  background: "transparent", marginBottom: 24,
                }}
              />
              <div style={{ borderTop: `1px solid ${C.borderLight}`, marginBottom: 24 }} />
            </div>

            {/* BlockNote Editor with live word count */}
            <div style={{ flex: 1, padding: "0 48px 40px", maxWidth: 800, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              <BlockNoteView
                editor={editor}
                theme="light"
                filePanel={false}
                style={{ fontSize: 15, lineHeight: 1.8 }}
                onChange={() => {
                  const text = blocksToText(editor.document || []);
                  setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
                }}
              >
                <FilePanelController filePanel={MediaLibraryFilePanel} />
              </BlockNoteView>
            </div>
          </div>

          {/* ── RIGHT PANEL: Materials + Derivatives ──────────────────── */}
          <div style={{
            width: 300, borderLeft: `1px solid ${C.border}`,
            background: C.surface, display: "flex", flexDirection: "column", flexShrink: 0,
          }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {[
                ["materials", "Materialien", form.materials.length],
                ["derivatives", "Ableitungen", form.derivatives.length],
              ].map(([id, label, count]) => (
                <button key={id} onClick={() => setRightTab(id)}
                  style={{
                    flex: 1, padding: "12px 8px", border: "none", cursor: "pointer",
                    background: rightTab === id ? C.bg : "transparent",
                    borderBottom: rightTab === id ? `2px solid ${C.accent}` : "2px solid transparent",
                    color: rightTab === id ? C.accent : C.textMid,
                    fontFamily: FONT, fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  {label}
                  {count > 0 && (
                    <span style={{
                      background: rightTab === id ? C.accent : C.border,
                      color: rightTab === id ? "#fff" : C.textMid,
                      borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px",
                    }}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

              {/* ── MATERIALIEN TAB ──────────────────────────────────── */}
              {rightTab === "materials" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMute, fontFamily: FONT }}>
                    Sammle alles zu dieser Story: Links, Notizen, Bilder und Quellen.
                  </p>

                  {/* Add buttons row */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Add link */}
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
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                        <LinkIcon size={13} strokeWidth={IW} /> Link hinzufügen
                      </button>
                    )}

                    {/* Add note */}
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
                          <button onClick={addNote} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Notiz speichern</button>
                          <button onClick={() => { setAddingNote(false); setNoteInput(""); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT }}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingNote(true)}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                        <StickyNote size={13} strokeWidth={IW} /> Notiz hinzufügen
                      </button>
                    )}

                    {/* Add image */}
                    <button onClick={() => setShowImagePicker(true)}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                      <ImageIcon size={13} strokeWidth={IW} /> Bild hinzufügen
                    </button>
                  </div>

                  {/* Materials list */}
                  {form.materials.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px 0", color: C.textMute, fontSize: 12, fontFamily: FONT }}>
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
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: C.textMute, fontFamily: FONT }}>
                    KI leitet aus dieser Story kanalspezifische Entwürfe ab.
                    {!hasContent && <span style={{ color: "#F59E0B" }}> Schreibe zuerst etwas im Editor.</span>}
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
                      Wähle Ziel-Kanäle links um die Auswahl einzugrenzen.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
