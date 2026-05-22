import { useState } from "react";
import { Link as LinkIcon, StickyNote, Image as ImageIcon } from "lucide-react";
import { T, FONT, IW } from "../../constants/colors.js";
import AccSection from "../../components/ui/AccSection.js";
import ImagePicker from "./ImagePicker.js";
import MaterialCard from "./MaterialCard.js";

interface Material {
  id: string;
  type: "link" | "note" | "image";
  url: string;
  title?: string;
}

interface MediaItem {
  id: string;
  type: string;
  url: string;
  name?: string;
}

interface MaterialsPanelProps {
  materials: Material[];
  items: MediaItem[];
  onAddLink: (url: string, title: string) => void;
  onAddNote: (text: string) => void;
  onAddImage: (img: any) => void;
  onRemove: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function MaterialsPanel({
  materials, items,
  onAddLink, onAddNote, onAddImage, onRemove,
  isOpen, onToggle,
}: MaterialsPanelProps) {
  const [linkInput, setLinkInput] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    onAddLink(url, linkTitle.trim());
    setLinkInput(""); setLinkTitle(""); setAddingLink(false);
  };

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    onAddNote(noteInput.trim());
    setNoteInput(""); setAddingNote(false);
  };

  const handleSelectImage = (img: any) => {
    onAddImage(img);
    setShowImagePicker(false);
  };

  return (
    <>
      {showImagePicker && (
        <ImagePicker items={items} onSelect={handleSelectImage} onClose={() => setShowImagePicker(false)} />
      )}
      <AccSection
        label="Materialien"
        badge={materials.length > 0 ? materials.length : null}
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {addingLink ? (
            <div style={{ background: T.gray50, border: `1px solid ${T.brand200}`, borderRadius: 9, padding: 12 }}>
              <input autoFocus value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddLink(); if (e.key === "Escape") setAddingLink(false); }}
                placeholder="https://…"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 6 }}
              />
              <input value={linkTitle}
                onChange={e => setLinkTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddLink(); }}
                placeholder="Titel (optional)"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleAddLink} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: T.brand600, color: T.white, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Hinzufügen</button>
                <button onClick={() => { setAddingLink(false); setLinkInput(""); setLinkTitle(""); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT }}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingLink(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
              <LinkIcon size={12} strokeWidth={IW} /> Link hinzufügen
            </button>
          )}
          {addingNote ? (
            <div style={{ background: T.gray50, border: `1px solid #F59E0B44`, borderRadius: 9, padding: 12 }}>
              <textarea autoFocus value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleAddNote(); if (e.key === "Escape") setAddingNote(false); }}
                placeholder="Notiz, Idee oder Quellenangabe…"
                rows={3}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, fontSize: 12, fontFamily: FONT, outline: "none", boxSizing: "border-box", resize: "none", marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleAddNote} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Speichern</button>
                <button onClick={() => { setAddingNote(false); setNoteInput(""); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT }}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingNote(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
              <StickyNote size={12} strokeWidth={IW} /> Notiz hinzufügen
            </button>
          )}
          <button onClick={() => setShowImagePicker(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: `1px dashed ${T.gray200}`, background: "transparent", color: T.gray500, cursor: "pointer", fontSize: 12, fontFamily: FONT, width: "100%" }}>
            <ImageIcon size={12} strokeWidth={IW} /> Bild hinzufügen
          </button>
          {materials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4px 0 2px", color: T.gray400, fontSize: 11, fontFamily: FONT }}>Noch keine Materialien.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
              {materials.map((mat: Material) => <MaterialCard key={mat.id} mat={mat} onRemove={onRemove} />)}
            </div>
          )}
        </div>
      </AccSection>
    </>
  );
}
