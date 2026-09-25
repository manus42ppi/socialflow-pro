import { useState, useCallback, useEffect, useRef } from "react";
import { Printer, Plus, FileText, CheckCircle, AlertCircle,
         Loader, Eye, Download, RotateCcw, BookOpen } from "lucide-react";
import { C, T, FONT, FONT_DISPLAY } from "../constants/colors.js";
import { useApp } from "../context/AppContext.jsx";

// ── Demo-Ausgaben (werden durch echte KV-Daten ersetzt) ──────────
const DEMO_AUSGABEN = [
  {
    id: "druck-001",
    titel: "ppi Cycling Magazin – Oktober 2026",
    seitenanzahl: 32,
    status: "ready",
    generatedAt: "2026-09-20T14:32:00Z",
    artikel: 5,
    cover: "KW 38/2026",
  },
  {
    id: "druck-002",
    titel: "ppi Cycling Magazin – September 2026",
    seitenanzahl: 28,
    status: "approved",
    generatedAt: "2026-08-18T09:11:00Z",
    artikel: 4,
    cover: "KW 34/2026",
  },
];

// ── Status-Konfiguration ──────────────────────────────────────────
const STATUS = {
  generating: { label: "Wird generiert…", color: C.info,       bg: "#EFF6FF", I: Loader    },
  ready:      { label: "Bereit zur Prüfung", color: C.warning,  bg: T.warningBg, I: Eye     },
  approved:   { label: "Freigegeben",       color: C.success,  bg: T.successBg, I: CheckCircle },
  error:      { label: "Fehler",            color: T.error600, bg: T.errorBg,  I: AlertCircle },
};

// ── Hilfsfunktionen ──────────────────────────────────────────────
function fmtDatum(iso) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Sub-Komponenten ──────────────────────────────────────────────

function AusgabeKarte({ ausgabe, onPreview, onRegenerate }) {
  const s = STATUS[ausgabe.status] ?? STATUS.ready;
  const StatusIcon = s.I;

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: T.rLg,
      padding: "20px 24px", display: "flex", alignItems: "center", gap: 20,
      cursor: "pointer", transition: "box-shadow 0.15s",
    }}
      onClick={() => onPreview(ausgabe)}
      onMouseEnter={e => e.currentTarget.style.boxShadow = T.shadowLg}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {/* Cover-Thumbnail */}
      <div style={{
        width: 56, height: 72, borderRadius: 4, flexShrink: 0,
        background: `linear-gradient(135deg, #1a2a3a 0%, #2d4a5a 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "2px 3px 8px rgba(0,0,0,0.2)",
      }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: FONT, textAlign: "center", lineHeight: 1.3 }}>
          {ausgabe.cover}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ausgabe.titel}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.textMid }}>
            {ausgabe.seitenanzahl} Seiten · {ausgabe.artikel} Artikel
          </span>
          {ausgabe.generatedAt && (
            <span style={{ fontSize: 12, color: C.textSoft }}>
              Erstellt {fmtDatum(ausgabe.generatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Status-Badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: s.bg, color: s.color, borderRadius: T.rMd,
        padding: "4px 10px", fontSize: 12, fontWeight: 500, flexShrink: 0,
      }}>
        <StatusIcon size={13} style={ausgabe.status === "generating" ? { animation: "spin 1s linear infinite" } : {}} />
        {s.label}
      </div>

      {/* Aktionen */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        {ausgabe.status !== "generating" && (
          <button
            onClick={() => onRegenerate(ausgabe)}
            title="Neu generieren"
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: T.rSm, padding: "6px 8px", cursor: "pointer", color: C.textMid, display: "flex", alignItems: "center" }}
          >
            <RotateCcw size={14} />
          </button>
        )}
        {(ausgabe.status === "ready" || ausgabe.status === "approved") && ausgabe.pdfBase64 && (
          <button
            onClick={() => downloadPdf(ausgabe)}
            title="PDF herunterladen"
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: T.rSm, padding: "6px 8px", cursor: "pointer", color: C.textMid, display: "flex", alignItems: "center" }}
          >
            <Download size={14} />
          </button>
        )}
        <button
          onClick={() => onPreview(ausgabe)}
          style={{
            background: C.accent, color: "white", border: "none", borderRadius: T.rSm,
            padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <Eye size={13} /> Prüfen
        </button>
      </div>
    </div>
  );
}

function downloadPdf(ausgabe) {
  if (!ausgabe.pdfBase64) return;
  const bytes = atob(ausgabe.pdfBase64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${ausgabe.titel}.pdf`;
  a.click();
}

// ── Artikel-Auswahl-Dialog ───────────────────────────────────────

function NeueAusgabeDialog({ stories, onGenerate, onClose }) {
  const [selected, setSelected] = useState([]);
  const [titel, setTitel] = useState(`ppi Cycling Magazin – ${new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`);

  function toggle(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, borderRadius: T.rLg, padding: 32, width: 560, maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text }}>Neue Druckausgabe</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textSoft }}>Wähle Artikel für diese Ausgabe. Die KI erstellt automatisch den Layout-Plan.</p>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: C.textMid, display: "block", marginBottom: 6 }}>Titel der Ausgabe</label>
          <input
            value={titel}
            onChange={e => setTitel(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: T.rMd, fontSize: 14, fontFamily: FONT, color: C.text, background: C.bg, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: C.textMid, display: "block", marginBottom: 8 }}>
            Artikel auswählen ({selected.length} gewählt)
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stories.map(s => (
              <label key={s.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                border: `1px solid ${selected.includes(s.id) ? C.accent : C.border}`,
                borderRadius: T.rMd, cursor: "pointer",
                background: selected.includes(s.id) ? C.accentLight : "transparent",
              }}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} style={{ marginTop: 2, accentColor: C.accent }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{s.title || "(Kein Titel)"}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>
                    {s.status} · {s.blocks?.length ?? 0} Blöcke
                  </div>
                </div>
              </label>
            ))}
            {stories.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: C.textSoft, fontSize: 13 }}>
                Keine Artikel vorhanden. Erstelle zuerst Artikel im Storys-Bereich.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: T.rMd, background: "none", cursor: "pointer", fontSize: 13, color: C.text }}>
            Abbrechen
          </button>
          <button
            disabled={selected.length === 0 || !titel.trim()}
            onClick={() => onGenerate({ titel, artikelIds: selected })}
            style={{
              padding: "8px 20px", background: selected.length ? C.accent : C.border,
              color: "white", border: "none", borderRadius: T.rMd,
              cursor: selected.length ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Printer size={14} /> Ausgabe generieren
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PDF-Vorschau-Modal ───────────────────────────────────────────

function PdfVorschauModal({ ausgabe, onClose, onApprove }) {
  const [approved, setApproved] = useState(ausgabe.status === "approved");

  let pdfSrc = null;
  if (ausgabe.pdfBase64) {
    const bytes = atob(ausgabe.pdfBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "application/pdf" });
    pdfSrc = URL.createObjectURL(blob);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#1a1a2e", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontSize: 15, fontWeight: 600, fontFamily: FONT_DISPLAY }}>{ausgabe.titel}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{ausgabe.seitenanzahl} Seiten</div>
        </div>
        <button
          onClick={() => { onApprove(ausgabe.id); setApproved(true); }}
          disabled={approved}
          style={{
            padding: "8px 20px", background: approved ? T.success500 : C.accent,
            color: "white", border: "none", borderRadius: T.rMd, cursor: approved ? "default" : "pointer",
            fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <CheckCircle size={14} /> {approved ? "Freigegeben" : "Layout freigeben"}
        </button>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: T.rMd, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>
          Schließen
        </button>
      </div>

      {/* PDF-Viewer */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {pdfSrc
          ? <embed src={pdfSrc} type="application/pdf" style={{ width: "100%", height: "100%" }} />
          : (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
              <FileText size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>Noch kein PDF vorhanden.</div>
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.6 }}>Generiere zuerst die Ausgabe.</div>
            </div>
          )
        }
      </div>
    </div>
  );
}

// ── Haupt-Seite ──────────────────────────────────────────────────

export default function DruckPage() {
  const { stories = [], currentWorkspaceId } = useApp();

  const [ausgaben, setAusgaben] = useState(DEMO_AUSGABEN);
  const [showNeueAusgabe, setShowNeueAusgabe] = useState(false);
  const [vorschau, setVorschau] = useState(null);
  const [loading, setLoading] = useState(null);
  const loadedRef = useRef(false);
  const wsKey = `druck_ausgaben_${currentWorkspaceId ?? "default"}`;

  // Load persisted editions from localStorage
  useEffect(() => {
    loadedRef.current = false;
    try {
      const saved = localStorage.getItem(wsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAusgaben(parsed);
          loadedRef.current = true;
          return;
        }
      }
    } catch {}
    setAusgaben(DEMO_AUSGABEN);
    loadedRef.current = true;
  }, [wsKey]);

  // Persist editions on every change (without pdfBase64 to stay within localStorage quota)
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      const toSave = ausgaben.map(({ pdfBase64: _pdf, ...rest }) => rest);
      localStorage.setItem(wsKey, JSON.stringify(toSave));
    } catch {}
  }, [ausgaben, wsKey]);

  const handleGenerate = useCallback(async ({ titel, artikelIds }) => {
    setShowNeueAusgabe(false);

    const id = `druck-${Date.now()}`;
    const neueAusgabe = {
      id, titel, seitenanzahl: 0, status: "generating",
      generatedAt: null, artikel: artikelIds.length, cover: "NEU",
    };
    setAusgaben(prev => [neueAusgabe, ...prev]);
    setLoading(id);

    try {
      const selectedStories = stories.filter(s => artikelIds.includes(s.id));
      const articles = selectedStories.map(s => {
        const imgMaterials = (s.materials ?? []).filter(m => m.type === "image");
        return {
          id: s.id,
          title: s.title,
          wordCount: (s.blocks ?? []).reduce((n, b) => n + (b.content?.[0]?.text?.split(" ").length ?? 0), 0),
          category: s.category ?? "feature",
          hasHeroImage: imgMaterials.length > 0,
          imageUrls: imgMaterials.map(m => m.url),
          content: (s.blocks ?? []).map(b => b.content?.[0]?.text ?? "").join("\n\n"),
          body: (s.blocks ?? []).map(b => b.content?.[0]?.text ?? "").join("\n\n"),
        };
      });

      const res = await fetch("/print-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles, workspaceId: currentWorkspaceId ?? "ws-ppi-media", issueId: id }),
      });
      const data = await res.json();

      if (data.ok) {
        setAusgaben(prev => prev.map(a => a.id === id
          ? { ...a, status: "ready", pdfBase64: data.pdf, layoutPlan: data.layoutPlan, seitenanzahl: data.pages * 2, generatedAt: new Date().toISOString() }
          : a
        ));
      } else {
        setAusgaben(prev => prev.map(a => a.id === id ? { ...a, status: "error", errorMsg: data.error } : a));
      }
    } catch (err) {
      console.error("Generierung fehlgeschlagen:", err.message);
      setAusgaben(prev => prev.map(a => a.id === id ? { ...a, status: "error", errorMsg: err.message } : a));
    } finally {
      setLoading(null);
    }
  }, [stories, currentWorkspaceId]);

  const handleApprove = useCallback(async (id) => {
    setAusgaben(prev => prev.map(a => a.id === id ? { ...a, status: "approved" } : a));

    const ausgabe = ausgaben.find(a => a.id === id);
    if (!ausgabe?.layoutPlan) return;

    try {
      await fetch("/print-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: id,
          workspaceId: currentWorkspaceId ?? "ws-ppi-media",
          layoutPlan: ausgabe.layoutPlan,
          komposition: `${ausgabe.artikel} Artikel, ${ausgabe.seitenanzahl} Seiten`,
          layoutZusammenfassung: "Freigegeben durch Redaktion",
        }),
      });
    } catch (err) {
      console.error("Approve-Call fehlgeschlagen:", err.message);
    }
  }, [ausgaben, currentWorkspaceId]);

  const stats = {
    gesamt: ausgaben.length,
    freigegeben: ausgaben.filter(a => a.status === "approved").length,
    bereit: ausgaben.filter(a => a.status === "ready").length,
  };

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 26, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
            <Printer size={24} style={{ color: C.accent }} />
            Druckausgaben
          </h1>
          <p style={{ margin: "6px 0 0", color: C.textSoft, fontSize: 14 }}>
            KI-generierte Print-Layouts aus deinen Artikeln
          </p>
        </div>
        <button
          onClick={() => setShowNeueAusgabe(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.accent, color: "white", border: "none",
            borderRadius: T.rMd, padding: "10px 18px", cursor: "pointer",
            fontSize: 14, fontWeight: 500,
          }}
        >
          <Plus size={16} /> Neue Ausgabe
        </button>
      </div>

      {/* Stats Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Ausgaben gesamt", val: stats.gesamt, icon: BookOpen, color: C.accent },
          { label: "Bereit zur Prüfung", val: stats.bereit, icon: Eye, color: C.warning },
          { label: "Freigegeben", val: stats.freigegeben, icon: CheckCircle, color: C.success },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: T.rLg, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: T.rMd, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: FONT_DISPLAY }}>{val}</div>
              <div style={{ fontSize: 12, color: C.textSoft }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ausgaben-Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ausgaben.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.textSoft }}>
            <Printer size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: C.textMid }}>Noch keine Ausgaben</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Klicke "Neue Ausgabe" um zu starten</div>
          </div>
        )}
        {ausgaben.map(a => (
          <AusgabeKarte
            key={a.id}
            ausgabe={a}
            onPreview={setVorschau}
            onRegenerate={() => {}}
          />
        ))}
      </div>

      {/* Modals */}
      {showNeueAusgabe && (
        <NeueAusgabeDialog
          stories={stories}
          onGenerate={handleGenerate}
          onClose={() => setShowNeueAusgabe(false)}
        />
      )}
      {vorschau && (
        <PdfVorschauModal
          ausgabe={vorschau}
          onClose={() => setVorschau(null)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
