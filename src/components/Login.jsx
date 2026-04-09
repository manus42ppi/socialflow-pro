import { useState } from "react";
import { SignIn } from "@clerk/clerk-react";
import { Shield, Layers, ChevronDown, ChevronUp, BarChart2, Image, FileText } from "lucide-react";
import { C, T, CSS, FONT } from "../constants/colors.js";
import { DEMO_USERS, ROLES } from "../constants/demo.js";
import { Badge } from "./ui/index.jsx";

// ── Clerk appearance (CX Fusion: clean light) ─────────────────────────────────
const clerkAppearance = {
  variables: {
    colorPrimary:          T.brand600,
    colorBackground:       T.white,
    colorText:             T.gray900,
    colorTextSecondary:    T.gray500,
    colorInputBackground:  T.white,
    colorInputText:        T.gray900,
    colorDanger:           T.error600,
    colorSuccess:          T.success500,
    borderRadius:          "8px",
    spacingUnit:           "14px",
    fontFamily:            FONT,
  },
  elements: {
    rootBox:               { width: "100%" },
    card: {
      background: T.white,
      border:     `1px solid ${T.gray200}`,
      boxShadow:  T.shadowLg,
      borderRadius: "12px",
      width: "100%",
    },
    headerTitle:           { color: T.gray900, fontSize: "20px", fontWeight: "700" },
    headerSubtitle:        { color: T.gray500 },
    socialButtonsBlockButton: {
      background: T.white,
      border:     `1px solid ${T.gray300}`,
      color:      T.gray700,
      boxShadow:  T.shadowXs,
    },
    socialButtonsBlockButtonText: { color: T.gray700, fontWeight: "600" },
    dividerText:           { color: T.gray400, fontSize: "12px", fontWeight: "600" },
    dividerLine:           { background: T.gray200 },
    formFieldLabel:        { color: T.gray600, fontSize: "12px", fontWeight: "600", letterSpacing: ".04em" },
    formFieldInput: {
      background: T.white,
      border:     `1px solid ${T.gray300}`,
      color:      T.gray900,
      fontSize:   "14px",
    },
    formButtonPrimary: {
      background:  T.brand600,
      boxShadow:   `0 2px 8px rgba(7,93,242,0.20)`,
      fontWeight:  "600",
      fontSize:    "14px",
    },
    footerActionLink:      { color: T.brand600 },
    footerActionText:      { color: T.gray500 },
    identityPreviewText:   { color: T.gray900 },
    identityPreviewEditButton: { color: T.brand600 },
    alertText:             { color: T.error600 },
    formResendCodeLink:    { color: T.brand600 },
    otpCodeFieldInput: {
      background: T.white,
      border:     `1px solid ${T.gray300}`,
      color:      T.gray900,
    },
    logoBox:   { display: "none" },
    logoImage: { display: "none" },
  },
};

export default function Login({ onLogin }) {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: T.appBg,
      display: "flex", fontFamily: FONT,
    }}>
      <style>{CSS}</style>

      {/* ── Left: Branding panel ─────────────────────────────────────────────── */}
      <div style={{
        flex: "0 0 420px", background: T.brand600,
        display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "48px 40px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 240, height: 240, borderRadius: "50%",
          background: "rgba(255,255,255,.06)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -40,
          width: 180, height: 180, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", pointerEvents: "none",
        }} />

        {/* Logo */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
            <div style={{
              width: 38, height: 38, borderRadius: T.rMd,
              background: "rgba(255,255,255,.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Layers size={20} color="#fff" strokeWidth={1.7} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
              SocialFlow<span style={{
                marginLeft: 6, fontSize: 9, fontWeight: 800,
                background: "rgba(255,255,255,.25)", padding: "2px 6px",
                borderRadius: 4, letterSpacing: ".05em", verticalAlign: "middle",
              }}>PRO</span>
            </span>
          </div>

          <h1 style={{
            fontSize: 28, fontWeight: 700, color: "#fff",
            letterSpacing: "-.02em", lineHeight: 1.3, margin: "0 0 16px",
          }}>
            Dein Social Media<br />Command Center
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.65)", lineHeight: 1.6, margin: 0 }}>
            Plane, erstelle und analysiere alle Inhalte für deine sozialen Kanäle – an einem Ort.
          </p>
        </div>

        {/* Feature highlights */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { I: FileText,  label: "Content planen & publizieren" },
            { I: Image,     label: "KI-gestützte Medienbibliothek" },
            { I: BarChart2, label: "Performance & Analytics" },
          ].map(({ I, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: T.rSm,
                background: "rgba(255,255,255,.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <I size={16} color="#fff" strokeWidth={1.7} />
              </div>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,.8)", fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
          © 2026 SocialFlow Pro
        </div>
      </div>

      {/* ── Right: Login form ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px", overflowY: "auto",
      }}>
        <div style={{
          width: "100%", maxWidth: 440,
          animation: "fadeUp .35s ease",
        }}>
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T.gray900, margin: "0 0 6px", letterSpacing: "-.01em" }}>
              Willkommen zurück
            </h2>
            <p style={{ fontSize: 14, color: T.gray500, margin: 0 }}>
              Melde dich an, um weiterzumachen
            </p>
          </div>

          {/* Clerk SignIn */}
          <SignIn routing="virtual" appearance={clerkAppearance} />

          {/* Demo Credentials */}
          <div style={{
            marginTop: 16, background: T.white,
            borderRadius: T.rLg, border: `1px solid ${T.gray200}`,
            boxShadow: T.shadowXs, overflow: "hidden",
          }}>
            <button
              onClick={() => setShowDemo(s => !s)}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 6, padding: "12px 16px", color: T.gray600,
                fontSize: 13, fontWeight: 600, fontFamily: FONT,
                transition: "background .1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray50}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={14} strokeWidth={1.7} color={T.brand600} />
                Demo-Zugänge (ohne Account)
              </span>
              {showDemo
                ? <ChevronUp size={14} color={T.gray400} />
                : <ChevronDown size={14} color={T.gray400} />}
            </button>

            {showDemo && (
              <div style={{
                padding: "0 12px 12px",
                borderTop: `1px solid ${T.gray100}`,
              }}>
                <div style={{ fontSize: 12, color: T.gray400, padding: "10px 4px 8px" }}>
                  Klicken zum Sofort-Login — kein Passwort nötig
                </div>
                {DEMO_USERS.map(u => (
                  <div
                    key={u.id}
                    onClick={() => onLogin(u)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "9px 12px", borderRadius: T.rMd, cursor: "pointer", marginBottom: 4,
                      background: T.gray50, border: `1px solid ${T.gray200}`,
                      transition: "background .12s, border-color .12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.brand25; e.currentTarget.style.borderColor = T.brand300; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.gray50; e.currentTarget.style.borderColor = T.gray200; }}
                  >
                    <span style={{ color: T.brand600, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                      {u.email}
                    </span>
                    <Badge color={ROLES[u.role].color} bg={`${ROLES[u.role].color}18`}>
                      {ROLES[u.role].label}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
