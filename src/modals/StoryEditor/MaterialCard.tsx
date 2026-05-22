import { X, Link as LinkIcon, StickyNote, Image as ImageIcon } from "lucide-react";
import { C, FONT, IW } from "../../constants/colors.js";

interface Material {
  id: string;
  type: "link" | "note" | "image";
  url: string;
  title?: string;
}

interface MaterialCardProps {
  mat: Material;
  onRemove: (id: string) => void;
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
}

export default function MaterialCard({ mat, onRemove }: MaterialCardProps) {
  if (mat.type === "image") {
    return (
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        overflow: "hidden", position: "relative",
      }}>
        {mat.url && (
          <img src={mat.url} alt={mat.title || ""}
            style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
        )}
        <div style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <ImageIcon size={11} strokeWidth={IW} color={C.textMute} />
          <span style={{ fontSize: 11, color: C.textMid, fontFamily: FONT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mat.title || "Bild"}
          </span>
          <button onClick={() => onRemove(mat.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute, padding: 2 }}>
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  const isLink = mat.type === "link";
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start",
    }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        {isLink
          ? <LinkIcon size={13} strokeWidth={IW} color={C.accent} />
          : <StickyNote size={13} strokeWidth={IW} color="#F59E0B" />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: isLink ? C.accent : C.text,
          fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {isLink ? (
            <a href={mat.url} target="_blank" rel="noopener noreferrer"
              style={{ color: C.accent, textDecoration: "none" }}
              onClick={e => e.stopPropagation()}>
              {mat.title || mat.url}
            </a>
          ) : mat.title}
        </div>
        {isLink && (
          <div style={{ fontSize: 10, color: C.textMute, fontFamily: FONT, marginTop: 1 }}>
            {getDomain(mat.url)}
          </div>
        )}
      </div>
      <button onClick={() => onRemove(mat.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute, padding: 2, flexShrink: 0 }}>
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  );
}
