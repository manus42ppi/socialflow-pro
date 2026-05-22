import { T, FONT } from "../../constants/colors.js";
import AccSection from "../../components/ui/AccSection.js";

interface HistoryEntry {
  id: string;
  savedAt: string;
  savedBy: string;
  wordCount: number;
  title: string;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function HistoryPanel({ history, isOpen, onToggle }: HistoryPanelProps) {
  return (
    <AccSection label="Verlauf" isOpen={isOpen} onToggle={onToggle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(history || []).length === 0 ? (
          <p style={{ color: T.gray400, fontSize: 12, fontFamily: FONT, textAlign: "center", padding: "4px 0" }}>Noch keine gespeicherten Versionen.</p>
        ) : (
          [...history].reverse().map((h, i) => (
            <div key={h.id} style={{ background: i === 0 ? T.brand50 : T.gray50, borderRadius: 8, padding: "8px 10px", border: `1px solid ${i === 0 ? T.brand200 : T.gray100}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? T.brand600 : T.gray700, fontFamily: FONT }}>
                {new Date(h.savedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })} · {new Date(h.savedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ fontSize: 11, color: T.gray400, fontFamily: FONT, marginTop: 2 }}>{h.savedBy} · {h.wordCount} Wörter</div>
            </div>
          ))
        )}
      </div>
    </AccSection>
  );
}
