import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import "@blocknote/ariakit/style.css";
import {
  useCreateBlockNote, FilePanelController,
  FormattingToolbarController,
  SideMenuController, SideMenu, DragHandleButton, DeleteButton,
  SuggestionMenuController, getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Save, Check,
  Wand2,
  ChevronLeft, AlignLeft,
  ExternalLink,
} from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { STORY_CHANNELS } from "../constants/demo.js";
import { uid, aiCall, fileToDataURL } from "../utils/store.js";
import ChIco from "../components/ui/ChIco.jsx";
import AccSection from "../components/ui/AccSection.tsx";
import { useApp } from "../context/AppContext.jsx";
import MediaLibraryFilePanel from "./StoryEditor/MediaLibraryFilePanel.tsx";
import DerivativePreviewModal from "./StoryEditor/DerivativePreviewModal.tsx";
import BlockPickerPortal from "./StoryEditor/BlockPickerPortal.tsx";
import { AddBlockButton, BlockTypeButton } from "./StoryEditor/SideMenuButtons.tsx";
import UnifiedFormattingToolbar from "./StoryEditor/UnifiedFormattingToolbar.tsx";
import MaterialsPanel from "./StoryEditor/MaterialsPanel.tsx";
import DerivativesPanel from "./StoryEditor/DerivativesPanel.tsx";
import SeoPanel from "./StoryEditor/SeoPanel.tsx";
import WebsitePanel from "./StoryEditor/WebsitePanel.tsx";
import HistoryPanel from "./StoryEditor/HistoryPanel.tsx";
import SparkPanel from "./StoryEditor/SparkPanel.tsx";

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

// ImagePicker, MaterialCard, DerivativeRow extracted to ./StoryEditor/ sub-components
// Block type constants moved to ./StoryEditor/BlockPickerPortal.tsx and UnifiedFormattingToolbar.tsx

// Preferred order for slash menu — most common first
const SLASH_ORDER = [
  "Paragraph",
  "Heading 1","Heading 2","Heading 3",
  "Bullet List","Numbered List","Check List",
  "Image","Video",
  "Quote","Divider","Table","Code Block",
];

// AddBlockButton, BlockTypeButton, BlockPickerPortal extracted to ./StoryEditor/SideMenuButtons.tsx and BlockPickerPortal.tsx

// UnifiedFormattingToolbar extracted to ./StoryEditor/UnifiedFormattingToolbar.tsx

// AccSection extracted to ../components/ui/AccSection.tsx

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function StoryEditorModal() {
  const { edStory: story, items, posts, updateStory, lockStory, unlockStory, setEdStory, setPosts, user, projects, uploadItem, updateItem, currentWorkspaceId } = useApp();
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
  // linkInput/linkTitle/noteInput/addingLink/addingNote/showImagePicker → moved to MaterialsPanel
  const [deriving, setDeriving] = useState({}); // { [chId]: boolean }
  const [derivPreview, setDerivPreview] = useState(null); // { chId, content, channel }

  const [articleText, setArticleText] = useState(() => blocksToText(story.blocks || []));
  const [tagsLoading, setTagsLoading] = useState(false);
  const [hashtagLoading, setHashtagLoading] = useState(false);
  // webPublishing/webPublished/webStats/statsLoading → moved to WebsitePanel

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


  const asRef          = useRef();
  const formRef        = useRef(form);
  const titleRef       = useRef();
  const subtitleRef    = useRef();
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

  // ── WebsitePanel publish success callback ─────────────────────────────────
  const handleWebPublishSuccess = useCallback((slug, webPublishedAt, webUpdatedAt) => {
    const updated = {
      ...formRef.current, webSlug: slug, status: "published",
      blocks: editor.document, webPublishedAt, webUpdatedAt,
    };
    updateStory(updated);
    setForm(prev => ({ ...prev, webSlug: slug, status: "published", webPublishedAt, webUpdatedAt }));
  }, [editor, updateStory]);

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

  // ── Material callbacks (used by MaterialsPanel) ───────────────────────────
  const addLink = useCallback((url, title) => {
    setForm(f => ({
      ...f,
      materials: [...f.materials, {
        id: uid(), type: "link",
        url, title: title || url,
        description: "", addedAt: new Date().toISOString(),
      }],
    }));
  }, []);

  const addNote = useCallback((text) => {
    setForm(f => ({
      ...f,
      materials: [...f.materials, {
        id: uid(), type: "note",
        url: "", title: text,
        description: "", addedAt: new Date().toISOString(),
      }],
    }));
  }, []);

  const addImage = useCallback((img) => {
    setForm(f => ({
      ...f,
      materials: [...f.materials, {
        id: uid(), type: "image",
        url: img.url, title: img.name || img.description || "Bild",
        mediaId: img.id, addedAt: new Date().toISOString(),
      }],
    }));
  }, []);

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

              {/* WEBSITE — rendered by WebsitePanel */}
              {(form.targetChannels?.includes("website") || form.webSlug) && (
                <WebsitePanel
                  form={form}
                  pushToWebsite={pushToWebsite}
                  onPublishSuccess={handleWebPublishSuccess}
                  isOpen={sOpen("website")}
                  onToggle={() => toggleSection("website")}
                />
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
                        <a href={`${window.location.origin}/site/${linked.slug}`} target="_blank" rel="noopener noreferrer"
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
              <MaterialsPanel
                materials={form.materials}
                items={items}
                onAddLink={addLink}
                onAddNote={addNote}
                onAddImage={addImage}
                onRemove={removeMaterial}
                isOpen={sOpen("materials")}
                onToggle={() => toggleSection("materials")}
              />

              {/* ABLEITUNGEN */}
              <DerivativesPanel
                derivatives={form.derivatives}
                targetChannels={form.targetChannels}
                hasContent={hasContent}
                deriving={deriving}
                onCreate={createDerivative}
                isOpen={sOpen("derivatives", false)}
                onToggle={() => toggleSection("derivatives")}
              />

              {/* SEO */}
              <SeoPanel
                form={form}
                seoResult={seoResult}
                seoScore={seoScore}
                seoColor={seoColor}
                readability={readability}
                hasContent={hasContent}
                tagsLoading={tagsLoading}
                hashtagLoading={hashtagLoading}
                onFormChange={(updates) => setForm(f => ({ ...f, ...updates }))}
                onGenerateTags={generateTags}
                onGenerateHashtags={generateHashtags}
                isOpen={sOpen("seo")}
                onToggle={() => toggleSection("seo")}
              />

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
              <HistoryPanel
                history={form.history || []}
                isOpen={sOpen("history", false)}
                onToggle={() => toggleSection("history")}
              />


              {/* ✨ SPARK – KI-Assistent */}
              <SparkPanel
                editor={editor}
                formRef={formRef}
                wordCount={wordCount}
                currentWorkspaceId={currentWorkspaceId}
                uploadItem={uploadItem}
                updateItem={updateItem}
                isOpen={sOpen("spark", false)}
                onToggle={() => toggleSection("spark")}
              />

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

// DerivativePreviewModal extracted to ./StoryEditor/DerivativePreviewModal.tsx
