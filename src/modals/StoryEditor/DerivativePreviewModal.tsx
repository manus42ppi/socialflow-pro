import { useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { C, FONT } from "../../constants/colors.js";
import ChIco from "../../components/ui/ChIco.jsx";

const CH_LIMITS: Record<string, number> = {
  instagram: 2200, twitter: 280, linkedin: 1300,
  facebook: 500, whatsapp: 800, website: 100000, print: 100000,
};

interface Channel {
  id: string;
  label: string;
}

interface DerivativePreviewModalProps {
  chId: string;
  channel: Channel;
  initialContent: string;
  onConfirm: (text: string) => void;
  onDiscard: () => void;
}

export default function DerivativePreviewModal({ chId, channel, initialContent, onConfirm, onDiscard }: DerivativePreviewModalProps) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <ChIco id={chId} size={18} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{channel.label} – Entwurf prüfen</div>
            <div style={{ fontSize: 11, color: C.textMute }}>Bearbeite den Text bevor du ihn als Post speicherst.</div>
          </div>
        </div>
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
