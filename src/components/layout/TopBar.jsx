import { Bell, Search } from "lucide-react";
import { C, T, FONT, IW } from "../../constants/colors.js";
import { Btn } from "../ui/index.jsx";
import { useApp } from "../../context/AppContext.jsx";

// ── TopBar (CX Fusion) ────────────────────────────────────────────────────────
// Höhe: 60px | Hintergrund: weiß | Rand unten: gray-200

export default function TopBar({ title }) {
  const { newPost: onNew } = useApp();
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

      {/* New post button */}
      <Btn onClick={onNew} size="md" style={{ gap: 6 }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 1v11M1 6.5h11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Neuer Post
      </Btn>
    </div>
  );
}
