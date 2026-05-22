import { X } from "lucide-react";
import { C, FONT } from "../../constants/colors.js";

interface MediaItem {
  id: string;
  type: string;
  url: string;
  name?: string;
}

interface ImagePickerProps {
  items: MediaItem[];
  onSelect: (img: MediaItem) => void;
  onClose: () => void;
}

export default function ImagePicker({ items, onSelect, onClose }: ImagePickerProps) {
  const images = items.filter(i => i.type === "image" && i.url);
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, width: 520, maxHeight: 480, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: C.text }}>Bild aus Medienbibliothek wählen</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMute }}><X size={18} strokeWidth={2} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: 16 }}>
          {images.length === 0 ? (
            <p style={{ textAlign: "center", color: C.textMute, fontFamily: FONT, fontSize: 13, padding: "24px 0" }}>Keine Bilder in der Medienbibliothek.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {images.map(img => (
                <div key={img.id} onClick={() => onSelect(img)}
                  style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2px solid transparent`, transition: "border-color .12s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}>
                  <img src={img.url} alt={img.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
