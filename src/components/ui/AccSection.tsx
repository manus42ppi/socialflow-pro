import { ChevronDown } from "lucide-react";
import { T, FONT } from "../../constants/colors.js";

interface AccSectionProps {
  label: string;
  open?: boolean;
  isOpen?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: number | string | null;
  badgeWarn?: boolean;
}

export default function AccSection({ label, badge, badgeWarn, isOpen, open, onToggle, children }: AccSectionProps) {
  const expanded = isOpen ?? open ?? false;
  return (
    <div style={{ borderBottom: `1px solid ${T.gray100}` }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          padding: "8px 14px", border: "none", cursor: "pointer",
          background: T.gray50, gap: 6, fontFamily: FONT, boxSizing: "border-box",
          borderBottom: expanded ? `1px solid ${T.gray100}` : "none",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = T.gray100)}
        onMouseLeave={e => (e.currentTarget.style.background = T.gray50)}
      >
        <ChevronDown
          size={12} strokeWidth={2.5} color={T.gray400}
          style={{ transition: "transform .18s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }}
        />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: T.gray500, textTransform: "uppercase", letterSpacing: ".06em", textAlign: "left" }}>
          {label}
        </span>
        {badge != null && (
          <span style={{
            background: badgeWarn ? T.error600 : T.brand100,
            color: badgeWarn ? T.white : T.brand600,
            borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 6px", flexShrink: 0,
          }}>{badge}</span>
        )}
      </button>
      {expanded && (
        <div style={{ padding: "10px 14px 12px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
