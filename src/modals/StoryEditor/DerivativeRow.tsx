import { useState } from "react";
import { Check, Loader, Wand2 } from "lucide-react";
import { C, FONT, IW } from "../../constants/colors.js";
import ChIco from "../../components/ui/ChIco.jsx";

// CH_ANGLE is kept here because it only relates to derivative display
const CH_ANGLE: Record<string, string> = {
  instagram: "Visueller Hook + kurze, emotionale Caption + Hashtags",
  twitter:   "Kernaussage als prägnanter Tweet, unter 280 Zeichen",
  linkedin:  "Professioneller Kontext, Mehrwert, 3–5 Absätze",
  facebook:  "Erzählerisch, Gemeinschaftsgefühl, Frage am Ende",
  whatsapp:  "Persönlich, direkt, kurze Nachricht",
  website:   "Vollständiger Artikel mit Einleitung, Hauptteil, Fazit",
  print:     "Druckreifer Artikel, Blocksatz, Quellen, Bildunterschriften",
};

interface Channel {
  id: string;
  label: string;
}

interface Derivative {
  id: string;
  channel: string;
  postId: string;
  createdAt: string;
}

interface DerivativeRowProps {
  channel: Channel;
  derivative?: Derivative;
  onCreate: (chId: string) => void;
  hasContent: boolean;
  loading: boolean;
}

export default function DerivativeRow({ channel, derivative, onCreate, hasContent, loading }: DerivativeRowProps) {
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
