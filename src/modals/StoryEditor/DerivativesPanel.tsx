import { T, FONT } from "../../constants/colors.js";
import { STORY_CHANNELS } from "../../constants/demo.js";
import AccSection from "../../components/ui/AccSection.js";
import DerivativeRow from "./DerivativeRow.js";

interface Derivative {
  id: string;
  channel: string;
  postId: string;
  createdAt: string;
}

interface DerivativesPanelProps {
  derivatives: Derivative[];
  targetChannels: string[];
  hasContent: boolean;
  deriving: Record<string, boolean>;
  onCreate: (chId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function DerivativesPanel({
  derivatives, targetChannels, hasContent, deriving,
  onCreate, isOpen, onToggle,
}: DerivativesPanelProps) {
  return (
    <AccSection
      label="Varianten"
      badge={derivatives.length > 0 ? derivatives.length : null}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {!hasContent && (
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#F59E0B", fontFamily: FONT, lineHeight: 1.5 }}>
            Schreibe zuerst Inhalt im Editor.
          </p>
        )}
        {(targetChannels.length > 0
          ? STORY_CHANNELS.filter((c: any) => targetChannels.includes(c.id))
          : STORY_CHANNELS
        ).map((ch: any) => {
          const derivative = derivatives.find(d => d.channel === ch.id);
          return (
            <DerivativeRow key={ch.id} channel={ch} derivative={derivative}
              onCreate={onCreate} hasContent={hasContent} loading={!!deriving[ch.id]} />
          );
        })}
        {targetChannels.length === 0 && (
          <p style={{ margin: "6px 0 0", fontSize: 10, color: T.gray400, fontFamily: FONT, textAlign: "center" }}>
            Wähle Ziel-Kanäle um die Auswahl einzugrenzen.
          </p>
        )}
      </div>
    </AccSection>
  );
}
