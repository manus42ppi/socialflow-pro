import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, Image as ImageIcon } from "lucide-react";
import { useBlockNoteEditor } from "@blocknote/react";
import { C, FONT } from "../../constants/colors.js";
import { fileToDataURL } from "../../utils/store.js";
import { useApp } from "../../context/AppContext.jsx";

interface MediaLibraryFilePanelProps {
  blockId: string;
}

export default function MediaLibraryFilePanel({ blockId }: MediaLibraryFilePanelProps) {
  const editor = useBlockNoteEditor();
  const { items, posts } = useApp();
  const [tab, setTab] = useState("library");
  const [hovId, setHovId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const images = useMemo(() => items.filter((i: any) => i.type === "image" && i.url), [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return images;
    const q = search.toLowerCase();
    return images.filter((i: any) => (i.name || "").toLowerCase().includes(q) || (i.tags || "").toLowerCase().includes(q));
  }, [images, search]);

  const usageMap = useMemo(() => {
    const map: Record<string, number> = {};
    posts.forEach((p: any) => { if (p.mediaId) map[p.mediaId] = (map[p.mediaId] || 0) + 1; });
    return map;
  }, [posts]);

  const handleSelect = (img: any) => {
    editor.updateBlock(blockId, { props: { url: img.url, name: img.name || "", caption: img.name || "" } });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataURL(file);
    editor.updateBlock(blockId, { props: { url, name: file.name, caption: "" } });
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
    }}>
      <div style={{
        background: C.surface, borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,.28)",
        width: "min(760px, 96vw)", maxHeight: "85vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Bild einfügen</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", background: C.bg, borderRadius: 8, padding: 2 }}>
              {[["library", "Medienbibliothek"], ["upload", "Hochladen"]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none",
                  background: tab === id ? C.accent : "transparent",
                  color: tab === id ? "#fff" : C.textMid,
                  cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 500,
                  fontFamily: FONT, transition: "background .15s",
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {tab === "library" ? (
          <>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Bilder suchen (Name, Tags)…"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8, boxSizing: "border-box",
                  border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                  fontSize: 13, fontFamily: FONT, outline: "none",
                }}
              />
            </div>
            <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.textMute, fontSize: 13 }}>
                  {images.length === 0
                    ? "Noch keine Bilder in der Medienbibliothek. Lade zuerst Bilder hoch."
                    : "Kein Bild gefunden."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {filtered.map((img: any) => {
                    const count = usageMap[img.id] || 0;
                    const isHov = hovId === img.id;
                    return (
                      <div key={img.id}
                        onClick={() => handleSelect(img)}
                        onMouseEnter={() => setHovId(img.id)}
                        onMouseLeave={() => setHovId(null)}
                        style={{
                          position: "relative", borderRadius: 10, overflow: "hidden",
                          cursor: "pointer", aspectRatio: "1/1",
                          outline: isHov ? `3px solid ${C.accent}` : "3px solid transparent",
                          transition: "outline .12s",
                        }}>
                        <img src={img.url} alt={img.name || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 50%)",
                          opacity: isHov ? 1 : 0, transition: "opacity .15s",
                          display: "flex", flexDirection: "column", justifyContent: "flex-end",
                          padding: "6px 8px",
                        }}>
                          {img.name && (
                            <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, lineHeight: 1.3,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {img.name}
                            </span>
                          )}
                        </div>
                        {count > 0 && (
                          <div style={{
                            position: "absolute", top: 6, left: 6,
                            background: "rgba(0,0,0,.7)", color: "#fff",
                            fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                            display: "flex", alignItems: "center", gap: 3,
                          }}>
                            <Check size={8} strokeWidth={3} /> {count}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              padding: "48px 64px", borderRadius: 12, border: `2px dashed ${C.border}`,
              cursor: "pointer", color: C.textMute, fontSize: 13, fontFamily: FONT,
              transition: "border-color .15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
              <ImageIcon size={36} strokeWidth={1.5} color={C.accent} />
              <span style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>Bild auswählen</span>
              <span style={{ fontSize: 12 }}>oder Datei hier ablegen</span>
              <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
