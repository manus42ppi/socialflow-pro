import { useState, useRef, useEffect } from "react";
import { Bell, Search, BookOpen, Send } from "lucide-react";
import { C, T, FONT, IW } from "../../constants/colors.js";
import { Btn } from "../ui/index.jsx";
import { useApp } from "../../context/AppContext.jsx";

// ── TopBar (CX Fusion) ────────────────────────────────────────────────────────
// Höhe: 60px | Hintergrund: weiß | Rand unten: gray-200
//
// Kontext-bewusster CTA:
//   /content → "+ Neuer Inhalt" mit TypePicker (Artikel | Post)
//   alle anderen Seiten → "+ Neuer Post" (direkt)

export default function TopBar({ title }) {
  const {
    nav,
    newPost: onNew,
    newStory: onNewStory,
    currentWorkspaceId, userWorkspaces,
  } = useApp();

  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  // Schließen bei Außenklick
  useEffect(() => {
    if (!showPicker) return;
    const close = e => { if (!pickerRef.current?.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showPicker]);

  const isContent = nav === "content";
  const noWs = !currentWorkspaceId && userWorkspaces?.length > 1;

  return (
    <div style={{
      height: 60, background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center",
      padding: "0 24px", gap: 10, flexShrink: 0,
      boxShadow: T.shadowXs,
    }}>
      {/* Page title */}
      <div style={{
        fontSize: 18, fontWeight: 700, color: T.gray900,
        letterSpacing: "-.01em", fontFamily: FONT,
        whiteSpace: "nowrap",
      }}>
        {title}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: T.gray100, border: `1px solid transparent`,
        borderRadius: T.rMd, padding: "0 12px",
        height: 36, width: 220, cursor: "text",
        transition: "border-color .15s, background .15s",
        fontSize: 14, color: T.gray400, fontFamily: FONT,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = T.white; e.currentTarget.style.borderColor = T.gray300; }}
        onMouseLeave={e => { e.currentTarget.style.background = T.gray100; e.currentTarget.style.borderColor = "transparent"; }}
      >
        <Search size={15} color={T.gray400} strokeWidth={IW} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Suchen…
        </span>
        <span style={{ fontSize: 11, color: T.gray300, flexShrink: 0 }}>⌘K</span>
      </div>

      {/* Notification bell */}
      <button style={{
        width: 36, height: 36, borderRadius: T.rMd,
        border: `1px solid ${T.gray200}`, background: "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: T.gray500, transition: "all .15s",
        position: "relative",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = T.gray100; e.currentTarget.style.borderColor = T.gray300; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = T.gray200; }}
      >
        <Bell size={16} strokeWidth={IW} />
      </button>

      {/* CTA — kontext-abhängig ─────────────────────────────────────────────── */}
      <div
        ref={pickerRef}
        style={{ position: "relative" }}
        title={noWs ? "Bitte zuerst einen Mandanten wählen" : undefined}
      >
        <Btn
          variant="outline"
          onClick={noWs ? undefined : (isContent ? () => setShowPicker(p => !p) : onNew)}
          size="md"
          style={{ gap: 6, opacity: noWs ? 0.45 : 1, cursor: noWs ? "not-allowed" : "pointer" }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {isContent ? "Neuer Inhalt" : "Neuer Post"}
        </Btn>

        {/* TypePicker — nur auf /content ──────────────────────────────────── */}
        {isContent && showPicker && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 300,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 8, boxShadow: T.shadowLg, minWidth: 260,
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {[
              {
                label: "Neuer Artikel",
                sub: "Langer Inhalt · BlockNote · SEO · Varianten",
                Icon: BookOpen, color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE",
                action: () => { onNewStory(); setShowPicker(false); },
              },
              {
                label: "Neuer Post",
                sub: "Social Media · Channel-Previews · KI-Assistent",
                Icon: Send, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0",
                action: () => { onNew(); setShowPicker(false); },
              },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={opt.action}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "9px 11px", borderRadius: 8, border: "none",
                  background: "transparent", cursor: "pointer", textAlign: "left",
                  fontFamily: FONT, transition: "background .1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: opt.bg, border: `1.5px solid ${opt.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <opt.Icon size={15} color={opt.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMute, lineHeight: 1.4 }}>
                    {opt.sub}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
