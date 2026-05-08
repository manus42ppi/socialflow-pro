import { useState } from "react";
import { ArrowUp, ArrowDown, CheckCircle, FileText, Clock, Globe } from "lucide-react";
import { C, T, FONT, IW } from "../../constants/colors.js";

// ── UI PRIMITIVES (CX Fusion Design System) ───────────────────────────────────
// Alle Basis-Komponenten sind hier zentralisiert.
// Styling-Änderungen an Buttons, Badges, Cards etc. → nur hier anpassen.

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Sp({ color = "#fff" }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      border: `2px solid ${color}40`, borderTopColor: color,
      animation: "spin .7s linear infinite", flexShrink: 0,
    }} />
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ initials, imageUrl, size = 32, color = C.accent }) {
  if (imageUrl) return (
    <img src={imageUrl} alt={initials || "Avatar"} style={{
      width: size, height: size, borderRadius: "50%", objectFit: "cover",
      flexShrink: 0, border: `1.5px solid ${T.gray200}`,
    }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg,${color},${color}cc)`,
      color: "#fff", display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700,
      fontSize: size * 0.36, flexShrink: 0,
      border: `1.5px solid ${color}30`,
    }}>
      {initials}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
// Generischer Badge (Farbe frei wählbar)
export function Badge({ color, bg, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: bg || T.gray100, color: color || T.gray600,
      fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 20, whiteSpace: "nowrap", letterSpacing: ".01em",
    }}>
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
// Varianten: primary | secondary | ghost | danger | success | ai
// Größen: sm | md
export function Btn({ children, variant = "primary", size = "md", onClick, disabled = false, style = {} }) {
  const V = {
    primary: {
      background: C.accent, color: "#fff", border: "none",
      boxShadow: T.shadowXs,
    },
    secondary: {
      background: T.white, color: T.gray700,
      border: `1px solid ${T.gray300}`, boxShadow: T.shadowXs,
    },
    ghost: {
      background: "transparent", color: T.gray600, border: "none",
    },
    danger: {
      background: T.errorBg, color: T.error600,
      border: `1px solid #FECACA`,
    },
    success: {
      background: T.successBg, color: T.success500,
      border: `1px solid #A7F3D0`,
    },
    ai: {
      background: `linear-gradient(135deg,${C.ai1},${C.ai2})`,
      color: "#fff", border: "none",
      boxShadow: `0 2px 12px ${C.purpleGlow}`,
    },
  };
  const P = { sm: "0 12px", md: "0 14px" };
  const H = { sm: 34, md: 38 };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: P[size] || P.md, height: H[size] || H.md,
        borderRadius: T.rMd, fontWeight: 600,
        fontSize: size === "sm" ? 13 : 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background-color .15s, border-color .15s, box-shadow .15s",
        fontFamily: FONT, whiteSpace: "nowrap",
        ...V[variant], ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return;
        if (variant === "primary") e.currentTarget.style.background = C.accentHov;
        if (variant === "secondary") e.currentTarget.style.background = T.gray100;
      }}
      onMouseLeave={e => {
        if (disabled) return;
        if (variant === "primary") e.currentTarget.style.background = C.accent;
        if (variant === "secondary") e.currentTarget.style.background = T.white;
      }}
    >
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface, borderRadius: T.rLg,
        border: `1px solid ${C.border}`, boxShadow: T.shadowSm,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Form Label ────────────────────────────────────────────────────────────────
export function FL({ children }) {
  return (
    <label style={{
      fontSize: 12, fontWeight: 600, color: T.gray500,
      display: "block", marginBottom: 5, letterSpacing: ".03em",
      textTransform: "uppercase",
    }}>
      {children}
    </label>
  );
}

// ── Text Input ────────────────────────────────────────────────────────────────
export function TIn({ label, icon: Icon, textarea = false, minH, ...props }) {
  const base = {
    width: "100%", padding: Icon ? "9px 12px 9px 36px" : "9px 12px",
    borderRadius: T.rMd, border: `1px solid ${T.gray300}`,
    fontSize: 14, outline: "none", color: C.text, background: C.surface,
    boxSizing: "border-box", fontFamily: FONT, transition: "border-color .15s, box-shadow .15s",
    ...props.style,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <FL>{label}</FL>}
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon
            size={15} color={T.gray400} strokeWidth={IW}
            style={{
              position: "absolute", left: 11,
              top: textarea ? 11 : "50%",
              transform: textarea ? "none" : "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
        )}
        {textarea
          ? <textarea {...props} style={{ ...base, minHeight: minH || 90, resize: "vertical" }}
              onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`; }}
              onBlur={e => { e.target.style.borderColor = T.gray300; e.target.style.boxShadow = "none"; }}
            />
          : <input {...props} style={base}
              onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`; }}
              onBlur={e => { e.target.style.borderColor = T.gray300; e.target.style.boxShadow = "none"; }}
            />
        }
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
// Semantische Status-Badges für Posts
export function SBadge({ status }) {
  const M = {
    scheduled: { color: T.success500,  bg: T.successBg,  label: "Geplant",  I: CheckCircle },
    draft:     { color: T.gray600,     bg: T.gray100,    label: "Entwurf",  I: FileText },
    pending:   { color: T.warning500,  bg: T.warningBg,  label: "Freigabe", I: Clock },
    published: { color: T.brand600,    bg: T.brand100,   label: "Live",     I: Globe },
  };
  const m = M[status] || M.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: m.bg, color: m.color,
      fontSize: 11, fontWeight: 600, padding: "3px 9px",
      borderRadius: 20, letterSpacing: ".01em",
    }}>
      <m.I size={10} strokeWidth={2.5} />
      {m.label}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
// Kennzahlen-Karte mit Icon, Wert, Delta und optionalem Click-Handler
export function SCrd({ icon: Icon, label, value, delta, color, onClick }) {
  const clr = color || C.accent;
  return (
    <Card
      style={{
        padding: "18px 20px 16px", cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .15s, transform .15s",
        userSelect: "none", overflow: "hidden", position: "relative",
      }}
      onClick={onClick}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = T.shadowLg;
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = T.shadowSm;
          e.currentTarget.style.transform = "";
        }
      }}
    >
      {/* Decorative background circle */}
      <div style={{
        position: "absolute", top: -12, right: -12, width: 72, height: 72,
        borderRadius: "50%", background: `${clr}08`, pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: T.rMd,
          background: `${clr}12`, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={17} color={clr} strokeWidth={IW} />
        </div>
        {/* Delta badge */}
        {delta !== undefined && (
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            fontSize: 12, fontWeight: 600,
            color: delta >= 0 ? T.success500 : T.error600,
            background: delta >= 0 ? T.successBg : T.errorBg,
            padding: "2px 7px", borderRadius: 20,
          }}>
            {delta >= 0
              ? <ArrowUp size={11} strokeWidth={2.5} />
              : <ArrowDown size={11} strokeWidth={2.5} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div style={{
        marginTop: 12, fontFamily: FONT, fontSize: 26,
        fontWeight: 700, color: C.text, letterSpacing: "-.03em",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 500, color: C.textSoft,
        marginTop: 2, display: "flex", alignItems: "center",
      }}>
        {label}
        {onClick && <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMute }}>→</span>}
      </div>
    </Card>
  );
}
