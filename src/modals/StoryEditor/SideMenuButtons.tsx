import { useRef } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { useStore } from "@tanstack/react-store";
import { FONT } from "../../constants/colors.js";
import { ADD_BLOCK_TYPES } from "./BlockPickerPortal.js";

export function useSideMenuBlock() {
  const editor = useBlockNoteEditor();
  const ext = editor.getExtension(SideMenuExtension);
  return { editor, block: useStore(ext.store, (s: any) => s?.block) };
}

export function AddBlockButton() {
  const { editor, block } = useSideMenuBlock();
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleBtnMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!block || !editor._blockPicker) return;
    editor._blockPicker(block, btnRef.current?.getBoundingClientRect(), "insert");
  };

  return (
    <button ref={btnRef} onMouseDown={handleBtnMouseDown} title="Block einfügen"
      style={{
        width:22, height:22, borderRadius:5, flexShrink:0,
        border:"1px solid #e5e7eb", background:"white", color:"#6b7280",
        fontSize:15, fontWeight:600, lineHeight:"20px", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .12s", fontFamily:FONT,
      }}
      onMouseEnter={e => { e.currentTarget.style.background="#f9fafb"; e.currentTarget.style.borderColor="#d1d5db"; e.currentTarget.style.color="#374151"; }}
      onMouseLeave={e => { e.currentTarget.style.background="white"; e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#6b7280"; }}
    >+</button>
  );
}

export function BlockTypeButton() {
  const { editor, block } = useSideMenuBlock();
  const btnRef = useRef<HTMLButtonElement>(null);

  const typeMatch = ADD_BLOCK_TYPES.find(bt =>
    bt.type === block?.type && ((bt as any).lv ? (bt as any).lv === block?.props?.level : true)
  );
  const icon = typeMatch?.icon ?? "¶";

  const handleBtnMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!block || !editor._blockPicker) return;
    editor._blockPicker(block, btnRef.current?.getBoundingClientRect(), "convert");
  };

  return (
    <button ref={btnRef} onMouseDown={handleBtnMouseDown} title="Block-Typ ändern"
      style={{
        width:22, height:22, borderRadius:5, flexShrink:0,
        border:"1px solid #e5e7eb", background:"white", color:"#6b7280",
        fontSize:10, fontWeight:700, lineHeight:"20px", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .12s", fontFamily:FONT,
      }}
      onMouseEnter={e => { e.currentTarget.style.background="#f9fafb"; e.currentTarget.style.borderColor="#d1d5db"; e.currentTarget.style.color="#374151"; }}
      onMouseLeave={e => { e.currentTarget.style.background="white"; e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#6b7280"; }}
    >{icon}</button>
  );
}
