/**
 * PostEditorModal – Full-screen BlockNote editor for posts
 *
 * Ersetzt Editor.jsx als primäre Post-Bearbeitung.
 * Läuft als Full-Screen-Takeover (wie StoryEditorModal, kein floating Modal).
 *
 * Speichert Inhalt als:
 *   post.blocks[]   ← BlockNote native format
 *   post.content    ← Plaintext-Sync für Channel-Previews & Backwards-Compat
 */
import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronLeft, Save, Calendar, Send, Check, Image, X, ChevronDown,
  Eye, Sparkles, FileText,
} from "lucide-react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import "@blocknote/ariakit/style.css";
import { BlockNoteView } from "@blocknote/ariakit";
import { useCreateBlockNote, FilePanelController } from "@blocknote/react";
import MediaLibraryFilePanel from "./StoryEditor/MediaLibraryFilePanel.js";
import { C, T, FONT, IW, CSS, TYPO } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { uid, fpos } from "../utils/store.js";
import { useApp } from "../context/AppContext.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { PREV } from "../components/previews/index.jsx";
import AIPanel from "../components/AIPanel.jsx";
import MediaPicker from "../components/StockSearch.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────
function blocksToText(blocks) {
  if (!blocks?.length) return "";
  return blocks
    .flatMap(b => {
      const line = (b.content || [])
        .filter(c => c.type === "text" || c.type === "link")
        .map(c => c.type === "link"
          ? (c.content || []).filter(x => x.type === "text").map(x => x.text).join("")
          : (c.text || ""))
        .join("");
      return line ? [line] : [];
    })
    .join("\n")
    .trim();
}

function textToBlocks(text) {
  if (!text?.trim()) return undefined;
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map(line => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUSES = [
  { id:"draft",     label:"Entwurf",        color:"#F59E0B" },
  { id:"pending",   label:"Zur Freigabe",   color:"#3B82F6" },
  { id:"scheduled", label:"Geplant",        color:"#0EA5E9" },
  { id:"published", label:"Veröffentlicht", color:"#7C3AED" },
];

const CATS = ["Politik","Wirtschaft","Tech","Sport","Lifestyle","Kultur","Gesundheit","Reise","Bildung","Andere"];
const CAT_CLR = {
  Politik:"#3B82F6", Wirtschaft:"#10B981", Tech:"#8B5CF6",
  Sport:"#F59E0B", Lifestyle:"#EC4899", Kultur:"#6366F1",
  Gesundheit:"#EF4444", Reise:"#14B8A6", Bildung:"#F97316", Andere:"#6B7280",
};

// ══════════════════════════════════════════════════════════════════════════════
export default function PostEditorModal() {
  const {
    edPost: post,
    items, campaigns,
    save: onSave,
    setEdPost,
    uploadItem: onUpload,
    updateItem: onUpdate,
    user,
  } = useApp();

  // ── BlockNote init ──────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initBlocks = useMemo(
    () => post.blocks?.length ? post.blocks : textToBlocks(post.content),
    [],
  );

  const editor = useCreateBlockNote({ initialContent: initBlocks });

  // ── State ───────────────────────────────────────────────────────────────────
  const [form, setForm]           = useState({ ...post, channelTexts: post.channelTexts || {} });
  const [pch, setPch]             = useState(post.channels?.[0] || "instagram");
  const [rightPane, setRightPane] = useState("preview");
  const [picker, setPicker]       = useState(false);
  const [saved, setSaved]         = useState(null);
  const [catOpen, setCatOpen]     = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [liveContent, setLiveContent] = useState(() => blocksToText(initBlocks || []));

  const formRef  = useRef(form);
  formRef.current = form;
  const timerRef = useRef();

  // ── Subscribe to editor changes → sync live preview ─────────────────────────
  useEffect(() => {
    const update = () => setLiveContent(blocksToText(editor.document));
    editor._tiptapEditor?.on("update", update);
    return () => editor._tiptapEditor?.off("update", update);
  }, [editor]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const media      = items.find(m => m.id === form.mediaId);
  const PC         = PREV[pch] || PREV.instagram;
  const previewPost = useMemo(() => ({ ...form, content: liveContent }), [form, liveContent]);

  const maxC    = form.channels?.length > 0
    ? Math.min(...form.channels.map(id => CHANNELS.find(c => c.id === id)?.maxChars || 9999))
    : 9999;
  const charLen = liveContent.length;
  const charPct = maxC < 9999 ? charLen / maxC * 100 : 0;
  const charClr = charPct > 90 ? "#EF4444" : charPct > 70 ? "#F59E0B" : C.textMute;

  const curStatus = STATUSES.find(s => s.id === form.status) || STATUSES[0];
  const isAdm     = user?.role === "admin";

  // ── Auto-save (30 s) ────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!form.title && !liveContent) return;
    timerRef.current = setTimeout(() => {
      const f = formRef.current;
      onSave({
        ...f,
        blocks:  editor.document,
        content: blocksToText(editor.document),
        status:  f.status === "published" ? f.status : "draft",
      });
      setSaved(new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" }));
    }, 30000);
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, liveContent]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const togCh = id => setForm(f => ({
    ...f,
    channels: f.channels?.includes(id)
      ? f.channels.filter(c => c !== id)
      : [...(f.channels || []), id],
  }));

  const handleSave = (statusOverride) => {
    const content = blocksToText(editor.document);
    onSave({
      ...formRef.current,
      id:      formRef.current.id || uid(),
      blocks:  editor.document,
      content,
      status:  statusOverride ?? formRef.current.status ?? "draft",
    });
    setEdPost(null);
  };

  const applyAiText = (text) => {
    const blocks = textToBlocks(text) || [{ type:"paragraph" }];
    editor.replaceBlocks(editor.document, blocks);
    setLiveContent(text);
  };

  const appendAiText = (text) => {
    const combined = (liveContent + (liveContent ? "\n\n" : "") + text).trim();
    applyAiText(combined);
  };

  // ── Close status picker on outside click ────────────────────────────────────
  useEffect(() => {
    if (!statusOpen) return;
    const close = () => setStatusOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [statusOpen]);

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      display:"flex", flexDirection:"column", flex:1,
      height:"100%", background:C.bg, fontFamily:FONT, overflow:"hidden",
    }}>
      <style>{CSS}</style>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink:0, height:52, paddingInline:14,
        display:"flex", alignItems:"center", gap:10,
        background:C.surface, borderBottom:`1px solid ${C.border}`,
      }}>

        {/* Back */}
        <button
          onClick={() => setEdPost(null)}
          style={{
            display:"flex", alignItems:"center", gap:4,
            background:"none", border:"none", cursor:"pointer",
            color:C.textSoft, fontSize:13, fontWeight:600, fontFamily:FONT,
            padding:"4px 8px", borderRadius:6, flexShrink:0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.text}
          onMouseLeave={e => e.currentTarget.style.color = C.textSoft}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          Zurück
        </button>

        <div style={{ width:1, height:20, background:C.borderLight }} />

        {/* Title */}
        <span style={{
          fontSize:14, fontWeight:700, color:C.text,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          flex:1, minWidth:0,
        }}>
          {form.title || "Neuer Post"}
        </span>

        {/* Char / word counter */}
        {(charLen > 0 || form.title) && (
          <div style={{
            display:"flex", gap:6, alignItems:"center",
            background:C.bg, border:`1px solid ${C.border}`,
            borderRadius:7, padding:"3px 9px", flexShrink:0,
            fontSize:10.5,
          }}>
            <span style={{ color:C.textMute }}>
              {liveContent.trim().split(/\s+/).filter(Boolean).length} Wörter
            </span>
            <span style={{ color:C.borderLight }}>·</span>
            <span style={{ color:charClr, fontWeight:600 }}>
              {charLen}{maxC < 9999 ? `/${maxC}` : ""} Z.
            </span>
            {maxC < 9999 && (
              <div style={{ width:36, height:3, borderRadius:99, background:C.borderLight, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(100, charPct)}%`, background:charClr, borderRadius:99, transition:"width .2s" }} />
              </div>
            )}
          </div>
        )}

        {saved && (
          <span style={{ fontSize:10.5, color:C.textMute, flexShrink:0 }}>
            gespeichert {saved}
          </span>
        )}

        {/* Status dropdown */}
        <div style={{ position:"relative", flexShrink:0 }}
          onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={() => setStatusOpen(o => !o)}
            style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"5px 10px", borderRadius:7,
              border:`1.5px solid ${curStatus.color}40`,
              background:`${curStatus.color}12`,
              color:curStatus.color, cursor:"pointer",
              fontSize:12, fontWeight:700, fontFamily:FONT,
            }}
          >
            <span style={{ width:7, height:7, borderRadius:"50%", background:curStatus.color }} />
            {curStatus.label}
            <ChevronDown size={11} strokeWidth={2.5} />
          </button>
          {statusOpen && (
            <div style={{
              position:"absolute", top:"calc(100% + 5px)", right:0, zIndex:200,
              background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:9, padding:4, boxShadow:T.shadowLg, minWidth:165,
            }}>
              {STATUSES.map(st => (
                <button
                  key={st.id}
                  onClick={() => { setForm(f => ({...f, status:st.id})); setStatusOpen(false); }}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    width:"100%", padding:"7px 10px", borderRadius:6,
                    border:"none", background:"none", cursor:"pointer",
                    fontFamily:FONT, fontSize:12, fontWeight:600,
                    color: form.status === st.id ? st.color : C.textMid,
                    textAlign:"left",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <span style={{ width:7, height:7, borderRadius:"50%", background:st.color, flexShrink:0 }} />
                  {st.label}
                  {form.status === st.id && <Check size={12} color={st.color} style={{ marginLeft:"auto" }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Save buttons */}
        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
          <button
            onClick={() => handleSave("draft")}
            style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"6px 11px", borderRadius:7,
              border:`1px solid ${C.border}`, background:C.surface,
              cursor:"pointer", fontSize:11.5, fontWeight:700,
              fontFamily:FONT, color:C.textMid,
            }}
          >
            <FileText size={12} strokeWidth={2} />
            Entwurf
          </button>
          {!isAdm && form.status !== "pending" && form.status !== "published" && (
            <button
              onClick={() => handleSave("pending")}
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"6px 11px", borderRadius:7,
                border:`1px solid ${C.border}`, background:C.surface,
                cursor:"pointer", fontSize:11.5, fontWeight:700,
                fontFamily:FONT, color:C.textMid,
              }}
            >
              <Send size={12} strokeWidth={2} />
              Freigabe
            </button>
          )}
          {isAdm && form.scheduledDate && form.status !== "scheduled" && (
            <button
              onClick={() => handleSave("scheduled")}
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"6px 11px", borderRadius:7,
                border:`1px solid ${C.border}`, background:C.surface,
                cursor:"pointer", fontSize:11.5, fontWeight:700,
                fontFamily:FONT, color:C.textMid,
              }}
            >
              <Calendar size={12} strokeWidth={2} />
              Planen
            </button>
          )}
          <button
            onClick={() => handleSave()}
            style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"6px 14px", borderRadius:7,
              background:C.accent, color:"#fff", border:"none",
              cursor:"pointer", fontSize:12, fontWeight:700,
              fontFamily:FONT, boxShadow:`0 2px 8px ${C.accent}40`,
            }}
          >
            <Save size={13} strokeWidth={2} />
            Speichern
          </button>
        </div>
      </div>

      {/* ── 3-COLUMN LAYOUT ──────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ─── LEFT: Metadata ─────────────────────────────────────────────── */}
        <div style={{
          width:220, flexShrink:0,
          overflow:"auto", padding:"14px 12px",
          borderRight:`1px solid ${C.borderLight}`,
          display:"flex", flexDirection:"column", gap:13,
          background:C.surface,
        }}>

          {/* Titel */}
          <div>
            <div style={{ ...TYPO.nano, marginBottom:5 }}>Titel (intern)</div>
            <input
              value={form.title || ""}
              onChange={e => setForm(f => ({...f, title:e.target.value}))}
              placeholder="Kurzer Arbeitstitel…"
              style={{
                width:"100%", padding:"7px 9px", borderRadius:7,
                border:`1px solid ${C.border}`, background:C.bg,
                fontSize:12.5, fontFamily:FONT, color:C.text,
                outline:"none", boxSizing:"border-box",
              }}
            />
          </div>

          {/* Kanäle */}
          <div>
            <div style={{ ...TYPO.nano, marginBottom:6 }}>Kanäle</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {CHANNELS.map(c => (
                <button
                  key={c.id}
                  onClick={() => togCh(c.id)}
                  title={c.label}
                  style={{
                    display:"flex", alignItems:"center", gap:4,
                    padding:"5px 8px", borderRadius:7,
                    border:`1.5px solid ${form.channels?.includes(c.id) ? c.color : C.border}`,
                    background: form.channels?.includes(c.id) ? `${c.color}12` : C.bg,
                    cursor:"pointer", transition:"all .12s",
                  }}
                >
                  <ChIco id={c.id} size={12} />
                  <span style={{
                    fontSize:11, fontWeight:600,
                    color: form.channels?.includes(c.id) ? c.color : C.textSoft,
                    fontFamily:FONT,
                  }}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Datum & Uhrzeit */}
          <div>
            <div style={{ ...TYPO.nano, marginBottom:5 }}>Veröffentlichung</div>
            <input
              type="date"
              value={form.scheduledDate || ""}
              onChange={e => setForm(f => ({...f, scheduledDate:e.target.value}))}
              style={{
                width:"100%", padding:"6px 9px", borderRadius:7,
                border:`1px solid ${C.border}`, background:C.bg,
                fontSize:12, fontFamily:FONT, color:C.text,
                outline:"none", boxSizing:"border-box", marginBottom:5,
              }}
            />
            <input
              type="time"
              value={form.scheduledTime || "12:00"}
              onChange={e => setForm(f => ({...f, scheduledTime:e.target.value}))}
              style={{
                width:"100%", padding:"6px 9px", borderRadius:7,
                border:`1px solid ${C.border}`, background:C.bg,
                fontSize:12, fontFamily:FONT, color:C.text,
                outline:"none", boxSizing:"border-box",
              }}
            />
          </div>

          {/* Kampagne */}
          {campaigns?.length > 0 && (
            <div>
              <div style={{ ...TYPO.nano, marginBottom:5 }}>Kampagne</div>
              <div style={{ position:"relative", borderRadius:7, border:`1px solid ${C.border}`, background:C.bg }}>
                <select
                  value={form.campaignId || ""}
                  onChange={e => setForm(f => ({...f, campaignId:e.target.value || null}))}
                  style={{
                    width:"100%", padding:"7px 28px 7px 9px",
                    border:"none", background:"transparent",
                    fontSize:12, fontFamily:FONT, color:C.text,
                    outline:"none", cursor:"pointer", appearance:"none",
                  }}
                >
                  <option value="">— Keine —</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={11} color={C.textMute} strokeWidth={2} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
              </div>
            </div>
          )}

          {/* Mediendatei */}
          <div>
            <div style={{ ...TYPO.nano, marginBottom:5 }}>Mediendatei</div>
            {media ? (
              <div style={{ display:"flex", gap:8, alignItems:"center", background:C.bg, borderRadius:8, padding:8, border:`1px solid ${C.border}` }}>
                <img
                  src={media.url} alt=""
                  style={{ width:40, height:40, objectFit:"cover", objectPosition:fpos(media), borderRadius:6, flexShrink:0 }}
                />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:C.text }}>{media.name}</div>
                  <div style={{ fontSize:10, color:C.textMute }}>{media.type}</div>
                </div>
                <button
                  onClick={() => setForm(f => ({...f, mediaId:null}))}
                  style={{ background:"none", border:"none", color:C.textMute, cursor:"pointer", padding:0, flexShrink:0 }}
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPicker(true)}
                style={{
                  width:"100%", padding:"10px 8px", borderRadius:8,
                  border:`1.5px dashed ${C.border}`, background:C.bg,
                  color:C.textSoft, fontSize:12, fontWeight:600,
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:6, fontFamily:FONT,
                  transition:"all .12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSoft; }}
              >
                <Image size={14} strokeWidth={IW} />
                Medien wählen
              </button>
            )}
          </div>

          {/* Kategorie */}
          <div>
            <button
              onClick={() => setCatOpen(o => !o)}
              style={{
                display:"flex", alignItems:"center", gap:4,
                background:"none", border:"none", cursor:"pointer",
                padding:0, color: catOpen ? C.text : C.textMute,
                fontSize:11, fontWeight:600, fontFamily:FONT,
              }}
            >
              <ChevronDown size={11} strokeWidth={2} style={{ transform:catOpen ? "rotate(180deg)" : "none", transition:"transform .15s" }} />
              Kategorie{form.category ? ` · ${form.category}` : ""}
            </button>
            {catOpen && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:7 }}>
                {CATS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setForm(f => ({...f, category: f.category === cat ? "" : cat}))}
                    style={{
                      padding:"2px 9px", borderRadius:20, cursor:"pointer",
                      border:`1.5px solid ${form.category === cat ? (CAT_CLR[cat] || "#6B7280") : C.border}`,
                      background: form.category === cat ? `${CAT_CLR[cat] || "#6B7280"}14` : "transparent",
                      color: form.category === cat ? (CAT_CLR[cat] || "#6B7280") : C.textSoft,
                      fontSize:10.5, fontWeight:600, fontFamily:FONT,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── CENTER: BlockNote editor ────────────────────────────────────── */}
        <div style={{ flex:1, overflow:"auto", background:C.bg, display:"flex", flexDirection:"column", minWidth:0 }}>
          {/* Char bar for limited channels */}
          {maxC < 9999 && (
            <div style={{ flexShrink:0, padding:"8px 32px 0", display:"flex", justifyContent:"flex-end" }}>
              <span style={{ fontSize:11, color:charClr, fontWeight:600 }}>
                {charLen} / {maxC} Zeichen
              </span>
            </div>
          )}

          {/* Editor */}
          <div style={{ flex:1, padding:"20px 0 60px" }}>
            <BlockNoteView
              editor={editor}
              theme="light"
              filePanel={false}
              style={{ minHeight:300 }}
            >
              {/* Ersetzt BlockNotes Standard-Datei-Upload durch Medienbibliothek-Picker */}
              <FilePanelController filePanel={MediaLibraryFilePanel} />
            </BlockNoteView>
          </div>
        </div>

        {/* ─── RIGHT: Preview + AI ─────────────────────────────────────────── */}
        <div style={{
          width:300, flexShrink:0,
          display:"flex", flexDirection:"column",
          borderLeft:`1px solid ${C.borderLight}`,
          background: rightPane === "ai"
            ? `linear-gradient(170deg,${C.purpleBg} 0%,${C.surface} 60%)`
            : C.bg,
          overflow:"hidden",
        }}>

          {/* Pane toggle */}
          <div style={{
            flexShrink:0, padding:"8px 10px",
            borderBottom:`1px solid ${C.borderLight}`,
            display:"flex", gap:3, background:C.surface,
          }}>
            {[["preview","Vorschau",Eye], ["ai","KI-Assistent",Sparkles]].map(([id, label, Ic]) => (
              <button
                key={id}
                onClick={() => setRightPane(id)}
                style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"5px 10px", borderRadius:7, border:"none",
                  background: rightPane === id
                    ? (id === "ai" ? `linear-gradient(135deg,${C.ai1},${C.ai2})` : C.bg)
                    : "transparent",
                  color: rightPane === id ? (id === "ai" ? "#fff" : C.text) : C.textSoft,
                  fontWeight:700, fontSize:11.5, cursor:"pointer", fontFamily:FONT,
                  boxShadow: rightPane === id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                  transition:"all .12s",
                }}
              >
                <Ic size={11} strokeWidth={2} />
                {label}
                {id === "ai" && (
                  <span style={{
                    fontSize:8.5, fontWeight:800, padding:"0 5px", borderRadius:8,
                    background: rightPane === "ai" ? "rgba(255,255,255,.3)" : C.purpleGlow,
                    color: rightPane === "ai" ? "#fff" : C.purple,
                  }}>PRO</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflow:"auto", padding:12 }}>

            {/* PREVIEW */}
            {rightPane === "preview" && (
              <>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                  {CHANNELS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setPch(c.id)}
                      style={{
                        display:"flex", alignItems:"center", gap:3,
                        padding:"3px 8px", borderRadius:6,
                        border:`1.5px solid ${pch === c.id ? c.color : C.border}`,
                        background: pch === c.id ? c.color : C.surface,
                        color: pch === c.id ? "#fff" : C.textSoft,
                        fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:FONT,
                        transition:"all .12s",
                      }}
                    >
                      <ChIco id={c.id} size={10} />
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}` }}>
                  <PC post={previewPost} media={media} />
                </div>
              </>
            )}

            {/* AI PANEL */}
            {rightPane === "ai" && (
              form.channels?.length > 0
                ? <AIPanel
                    content={liveContent}
                    chId={form.channels[0]}
                    onApply={applyAiText}
                    onApplyHT={appendAiText}
                  />
                : <div style={{ textAlign:"center", padding:"48px 16px" }}>
                    <div style={{
                      width:48, height:48, borderRadius:14, margin:"0 auto 14px",
                      background:`linear-gradient(135deg,${C.ai1}20,${C.ai2}10)`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <Sparkles size={22} strokeWidth={1.5} color={C.purple} style={{ opacity:.5 }} />
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.textSoft, marginBottom:6 }}>
                      Kanal auswählen
                    </div>
                    <div style={{ fontSize:12, color:C.textMute, lineHeight:1.5 }}>
                      Wähle mindestens einen Kanal links aus, um den KI-Assistenten zu nutzen.
                    </div>
                  </div>
            )}
          </div>
        </div>
      </div>

      {/* Media picker */}
      {picker && (
        <MediaPicker
          items={items}
          posts={[]}
          onSelect={item => { setForm(f => ({...f, mediaId:item.id})); setPicker(false); }}
          onUpload={onUpload}
          onUpdate={onUpdate}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  );
}
