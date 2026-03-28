import { useState } from "react";
import { SignIn } from "@clerk/clerk-react";
import { Shield, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { C, CSS } from "../constants/colors.js";
import { FONT, FONT_DISPLAY } from "../constants/colors.js";
import { DEMO_USERS, ROLES } from "../constants/demo.js";
import { Badge } from "./ui/index.jsx";

// Clerk appearance: dark glassmorphism matching our design
const clerkAppearance = {
  variables: {
    colorPrimary: "#5B5BD6",
    colorBackground: "transparent",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.5)",
    colorInputBackground: "rgba(255,255,255,0.07)",
    colorInputText: "#ffffff",
    colorDanger: "#fc8181",
    colorSuccess: "#30A46C",
    borderRadius: "10px",
    spacingUnit: "14px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    card: {
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      borderRadius: "18px",
      width: "100%",
    },
    headerTitle: { color: "#fff", fontSize: "20px", fontWeight: "700" },
    headerSubtitle: { color: "rgba(255,255,255,0.4)" },
    socialButtonsBlockButton: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#fff",
    },
    socialButtonsBlockButtonText: { color: "#fff", fontWeight: "600" },
    dividerText: { color: "rgba(255,255,255,0.35)", fontSize: "11px", fontWeight: "600", letterSpacing: ".03em" },
    dividerLine: { background: "rgba(255,255,255,0.1)" },
    formFieldLabel: { color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: "700", letterSpacing: ".06em" },
    formFieldInput: {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#fff",
      fontSize: "13px",
    },
    formFieldInputShowPasswordButton: { color: "rgba(255,255,255,0.4)" },
    formButtonPrimary: {
      background: "linear-gradient(135deg,#5B5BD6,#4444b8)",
      boxShadow: "0 4px 20px rgba(91,91,214,0.2)",
      fontWeight: "700",
      fontSize: "14px",
    },
    footerActionLink: { color: "#5B5BD6" },
    footerActionText: { color: "rgba(255,255,255,0.35)" },
    identityPreviewText: { color: "#fff" },
    identityPreviewEditButton: { color: "#5B5BD6" },
    formHeaderTitle: { color: "#fff" },
    alertText: { color: "#fc8181" },
    alertTextDanger: { color: "#fc8181" },
    formResendCodeLink: { color: "#5B5BD6" },
    otpCodeFieldInput: {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#fff",
    },
    logoBox: { display: "none" },
    logoImage: { display: "none" },
  },
};

export default function Login({ onLogin }) {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 50%,#1a0e2e 0%,#0A0C10 50%,#0d1420 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT, padding: 16,
    }}>
      <style>{CSS}</style>
      {/* Subtle glow overlays */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle at 80% 20%,${C.accent}08 0%,transparent 50%),radial-gradient(circle at 20% 80%,${C.purple}0A 0%,transparent 50%)`,
      }}/>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)",
        backgroundSize: "44px 44px",
      }}/>

      <div style={{ width: "100%", maxWidth: 460, animation: "fadeUp .45s ease", position: "relative", zIndex: 1 }}>

        {/* Logo header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 15,
              background: `linear-gradient(135deg,${C.accent},#8b00d6)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 32px ${C.accentGlow}`,
            }}>
              <Layers size={24} color="#fff" strokeWidth={1.5}/>
            </div>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-.03em" }}>
              SocialFlow
            </span>
          </div>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13.5, margin: 0, letterSpacing: ".01em" }}>
            Dein Social Media Command Center
          </p>
        </div>

        {/* Clerk embedded SignIn */}
        <SignIn
          routing="hash"
          appearance={clerkAppearance}
          forceRedirectUrl={window.location.origin + window.location.pathname}
        />

        {/* Demo Credentials (collapsible) */}
        <div style={{
          marginTop: 14, background: "rgba(255,255,255,.04)",
          borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden",
        }}>
          <button
            onClick={() => setShowDemo(s => !s)}
            style={{
              width: "100%", background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 6, padding: "10px 14px", color: "rgba(255,255,255,.35)",
              fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", fontFamily: FONT,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Shield size={10} strokeWidth={2}/>DEMO-ZUGÄNGE (ohne Account)
            </span>
            {showDemo ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          {showDemo && (
            <div style={{ padding: "0 14px 12px" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginBottom: 8 }}>
                Klicken zum Sofort-Login — kein Passwort nötig
              </div>
              {DEMO_USERS.map(u => (
                <div
                  key={u.id}
                  onClick={() => onLogin(u)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.09)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.04)"}
                >
                  <span style={{ color: "#7dd3fc", fontFamily: "monospace", fontSize: 12 }}>{u.email}</span>
                  <Badge color={ROLES[u.role].color}>{ROLES[u.role].label}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
