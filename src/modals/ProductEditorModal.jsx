import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Check, Trash2, Wand2, Loader, Image as ImageIcon,
  Plus, Upload, Send as SendIcon, Package,
} from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { uid, aiCall, fileToDataURL, getMediaType, AI } from "../utils/store.js";
import { STORY_PERSONA } from "../utils/spark.js";
import { useApp } from "../context/AppContext.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = [
  { id: "draft",        label: "Entwurf",     color: "#F59E0B" },
  { id: "active",       label: "Aktiv",       color: "#10B981" },
  { id: "discontinued", label: "Eingestellt", color: "#EF4444" },
];

const CURRENCIES = ["EUR", "USD", "CHF", "GBP"];
const UNITS      = ["Stk.", "m", "kg", "Paar", "Set", "l"];
const VAT_CLASSES = ["19%", "7%", "0%"];

const ATTR_KEY_SUGGESTIONS = ["Gewicht", "Maße", "Material", "Farbe", "Herkunft", "Zertifizierungen"];

const SPARK_ACTIONS = [
  { id: "shortdesc",   label: "Kurztext schreiben" },
  { id: "description", label: "Beschreibung ausformulieren" },
  { id: "attributes",  label: "Attribute vervollständigen" },
  { id: "optimize",    label: "Verkaufstext optimieren" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPricePreview(price, currency, unit, vatClass) {
  const num = parseFloat(price);
  if (isNaN(num) || !price) return null;
  const formatted = num.toLocaleString("de-DE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const sym = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "CHF" ? "CHF" : "£";
  return `${formatted} ${sym} / ${unit || "Stk."} inkl. ${vatClass || "19%"} MwSt.`;
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 800,
      textTransform: "uppercase", letterSpacing: ".1em",
      color: C.textMute, marginBottom: 10, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block", fontFamily: FONT,
        fontSize: 12, fontWeight: 600, color: C.textMid,
        marginBottom: 5,
      }}
    >
      {children}
    </label>
  );
}

// ── Input style ───────────────────────────────────────────────────────────────
const inputStyle = (focus = false) => ({
  width: "100%", boxSizing: "border-box",
  padding: "9px 12px", borderRadius: T.rMd,
  border: `1.5px solid ${focus ? C.accent : C.border}`,
  fontSize: 13.5, fontFamily: FONT, color: C.text,
  background: C.surface, outline: "none",
  transition: "border-color .15s",
});

// ── Textarea style ────────────────────────────────────────────────────────────
const textareaStyle = (minH = 80) => ({
  width: "100%", boxSizing: "border-box",
  padding: "9px 12px", borderRadius: T.rMd,
  border: `1.5px solid ${C.border}`,
  fontSize: 13.5, fontFamily: FONT, color: C.text,
  background: C.surface, outline: "none", resize: "vertical",
  minHeight: minH, lineHeight: 1.55,
  transition: "border-color .15s",
});

// ── FocusInput wrapper ────────────────────────────────────────────────────────
function FocusInput({ value, onChange, placeholder, style = {}, id }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ ...inputStyle(focus), ...style }}
    />
  );
}

// ── FocusTextarea wrapper ─────────────────────────────────────────────────────
function FocusTextarea({ value, onChange, placeholder, minH, id }) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ ...textareaStyle(minH), border: `1.5px solid ${focus ? C.accent : C.border}` }}
    />
  );
}

// ── Spark chat bubble ─────────────────────────────────────────────────────────
function SparkBubble({ msg, onApply }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 8, marginBottom: 10, alignItems: "flex-start",
    }}>
      <div style={{
        maxWidth: "85%",
        background: isUser ? C.accent : T.gray100,
        color: isUser ? "#fff" : C.text,
        padding: "9px 13px", borderRadius: 10,
        fontSize: 12.5, fontFamily: FONT, lineHeight: 1.55,
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
        {!isUser && onApply && (
          <button
            onClick={onApply}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              marginTop: 8, padding: "5px 10px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.surface,
              color: C.accent, fontSize: 11.5, fontWeight: 600,
              fontFamily: FONT, cursor: "pointer",
            }}
          >
            <Check size={11} strokeWidth={2.2} /> Anwenden
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProductEditorModal() {
  const {
    edProduct, setEdProduct, saveProduct, updateProduct, delProduct,
    items, uploadItem, updateItem, currentWorkspaceId, user,
  } = useApp();

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => ({
    name: "", sku: "", category: "", status: "draft", tags: "",
    shortDesc: "", description: "", price: "", currency: "EUR",
    unit: "Stk.", vatClass: "19%", mediaIds: [], attributes: [],
    ...edProduct,
  }));

  const set = useCallback((key, val) => setForm(f => ({ ...f, [key]: val })), []);

  // ── Auto-save (30 s debounce, no stale closure) ───────────────────────────
  const formRef = useRef(form);
  formRef.current = form;
  const autoTimer = useRef(null);

  useEffect(() => {
    clearTimeout(autoTimer.current);
    if (!form.name && !form.description) return;
    autoTimer.current = setTimeout(() => {
      updateProduct?.({ ...formRef.current, updatedAt: new Date().toISOString() });
    }, 30000);
    return () => clearTimeout(autoTimer.current);
  }, [form.name, form.description, updateProduct]);

  // ── Confirm-delete dialog ─────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Media: file upload ────────────────────────────────────────────────────
  const fileRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    for (const file of Array.from(files)) {
      const url = await fileToDataURL(file);
      const id = uid();
      const mtype = getMediaType(file);
      const item = {
        id, name: file.name, url, type: mtype, size: file.size,
        date: new Date().toLocaleDateString("de"), tags: "",
        description: "", altText: "", category: "",
        focusPoint: { x: 50, y: 50 }, mood: "", analyzing: mtype === "image",
        workspaceId: currentWorkspaceId || "ws-ppi-media",
      };
      uploadItem(item);
      set("mediaIds", [...(formRef.current.mediaIds || []), id]);
      if (mtype === "image") {
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 30000));
        Promise.race([AI.analyzeImg(url), timeout])
          .then(r => updateItem({
            ...item, analyzing: false,
            tags: Array.isArray(r.tags) ? r.tags.join(", ") : "",
            description: r.description || "",
            altText: r.suggestedAlt || "",
            mood: r.mood || "",
            focusPoint: r.focalPoint ? { x: r.focalPoint.x, y: r.focalPoint.y } : { x: 50, y: 50 },
            aiAnalysis: r,
          }))
          .catch(() => updateItem({ ...item, analyzing: false, aiError: true }));
      } else {
        updateItem({ ...item, analyzing: false });
      }
    }
  }, [uploadItem, updateItem, currentWorkspaceId, set]);

  // Library items (workspace-filtered, newest first, max 20)
  const libraryItems = (items || [])
    .filter(i => i.type === "image")
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 20);

  const toggleLibItem = (id) => {
    const current = form.mediaIds || [];
    if (current.includes(id)) {
      set("mediaIds", current.filter(x => x !== id));
    } else {
      set("mediaIds", [...current, id]);
    }
  };

  // ── Attributes ────────────────────────────────────────────────────────────
  const addAttr = () => set("attributes", [...(form.attributes || []), { id: uid(), key: "", value: "" }]);
  const updateAttr = (id, field, val) => {
    set("attributes", (form.attributes || []).map(a => a.id === id ? { ...a, [field]: val } : a));
  };
  const removeAttr = (id) => set("attributes", (form.attributes || []).filter(a => a.id !== id));

  // ── Spark panel ───────────────────────────────────────────────────────────
  const [sparkMessages, setSparkMessages] = useState([]);
  const [sparkInput, setSparkInput] = useState("");
  const [sparkLoading, setSparkLoading] = useState(false);
  const [lastSparkTask, setLastSparkTask] = useState(null);
  const sparkEndRef = useRef(null);

  useEffect(() => {
    sparkEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sparkMessages]);

  const buildProductCtx = () => [
    `Produkt: ${form.name || "(kein Name)"}`,
    form.sku && `SKU: ${form.sku}`,
    form.category && `Kategorie: ${form.category}`,
    form.price && `Preis: ${form.price} ${form.currency}/${form.unit}`,
    form.attributes?.length && `Attribute: ${form.attributes.map(a => `${a.key}: ${a.value}`).join(", ")}`,
    form.shortDesc && `Aktueller Kurztext: ${form.shortDesc}`,
    form.description && `Aktuelle Beschreibung (Auszug): ${form.description.slice(0, 400)}`,
  ].filter(Boolean).join("\n");

  const sparkSend = useCallback(async (promptText, taskId = null) => {
    if (!promptText.trim() || sparkLoading) return;
    const userMsg = { role: "user", content: promptText };
    setSparkMessages(m => [...m, userMsg]);
    setSparkInput("");
    setSparkLoading(true);
    setLastSparkTask(taskId);
    try {
      const systemCtx = [
        STORY_PERSONA,
        "KEIN Emoji im Text.",
        "",
        "Produktkontext:",
        buildProductCtx(),
      ].join("\n");
      const messages = [
        { role: "user", content: `${systemCtx}\n\n${promptText}` },
      ];
      const reply = await aiCall(messages, 1500);
      setSparkMessages(m => [...m, { role: "assistant", content: reply, taskId }]);
    } catch (err) {
      console.error("Spark error:", err);
      setSparkMessages(m => [...m, { role: "assistant", content: "Fehler bei der KI-Anfrage. Bitte erneut versuchen.", taskId: null }]);
    } finally {
      setSparkLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sparkLoading, form]);

  const applySparkReply = (content, taskId) => {
    if (taskId === "shortdesc") {
      set("shortDesc", content.slice(0, 160));
    } else if (taskId === "description") {
      set("description", content);
    } else if (taskId === "optimize") {
      // Place optimized text in description (user decides)
      set("description", content);
    }
    // attributes: user copies manually — complex structured output
  };

  // ── Save & close ──────────────────────────────────────────────────────────
  const handleClose = () => {
    const now = new Date().toISOString();
    saveProduct({ ...form, updatedAt: now });
    setEdProduct(null);
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    updateProduct?.({ ...form, updatedAt: now });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const updatedLabel = form.updatedAt
    ? new Date(form.updatedAt).toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  const pricePreview = fmtPricePreview(form.price, form.currency, form.unit, form.vatClass);
  const shortDescLen = (form.shortDesc || "").length;
  const shortDescOver = shortDescLen > 160;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", background: C.bg,
    }}>
      <style>{CSS}</style>

      {/* ══════════════════════════════════════════════════════════════════
          LEFT SIDEBAR (230px)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        width: 230, flexShrink: 0, background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Package size={15} strokeWidth={IW} color={C.accent} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.text, flex: 1 }}>
            Produkt
          </span>
          <button
            onClick={handleClose}
            style={{
              display: "flex", alignItems: "center", padding: 6,
              borderRadius: 6, border: "none", background: "none",
              cursor: "pointer", color: C.textMute,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.gray100; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMute; }}
            title="Speichern und schließen"
          >
            <X size={15} strokeWidth={IW} />
          </button>
        </div>

        {/* Sidebar content */}
        <div style={{ padding: "16px", flex: 1 }}>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: ".1em",
              color: C.textMute, marginBottom: 8,
            }}>
              Status
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {STATUSES.map(s => {
                const active = form.status === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => set("status", s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", borderRadius: T.rMd,
                      border: `1.5px solid ${active ? s.color + "50" : "transparent"}`,
                      background: active ? s.color + "10" : "transparent",
                      cursor: "pointer", textAlign: "left",
                      transition: "all .12s",
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: s.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: FONT, fontSize: 12.5, fontWeight: active ? 700 : 500,
                      color: active ? s.color : C.textMid,
                    }}>
                      {s.label}
                    </span>
                    {active && (
                      <Check size={11} strokeWidth={2.5} color={s.color} style={{ marginLeft: "auto" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kategorie */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: ".1em",
              color: C.textMute, marginBottom: 6,
            }}>
              Kategorie
            </div>
            <FocusInput
              value={form.category}
              onChange={e => set("category", e.target.value)}
              placeholder="z. B. Elektronik"
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: ".1em",
              color: C.textMute, marginBottom: 6,
            }}>
              Tags
            </div>
            <FocusInput
              value={form.tags}
              onChange={e => set("tags", e.target.value)}
              placeholder="kommagetrennt"
            />
          </div>

          {/* Updated at */}
          {updatedLabel && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: FONT, fontSize: 11, color: C.textMute,
                lineHeight: 1.4,
              }}>
                Zuletzt gespeichert<br />
                <span style={{ color: C.textSoft, fontWeight: 500 }}>{updatedLabel}</span>
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            style={{
              width: "100%", padding: "8px 12px",
              borderRadius: T.rMd, border: "none",
              background: C.accent, color: "#fff",
              fontFamily: FONT, fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 6,
              marginBottom: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.accentHov; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.accent; }}
          >
            <Check size={13} strokeWidth={2.2} /> Speichern
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: "100%", padding: "7px 12px",
                borderRadius: T.rMd, border: `1px solid ${C.border}`,
                background: "none", color: C.textMute,
                fontFamily: FONT, fontSize: 12, fontWeight: 500,
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 5,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red + "44"; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textMute; e.currentTarget.style.borderColor = C.border; }}
            >
              <Trash2 size={12} strokeWidth={IW} /> Löschen
            </button>
          ) : (
            <div style={{
              background: T.errorBg, borderRadius: T.rMd,
              padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.red, marginBottom: 8 }}>
                Wirklich löschen?
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 6,
                    border: `1px solid ${C.border}`, background: C.surface,
                    fontFamily: FONT, fontSize: 11.5, fontWeight: 600,
                    color: C.textMid, cursor: "pointer",
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => { delProduct(form.id); setEdProduct(null); }}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 6,
                    border: "none", background: C.red,
                    fontFamily: FONT, fontSize: 11.5, fontWeight: 600,
                    color: "#fff", cursor: "pointer",
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN AREA (flex: 1, scrollable)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "32px 40px",
        background: C.bg,
      }}>

        {/* ── BASICS ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Basics</SectionLabel>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel htmlFor="prod-name">Produktname *</FieldLabel>
            <FocusInput
              id="prod-name"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Produktname"
              style={{ fontSize: 16, fontWeight: 600, padding: "11px 14px" }}
            />
          </div>
          <div>
            <FieldLabel htmlFor="prod-sku">Artikelnummer / SKU</FieldLabel>
            <FocusInput
              id="prod-sku"
              value={form.sku}
              onChange={e => set("sku", e.target.value)}
              placeholder="z. B. ART-00123"
              style={{ maxWidth: 260 }}
            />
          </div>
        </div>

        {/* ── TEXTE ── */}
        <div style={{ marginBottom: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <SectionLabel>Texte</SectionLabel>

          {/* Short desc */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
              <FieldLabel htmlFor="prod-shortdesc">Kurztext (Listing)</FieldLabel>
              <span style={{
                fontSize: 11, fontWeight: 600, marginLeft: "auto",
                color: shortDescOver ? C.red : C.textMute, fontFamily: FONT,
              }}>
                {shortDescLen}/160
                {shortDescOver && " — zu lang"}
              </span>
            </div>
            <FocusTextarea
              id="prod-shortdesc"
              value={form.shortDesc}
              onChange={e => set("shortDesc", e.target.value.slice(0, 200))}
              placeholder="Kurzbeschreibung für Produktlisten und Suchergebnisse (max. 160 Zeichen)"
              minH={70}
            />
            {shortDescOver && (
              <div style={{
                marginTop: 4, fontFamily: FONT, fontSize: 11.5,
                color: C.red, fontWeight: 500,
              }}>
                Kurztext ist zu lang ({shortDescLen} Zeichen). Bitte auf max. 160 kürzen.
              </div>
            )}
          </div>

          {/* Long desc */}
          <div>
            <FieldLabel htmlFor="prod-desc">Beschreibung</FieldLabel>
            <FocusTextarea
              id="prod-desc"
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Ausführliche Produktbeschreibung, Merkmale, Anwendungsfälle…"
              minH={160}
            />
          </div>
        </div>

        {/* ── MEDIEN ── */}
        <div style={{ marginBottom: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <SectionLabel>Medien</SectionLabel>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: T.rMd,
                border: `1.5px solid ${C.border}`, background: C.surface,
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                color: C.textMid, cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
            >
              <Upload size={12} strokeWidth={IW} /> Hochladen
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
          />

          {/* Selected media thumbnails */}
          {(form.mediaIds || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {(form.mediaIds || []).map(id => {
                const item = (items || []).find(i => i.id === id);
                return (
                  <div key={id} style={{ position: "relative", width: 80, height: 80, borderRadius: T.rMd, overflow: "hidden", border: `2px solid ${C.accent}` }}>
                    {item?.url ? (
                      <img
                        src={item.url}
                        alt={item.altText || item.name || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: T.gray100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ImageIcon size={22} strokeWidth={IW} color={C.textMute} />
                      </div>
                    )}
                    <button
                      onClick={() => toggleLibItem(id)}
                      style={{
                        position: "absolute", top: 3, right: 3,
                        width: 18, height: 18, borderRadius: "50%",
                        border: "none", background: "rgba(0,0,0,.55)",
                        color: "#fff", display: "flex", alignItems: "center",
                        justifyContent: "center", cursor: "pointer", padding: 0,
                      }}
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Library grid */}
          {libraryItems.length > 0 && (
            <>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.textMute, marginBottom: 8 }}>
                Aus Medienbibliothek auswählen
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {libraryItems.map(item => {
                  const selected = (form.mediaIds || []).includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleLibItem(item.id)}
                      style={{
                        width: 64, height: 64, borderRadius: T.rMd, overflow: "hidden",
                        border: `2px solid ${selected ? C.accent : C.border}`,
                        cursor: "pointer", flexShrink: 0, position: "relative",
                        transition: "border-color .12s",
                      }}
                    >
                      <img
                        src={item.url}
                        alt={item.altText || item.name || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      {selected && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: C.accent + "30",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Check size={14} strokeWidth={2.5} color={C.accent} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── PREISE ── */}
        <div style={{ marginBottom: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <SectionLabel>Preise</SectionLabel>

          {/* Row 1: price + currency + unit */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 120px" }}>
              <FieldLabel htmlFor="prod-price">Preis</FieldLabel>
              <FocusInput
                id="prod-price"
                value={form.price}
                onChange={e => set("price", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div style={{ flex: "1 1 80px" }}>
              <FieldLabel>Währung</FieldLabel>
              <select
                value={form.currency}
                onChange={e => set("currency", e.target.value)}
                style={{ ...inputStyle(), padding: "9px 10px" }}
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 80px" }}>
              <FieldLabel>Einheit</FieldLabel>
              <select
                value={form.unit}
                onChange={e => set("unit", e.target.value)}
                style={{ ...inputStyle(), padding: "9px 10px" }}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: VAT */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-end" }}>
            <div style={{ width: 120 }}>
              <FieldLabel>MwSt.-Klasse</FieldLabel>
              <select
                value={form.vatClass}
                onChange={e => set("vatClass", e.target.value)}
                style={{ ...inputStyle(), padding: "9px 10px" }}
              >
                {VAT_CLASSES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {pricePreview && (
              <div style={{
                flex: 1, padding: "9px 12px", borderRadius: T.rMd,
                background: C.accentLight, fontFamily: FONT,
                fontSize: 13, fontWeight: 600, color: C.accent,
              }}>
                {pricePreview}
              </div>
            )}
          </div>
        </div>

        {/* ── ATTRIBUTE ── */}
        <div style={{ marginBottom: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <SectionLabel>Attribute</SectionLabel>
            <div style={{ flex: 1 }} />
            <button
              onClick={addAttr}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: T.rMd,
                border: `1.5px solid ${C.border}`, background: C.surface,
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                color: C.textMid, cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
            >
              <Plus size={12} strokeWidth={IW} /> Attribut hinzufügen
            </button>
          </div>

          {/* Key suggestions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {ATTR_KEY_SUGGESTIONS.map(k => (
              <button
                key={k}
                onClick={() => {
                  // Only add if not already present
                  const exists = (form.attributes || []).some(a => a.key === k);
                  if (!exists) set("attributes", [...(form.attributes || []), { id: uid(), key: k, value: "" }]);
                }}
                style={{
                  padding: "4px 10px", borderRadius: 20,
                  border: `1px solid ${C.border}`, background: C.surface,
                  fontFamily: FONT, fontSize: 11.5, color: C.textSoft,
                  cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSoft; }}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Attribute list */}
          {(form.attributes || []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(form.attributes || []).map(attr => (
                <div key={attr.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <FocusInput
                    value={attr.key}
                    onChange={e => updateAttr(attr.id, "key", e.target.value)}
                    placeholder="Eigenschaft"
                    style={{ flex: 1 }}
                  />
                  <FocusInput
                    value={attr.value}
                    onChange={e => updateAttr(attr.id, "value", e.target.value)}
                    placeholder="Wert"
                    style={{ flex: 2 }}
                  />
                  <button
                    onClick={() => removeAttr(attr.id)}
                    style={{
                      display: "flex", alignItems: "center", padding: "9px 9px",
                      borderRadius: T.rMd, border: `1px solid ${C.border}`,
                      background: C.surface, color: C.textMute, cursor: "pointer", flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red + "44"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.textMute; e.currentTarget.style.borderColor = C.border; }}
                  >
                    <Trash2 size={13} strokeWidth={IW} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT SPARK PANEL (300px)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        width: 300, flexShrink: 0, background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 18px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Wand2 size={15} strokeWidth={IW} color={C.accent} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.text }}>
            Spark
          </span>
        </div>

        {/* Quick action chips */}
        <div style={{ padding: "12px 14px 8px", display: "flex", flexWrap: "wrap", gap: 6, borderBottom: `1px solid ${C.borderLight}` }}>
          {SPARK_ACTIONS.map(a => (
            <button
              key={a.id}
              onClick={() => {
                const prompts = {
                  shortdesc:   `Schreibe einen prägnanten Kurztext (maximal 160 Zeichen) für dieses Produkt. Nur der reine Text, keine Erklärung.`,
                  description: `Formuliere eine überzeugende Produktbeschreibung aus. Benefit-orientiert, aktive Sprache, keine Emojis. Nur der reine Text.`,
                  attributes:  `Vervollständige die Produktattribute sinnvoll basierend auf Produktname und Kategorie. Liste die fehlenden Attribute als Schlüssel: Wert, je eine Zeile.`,
                  optimize:    `Optimiere den folgenden Verkaufstext für maximale Conversion. Mache ihn überzeugender, klarer und benefit-orientierter.\n\n${form.description || form.shortDesc || "(kein Text vorhanden)"}`,
                };
                sparkSend(prompts[a.id] || a.label, a.id);
              }}
              disabled={sparkLoading}
              style={{
                padding: "5px 10px", borderRadius: 20,
                border: `1px solid ${C.border}`, background: T.gray50,
                fontFamily: FONT, fontSize: 11.5, fontWeight: 500,
                color: C.textMid, cursor: sparkLoading ? "default" : "pointer",
                opacity: sparkLoading ? .5 : 1,
              }}
              onMouseEnter={e => { if (!sparkLoading) { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.color = C.accent; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Chat messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
          {sparkMessages.length === 0 && (
            <div style={{
              textAlign: "center", padding: "30px 16px",
              fontFamily: FONT, fontSize: 12.5, color: C.textMute,
              lineHeight: 1.6,
            }}>
              Wähle eine Schnellaktion oder stelle eine Frage zu diesem Produkt.
            </div>
          )}
          {sparkMessages.map((msg, i) => {
            const isAssistant = msg.role === "assistant";
            const canApply = isAssistant && (msg.taskId === "shortdesc" || msg.taskId === "description" || msg.taskId === "optimize");
            return (
              <SparkBubble
                key={i}
                msg={msg}
                onApply={canApply ? () => applySparkReply(msg.content, msg.taskId) : null}
              />
            );
          })}
          {sparkLoading && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <div style={{
                background: T.gray100, padding: "9px 13px",
                borderRadius: 10, display: "flex", alignItems: "center", gap: 6,
              }}>
                <Loader size={12} strokeWidth={IW} color={C.accent} style={{ animation: "spin .7s linear infinite" }} />
                <span style={{ fontFamily: FONT, fontSize: 12, color: C.textSoft }}>Spark denkt…</span>
              </div>
            </div>
          )}
          <div ref={sparkEndRef} />
        </div>

        {/* Input row */}
        <div style={{
          padding: "10px 14px 14px",
          borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 6, alignItems: "flex-end",
        }}>
          <textarea
            value={sparkInput}
            onChange={e => setSparkInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sparkSend(sparkInput);
              }
            }}
            placeholder="Frage oder Aufgabe…"
            rows={2}
            style={{
              flex: 1, resize: "none",
              padding: "8px 10px", borderRadius: T.rMd,
              border: `1.5px solid ${C.border}`,
              fontFamily: FONT, fontSize: 12.5, color: C.text,
              background: C.surface, outline: "none", lineHeight: 1.5,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
          />
          <button
            onClick={() => sparkSend(sparkInput)}
            disabled={!sparkInput.trim() || sparkLoading}
            style={{
              padding: "9px 11px", borderRadius: T.rMd,
              border: "none",
              background: sparkInput.trim() && !sparkLoading ? C.accent : T.gray200,
              color: sparkInput.trim() && !sparkLoading ? "#fff" : C.textMute,
              cursor: sparkInput.trim() && !sparkLoading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
              flexShrink: 0, alignSelf: "flex-end",
            }}
          >
            <SendIcon size={14} strokeWidth={IW} />
          </button>
        </div>
      </div>
    </div>
  );
}
