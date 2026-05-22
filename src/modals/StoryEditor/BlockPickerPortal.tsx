import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FONT } from "../../constants/colors.js";

export const ADD_BLOCK_TYPES = [
  // Text
  { type:"paragraph",        label:"Text",          icon:"¶",   group:"Text"  },
  { type:"heading", lv:1,    label:"Überschrift 1", icon:"H1",  group:"Text"  },
  { type:"heading", lv:2,    label:"Überschrift 2", icon:"H2",  group:"Text"  },
  { type:"heading", lv:3,    label:"Überschrift 3", icon:"H3",  group:"Text"  },
  { type:"quote",            label:"Zitat",         icon:"❝",   group:"Text"  },
  // Listen
  { type:"bulletListItem",   label:"Aufzählung",    icon:"•",   group:"Liste" },
  { type:"numberedListItem", label:"Nummeriert",    icon:"1.",  group:"Liste" },
  { type:"checkListItem",    label:"Aufgabe",       icon:"☐",   group:"Liste" },
  { type:"toggleListItem",   label:"Aufklapper",    icon:"▸",   group:"Liste" },
  // Medien
  { type:"image",            label:"Bild",          icon:"🖼",  group:"Medien"},
  { type:"video",            label:"Video",         icon:"▶",   group:"Medien"},
  { type:"audio",            label:"Audio",         icon:"♪",   group:"Medien"},
  { type:"file",             label:"Datei",         icon:"📎",  group:"Medien"},
  // Sonstiges
  { type:"table",            label:"Tabelle",       icon:"⊞",   group:"Extra" },
  { type:"codeBlock",        label:"Code",          icon:"</>", group:"Extra" },
  { type:"divider",          label:"Trennlinie",    icon:"—",   group:"Extra" },
];

interface BlockPickerPortalProps {
  editor: any;
}

export default function BlockPickerPortal({ editor }: BlockPickerPortalProps) {
  const [state, setState] = useState<null | { block: any; pos: { top: number; left: number }; mode: string }>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const setStateRef = useRef(setState);
  setStateRef.current = setState;
  useEffect(() => {
    editor._blockPicker = (block: any, rect: DOMRect | undefined, mode = "insert") => {
      setStateRef.current({
        block, mode,
        pos: rect ? { top: rect.bottom + 6, left: rect.left } : { top: 200, left: 200 },
      });
    };
    return () => { editor._blockPicker = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state) return;
    const handleOut = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setState(null);
    };
    document.addEventListener("mousedown", handleOut, true);
    return () => document.removeEventListener("mousedown", handleOut, true);
  }, [state]);

  const handleItemMouseDown = (e: React.MouseEvent, bt: typeof ADD_BLOCK_TYPES[0]) => {
    e.preventDefault();
    e.stopPropagation();
    const { block, mode } = state!;
    setState(null);
    try {
      const def: any = { type: bt.type };
      if ((bt as any).lv) def.props = { level: (bt as any).lv };
      if (mode === "convert") {
        editor.updateBlock(block, def);
        editor.setTextCursorPosition(block, "end");
        editor.focus();
      } else {
        const [nb] = editor.insertBlocks([def], block, "after");
        if (nb) {
          editor.setTextCursorPosition(nb, "end");
          editor.focus();
        }
      }
    } catch (err) {
      console.error("[BlockPicker]", err);
    }
  };

  if (!state) return null;

  const groups = [...new Set(ADD_BLOCK_TYPES.map(bt => bt.group))];
  const viewH = window.innerHeight;
  const estH = 420;
  const top = state.pos.top + estH > viewH ? Math.max(8, viewH - estH - 8) : state.pos.top;

  return createPortal(
    <div ref={menuRef} style={{
      position:"fixed", top, left: state.pos.left,
      zIndex:99999, background:"#fff",
      border:"1px solid #e5e7eb", borderRadius:12,
      boxShadow:"0 8px 32px rgba(0,0,0,.16)",
      padding:"6px", minWidth:230, fontFamily:FONT,
      maxHeight: "min(480px, 85vh)", overflowY:"auto",
    }}>
      <div style={{fontSize:10, color:"#9ca3af", padding:"5px 10px 6px",
        fontWeight:700, textTransform:"uppercase", letterSpacing:".06em"}}>
        {state.mode === "convert" ? "Typ umwandeln" : "Block einfügen"}
      </div>
      {groups.map(group => (
        <div key={group}>
          <div style={{fontSize:9.5, color:"#c4c9d4", padding:"6px 10px 3px",
            fontWeight:700, textTransform:"uppercase", letterSpacing:".06em"}}>
            {group}
          </div>
          {ADD_BLOCK_TYPES.filter(bt => bt.group === group).map(bt => (
            <div key={`${bt.type}-${(bt as any).lv||""}`}
              onMouseDown={(e) => handleItemMouseDown(e, bt)}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"7px 10px", borderRadius:7,
                cursor:"pointer", fontSize:13, color:"#374151", userSelect:"none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background="#f3f4f6")}
              onMouseLeave={e => (e.currentTarget.style.background="transparent")}
            >
              <span style={{
                width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center",
                background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:6,
                fontSize:11, fontWeight:700, color:"#6b7280", flexShrink:0,
              }}>{bt.icon}</span>
              {bt.label}
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}
