import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import "@blocknote/ariakit/style.css";
import {
  useCreateBlockNote, useBlockNoteEditor, FilePanelController,
  FormattingToolbarController, FormattingToolbar,
  BlockTypeSelect, BasicTextStyleButton, CreateLinkButton,
  blockTypeSelectItems,
  SideMenuController, SideMenu, DragHandleButton, DeleteButton,
  SuggestionMenuController, getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { useStore } from "@tanstack/react-store";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom"; // still used by MediaLibraryFilePanel + DerivativePreviewModal
import {
  X, Save, Check, Link as LinkIcon, StickyNote,
  Trash2, Wand2, Loader, Image as ImageIcon,
  ChevronLeft, ChevronDown, AlignLeft, Eye, Clock,
  TrendingUp, TrendingDown, Minus,
  BarChart2, Hash, Tag, RefreshCw, Globe, ExternalLink,
  Sparkles, Send, RotateCcw,
} from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { STORY_CHANNELS } from "../constants/demo.js";
import { uid, aiCall, fileToDataURL, parseJSON } from "../utils/store.js";
import { stockSearch, skGet } from "../components/StockSearch.jsx";
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

const SPARK_ACTIONS = [
  { id:"shorten",    label:"Kürzen",        prompt:"Kürze diesen Text auf das Wesentliche, ohne wichtige Informationen zu verlieren." },
  { id:"expand",     label:"Verlängern",    prompt:"Erweitere diesen Text mit mehr Details, Beispielen und konkreten Zahlen." },
  { id:"rephrase",   label:"Umformulieren", prompt:"Formuliere diesen Text komplett um, behalte Inhalt und Aussage bei." },
  { id:"simplify",   label:"Vereinfachen",  prompt:"Vereinfache den Schreibstil für ein breiteres Publikum: kürzere Sätze, weniger Fachbegriffe." },
  { id:"formal",     label:"Formeller",     prompt:"Schreibe formeller und professioneller, behalt den Inhalt vollständig bei." },
  { id:"spellcheck", label:"Korrektur",     prompt:"Korrigiere alle Rechtschreib- und Grammatikfehler. Verändere keine Inhalte." },
];
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
// Rich markdown converter for web publishing (preserves headings, images, lists)
function blocksToMarkdown(blocks) {
  if (!blocks?.length) return "";
  const inl = (content) => {
    if (!Array.isArray(content)) return "";
    return content.map(item => {
      if (item.type === "link") return `[${(item.content||[]).map(c=>c.text||"").join("")}](${item.href||""})`;
      if (item.type !== "text") return "";
      let t = item.text || "";
      if (item.styles?.bold)   t = `**${t}**`;
      if (item.styles?.italic) t = `*${t}*`;
      if (item.styles?.code)   t = `\`${t}\``;
      return t;
    }).join("");
  };
  const lines = [];
  for (const block of blocks) {
    if (block.type === "image") {
      const url = block.props?.url || "";
      if (url && !url.startsWith("data:")) // skip base64 (too large for KV)
        lines.push(`![${block.props?.caption || ""}](${url})`);
    } else if (block.type === "heading") {
      const t = inl(block.content);
      if (t.trim()) lines.push(`${"#".repeat(block.props?.level || 2)} ${t.trim()}`);
    } else if (block.type === "bulletListItem") {
      const t = inl(block.content);
      if (t.trim()) lines.push(`- ${t.trim()}`);
    } else if (block.type === "numberedListItem") {
      const t = inl(block.content);
      if (t.trim()) lines.push(`1. ${t.trim()}`);
    } else if (block.type === "blockquote" || block.type === "quote") {
      const t = inl(block.content);
      if (t.trim()) lines.push(`> ${t.trim()}`);
    } else {
      const t = inl(block.content);
      if (t.trim()) lines.push(t.trim());
    }
    if (block.children?.length) lines.push(blocksToMarkdown(block.children));
  }
  return lines.filter(Boolean).join("\n\n");
}

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

// Convert plain/markdown text back into BlockNote blocks (used by Spark full-replace)
function textToBlocks(text) {
  if (!text?.trim()) return [];
  return text
    .split(/\n\n+/)
    .filter(p => p.trim())
    .flatMap(para =>
      para.split('\n').filter(l => l.trim()).map(line => {
        const l = line.trim();
        if (/^## /.test(l))  return { type:'heading',        props:{level:2,textAlignment:"left"}, content:[{type:"text",text:l.slice(3).trim(),styles:{}}], children:[] };
        if (/^### /.test(l)) return { type:'heading',        props:{level:3,textAlignment:"left"}, content:[{type:"text",text:l.slice(4).trim(),styles:{}}], children:[] };
        if (/^[*-] /.test(l)) return { type:'bulletListItem', props:{textAlignment:"left"},          content:[{type:"text",text:l.slice(2).trim(),styles:{}}], children:[] };
        return { type:'paragraph', props:{textAlignment:"left"}, content:[{type:"text",text:l,styles:{}}], children:[] };
      })
    );
}

// ── Spark: serialise document as numbered list for AI prompt ─────────────
function serializeDocumentForAI(blocks) {
  if (!blocks?.length) return "(leer)";
  return blocks.map((b, i) => {
    const inl = c => Array.isArray(c) ? c.map(x => x.type==="text"?x.text||"":"").join("") : "";
    const t = inl(b.content);
    if (b.type === "heading")          return `[${i}] H${b.props?.level||2}: "${t.slice(0,100)}"`;
    if (b.type === "image")            return `[${i}] BILD: alt="${(b.props?.caption||"").slice(0,80)}" url="${(b.props?.url||"").slice(0,60)}"`;
    if (b.type === "bulletListItem")   return `[${i}] LISTE: "${t.slice(0,80)}"`;
    if (b.type === "numberedListItem") return `[${i}] NUMM: "${t.slice(0,80)}"`;
    if (b.type === "blockquote" || b.type === "quote") return `[${i}] ZITAT: "${t.slice(0,100)}"`;
    return `[${i}] ABS: "${t.slice(0,130)}${t.length>130?"…":""}"`;
  }).join("\n");
}

// ── Spark: build a BlockNote block from one AI action ────────────────────
function makeBlockFromAction(op, imageMap = {}) {
  const mkC = txt => [{ type:"text", text: txt || "", styles:{} }];
  if (op.type === "heading")          return { type:"heading",          props:{level:op.level||2, textAlignment:"left"}, content:mkC(op.text), children:[] };
  if (op.type === "paragraph")        return { type:"paragraph",        props:{textAlignment:"left"},                    content:mkC(op.text), children:[] };
  if (op.type === "bulletListItem")   return { type:"bulletListItem",   props:{textAlignment:"left"},                    content:mkC(op.text), children:[] };
  if (op.type === "numberedListItem") return { type:"numberedListItem", props:{textAlignment:"left"},                    content:mkC(op.text), children:[] };
  if (op.type === "image") {
    const img = imageMap[op._imgKey];
    if (!img) return null;
    return { type:"image", props:{ url:img.url, caption:op.alt||op.query||"", previewWidth:512, backgroundColor:"default", textAlignment:"left" }, content:[], children:[] };
  }
  return null;
}

// ── Spark: apply action list to original blocks array ────────────────────
function applyActionsToBlocks(originalBlocks, actions, imageMap) {
  const out = [];
  for (let i = 0; i < originalBlocks.length; i++) {
    for (const op of actions) if (op.op==="insert_before" && op.index===i) { const b=makeBlockFromAction(op,imageMap); if(b) out.push(b); }
    const del = actions.find(o => o.op==="delete"  && o.index===i);
    const rep = actions.find(o => o.op==="replace" && o.index===i);
    if      (del) { /* drop */ }
    else if (rep) { const b=makeBlockFromAction(rep,imageMap); if(b) out.push(b); }
    else          { out.push(originalBlocks[i]); }
    for (const op of actions) if (op.op==="insert_after" && op.index===i) { const b=makeBlockFromAction(op,imageMap); if(b) out.push(b); }
  }
  for (const op of actions) if (op.op==="append") { const b=makeBlockFromAction(op,imageMap); if(b) out.push(b); }
  return out.filter(Boolean);
}

// ── Spark: display label for one AI action (used in plan preview) ────────
function sparkActionDisplay(a) {
  const opIcon  = { replace:"✏", insert_after:"＋", insert_before:"＋", delete:"✕", append:"＋" };
  const opColor = { replace:"#7C3AED", insert_after:"#059669", insert_before:"#059669", delete:"#DC2626", append:"#059669" };
  const typeLabel = { heading:"Überschrift", paragraph:"Absatz", bulletListItem:"Aufzählung", numberedListItem:"Liste", image:"Bild" };
  let label = "";
  if (a.type === "image") label = `Bild: "${a.query?.slice(0,40)||""}"`;
  else if (a.op === "delete") label = `Block [${a.index}] entfernen`;
  else {
    const tl = typeLabel[a.type] || a.type;
    const txt = (a.text||"").slice(0,42) + ((a.text||"").length>42?"…":"");
    label = a.type==="heading" ? `H${a.level||2}: "${txt}"` : `${tl}: "${txt}"`;
  }
  return { icon: a.type==="image" ? "🖼" : (opIcon[a.op]||"•"), label, color: opColor[a.op]||"#6B7280" };
}

function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
}

// ── READABILITY ────────────────────────────────────────────────────────────
function computeReadability(text) {
  if (!text || text.trim().length < 20) return null;
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 3);
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) return null;
  const asl = words.length / sentences.length; // avg sentence length
  const acw = words.reduce((s, w) => s + w.replace(/[^a-zäöüA-ZÄÖÜ]/g, "").length, 0) / words.length; // avg char per word
  // Approximated Flesch for German: FRE = 180 − ASL − (58.5 × ASW); ASW ≈ chars/word/5
  const asw = acw / 5;
  const fre = Math.max(0, Math.min(100, Math.round(180 - asl - 58.5 * asw)));
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length;
  let level, color;
  if (fre >= 70)      { level = "Sehr leicht"; color = "#10B981"; }
  else if (fre >= 55) { level = "Leicht";      color = "#22C55E"; }
  else if (fre >= 40) { level = "Mittel";      color = "#F59E0B"; }
  else if (fre >= 25) { level = "Schwer";      color = "#EF4444"; }
  else                { level = "Sehr schwer"; color = "#DC2626"; }
  return { fre, level, color, asl: Math.round(asl * 10) / 10, acw: Math.round(acw * 10) / 10, longSentences };
}

// ── SEO CHECKS ─────────────────────────────────────────────────────────────
function computeSEOChecks({ text, title, subtitle, keyword, wordCount, metaDesc, blocks }) {
  const kw = (keyword || "").toLowerCase().trim();
  const titleL = (title || "").toLowerCase();
  const subL = (subtitle || "").toLowerCase();
  const textL = (text || "").toLowerCase();
  const checks = [];

  // Title
  checks.push({ ok: !!title && title.length >= 10, label: "Titel vorhanden (≥10 Zeichen)", weight: 10 });
  if (kw) checks.push({ ok: titleL.includes(kw), label: `Keyword "${keyword}" im Titel`, weight: 15 });

  // Subtitle / intro
  checks.push({ ok: !!subtitle && subtitle.length > 10, label: "Untertitel / Lead vorhanden", weight: 7 });
  if (kw) checks.push({ ok: subL.includes(kw) || textL.slice(0, 300).includes(kw), label: `Keyword in Einleitung`, weight: 10 });

  // Keyword density
  if (kw && wordCount > 10) {
    const kwWords = kw.split(/\s+/).length;
    const occ = (textL.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "g")) || []).length;
    const density = (occ * kwWords / wordCount) * 100;
    checks.push({ ok: density >= 0.5 && density <= 2.5, label: `Keyword-Dichte ${density.toFixed(1)}% (Ziel: 0.5–2.5%)`, weight: 12 });
  }

  // Word count
  checks.push({ ok: wordCount >= 300, label: `Wortanzahl ${wordCount} (empfohlen ≥300)`, weight: 10 });
  checks.push({ ok: wordCount >= 600, label: `Tiefe: ${wordCount} Wörter (optimal ≥600)`, weight: 5 });

  // Structure
  const hasH2 = blocks?.some(b => b.type === "heading" && b.props?.level === 2);
  checks.push({ ok: !!hasH2, label: "Zwischenüberschriften (H2) vorhanden", weight: 8 });

  // Meta description
  checks.push({ ok: !!metaDesc && metaDesc.length >= 50 && metaDesc.length <= 160, label: `Meta-Beschreibung ${metaDesc ? metaDesc.length + "/160" : "fehlt"}`, weight: 8 });
  if (kw && metaDesc) checks.push({ ok: (metaDesc||"").toLowerCase().includes(kw), label: "Keyword in Meta-Beschreibung", weight: 7 });

  // Images
  const hasImg = blocks?.some(b => b.type === "image");
  checks.push({ ok: !!hasImg, label: "Mindestens ein Bild im Artikel", weight: 8 });

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.ok).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);
  return { checks, score };
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

// ── Reduced block-type list: only the types editors actually need ─────────
// Filters out H4-H6 and all toggle-heading variants so the dropdown fits
// on screen without scrolling.
const USEFUL_BLOCK_TYPES = ["paragraph","heading","bulletListItem","numberedListItem","checkListItem","quote"];
const USEFUL_BLOCK_PROPS  = [
  undefined,                            // paragraph
  { level: 1, isToggleable: false },    // H1
  { level: 2, isToggleable: false },    // H2
  { level: 3, isToggleable: false },    // H3
  undefined,                            // bulletListItem
  undefined,                            // numberedListItem
  undefined,                            // checkListItem
  undefined,                            // quote
];

// Preferred order for slash menu — most common first
const SLASH_ORDER = [
  "Paragraph",
  "Heading 1","Heading 2","Heading 3",
  "Bullet List","Numbered List","Check List",
  "Image","Video",
  "Quote","Divider","Table","Code Block",
];

// ── ADD BLOCK BUTTON + PICKER ─────────────────────────────────────────────
// Architecture: AddBlockButton is a DUMB button. It reads the currently-hovered
// block from the SideMenuExtension store and calls a module-level callback when
// clicked. The actual picker UI lives in BlockPickerPortal, which is rendered at
// the StoryEditorModal level — completely outside the SideMenu lifecycle.
//
// WHY: editor.insertBlocks() triggers a BlockNote re-render that causes the
// SideMenuExtension to update its hovered block, which unmounts the old
// AddBlockButton before React can render the picker portal. Moving picker state
// to the modal level solves this entirely.
//
// TESTING LESSON: Never test by calling React fiber props directly
// (__reactProps.onMouseDown). Always use real dispatchEvent or preview_click
// to reproduce actual browser behavior, and verify state AFTER the editor
// re-render settles (300–500ms timeout).

// All 14 BlockNote block types (confirmed from editor.schema.blockSpecs):
// audio, bulletListItem, checkListItem, codeBlock, divider, file, heading,
// image, numberedListItem, paragraph, quote, table, toggleListItem, video
// Note: "Gallery" is not a native BlockNote block type.
const ADD_BLOCK_TYPES = [
  // Text
  { type:"paragraph",        label:"Text",          icon:"¶",   group:"Text"  },
  { type:"heading", lv:1,    label:"Überschrift 1", icon:"H1",  group:"Text"  },
  { type:"heading", lv:2,    label:"Überschrift 2", icon:"H2",  group:"Text"  },
  { type:"heading", lv:3,    label:"Überschrift 3", icon:"H3",  group:"Text"  },
  { type:"quote",            label:"Zitat",         icon:"❝",   group:"Text"  },
  // Listen
  { type:"bulletListItem",   label:"Aufzählung",    icon:"•",   group:"Liste" },
  { type:"numberedListItem", label:"Nummeriert",    icon:"1.",  group:"Liste" },
  { type:"checkListItem",    label:"Aufgabe",       icon:"☐",   group:"Liste" },
  { type:"toggleListItem",   label:"Aufklapper",    icon:"▸",   group:"Liste" },
  // Medien
  { type:"image",            label:"Bild",          icon:"🖼",  group:"Medien"},
  { type:"video",            label:"Video",         icon:"▶",   group:"Medien"},
  { type:"audio",            label:"Audio",         icon:"♪",   group:"Medien"},
  { type:"file",             label:"Datei",         icon:"📎",  group:"Medien"},
  // Sonstiges
  { type:"table",            label:"Tabelle",       icon:"⊞",   group:"Extra" },
  { type:"codeBlock",        label:"Code",          icon:"</>", group:"Extra" },
  { type:"divider",          label:"Trennlinie",    icon:"—",   group:"Extra" },
];

// Architecture note: instead of a module-level variable (which Vite HMR resets on
// every file save, breaking the callback), we store the opener on the editor object.
// The editor instance is created once (stable React state) and survives HMR.
// mode: "insert" → insertBlocks after current block
//       "convert" → updateBlock to change type of current block

// Shared hook: reads current hovered block from SideMenuExtension store
function useSideMenuBlock() {
  const editor = useBlockNoteEditor();
  const ext = editor.getExtension(SideMenuExtension);
  return { editor, block: useStore(ext.store, (s) => s?.block) };
}

// "+" button — inserts a NEW block after the current one
function AddBlockButton() {
  const { editor, block } = useSideMenuBlock();
  const btnRef = useRef(null);

  const handleBtnMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!block || !editor._blockPicker) return;
    editor._blockPicker(block, btnRef.current?.getBoundingClientRect(), "insert");
  };

  return (
    <button ref={btnRef} onMouseDown={handleBtnMouseDown} title="Block einfügen"
      style={{
        width:22, height:22, borderRadius:5, flexShrink:0,
        border:"1px solid #e5e7eb", background:"white", color:"#6b7280",
        fontSize:15, fontWeight:600, lineHeight:"20px", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .12s", fontFamily:FONT,
      }}
      onMouseEnter={e => { e.currentTarget.style.background="#f9fafb"; e.currentTarget.style.borderColor="#d1d5db"; e.currentTarget.style.color="#374151"; }}
      onMouseLeave={e => { e.currentTarget.style.background="white"; e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#6b7280"; }}
    >+</button>
  );
}

// Block-type badge — shows current block type, click to convert
function BlockTypeButton() {
  const { editor, block } = useSideMenuBlock();
  const btnRef = useRef(null);

  // Derive icon from current block type
  const typeMatch = ADD_BLOCK_TYPES.find(bt =>
    bt.type === block?.type && (bt.lv ? bt.lv === block?.props?.level : true)
  );
  const icon = typeMatch?.icon ?? "¶";

  const handleBtnMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!block || !editor._blockPicker) return;
    editor._blockPicker(block, btnRef.current?.getBoundingClientRect(), "convert");
  };

  return (
    <button ref={btnRef} onMouseDown={handleBtnMouseDown} title="Block-Typ ändern"
      style={{
        width:22, height:22, borderRadius:5, flexShrink:0,
        border:"1px solid #e5e7eb", background:"white", color:"#6b7280",
        fontSize:10, fontWeight:700, lineHeight:"20px", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .12s", fontFamily:FONT,
      }}
      onMouseEnter={e => { e.currentTarget.style.background="#f9fafb"; e.currentTarget.style.borderColor="#d1d5db"; e.currentTarget.style.color="#374151"; }}
      onMouseLeave={e => { e.currentTarget.style.background="white"; e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#6b7280"; }}
    >{icon}</button>
  );
}

// Rendered at the StoryEditorModal level — never unmounts when SideMenu changes.
// Block insertion only happens here, AFTER the user picks a type.
function BlockPickerPortal({ editor }) {
  const [state, setState] = useState(null); // null | { block, pos:{top,left} }
  const menuRef = useRef(null);

  // Store opener on the editor object — survives Vite HMR without resetting.
  // A ref always holds the latest setState, so the useEffect(fn,[]) callback
  // stays current without needing to re-register after each render.
  const setStateRef = useRef(setState);
  setStateRef.current = setState;
  useEffect(() => {
    editor._blockPicker = (block, rect, mode = "insert") => {
      setStateRef.current({
        block, mode,
        pos: rect ? { top: rect.bottom + 6, left: rect.left } : { top: 200, left: 200 },
      });
    };
    return () => { editor._blockPicker = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount; setStateRef keeps callback fresh across re-renders

  // Close when clicking outside the picker
  useEffect(() => {
    if (!state) return;
    const handleOut = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      setState(null);
    };
    document.addEventListener("mousedown", handleOut, true);
    return () => document.removeEventListener("mousedown", handleOut, true);
  }, [state]);

  const handleItemMouseDown = (e, bt) => {
    e.preventDefault();
    e.stopPropagation();
    const { block, mode } = state;
    setState(null); // close picker immediately
    try {
      const def = { type: bt.type };
      if (bt.lv) def.props = { level: bt.lv };
      if (mode === "convert") {
        // Change the type of the existing block in place
        editor.updateBlock(block, def);
        editor.setTextCursorPosition(block, "end");
        editor.focus();
      } else {
        // Insert a new block after the current one
        const [nb] = editor.insertBlocks([def], block, "after");
        if (nb) {
          editor.setTextCursorPosition(nb, "end");
          editor.focus();
        }
      }
    } catch (err) {
      console.error("[BlockPicker]", err);
    }
  };

  if (!state) return null;

  // Group items for display
  const groups = [...new Set(ADD_BLOCK_TYPES.map(bt => bt.group))];

  // Ensure picker stays within viewport vertically
  const viewH = window.innerHeight;
  const estH = 420; // approx picker height
  const top = state.pos.top + estH > viewH ? Math.max(8, viewH - estH - 8) : state.pos.top;

  return createPortal(
    <div ref={menuRef} style={{
      position:"fixed", top, left: state.pos.left,
      zIndex:99999, background:"#fff",
      border:"1px solid #e5e7eb", borderRadius:12,
      boxShadow:"0 8px 32px rgba(0,0,0,.16)",
      padding:"6px", minWidth:230, fontFamily:FONT,
      maxHeight: "min(480px, 85vh)", overflowY:"auto",
    }}>
      <div style={{fontSize:10, color:"#9ca3af", padding:"5px 10px 6px",
        fontWeight:700, textTransform:"uppercase", letterSpacing:".06em"}}>
        {state.mode === "convert" ? "Typ umwandeln" : "Block einfügen"}
      </div>
      {groups.map(group => (
        <div key={group}>
          <div style={{fontSize:9.5, color:"#c4c9d4", padding:"6px 10px 3px",
            fontWeight:700, textTransform:"uppercase", letterSpacing:".06em"}}>
            {group}
          </div>
          {ADD_BLOCK_TYPES.filter(bt => bt.group === group).map(bt => (
            <div key={`${bt.type}-${bt.lv||""}`}
              onMouseDown={(e) => handleItemMouseDown(e, bt)}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"7px 10px", borderRadius:7,
                cursor:"pointer", fontSize:13, color:"#374151", userSelect:"none",
              }}
              onMouseEnter={e => e.currentTarget.style.background="#f3f4f6"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              <span style={{
                width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center",
                background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:6,
                fontSize:11, fontWeight:700, color:"#6b7280", flexShrink:0,
              }}>{bt.icon}</span>
              {bt.label}
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}

// ── UNIFIED FORMATTING TOOLBAR (formatting + KI in one bar) ───────────────
function UnifiedFormattingToolbar() {
  const [mode, setMode] = useState("format"); // "format" | "ai" | "loading" | "result"
  const [aiResult, setAiResult] = useState("");
  const [resultPos, setResultPos] = useState(null); // { x, y } for the result panel
  const selRef = useRef(null);
  const editor = useBlockNoteEditor();

  const AI_ACTIONS = [
    { id: "improve",   label: "✦ Verbessern" },
    { id: "shorten",   label: "↓ Kürzen"     },
    { id: "expand",    label: "↑ Erweitern"  },
    { id: "spell",     label: "✓ Korrektur"  },
    { id: "formal",    label: "≡ Formell"    },
    { id: "translate", label: "⇄ Englisch"   },
  ];
  const PROMPTS = {
    improve:   t => `Verbessere diesen Text stilistisch (Klarheit, Fluss, Prägnanz). Gib NUR den verbesserten Text zurück:\n\n${t}`,
    shorten:   t => `Kürze diesen Text auf das Wesentliche. Gib NUR den gekürzten Text zurück:\n\n${t}`,
    expand:    t => `Erweitere diesen Text mit mehr Details und Beispielen. Gib NUR den erweiterten Text zurück:\n\n${t}`,
    spell:     t => `Korrigiere alle Rechtschreib- und Grammatikfehler. Gib NUR den korrigierten Text zurück:\n\n${t}`,
    formal:    t => `Schreibe diesen Text formeller und professioneller um. Gib NUR den Text zurück:\n\n${t}`,
    translate: t => `Übersetze diesen deutschen Text ins Englische. Gib NUR die englische Übersetzung zurück:\n\n${t}`,
  };

  const handleAI = async (id) => {
    const text = window.getSelection()?.toString().trim();
    if (!text || text.length < 5) return;
    const sel = window.getSelection();
    // Save selection range and position
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      selRef.current = range.cloneRange();
      const rect = range.getBoundingClientRect();
      setResultPos({
        x: Math.max(200, Math.min(window.innerWidth - 420, rect.left + rect.width / 2 - 200)),
        y: rect.bottom + 12,
      });
    }
    setMode("loading");
    try {
      const r = await aiCall([{ role: "user", content: PROMPTS[id](text) }], 900);
      setAiResult(r.trim());
      setMode("result");
    } catch {
      setAiResult("⚠ KI nicht verfügbar (nur auf der Live-Site)");
      setMode("result");
    }
  };

  const apply = () => {
    if (!aiResult || !selRef.current) return;
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(selRef.current);
      document.execCommand("insertText", false, aiResult);
    } catch {}
    setMode("format"); setAiResult(""); setResultPos(null);
  };

  const dismiss = () => { setMode("format"); setAiResult(""); setResultPos(null); };

  // Filtered block-type list: only 8 common types, fits without scrolling
  const filteredBlockItems = useMemo(() => {
    if (!editor?.dictionary) return undefined;
    return blockTypeSelectItems(editor.dictionary).filter(item => {
      if (!USEFUL_BLOCK_TYPES.includes(item.type)) return false;
      if (item.type === "heading") {
        return item.props?.level <= 3 && !item.props?.isToggleable;
      }
      return true;
    });
  }, [editor?.dictionary]);

  // Insert an image block at the current cursor position
  const insertImage = () => {
    try {
      const cursorBlock = editor.getTextCursorPosition().block;
      editor.insertBlocks(
        [{ type: "image", props: { url: "", caption: "", showPreview: true, previewWidth: 512 } }],
        cursorBlock,
        "after"
      );
      // Focus the newly inserted block so the file panel opens
      editor.focus();
    } catch {}
  };

  const btnBase = {
    padding: "3px 9px", borderRadius: 5, border: "none",
    fontSize: 11.5, fontWeight: 600, cursor: "pointer",
    fontFamily: FONT, transition: "background .1s",
    display: "flex", alignItems: "center", gap: 3,
  };

  return (
    <>
      <FormattingToolbar>
        {/* ── Standard format buttons ── */}
        {(mode === "format") && <>
          <BlockTypeSelect key="blockTypeSelect" items={filteredBlockItems} />
          <BasicTextStyleButton basicTextStyle="bold"      key="bold" />
          <BasicTextStyleButton basicTextStyle="italic"    key="italic" />
          <BasicTextStyleButton basicTextStyle="underline" key="underline" />
          <BasicTextStyleButton basicTextStyle="strike"    key="strike" />
          <CreateLinkButton  key="link" />
          <div key="sep-img" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          <button key="insert-image"
            onMouseDown={e => e.preventDefault()}
            onClick={insertImage}
            style={{ ...btnBase, background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.9)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.12)"}
            title="Bild einfügen">
            <ImageIcon size={12} strokeWidth={IW} /> Bild
          </button>
          <div key="sep" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          <button key="ai-open"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setMode("ai")}
            style={{ ...btnBase, background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.9)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.12)"}>
            <Wand2 size={11} strokeWidth={IW} /> KI
          </button>
        </>}

        {/* ── AI action buttons ── */}
        {mode === "ai" && <>
          <button key="back"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setMode("format")}
            style={{ ...btnBase, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.16)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}>
            ← Zurück
          </button>
          <div key="sep2" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          {AI_ACTIONS.map(({ id, label }) => (
            <button key={id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleAI(id)}
              style={{ ...btnBase, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.88)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}>
              {label}
            </button>
          ))}
        </>}

        {/* ── Loading ── */}
        {mode === "loading" && (
          <div key="loading" style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 10px", color: "rgba(255,255,255,.8)", fontSize: 12, fontFamily: FONT }}>
            <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
            KI schreibt…
          </div>
        )}

        {/* ── Result: compact toolbar indicator only ── */}
        {mode === "result" && <>
          <div key="ri" style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", color: "rgba(255,255,255,.7)", fontSize: 11.5, fontFamily: FONT }}>
            <Check size={12} strokeWidth={2.5} color="#a5f3c0" /> KI-Ergebnis bereit ↓
          </div>
          <div key="sep3" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          <button key="apply-tb"
            onMouseDown={e => e.preventDefault()}
            onClick={apply}
            style={{ ...btnBase, background: "rgba(99,102,241,.7)", color: "#fff" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.9)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,.7)"}>
            <Check size={11} strokeWidth={2.5} /> Übernehmen
          </button>
          <button key="retry-tb"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setMode("ai")}
            style={{ ...btnBase, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.75)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}>
            ↺
          </button>
          <button key="discard-tb"
            onMouseDown={e => e.preventDefault()}
            onClick={dismiss}
            style={{ ...btnBase, background: "transparent", color: "rgba(255,255,255,.4)", padding: "3px 6px" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ✕
          </button>
        </>}
      </FormattingToolbar>

      {/* ── Full result panel (portal, positioned below the selection) ── */}
      {mode === "result" && resultPos && createPortal(
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: "fixed",
            left: resultPos.x,
            top: resultPos.y,
            zIndex: 9500,
            width: 400,
            background: "#1a1a2e",
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,.4)",
            fontFamily: FONT,
            overflow: "hidden",
          }}
        >
          {/* Caret */}
          <div style={{ position: "absolute", top: -6, left: 40, width: 12, height: 6, overflow: "hidden" }}>
            <div style={{ width: 12, height: 12, background: "#1a1a2e", transform: "rotate(45deg)", transformOrigin: "bottom right", marginTop: 3 }} />
          </div>
          {/* Header */}
          <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 6 }}>
            <Wand2 size={12} strokeWidth={IW} color="#a5b4fc" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc" }}>KI-Vorschlag</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginLeft: "auto" }}>Markierten Text ersetzen</span>
          </div>
          {/* Full result text */}
          <div style={{
            padding: "12px 14px",
            maxHeight: 260,
            overflowY: "auto",
            fontSize: 13.5,
            lineHeight: 1.7,
            color: "rgba(255,255,255,.88)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {aiResult}
          </div>
          {/* Action bar */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.1)", display: "flex", gap: 6 }}>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={apply}
              style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: "#6366F1", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              onMouseEnter={e => e.currentTarget.style.background = "#4F46E5"}
              onMouseLeave={e => e.currentTarget.style.background = "#6366F1"}>
              <Check size={13} strokeWidth={2.5} /> Übernehmen
            </button>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => setMode("ai")}
              style={{ padding: "8px 14px", borderRadius: 7, border: "none", background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.75)", fontSize: 12, cursor: "pointer", fontFamily: FONT }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}>
              ↺ Neu
            </button>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={dismiss}
              style={{ padding: "8px 12px", borderRadius: 7, border: "none", background: "transparent", color: "rgba(255,255,255,.35)", fontSize: 14, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── ACCORDION SECTION (right sidebar) ─────────────────────────────────────────
function AccSection({ label, badge, badgeWarn, isOpen, onToggle, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.gray100}` }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          padding: "8px 14px", border: "none", cursor: "pointer",
          background: T.gray50, gap: 6, fontFamily: FONT, boxSizing: "border-box",
          borderBottom: isOpen ? `1px solid ${T.gray100}` : "none",
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.gray100}
        onMouseLeave={e => e.currentTarget.style.background = T.gray50}
      >
        <ChevronDown
          size={12} strokeWidth={2.5} color={T.gray400}
          style={{ transition: "transform .18s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }}
        />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: T.gray500, textTransform: "uppercase", letterSpacing: ".06em", textAlign: "left" }}>
          {label}
        </span>
        {badge != null && (
          <span style={{
            background: badgeWarn ? T.error600 : T.brand100,
            color: badgeWarn ? T.white : T.brand600,
            borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 6px", flexShrink: 0,
          }}>{badge}</span>
        )}
      </button>
      {isOpen && (
        <div style={{ padding: "10px 14px 12px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function StoryEditorModal() {
  const { edStory: story, items, posts, saveStory: onSave, updateStory, lockStory, unlockStory, setEdStory, setPosts, user, projects } = useApp();
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
    metaTitle: story.metaTitle || "",
    metaDesc: story.metaDesc || "",
    seoKeyword: story.seoKeyword || "",
    hashtags: story.hashtags || "",
    webPublishedAt: story.webPublishedAt || null,
    webUpdatedAt: story.webUpdatedAt || null,
    voodooProjectId: story.voodooProjectId || null,
  });

  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("story_panel_collapsed") || "{}"); }
    catch { return {}; }
  });
  const toggleSection = (id) => {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("story_panel_collapsed", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  // defaultOpen: true means open unless the user explicitly collapsed it
  const sOpen = (id, def = true) => collapsed[id] === undefined ? def : !collapsed[id];
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

  const [articleText, setArticleText] = useState(() => blocksToText(story.blocks || []));
  // Website publish state
  const [webPublishing, setWebPublishing] = useState(false);
  const [webPublished, setWebPublished] = useState(
    story.webSlug ? { slug: story.webSlug, url: `https://ppi-n3xt-website.pages.dev/blog/post.html?slug=${story.webSlug}` } : null
  );
  const [tagsLoading, setTagsLoading] = useState(false);
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [webStats, setWebStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Right sidebar resize ─────────────────────────────────────────────────
  const [sidebarW, setSidebarW] = useState(300);
  const sidebarDragRef = useRef(false);
  const onResizeSidebarStart = useCallback((e) => {
    e.preventDefault();
    sidebarDragRef.current = true;
    const startX = e.clientX;
    const startW = sidebarW;
    const onMove = (ev) => {
      if (!sidebarDragRef.current) return;
      const delta = startX - ev.clientX; // drag left = wider
      setSidebarW(Math.max(260, Math.min(520, startW + delta)));
    };
    const onUp = () => {
      sidebarDragRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarW]);

  // ── Spark AI assistant ────────────────────────────────────────────────────
  const [sparkMessages, setSparkMessages] = useState([]);
  const [sparkInput,    setSparkInput]    = useState("");
  const [sparkLoading,  setSparkLoading]  = useState(false);
  const [sparkSelInfo,  setSparkSelInfo]  = useState(null); // { text, wordCount }
  const [sparkUndo,     setSparkUndo]     = useState(null); // { blocks, msgId }

  const asRef          = useRef();
  const formRef        = useRef(form);
  const titleRef       = useRef();
  const subtitleRef    = useRef();
  const sparkSelRef    = useRef(null);  // stored Range for selection-based edits
  const sparkScrollRef = useRef(null);  // ref for auto-scrolling chat
  const sparkInputRef  = useRef("");    // always-current value — avoids stale closure in sparkSend
  formRef.current = form;

  // ── Web stats fetch ───────────────────────────────────────────────────────
  const fetchWebStats = useCallback(async (slug) => {
    const s = slug || formRef.current.webSlug;
    if (!s) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`https://socialflow-pro.pages.dev/track?slug=${encodeURIComponent(s)}`);
      if (res.ok) setWebStats(await res.json());
    } catch { /* ignore */ }
    setStatsLoading(false);
  }, []);

  // Auto-fetch on mount + refresh every hour while editor is open
  useEffect(() => {
    if (!story.webSlug) return;
    fetchWebStats(story.webSlug);
    const interval = setInterval(() => fetchWebStats(), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

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
  }, [form.title, form.subtitle, form.status, form.category, form.tags, form.targetChannels, form.seoKeyword, form.metaTitle, form.metaDesc, form.hashtags]);

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

  // ── Spark: track text selection within the editor ─────────────────────────
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 3) {
        setSparkSelInfo({ text, wordCount: text.split(/\s+/).filter(Boolean).length });
        sparkSelRef.current = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      } else if (!text) {
        setSparkSelInfo(null);
        sparkSelRef.current = null;
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

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

  // ── Spark: send prompt to AI ──────────────────────────────────────────────
  // Selection active  → quick text-edit mode  → plain-text response
  // No selection      → agentic editor mode   → JSON action plan response
  const sparkSend = async (prompt) => {
    const p = (prompt || sparkInputRef.current).trim();
    if (!p || sparkLoading) return;
    setSparkInput(""); sparkInputRef.current = "";

    const isSel    = !!(sparkSelInfo && sparkSelRef.current);
    const ctxText  = isSel ? sparkSelInfo.text : blocksToText(editor.document || []);
    const ctxWords = isSel ? sparkSelInfo.wordCount : wordCount;
    const selRange = isSel ? sparkSelRef.current : null;

    setSparkMessages(prev => [...prev, { id:uid(), role:"user", text:p, isSel, ctxWords }]);
    setSparkLoading(true);

    try {
      if (isSel) {
        // ── Text-edit mode (selection) ──────────────────────────────────────
        const sys = `Du bist Spark, ein präziser KI-Editor für Content-Erstellung. Bearbeite NUR den folgenden markierten Text (${ctxWords} Wörter). Antworte NUR mit dem bearbeiteten Text – keine Erklärungen, keine Präfixe, keine Anführungszeichen.`;
        const result = await aiCall([{ role:"user", content:`${sys}\n\nText:\n${ctxText}\n\nAufgabe: ${p}` }], 2000);
        const trimmed = result.trim();
        if (!trimmed) throw new Error("empty");
        setSparkMessages(prev => [...prev, { id:uid(), role:"spark", type:"suggestion", text:trimmed, isSel:true, selRange, applied:false }]);

      } else {
        // ── Agentic editor mode (full document) ─────────────────────────────
        const blocks     = editor.document || [];
        const serialized = serializeDocumentForAI(blocks);
        const sys = `Du bist Spark, der autonome KI-Editor von SocialFlow Pro. Du kennst jeden Block des Artikels und kannst gezielte Änderungen planen: Überschriften schreiben, Absätze umformulieren, Bilder suchen & einsetzen, Strukturen verbessern, Listenelemente hinzufügen und mehr.

ARTIKEL:
Titel: "${formRef.current.title || "(kein Titel)"}"
Kategorie: ${formRef.current.category || "–"} | Wörter: ${wordCount}

INHALT (${blocks.length} Blöcke, nummeriert):
${serialized}

AUFGABE: ${p}

Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt – kein Markdown-Code-Block, kein Text davor oder danach:
{
  "plan": "Was du tust (1–2 Sätze auf Deutsch)",
  "actions": [
    { "op": "replace",       "index": N, "type": "heading",          "level": 2,   "text": "..." },
    { "op": "replace",       "index": N, "type": "paragraph",                       "text": "..." },
    { "op": "insert_after",  "index": N, "type": "bulletListItem",                  "text": "..." },
    { "op": "insert_before", "index": N, "type": "numberedListItem",                "text": "..." },
    { "op": "insert_after",  "index": N, "type": "image",  "query": "english stock photo search term", "alt": "Bildbeschreibung" },
    { "op": "delete",        "index": N },
    { "op": "append",                    "type": "paragraph",                       "text": "..." }
  ]
}

REGELN:
- "index" = Position in der originalen Blockliste (nicht durch andere Aktionen verschoben)
- Bilder: "query" als präziser englischer Suchbegriff für Unsplash/Pexels
- Maximal 15 Aktionen – fokussiert und präzise
- Verändere nur was die Aufgabe verlangt
- Exakt valides JSON, ohne Code-Block-Backticks`;

        const result  = await aiCall([{ role:"user", content:sys }], 3500);
        const parsed  = parseJSON(result.trim());
        if (!parsed?.plan || !Array.isArray(parsed?.actions)) throw new Error("invalid json");
        // Assign unique image keys so results can be matched back to actions
        const actions = parsed.actions.map(a => a.type==="image" ? { ...a, _imgKey:uid() } : a);
        setSparkMessages(prev => [...prev, { id:uid(), role:"spark", type:"plan", plan:parsed.plan, actions, status:"pending" }]);
      }

      setTimeout(() => { if (sparkScrollRef.current) sparkScrollRef.current.scrollTop = sparkScrollRef.current.scrollHeight; }, 60);
    } catch {
      setSparkMessages(prev => [...prev, { id:uid(), role:"spark", type:"error", text:"⚠️ KI nicht verfügbar oder hat kein gültiges JSON geliefert." }]);
    }
    setSparkLoading(false);
  };

  // ── Spark: apply suggestion to editor ────────────────────────────────────
  const sparkApply = (msg) => {
    if (!msg.text || msg.applied) return;
    // Snapshot current document for one-step undo
    const snapshot = JSON.parse(JSON.stringify(editor.document));
    setSparkUndo({ blocks: snapshot, msgId: msg.id });

    if (msg.isSel && msg.selRange) {
      // Replace selected text in-place
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(msg.selRange);
        document.execCommand("insertText", false, msg.text);
      } catch {}
    } else {
      // Replace full document
      const newBlocks = textToBlocks(msg.text);
      if (newBlocks.length) editor.replaceBlocks(editor.document, newBlocks);
    }
    setSparkMessages(prev => prev.map(m => m.id === msg.id ? { ...m, applied:true } : m));
    setSparkSelInfo(null);
    sparkSelRef.current = null;
  };

  // ── Spark: execute agentic plan (fetch images + apply all block ops) ─────
  const executeSparkPlan = async (msg) => {
    setSparkMessages(prev => prev.map(m => m.id===msg.id ? { ...m, status:"applying" } : m));
    const snapshot = JSON.parse(JSON.stringify(editor.document));
    setSparkUndo({ blocks: snapshot, msgId: msg.id });
    try {
      // Fetch stock images in parallel for all image actions
      const imageActions = (msg.actions||[]).filter(a => a.type==="image");
      const imageMap = {};
      await Promise.all(imageActions.map(async a => {
        for (const src of ["unsplash","pexels","pixabay"]) {
          if (!skGet(src)) continue;
          try {
            const res = await stockSearch(src, a.query, { orientation:"landscape", type:"photo" });
            if (res?.[0]) { imageMap[a._imgKey] = res[0]; break; }
          } catch {}
        }
      }));
      const newBlocks = applyActionsToBlocks(snapshot, msg.actions||[], imageMap);
      if (newBlocks.length) editor.replaceBlocks(editor.document, newBlocks);
      const imgMiss = imageActions.filter(a => !imageMap[a._imgKey]).length;
      setSparkMessages(prev => prev.map(m => m.id===msg.id ? {
        ...m, status:"applied",
        appliedSummary: imgMiss > 0 ? `${imgMiss} Bild${imgMiss>1?"er":""} nicht gefunden – API-Key unter Einstellungen hinterlegen.` : undefined,
      } : m));
    } catch {
      setSparkMessages(prev => prev.map(m => m.id===msg.id ? { ...m, status:"error" } : m));
    }
  };

  // ── Spark: undo last applied suggestion ──────────────────────────────────
  const sparkUndoApply = () => {
    if (!sparkUndo) return;
    try {
      editor.replaceBlocks(editor.document, sparkUndo.blocks);
      setSparkMessages(prev => prev.map(m => m.id === sparkUndo.msgId ? { ...m, applied:false } : m));
    } catch {}
    setSparkUndo(null);
  };

  // ── Shared: send story content to ppi n3xt website ───────────────────────
  // Returns { slug, url } on success, throws on error.
  const pushToWebsite = async (f) => {
    const text = blocksToMarkdown(editor.document || []);
    const plainText = blocksToText(editor.document || []);
    const excerpt = f.subtitle || plainText.split(/\n+/).find(l => l.trim().length > 30)?.trim()?.slice(0, 160) || "";
    let token = null;
    try { const clerk = window.Clerk; if (clerk?.session) token = await clerk.session.getToken(); } catch {}
    const res = await fetch("https://socialflow-pro.pages.dev/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        title: f.title || "Unbenannte Story",
        content: text, excerpt,
        category: f.category || "Allgemein",
        tags: f.tags || "",
        author: user?.name || "ppi n3xt Redaktion",
        workspaceId: "ws-ppi-n3xt",
        slug: f.webSlug || undefined, // keep URL stable on updates
      }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
    return res.json();
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

    // If story was already published → silently re-sync to website in background
    if (f.webSlug && f.title) {
      const syncNow = new Date().toISOString();
      pushToWebsite(f).then(() => {
        setForm(prev => ({ ...prev, webUpdatedAt: syncNow }));
      }).catch(() => {}); // fire-and-forget
    }

    // updateStory keeps the editor open (onSave/saveStory would close it)
    updateStory({
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

  // ── Publish to ppi n3xt website (interactive button) ─────────────────────
  const handlePublishToWeb = async () => {
    setWebPublishing(true);
    try {
      const f = formRef.current;
      const { slug, url } = await pushToWebsite(f);
      const now = new Date().toISOString();
      // Keep original publishedAt on updates, only set it once
      const webPublishedAt = f.webPublishedAt || now;
      const webUpdatedAt   = now;
      setWebPublished({ slug, url });
      const updated = {
        ...formRef.current, webSlug: slug, status: "published",
        blocks: editor.document, webPublishedAt, webUpdatedAt,
      };
      updateStory(updated);
      setForm(prev => ({ ...prev, webSlug: slug, status: "published", webPublishedAt, webUpdatedAt }));
      // Refresh stats after a short delay (KV may need a moment to reflect)
      setTimeout(() => fetchWebStats(slug), 1500);
    } catch (e) {
      console.error("[PublishToWeb]", e);
      setWebPublished({ error: e.message });
    } finally {
      setWebPublishing(false);
    }
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
    setCollapsed(prev => ({ ...prev, derivatives: false })); // open accordion

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

  const catColor = CAT_COLOR[form.category] || C.textMid;

  // ── SEO + readability memos ───────────────────────────────────────────────
  const readability = useMemo(() => computeReadability(articleText), [articleText]);
  const seoResult = useMemo(() => computeSEOChecks({
    text: articleText, title: form.title, subtitle: form.subtitle,
    keyword: form.seoKeyword, wordCount, metaDesc: form.metaDesc,
    blocks: editor.document,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [articleText, form.title, form.subtitle, form.seoKeyword, form.metaDesc, wordCount]);

  const seoScore = seoResult?.score ?? 0;
  const seoColor = seoScore >= 70 ? "#10B981" : seoScore >= 40 ? "#F59E0B" : "#EF4444";

  // ── AI: auto-generate tags ────────────────────────────────────────────────
  const generateTags = async () => {
    const text = blocksToText(editor.document || []);
    if (!text && !form.title) return;
    setTagsLoading(true);
    try {
      const r = await aiCall([{ role: "user", content: `Analysiere diesen Artikel und gib 5–8 passende Tags zurück, kommagetrennt, lowercase, keine #-Zeichen:\n\nTitel: ${form.title||""}\n\n${text}` }], 300);
      setForm(f => ({ ...f, tags: r.trim() }));
    } catch { /* ignore */ }
    setTagsLoading(false);
  };

  // ── AI: hashtag suggestions ───────────────────────────────────────────────
  const generateHashtags = async () => {
    const text = blocksToText(editor.document || []);
    if (!text && !form.title) return;
    setHashtagLoading(true);
    try {
      const r = await aiCall([{ role: "user", content: `Generiere 10–15 relevante Social-Media-Hashtags für diesen Artikel. Gib NUR die Hashtags zurück, leerzeichen-getrennt, mit #:\n\nTitel: ${form.title||""}\n\n${text}` }], 400);
      setForm(f => ({ ...f, hashtags: r.trim() }));
    } catch { /* ignore */ }
    setHashtagLoading(false);
  };

  const saveStatusLabel = hasUnsaved
    ? { text: "● Nicht gespeichert", color: "#F59E0B" }
    : lastSaved
      ? { text: `✓ Gespeichert ${lastSaved.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`, color: "#10B981" }
      : { text: "", color: C.textMute };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: C.bg }}>
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
        /* Block layout — no separator lines between blocks */
        .bn-block-outer { margin: 0 !important; padding: 0 !important; }
        .bn-block-outer + .bn-block-outer { border-top: none !important; }
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

        /* ── Inline toolbar (formatting bar) ── */
        .bn-toolbar { background: #1a1a2e !important; border-radius: 10px !important; box-shadow: 0 8px 32px rgba(0,0,0,.35) !important; border: 1px solid rgba(255,255,255,.1) !important; padding: 4px 6px !important; z-index: 1200 !important; }
        .bn-toolbar button { color: rgba(255,255,255,.72) !important; border-radius: 5px !important; }
        .bn-toolbar button:hover { background: rgba(255,255,255,.12) !important; color: #fff !important; }
        .bn-toolbar button[data-active="true"] { background: rgba(255,255,255,.18) !important; color: #fff !important; }
        /* Dividers inside toolbar */
        .bn-toolbar [role="separator"], .bn-toolbar hr { background: rgba(255,255,255,.15) !important; }

        /* ── Slash / suggestion menu ── */
        .bn-suggestion-menu {
          background: #1a1a2e !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 12px !important;
          box-shadow: 0 16px 48px rgba(0,0,0,.45) !important;
          z-index: 1200 !important;
          min-width: 220px !important;
          max-width: 256px !important;
          padding: 5px !important;
          overflow: hidden !important;
        }
        /* Group labels / section headers */
        .bn-suggestion-menu-label,
        [data-suggestion-menu-label] {
          font-size: 9px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: .08em !important;
          color: rgba(255,255,255,.28) !important;
          padding: 10px 10px 3px !important;
          font-family: ${FONT} !important;
        }
        /* Individual items */
        .bn-suggestion-menu-item {
          border-radius: 7px !important;
          padding: 7px 10px !important;
          gap: 10px !important;
          transition: background .1s !important;
        }
        .bn-suggestion-menu-item:hover,
        .bn-suggestion-menu-item[data-selected="true"],
        .bn-suggestion-menu-item[aria-selected="true"] {
          background: rgba(255,255,255,.1) !important;
        }
        /* Item title */
        .bn-suggestion-menu-item-title {
          font-size: 12.5px !important;
          font-weight: 600 !important;
          color: rgba(255,255,255,.88) !important;
          font-family: ${FONT} !important;
        }
        /* Hide verbose subtitle — reduces clutter */
        .bn-suggestion-menu-item-subtitle { display: none !important; }
        /* Icon */
        .bn-suggestion-menu-item-icon svg,
        .bn-suggestion-menu-item > svg {
          color: rgba(255,255,255,.45) !important;
          width: 15px !important; height: 15px !important;
        }
        /* Keyboard shortcut badge */
        .bn-suggestion-menu-item kbd,
        .bn-suggestion-menu-item [data-key] {
          background: rgba(255,255,255,.07) !important;
          color: rgba(255,255,255,.3) !important;
          border: none !important;
          font-size: 9px !important;
          border-radius: 4px !important;
          padding: 1px 5px !important;
          font-family: ${FONT} !important;
        }

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
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
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

          {/* word + reading time — lightweight top bar info */}
          <span style={{ fontSize: 10.5, color: C.textMute, fontFamily: FONT, flexShrink: 0 }}>
            {wordCount} Wörter · {readingTime} Min.
          </span>
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
                    <span
                      style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: (CAT_COLOR[form.category] || C.textMid) + "14", color: CAT_COLOR[form.category] || C.textMid }}>
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
              {/* Force BlockNote suggestion/slash menu to always render in light mode.
                  The menu renders in a portal outside .bn-container, so it doesn't
                  inherit theme="light" automatically. */}
              <style>{`
                .bn-suggestion-menu,
                .bn-ak-menu,
                .bn-grid-suggestion-menu {
                  --bn-colors-menu-text: #1a1a1a !important;
                  --bn-colors-menu-background: #ffffff !important;
                  --bn-colors-hovered-text: #1a1a1a !important;
                  --bn-colors-hovered-background: #f0f0f0 !important;
                  --bn-colors-selected-text: #1a1a1a !important;
                  --bn-colors-selected-background: #e8e8e8 !important;
                  --bn-colors-shadow: rgba(0,0,0,.12) !important;
                  --bn-colors-border: #e5e5e5 !important;
                  color: #1a1a1a !important;
                  background: #ffffff !important;
                }
                .bn-ak-suggestion-menu-item-title { color: #1a1a1a !important; }
                .bn-ak-suggestion-menu-item-subtitle { color: #6b7280 !important; }
                .bn-ak-suggestion-menu-item-section { color: #9ca3af !important; font-size: 10px !important; }

              `}</style>
              <BlockNoteView
                editor={editor}
                theme="light"
                filePanel={false}
                formattingToolbar={false}
                sideMenu={false}
                slashMenu={false}
                style={{ fontSize: 16, lineHeight: 1.8 }}
                onChange={() => {
                  const text = blocksToText(editor.document || []);
                  setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
                  setArticleText(text);
                  setHasUnsaved(true);
                }}
              >
                <FormattingToolbarController formattingToolbar={UnifiedFormattingToolbar} />
                <FilePanelController filePanel={MediaLibraryFilePanel} />
                <SideMenuController sideMenu={props => (
                  <SideMenu {...props}>
                    <BlockTypeButton />
                    <AddBlockButton />
                    <DragHandleButton {...props} />
                    <DeleteButton {...props} />
                  </SideMenu>
                )} />
                <SuggestionMenuController
                  triggerCharacter="/"
                  getItems={async query => {
                    const all = getDefaultReactSlashMenuItems(editor);
                    const KEEP = new Set(SLASH_ORDER);
                    const filtered = all.filter(item => {
                      const title = typeof item.title === "string" ? item.title : "";
                      return KEEP.has(title);
                    });
                    // Sort by our preferred order (most common first)
                    const sorted = [...filtered].sort((a, b) => {
                      const ai = SLASH_ORDER.indexOf(a.title);
                      const bi = SLASH_ORDER.indexOf(b.title);
                      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                    });
                    if (!query) return sorted;
                    const q = query.toLowerCase();
                    return sorted.filter(item =>
                      (item.title||"").toLowerCase().includes(q) ||
                      (item.subtext||"").toLowerCase().includes(q) ||
                      (item.aliases||[]).some(a => a.toLowerCase().includes(q))
                    );
                  }}
                />
              </BlockNoteView>
              {/* Portal lives outside BlockNote tree so it survives SideMenu remounts */}
              <BlockPickerPortal editor={editor} />
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

          {/* ── RESIZE HANDLE ──────────────────────────────────────────── */}
          <div
            onMouseDown={onResizeSidebarStart}
            title="Breite anpassen"
            style={{
              width: 5, flexShrink: 0, cursor: "col-resize", zIndex: 10,
              borderLeft: `1px solid ${T.gray200}`, background: "transparent",
              transition: "background .1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.brand100; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          />

          {/* ── RIGHT PANEL: Materials + Derivatives ──────────────────── */}
          <div style={{
            width: sidebarW, flexShrink: 0,
            background: T.white, display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>

            {/* ── AKTIONEN ─────────────────────────────────────────────── */}
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.gray100}`, flexShrink: 0, background: T.white }}>

              {/* Save-status */}
              {saveStatusLabel?.text && (
                <div style={{ fontSize: 9.5, fontFamily: FONT, color: saveStatusLabel.color, marginBottom: 8, display: "flex", alignItems: "center", gap: 3 }}>
                  {saveStatusLabel.text}
                </div>
              )}

              {/* Speichern + Bereit */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleSave()}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    padding: "7px 0", borderRadius: T.rMd, border: `1px solid ${T.gray200}`,
                    background: T.white, color: T.gray600, fontFamily: FONT,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .12s",
                    boxShadow: T.shadowXs,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.gray50; e.currentTarget.style.borderColor = T.gray300; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.white; e.currentTarget.style.borderColor = T.gray200; }}
                >
                  <Save size={13} strokeWidth={IW} /> Speichern
                </button>
                <button
                  onClick={() => handleSave("ready")}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    padding: "7px 0", borderRadius: T.rMd, border: `1px solid ${T.brand600}`,
                    background: T.brand600, color: T.white, fontFamily: FONT,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "filter .12s",
                    boxShadow: T.shadowXs,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = "brightness(.9)"; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                >
                  <Check size={13} strokeWidth={2.5} /> Bereit
                </button>
              </div>

            </div>

            {/* ── Scrollable accordion sections ─────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* WEBSITE */}
              {(form.targetChannels?.includes("website") || form.webSlug) && (
                <AccSection
                  label="Website · ppi n3xt"
                  badge={webPublished && !webPublished.error ? "Live" : null}
                  isOpen={sOpen("website")}
                  onToggle={() => toggleSection("website")}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Publish / Update button */}
                    <button
                      onClick={handlePublishToWeb}
                      disabled={webPublishing || !form.title}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "7px 0", borderRadius: T.rMd, boxSizing: "border-box",
                        border: `1px solid ${webPublished && !webPublished.error ? T.brand200 : T.brand600}`,
                        background: webPublishing ? T.brand50 : webPublished && !webPublished.error ? T.brand50 : T.brand600,
                        color: webPublishing || (webPublished && !webPublished.error) ? T.brand600 : T.white,
                        fontFamily: FONT, fontSize: 12, fontWeight: 600,
                        cursor: webPublishing || !form.title ? "default" : "pointer",
                        opacity: !form.title ? 0.5 : 1, transition: "all .15s", boxShadow: T.shadowXs,
                      }}
                      onMouseEnter={e => { if (!webPublishing && form.title) e.currentTarget.style.filter = "brightness(.93)"; }}
                      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                    >
                      {webPublishing
                        ? <><Loader size={12} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> Wird aktualisiert…</>
                        : webPublished && !webPublished.error
                          ? <><RefreshCw size={12} strokeWidth={2} /> Aktualisieren</>
                          : <><Globe size={13} strokeWidth={2} /> Auf Website veröffentlichen</>
                      }
                    </button>

                    {/* Live ansehen */}
                    {webPublished && !webPublished.error && (
                      <a href={webPublished.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          padding: "6px 0", borderRadius: T.rMd, border: `1px solid ${T.gray200}`,
                          background: T.white, color: T.brand600, fontFamily: FONT,
                          fontSize: 11.5, fontWeight: 600, textDecoration: "none",
                          width: "100%", transition: "all .15s", boxSizing: "border-box", boxShadow: T.shadowXs,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.brand25; e.currentTarget.style.borderColor = T.brand200; }}
                        onMouseLeave={e => { e.currentTarget.style.background = T.white; e.currentTarget.style.borderColor = T.gray200; }}
                      >
                        <ExternalLink size={11} strokeWidth={2} /> Live ansehen
                      </a>
                    )}

                    {/* Publication metadata card */}
                    {(form.webSlug || (webPublished && !webPublished.error)) && (
                      <div style={{ background: T.gray50, borderRadius: T.rMd, border: `1px solid ${T.gray100}`, padding: "9px 11px", display: "flex", flexDirection: "column", gap: 7 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                          <Globe size={11} strokeWidth={2} color={T.gray400} style={{ marginTop: 2, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 2 }}>URL</div>
                            <div style={{ fontSize: 10, color: T.gray500, fontFamily: FONT, lineHeight: 1.5 }}>
                              /blog/<span style={{ color: T.brand600, fontWeight: 600, wordBreak: "break-all" }}>{form.webSlug || webPublished?.slug}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ height: 1, background: T.gray100 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {form.webPublishedAt && (
                            <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                              <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.successBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                                <Check size={8} strokeWidth={3} color={T.success500} />
                              </div>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em" }}>Erstveröffentlichung</div>
                                <div style={{ fontSize: 10.5, color: T.gray700, fontFamily: FONT, marginTop: 1 }}>
                                  {new Date(form.webPublishedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                                  {" · "}{new Date(form.webPublishedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          )}
                          {form.webUpdatedAt && form.webUpdatedAt !== form.webPublishedAt && (
                            <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                              <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.brand100, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                                <RefreshCw size={7} strokeWidth={2.5} color={T.brand600} />
                              </div>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em" }}>Letztes Update</div>
                                <div style={{ fontSize: 10.5, color: T.gray700, fontFamily: FONT, marginTop: 1 }}>
                                  {new Date(form.webUpdatedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                                  {" · "}{new Date(form.webUpdatedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats card */}
                    {(webStats || statsLoading) && (
                      <div style={{ background: T.gray50, borderRadius: T.rMd, border: `1px solid ${T.gray100}`, padding: "10px 11px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", display: "flex", alignItems: "center", gap: 4 }}>
                            <BarChart2 size={9} strokeWidth={2} /> Statistik
                          </div>
                          <button onClick={() => fetchWebStats()} disabled={statsLoading}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.gray400, padding: 2, display: "flex", borderRadius: 4, transition: "color .12s" }}
                            onMouseEnter={e => e.currentTarget.style.color = T.gray600}
                            onMouseLeave={e => e.currentTarget.style.color = T.gray400}
                            title="Neu laden">
                            <RefreshCw size={10} strokeWidth={2} style={{ animation: statsLoading ? "spin 1s linear infinite" : "none" }} />
                          </button>
                        </div>

                        {statsLoading && !webStats ? (
                          <div style={{ fontSize: 10.5, color: T.gray400, fontFamily: FONT, textAlign: "center", padding: "8px 0" }}>Lade…</div>
                        ) : webStats && (<>

                          {/* ── Engagement-Score ── */}
                          {(() => {
                            const s = webStats.engagementScore ?? 0;
                            const col = s >= 70 ? T.success500 : s >= 40 ? T.brand600 : T.warning500;
                            const label = s >= 70 ? "Stark" : s >= 40 ? "Gut" : s > 0 ? "Aufbau" : "–";
                            return (
                              <div style={{ background: T.white, borderRadius: T.rSm, border: `1px solid ${T.gray100}`, padding: "8px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 8, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Engagement-Score</div>
                                  <div style={{ height: 6, background: T.gray100, borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ width: `${s}%`, height: "100%", background: col, borderRadius: 4, transition: "width .4s" }} />
                                  </div>
                                  <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, marginTop: 3 }}>Scroll ×  Verweildauer</div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: FONT, lineHeight: 1 }}>{s > 0 ? s : "–"}</div>
                                  <div style={{ fontSize: 8, fontWeight: 700, color: col, fontFamily: FONT }}>{s > 0 ? label : "Keine Daten"}</div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* ── 3-Spalten: Aufrufe / Ø Zeit / Trend ── */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                            {[
                              { icon: <Eye size={9} strokeWidth={2} color={T.gray400} />, label: "Aufrufe",
                                value: webStats.views >= 1000 ? `${(webStats.views/1000).toFixed(1)}k` : String(webStats.views),
                                sub: webStats.last7 > 0 ? `${webStats.last7} / Wo.` : "–" },
                              { icon: <Clock size={9} strokeWidth={2} color={T.gray400} />, label: "Ø Zeit",
                                value: webStats.avgDuration ? (webStats.avgDuration >= 60 ? `${Math.floor(webStats.avgDuration/60)}m` : `${webStats.avgDuration}s`) : "–",
                                sub: webStats.avgDuration ? (webStats.avgDuration >= 60 ? `${Math.floor(webStats.avgDuration/60)}m ${webStats.avgDuration%60}s` : `${webStats.avgDuration}s`) : "keine Daten" },
                              { icon: webStats.trend === "up" ? <TrendingUp size={9} strokeWidth={2} color={T.success500} />
                                    : webStats.trend === "down" ? <TrendingDown size={9} strokeWidth={2} color={T.error600} />
                                    : <Minus size={9} strokeWidth={2} color={T.gray400} />,
                                label: "Trend",
                                value: webStats.trendPct != null ? `${webStats.trendPct > 0 ? "+" : ""}${webStats.trendPct}%` : "–",
                                valueColor: webStats.trend === "up" ? T.success500 : webStats.trend === "down" ? T.error600 : T.gray700,
                                sub: "vs. Vorwoche" },
                            ].map(({ icon, label, value, sub, valueColor }) => (
                              <div key={label} style={{ background: T.white, borderRadius: T.rSm, padding: "6px 7px", border: `1px solid ${T.gray100}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>{icon}
                                  <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: valueColor || T.gray900, fontFamily: FONT, lineHeight: 1 }}>{value}</div>
                                <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, marginTop: 2, lineHeight: 1.3 }}>{sub}</div>
                              </div>
                            ))}
                          </div>

                          {/* ── Rückkehr-Quote + Klick-Rate ── */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                            {[
                              { label: "Rückkehr", value: webStats.returnRate > 0 ? `${webStats.returnRate}%` : "–",
                                sub: webStats.returnVisits > 0 ? `${webStats.returnVisits} Wiederk.` : "Keine Daten",
                                color: webStats.returnRate >= 20 ? T.success500 : T.gray700 },
                              { label: "Link-Klicks", value: webStats.linkClickRate > 0 ? `${webStats.linkClickRate}%` : "–",
                                sub: webStats.linkClicks > 0 ? `${webStats.linkClicks} Klicks` : "Keine Daten",
                                color: T.gray700 },
                            ].map(({ label, value, sub, color }) => (
                              <div key={label} style={{ background: T.white, borderRadius: T.rSm, padding: "6px 7px", border: `1px solid ${T.gray100}` }}>
                                <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 3 }}>{label}</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: FONT, lineHeight: 1 }}>{value}</div>
                                <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, marginTop: 2 }}>{sub}</div>
                              </div>
                            ))}
                          </div>

                          {/* ── Sparkline ── */}
                          {webStats.sparkline?.length > 0 && (() => {
                            const maxV = Math.max(1, ...webStats.sparkline.map(d => d.views));
                            const barW = 10, gap = 3, h = 32, total = webStats.sparkline.length;
                            const svgW = total * barW + (total - 1) * gap;
                            return (
                              <div>
                                <div style={{ fontSize: 8.5, color: T.gray400, fontFamily: FONT, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".07em" }}>Letzte 14 Tage</div>
                                <svg width="100%" viewBox={`0 0 ${svgW} ${h}`} preserveAspectRatio="none" style={{ display: "block", height: h }}>
                                  {webStats.sparkline.map((d, i) => {
                                    const barH = Math.max(2, Math.round((d.views / maxV) * h));
                                    return <rect key={d.date} x={i*(barW+gap)} y={h-barH} width={barW} height={barH} rx={2} fill={i===total-1?T.brand600:d.views>0?T.brand200:T.gray100} />;
                                  })}
                                </svg>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                  <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT }}>{webStats.sparkline[0]?.date?.slice(5).replace("-",".")}</span>
                                  <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT }}>Heute</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* ── Scroll-Tiefe ── */}
                          {webStats.scrollStats?.pct25 > 0 && (
                            <div>
                              <div style={{ fontSize: 8.5, color: T.gray400, fontFamily: FONT, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Scroll-Tiefe</div>
                              {[
                                { label: "25%", val: webStats.scrollStats.pct25 },
                                { label: "50%", val: webStats.scrollStats.pct50 },
                                { label: "75%", val: webStats.scrollStats.pct75 },
                                { label: "100%", val: webStats.scrollStats.pct100 },
                              ].map(({ label, val }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                  <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, width: 26, flexShrink: 0 }}>{label}</span>
                                  <div style={{ flex: 1, height: 5, background: T.gray100, borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ width: `${val}%`, height: "100%", background: val >= 75 ? T.success500 : val >= 50 ? T.brand600 : T.brand200, borderRadius: 3, transition: "width .3s" }} />
                                  </div>
                                  <span style={{ fontSize: 8, color: T.gray500, fontFamily: FONT, width: 26, textAlign: "right", flexShrink: 0 }}>{val}%</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── Referrer-Quelle ── */}
                          {webStats.referrerBreakdown && webStats.views > 0 && (() => {
                            const ref = webStats.referrerBreakdown;
                            const entries = [
                              { key: "direct",     label: "Direkt",      color: T.gray500 },
                              { key: "organic",    label: "Suche",       color: T.brand600 },
                              { key: "social",     label: "Social",      color: "#E1306C" },
                              { key: "newsletter", label: "Newsletter",  color: T.success500 },
                              { key: "other",      label: "Andere",      color: T.gray400 },
                            ].filter(e => ref[e.key]?.count > 0);
                            if (!entries.length) return null;
                            return (
                              <div>
                                <div style={{ fontSize: 8.5, color: T.gray400, fontFamily: FONT, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Traffic-Quelle</div>
                                <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                                  {entries.map(e => ref[e.key].pct > 0 && (
                                    <div key={e.key} style={{ width: `${ref[e.key].pct}%`, background: e.color, transition: "width .3s" }} title={`${e.label}: ${ref[e.key].pct}%`} />
                                  ))}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px" }}>
                                  {entries.map(e => (
                                    <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                                      <span style={{ fontSize: 8, color: T.gray500, fontFamily: FONT }}>{e.label} {ref[e.key].pct}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                        </>)}
                      </div>
                    )}

                    {/* Fehler */}
                    {webPublished?.error && (
                      <div style={{ fontSize: 10, color: T.error600, fontFamily: FONT, padding: "5px 9px", background: T.errorBg, borderRadius: T.rSm, border: `1px solid ${T.error600}22` }}>
                        ✕ {webPublished.error}
                      </div>
                    )}
                  </div>
                </AccSection>
              )}

              {/* CREATION VOODOO – Landing Page link */}
              {(() => {
                const liveProjects = (projects || []).filter(p => p.status === "live");
                if (!liveProjects.length && !form.voodooProjectId) return null;
                const linked = form.voodooProjectId ? (projects || []).find(p => p.id === form.voodooProjectId) : null;
                return (
                  <AccSection
                    label="Creation Voodoo · Landing Page"
                    badge={linked ? "Verknüpft" : null}
                    isOpen={sOpen("voodoo", false)}
                    onToggle={() => toggleSection("voodoo")}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Info text */}
                      <div style={{ fontSize: 10.5, color: T.gray500, fontFamily: FONT, lineHeight: 1.5 }}>
                        Verknüpfe diese Story mit einer Creation Voodoo Landing Page. Die Story wird als Referenz-Content für die Seite gespeichert.
                      </div>

                      {/* Project selector */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {liveProjects.map(p => {
                          const isLinked = form.voodooProjectId === p.id;
                          return (
                            <button key={p.id}
                              onClick={() => setForm(f => ({ ...f, voodooProjectId: isLinked ? null : p.id }))}
                              style={{
                                display: "flex", alignItems: "center", gap: 8, width: "100%",
                                padding: "7px 10px", borderRadius: T.rMd, textAlign: "left",
                                border: `1.5px solid ${isLinked ? "#7C3AED55" : T.gray200}`,
                                background: isLinked ? "#7C3AED0A" : T.white,
                                cursor: "pointer", fontFamily: FONT, transition: "all .13s",
                                boxShadow: isLinked ? `0 0 0 2px #7C3AED18` : T.shadowXs,
                              }}
                              onMouseEnter={e => { if (!isLinked) { e.currentTarget.style.borderColor = "#7C3AED44"; e.currentTarget.style.background = "#7C3AED06"; }}}
                              onMouseLeave={e => { if (!isLinked) { e.currentTarget.style.borderColor = T.gray200; e.currentTarget.style.background = T.white; }}}
                            >
                              <div style={{
                                width: 28, height: 28, borderRadius: T.rSm, flexShrink: 0,
                                background: isLinked ? "#7C3AED" : T.gray100,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all .13s",
                              }}>
                                <Wand2 size={13} strokeWidth={2} color={isLinked ? "#fff" : T.gray400} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: isLinked ? "#7C3AED" : T.gray800, fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {p.name}
                                </div>
                                {p.slug && (
                                  <div style={{ fontSize: 9.5, color: T.gray400, fontFamily: FONT, marginTop: 1, fontWeight: 500 }}>
                                    /site/{p.slug}
                                  </div>
                                )}
                              </div>
                              {isLinked && (
                                <div style={{ flexShrink: 0, background: "#7C3AED", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 9, fontWeight: 800 }}>
                                  <Check size={8} strokeWidth={3} style={{ verticalAlign: "middle" }} /> Aktiv
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Link to live page */}
                      {linked?.slug && (
                        <a href={`https://socialflow-pro.pages.dev/site/${linked.slug}`} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            padding: "6px 0", borderRadius: T.rMd, border: `1px solid #7C3AED44`,
                            background: "#7C3AED0A", color: "#7C3AED", fontFamily: FONT,
                            fontSize: 11.5, fontWeight: 600, textDecoration: "none",
                            width: "100%", transition: "all .15s", boxSizing: "border-box",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#7C3AED14"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#7C3AED0A"; }}
                        >
                          <ExternalLink size={11} strokeWidth={2} /> Landing Page öffnen
                        </a>
                      )}

                      {/* No live projects hint */}
                      {liveProjects.length === 0 && (
                        <div style={{ fontSize: 10, color: T.gray400, fontFamily: FONT, textAlign: "center", padding: "6px 0", fontStyle: "italic" }}>
                          Keine Live-Seiten verfügbar — erstelle zuerst eine Landing Page in Creation Voodoo.
                        </div>
                      )}
                    </div>
                  </AccSection>
                );
              })()}

              {/* STATUS */}
              <AccSection label="Status" isOpen={sOpen("status")} onToggle={() => toggleSection("status")}>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {STATUSES.map(s => {
                    const on = form.status === s.id;
                    return (
                      <button key={s.id} onClick={() => setForm(f => ({ ...f, status: s.id }))}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                          borderRadius: 5, border: `1px solid ${on ? s.color + "55" : T.gray200}`,
                          background: on ? s.color + "12" : "transparent",
                          color: on ? s.color : T.gray500, fontFamily: FONT,
                          fontSize: 10.5, fontWeight: on ? 700 : 500, cursor: "pointer", transition: "all .1s",
                        }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </AccSection>

              {/* KATEGORIE */}
              <AccSection label="Kategorie" isOpen={sOpen("kategorie")} onToggle={() => toggleSection("kategorie")}>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${T.gray200}`, background: T.white, color: form.category ? T.gray700 : T.gray400, fontSize: 11, fontFamily: FONT, outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                  {CATS.map(c => <option key={c} value={c}>{c || "Keine Kategorie"}</option>)}
                </select>
              </AccSection>

              {/* ZIEL-KANÄLE */}
              <AccSection label="Ziel-Kanäle" isOpen={sOpen("kanale")} onToggle={() => toggleSection("kanale")}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {STORY_CHANNELS.map(ch => {
                    const active = form.targetChannels.includes(ch.id);
                    return (
                      <button key={ch.id} onClick={() => toggleChannel(ch.id)} title={ch.label}
                        style={{
                          width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                          border: `1.5px solid ${active ? ch.color + "66" : T.gray200}`,
                          background: active ? ch.color + "14" : "transparent",
                          cursor: "pointer", transition: "all .12s",
                        }}>
                        <ChIco id={ch.id} size={14} color={active ? ch.color : T.gray400} />
                      </button>
                    );
                  })}
                </div>
              </AccSection>

              {/* TAGS */}
              <AccSection label="Tags" isOpen={sOpen("tags")} onToggle={() => toggleSection("tags")}>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3…"
                  style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.gray200}`, background: T.white, color: T.gray700, fontSize: 11, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
                />
                {form.tags && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {form.tags.split(",").map(t => t.trim()).filter(Boolean).map((t, i) => (
                      <span key={i} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: T.brand50, color: T.brand600, fontFamily: FONT, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                )}
              </AccSection>

              {/* MATERIALIEN */}
              <AccSection
                label="Materialien"
                badge={form.materials.length > 0 ? form.materials.length : null}
                isOpen={sOpen("materials")}
                onToggle={() => toggleSection("materials")}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {addingLink ? (
                    <div style={{ background: T.gray50, border: `1px solid ${T.brand200}`, borderRadius: 9, padding: 12 }}>
                      <input autoFocus value={linkInput}
                        onChange={e => setLinkInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addLink(); if (e.key === "Escape") setAddingLink(false); }}
                        placeholder="https://…"
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 6 }}
                      />
                      <input value={linkTitle}
                        onChange={e => setLinkTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addLink(); }}
                        placeholder="Titel (optional)"
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={addLink} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: T.brand600, color: T.white, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Hinzufügen</button>
                        <button onClick={() => { setAddingLink(false); setLinkInput(""); setLinkTitle(""); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT }}>Abbrechen</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingLink(true)}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                      <LinkIcon size={12} strokeWidth={IW} /> Link hinzufügen
                    </button>
                  )}
                  {addingNote ? (
                    <div style={{ background: T.gray50, border: `1px solid #F59E0B44`, borderRadius: 9, padding: 12 }}>
                      <textarea autoFocus value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addNote(); if (e.key === "Escape") setAddingNote(false); }}
                        placeholder="Notiz, Idee oder Quellenangabe…"
                        rows={3}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", resize: "none", marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={addNote} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Speichern</button>
                        <button onClick={() => { setAddingNote(false); setNoteInput(""); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT }}>Abbrechen</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingNote(true)}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                      <StickyNote size={12} strokeWidth={IW} /> Notiz hinzufügen
                    </button>
                  )}
                  <button onClick={() => setShowImagePicker(true)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
                    <ImageIcon size={12} strokeWidth={IW} /> Bild hinzufügen
                  </button>
                  {form.materials.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4px 0 2px", color: T.gray400, fontSize: 11, fontFamily: FONT }}>Noch keine Materialien.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                      {form.materials.map(mat => <MaterialCard key={mat.id} mat={mat} onRemove={removeMaterial} />)}
                    </div>
                  )}
                </div>
              </AccSection>

              {/* ABLEITUNGEN */}
              <AccSection
                label="Ableitungen"
                badge={form.derivatives.length > 0 ? form.derivatives.length : null}
                isOpen={sOpen("derivatives", false)}
                onToggle={() => toggleSection("derivatives")}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {!hasContent && (
                    <p style={{ margin: "0 0 6px", fontSize: 11, color: "#F59E0B", fontFamily: FONT, lineHeight: 1.5 }}>
                      Schreibe zuerst Inhalt im Editor.
                    </p>
                  )}
                  {(form.targetChannels.length > 0
                    ? STORY_CHANNELS.filter(c => form.targetChannels.includes(c.id))
                    : STORY_CHANNELS
                  ).map(ch => {
                    const derivative = form.derivatives.find(d => d.channel === ch.id);
                    return (
                      <DerivativeRow key={ch.id} channel={ch} derivative={derivative}
                        onCreate={createDerivative} hasContent={hasContent} loading={!!deriving[ch.id]} />
                    );
                  })}
                  {form.targetChannels.length === 0 && (
                    <p style={{ margin: "6px 0 0", fontSize: 10, color: T.gray400, fontFamily: FONT, textAlign: "center" }}>
                      Wähle Ziel-Kanäle um die Auswahl einzugrenzen.
                    </p>
                  )}
                </div>
              </AccSection>

              {/* SEO */}
              <AccSection
                label="SEO"
                badge={seoScore < 50 ? "!" : seoScore}
                badgeWarn={seoScore < 50}
                isOpen={sOpen("seo")}
                onToggle={() => toggleSection("seo")}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Score card */}
                  <div style={{ background: T.gray50, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.gray100}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.gray700, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5 }}>
                        <BarChart2 size={13} strokeWidth={IW} color={seoColor} /> SEO-Score
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: seoColor, fontFamily: FONT }}>{seoScore}</span>
                    </div>
                    <div style={{ height: 5, background: T.gray100, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${seoScore}%`, background: seoColor, borderRadius: 10, transition: "width .4s" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                      {(seoResult?.checks || []).map((chk, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ flexShrink: 0, marginTop: 1, fontSize: 10, color: chk.ok ? "#10B981" : "#EF4444", fontWeight: 800 }}>{chk.ok ? "✓" : "✗"}</span>
                          <span style={{ fontSize: 10.5, color: T.gray600, fontFamily: FONT, lineHeight: 1.4 }}>{chk.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Focus keyword */}
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>Focus-Keyword</div>
                    <input value={form.seoKeyword} onChange={e => setForm(f => ({ ...f, seoKeyword: e.target.value }))}
                      placeholder="z.B. social media strategie"
                      style={{ width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.gray200}`, background: T.white, color: T.gray700, fontSize: 12, fontFamily: FONT, outline: "none" }}
                    />
                    <div style={{ fontSize: 10, color: T.gray400, marginTop: 3, fontFamily: FONT }}>Keyword, für das du ranken möchtest.</div>
                  </div>
                  {/* Readability */}
                  {readability && (
                    <div style={{ background: T.gray50, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.gray100}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.gray700, fontFamily: FONT }}>Lesbarkeit</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: readability.color, fontFamily: FONT }}>{readability.level}</span>
                      </div>
                      <div style={{ height: 5, background: T.gray100, borderRadius: 10, overflow: "hidden", marginBottom: 9 }}>
                        <div style={{ height: "100%", width: `${readability.fre}%`, background: readability.color, borderRadius: 10, transition: "width .4s" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {[
                          [`Flesch-Score: ${readability.fre}/100`, readability.fre >= 40],
                          [`Ø Satzlänge: ${readability.asl} Wörter${readability.asl > 20 ? " ⚠ zu lang" : ""}`, readability.asl <= 20],
                          [`Ø Wortlänge: ${readability.acw} Zeichen`, readability.acw <= 7],
                          [`Lange Sätze (>25 W.): ${readability.longSentences}`, readability.longSentences === 0],
                        ].map(([lbl, ok], i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 10, color: ok ? "#10B981" : "#F59E0B", fontWeight: 800, flexShrink: 0 }}>{ok ? "✓" : "!"}</span>
                            <span style={{ fontSize: 10.5, color: T.gray600, fontFamily: FONT }}>{lbl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Tags */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", display: "flex", alignItems: "center", gap: 4 }}>
                        <Tag size={10} strokeWidth={2} /> Tags
                      </div>
                      <button onClick={generateTags} disabled={tagsLoading || !hasContent}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, border: `1px solid ${T.brand200}`, background: "transparent", color: T.brand600, fontSize: 10.5, fontWeight: 600, cursor: hasContent ? "pointer" : "default", opacity: hasContent ? 1 : 0.4, fontFamily: FONT }}>
                        {tagsLoading ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={10} strokeWidth={2} />} KI-Tags
                      </button>
                    </div>
                    <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      placeholder="tag1, tag2, tag3…"
                      style={{ width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.gray200}`, background: T.white, color: T.gray700, fontSize: 12, fontFamily: FONT, outline: "none" }}
                    />
                    {form.tags && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {form.tags.split(",").map(t => t.trim()).filter(Boolean).map((t, i) => (
                          <span key={i} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: T.brand50, color: T.brand600, fontFamily: FONT, fontWeight: 600 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Hashtags */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", display: "flex", alignItems: "center", gap: 4 }}>
                        <Hash size={10} strokeWidth={2} /> Hashtags
                      </div>
                      <button onClick={generateHashtags} disabled={hashtagLoading || !hasContent}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, border: `1px solid ${T.brand200}`, background: "transparent", color: T.brand600, fontSize: 10.5, fontWeight: 600, cursor: hasContent ? "pointer" : "default", opacity: hasContent ? 1 : 0.4, fontFamily: FONT }}>
                        {hashtagLoading ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={10} strokeWidth={2} />} Vorschläge
                      </button>
                    </div>
                    <textarea value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                      placeholder="#social #marketing …" rows={3}
                      style={{ width: "100%", boxSizing: "border-box", resize: "none", padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.gray200}`, background: T.white, color: T.gray700, fontSize: 12, fontFamily: FONT, outline: "none" }}
                    />
                    {form.hashtags && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {form.hashtags.split(/[\s,]+/).map(h => h.trim()).filter(h => h.startsWith("#")).map((h, i) => (
                          <span key={i} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: "#6366F114", color: "#6366F1", fontFamily: FONT, fontWeight: 600 }}>{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Meta (Web) */}
                  <div style={{ background: T.gray50, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.gray100}` }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Meta (Web)</div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: T.gray600, fontFamily: FONT, marginBottom: 4 }}>SEO-Titel</div>
                      <input value={form.metaTitle} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))}
                        placeholder={form.title || "Seitentitel für Google…"} maxLength={70}
                        style={{ width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 6, border: `1px solid ${(form.metaTitle||form.title||"").length > 60 ? "#EF4444" : T.gray200}`, background: T.white, color: T.gray700, fontSize: 11.5, fontFamily: FONT, outline: "none" }}
                      />
                      <div style={{ fontSize: 9.5, color: (form.metaTitle||form.title||"").length > 60 ? "#EF4444" : T.gray400, textAlign: "right", marginTop: 2, fontFamily: FONT }}>{(form.metaTitle||form.title||"").length}/70</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: T.gray600, fontFamily: FONT, marginBottom: 4 }}>Meta-Beschreibung</div>
                      <textarea value={form.metaDesc} onChange={e => setForm(f => ({ ...f, metaDesc: e.target.value }))}
                        placeholder="Kurzbeschreibung für Suchergebnisse (50–160 Zeichen)…" rows={3} maxLength={160}
                        style={{ width: "100%", boxSizing: "border-box", resize: "none", padding: "6px 9px", borderRadius: 6, border: `1px solid ${form.metaDesc && (form.metaDesc.length < 50 || form.metaDesc.length > 160) ? "#EF4444" : T.gray200}`, background: T.white, color: T.gray700, fontSize: 11.5, fontFamily: FONT, outline: "none" }}
                      />
                      <div style={{ fontSize: 9.5, color: form.metaDesc && (form.metaDesc.length < 50 || form.metaDesc.length > 160) ? "#EF4444" : T.gray400, textAlign: "right", marginTop: 2, fontFamily: FONT }}>{(form.metaDesc||"").length}/160</div>
                    </div>
                    {(form.metaTitle || form.title) && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: T.white, borderRadius: 8, border: `1px solid ${T.gray100}` }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Google-Vorschau</div>
                        <div style={{ fontSize: 14, color: "#1a0dab", fontFamily: "Arial,sans-serif", lineHeight: 1.3, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.metaTitle || form.title}</div>
                        <div style={{ fontSize: 11, color: "#006621", fontFamily: "Arial,sans-serif", marginBottom: 2 }}>socialflow-pro.pages.dev</div>
                        <div style={{ fontSize: 11.5, color: "#545454", fontFamily: "Arial,sans-serif", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {form.metaDesc || form.subtitle || "Keine Meta-Beschreibung gesetzt."}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </AccSection>

              {/* KOMMENTARE */}
              <AccSection
                label="Kommentare"
                badge={(form.comments||[]).filter(c=>!c.resolved).length > 0 ? (form.comments||[]).filter(c=>!c.resolved).length : null}
                isOpen={sOpen("comments", false)}
                onToggle={() => toggleSection("comments")}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <textarea value={commentInput} onChange={e => setCommentInput(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); addComment(); } }}
                      placeholder="Kommentar schreiben… (Cmd+Enter senden)" rows={3}
                      style={{ width: "100%", boxSizing: "border-box", resize: "none", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.gray200}`, fontSize: 12, fontFamily: FONT, outline: "none", color: T.gray700 }}
                    />
                    <button onClick={addComment} disabled={!commentInput.trim()}
                      style={{ alignSelf: "flex-end", background: commentInput.trim() ? T.brand600 : T.gray200, border: "none", borderRadius: 6, color: commentInput.trim() ? T.white : T.gray400, fontSize: 11, fontWeight: 700, padding: "5px 12px", cursor: commentInput.trim() ? "pointer" : "default", fontFamily: FONT }}>
                      Senden
                    </button>
                  </div>
                  {(form.comments || []).length === 0 ? (
                    <p style={{ color: T.gray400, fontSize: 12, fontFamily: FONT, textAlign: "center", padding: "4px 0" }}>Noch keine Kommentare.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[...(form.comments || [])].reverse().map(c => (
                        <div key={c.id} style={{ background: c.resolved ? T.gray50 : T.white, borderRadius: 8, padding: "8px 10px", opacity: c.resolved ? 0.55 : 1, border: `1px solid ${T.gray100}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.brand600, color: T.white, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {(c.authorName || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.gray800, fontFamily: FONT }}>{c.authorName}</span>
                            <span style={{ fontSize: 10, color: T.gray400, fontFamily: FONT, marginLeft: "auto" }}>
                              {new Date(c.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p style={{ margin: "0 0 6px", fontSize: 12, color: T.gray700, fontFamily: FONT, lineHeight: 1.5 }}>{c.text}</p>
                          {!c.resolved && (
                            <button onClick={() => resolveComment(c.id)}
                              style={{ background: "none", border: `1px solid ${T.gray200}`, borderRadius: 5, color: T.gray500, fontSize: 10, fontWeight: 600, padding: "2px 8px", cursor: "pointer", fontFamily: FONT }}>
                              Erledigt
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccSection>

              {/* VERLAUF */}
              <AccSection label="Verlauf" isOpen={sOpen("history", false)} onToggle={() => toggleSection("history")}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(form.history || []).length === 0 ? (
                    <p style={{ color: T.gray400, fontSize: 12, fontFamily: FONT, textAlign: "center", padding: "4px 0" }}>Noch keine gespeicherten Versionen.</p>
                  ) : (
                    [...(form.history || [])].reverse().map((h, i) => (
                      <div key={h.id} style={{ background: i === 0 ? T.brand50 : T.gray50, borderRadius: 8, padding: "8px 10px", border: `1px solid ${i === 0 ? T.brand200 : T.gray100}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? T.brand600 : T.gray700, fontFamily: FONT }}>
                          {new Date(h.savedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })} · {new Date(h.savedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: 11, color: T.gray400, fontFamily: FONT, marginTop: 2 }}>{h.savedBy} · {h.wordCount} Wörter</div>
                      </div>
                    ))
                  )}
                </div>
              </AccSection>

              {/* ✨ SPARK – KI-Assistent */}
              <AccSection
                label="Spark"
                badge={sparkMessages.filter(m=>!m.dismissed).length > 0 ? sparkMessages.filter(m=>!m.dismissed).length : undefined}
                isOpen={sOpen("spark", false)}
                onToggle={() => toggleSection("spark")}
              >
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>

                  {/* Context indicator */}
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                    <div style={{
                      flex:1, display:"flex", alignItems:"center", gap:6,
                      background: sparkSelInfo ? "#ECFDF5" : "#fff",
                      border: `1px solid ${sparkSelInfo ? "#6EE7B7" : T.gray200}`,
                      borderRadius:16, padding:"5px 10px",
                    }}>
                      <Sparkles size={13} color={sparkSelInfo ? "#10B981" : T.gray400} strokeWidth={2.5} style={{flexShrink:0}}/>
                      <span style={{ fontSize:12, fontWeight:600, color: sparkSelInfo ? "#065F46" : T.gray500, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {sparkSelInfo ? `Auswahl · ${sparkSelInfo.wordCount} Wörter` : `Artikel · ${wordCount} Wörter`}
                      </span>
                    </div>
                    {sparkMessages.length > 0 && (
                      <button
                        onClick={() => { setSparkMessages([]); setSparkUndo(null); }}
                        title="Chat leeren"
                        style={{ background:"none", border:`1px solid ${T.gray200}`, borderRadius:6, color:T.gray400, cursor:"pointer", padding:"3px 7px", fontSize:11, fontFamily:FONT, flexShrink:0, lineHeight:1.4 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=T.gray300; e.currentTarget.style.color=T.gray600; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=T.gray200; e.currentTarget.style.color=T.gray400; }}
                      >✕</button>
                    )}
                  </div>

                  {/* Quick action chips */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, flexShrink:0 }}>
                    {SPARK_ACTIONS.map(a => (
                      <button
                        key={a.id}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => sparkSend(a.prompt)}
                        disabled={sparkLoading}
                        style={{
                          padding:"5px 11px", borderRadius:14, fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer",
                          border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray600,
                          opacity: sparkLoading ? .5 : 1, transition:"all .12s",
                        }}
                        onMouseEnter={e => { if(!sparkLoading){e.currentTarget.style.background=T.brand25;e.currentTarget.style.borderColor=T.brand200;e.currentTarget.style.color=T.brand600;} }}
                        onMouseLeave={e => { e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=T.gray200;e.currentTarget.style.color=T.gray600; }}
                      >{a.label}</button>
                    ))}
                  </div>

                  {/* Chat history — scrolls internally */}
                  {(sparkMessages.filter(m=>!m.dismissed).length > 0 || sparkLoading) && (
                    <div
                      ref={sparkScrollRef}
                      style={{ maxHeight:240, overflowY:"auto", display:"flex", flexDirection:"column", gap:6, borderRadius:10, border:`1px solid ${T.gray100}`, padding:"8px", background:T.gray50 }}
                    >
                      {sparkMessages.filter(m => !m.dismissed).map(msg => {
                        // ── User bubble ──────────────────────────────────────────
                        if (msg.role === "user") return (
                          <div key={msg.id} style={{ display:"flex", justifyContent:"flex-end" }}>
                            <div style={{ background:"#fff", border:`1px solid ${T.gray200}`, borderRadius:"10px 10px 2px 10px", padding:"7px 11px", maxWidth:"90%", fontSize:13, color:T.gray700, fontFamily:FONT, lineHeight:1.5 }}>
                              {msg.isSel && <span style={{ fontSize:11, color:T.gray400, fontFamily:FONT, display:"block", marginBottom:2 }}>✂ Auswahl · {msg.ctxWords} Wörter</span>}
                              {msg.text}
                            </div>
                          </div>
                        );

                        // ── Error message ─────────────────────────────────────────
                        if (msg.type === "error") return (
                          <div key={msg.id} style={{ fontSize:12, color:"#C4511E", background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, padding:"7px 10px", fontFamily:FONT, lineHeight:1.4 }}>
                            {msg.text}
                          </div>
                        );

                        // ── Agentic plan card ─────────────────────────────────────
                        if (msg.type === "plan") return (
                          <div key={msg.id} style={{ display:"flex", flexDirection:"column", gap:6, background:"#fff", border:`1px solid ${msg.status==="applied"?T.gray100:T.brand100}`, borderRadius:10, padding:"9px 10px" }}>
                            {/* Header row */}
                            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                              <Sparkles size={13} color={T.brand600} strokeWidth={2.5}/>
                              <span style={{ fontSize:11, fontWeight:700, color:T.brand600, fontFamily:FONT, letterSpacing:".04em", textTransform:"uppercase" }}>Spark · Plan</span>
                              {msg.status==="applied" && <><Check size={11} strokeWidth={3} color="#10B981" style={{marginLeft:"auto"}}/><span style={{fontSize:11,color:"#10B981",fontWeight:600,fontFamily:FONT}}>Erledigt</span></>}
                              {msg.status==="applying" && <><Loader size={11} color={T.brand600} strokeWidth={2} style={{marginLeft:"auto",animation:"spin .8s linear infinite"}}/><span style={{fontSize:11,color:T.brand600,fontWeight:600,fontFamily:FONT}}>Läuft…</span></>}
                              {msg.status==="error" && <span style={{fontSize:11,color:"#DC2626",fontWeight:600,fontFamily:FONT,marginLeft:"auto"}}>Fehler</span>}
                            </div>
                            {/* Plan description */}
                            <p style={{ margin:0, fontSize:13, color:T.gray700, fontFamily:FONT, lineHeight:1.55 }}>{msg.plan}</p>
                            {/* Action list */}
                            {msg.status!=="applied" && msg.actions?.length>0 && (
                              <div style={{ borderTop:`1px solid ${T.gray100}`, paddingTop:6, display:"flex", flexDirection:"column", gap:3 }}>
                                {msg.actions.map((a, i) => {
                                  const d = sparkActionDisplay(a);
                                  return (
                                    <div key={i} style={{ display:"flex", gap:6, alignItems:"center" }}>
                                      <span style={{ fontSize:11, color:d.color, fontWeight:800, fontFamily:"monospace", flexShrink:0, minWidth:16, textAlign:"center" }}>{d.icon}</span>
                                      <span style={{ fontSize:11, color:T.gray500, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Warning if images couldn't load */}
                            {msg.appliedSummary && <div style={{ fontSize:11, color:"#92400E", background:"#FFF7ED", borderRadius:6, padding:"4px 8px", fontFamily:FONT }}>{msg.appliedSummary}</div>}
                            {/* CTA buttons */}
                            {msg.status==="pending" && (
                              <div style={{ display:"flex", gap:5 }}>
                                <button onMouseDown={e=>e.preventDefault()} onClick={()=>executeSparkPlan(msg)}
                                  style={{ flex:1, padding:"6px 0", borderRadius:7, border:"none", background:C.accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                                  <Check size={12} strokeWidth={3}/> Anwenden
                                </button>
                                <button onMouseDown={e=>e.preventDefault()} onClick={()=>setSparkMessages(prev=>prev.map(m=>m.id===msg.id?{...m,dismissed:true}:m))}
                                  style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray500, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
                                  Verwerfen
                                </button>
                              </div>
                            )}
                          </div>
                        );

                        // ── Selection text-edit suggestion card ───────────────────
                        return (
                          <div key={msg.id} style={{ display:"flex", flexDirection:"column", gap:6, background:"#fff", border:`1px solid ${msg.applied ? T.gray100 : T.brand100}`, borderRadius:10, padding:"9px 10px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                              <Sparkles size={13} color={T.brand600} strokeWidth={2.5}/>
                              <span style={{ fontSize:11, fontWeight:700, color:T.brand600, fontFamily:FONT, letterSpacing:".04em", textTransform:"uppercase" }}>Spark · Text</span>
                              {msg.applied && (
                                <span style={{ marginLeft:"auto", fontSize:11, color:"#10B981", fontWeight:600, fontFamily:FONT, display:"flex", alignItems:"center", gap:3 }}>
                                  <Check size={11} strokeWidth={3}/> Übernommen
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize:13, color: msg.applied ? T.gray400 : T.gray700, fontFamily:FONT, lineHeight:1.6, maxHeight:130, overflowY:"auto", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                              {msg.text}
                            </div>
                            {!msg.applied && (
                              <div style={{ display:"flex", gap:5 }}>
                                <button onMouseDown={e=>e.preventDefault()} onClick={()=>sparkApply(msg)}
                                  style={{ flex:1, padding:"6px 0", borderRadius:7, border:"none", background:C.accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                                  <Check size={12} strokeWidth={3}/> Übernehmen
                                </button>
                                <button onMouseDown={e=>e.preventDefault()} onClick={()=>setSparkMessages(prev=>prev.map(m=>m.id===msg.id?{...m,dismissed:true}:m))}
                                  style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray500, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
                                  Verwerfen
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Loading dots */}
                      {sparkLoading && (
                        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 2px" }}>
                          <Sparkles size={13} color={T.brand600} strokeWidth={2.5}/>
                          <div style={{ display:"flex", gap:4 }}>
                            {[0,1,2].map(i => (
                              <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:T.brand600, animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input row — always pinned at bottom */}
                  <div style={{ display:"flex", gap:6, alignItems:"flex-end", flexShrink:0, borderTop:`1px solid ${T.gray100}`, paddingTop:8 }}>
                    <textarea
                      value={sparkInput}
                      onChange={e => { setSparkInput(e.target.value); sparkInputRef.current = e.target.value; }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sparkSend(); } }}
                      placeholder="Frag Spark…"
                      rows={2}
                      style={{
                        flex:1, resize:"none", padding:"8px 11px", borderRadius:9,
                        border:`1.5px solid ${sparkInput ? C.accent + "55" : T.gray200}`,
                        fontSize:13, fontFamily:FONT, color:C.text, outline:"none",
                        background:"#fff", lineHeight:1.45, transition:"border-color .12s",
                      }}
                    />
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => sparkSend()}
                      disabled={!sparkInputRef.current.trim() || sparkLoading}
                      style={{
                        width:36, height:36, borderRadius:9, border:"none", flexShrink:0,
                        background: sparkInput.trim() && !sparkLoading ? C.accent : T.gray200,
                        color:"#fff", cursor: sparkInput.trim() && !sparkLoading ? "pointer" : "default",
                        display:"flex", alignItems:"center", justifyContent:"center", transition:"background .12s",
                      }}
                    >
                      {sparkLoading ? <Loader size={14} strokeWidth={2} style={{animation:"spin .8s linear infinite"}}/> : <Send size={14} strokeWidth={2.5}/>}
                    </button>
                  </div>

                  {/* Undo — below input */}
                  {sparkUndo && (
                    <button
                      onClick={sparkUndoApply}
                      style={{
                        flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                        padding:"7px 0", borderRadius:8, border:`1px solid ${T.gray200}`,
                        background:T.gray50, color:T.gray500, fontSize:13, fontWeight:600,
                        cursor:"pointer", fontFamily:FONT, transition:"all .12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background=T.gray100; e.currentTarget.style.borderColor=T.gray300; }}
                      onMouseLeave={e => { e.currentTarget.style.background=T.gray50; e.currentTarget.style.borderColor=T.gray200; }}
                    >
                      <RotateCcw size={13} strokeWidth={2.5}/> Rückgängig
                    </button>
                  )}

                </div>
              </AccSection>

            </div>
          </div>
        </div>
      </div>


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
