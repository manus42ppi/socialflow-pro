import { Bell } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../../constants/colors.js";
import { Btn } from "../ui/index.jsx";
import { useApp } from "../../context/AppContext.jsx";

export default function TopBar({title}){
  const { user, newPost: onNew } = useApp();
  return(
    <div style={{height:50,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 22px",gap:12,flexShrink:0}}>
      <div style={{fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:15,color:C.text,letterSpacing:"-.01em"}}>{title}</div>
      <div style={{flex:1}}/>
      <div style={{display:"flex",alignItems:"center",gap:7,background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 11px",fontSize:12,color:C.textSoft,width:190}}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="5" stroke={C.textMute} strokeWidth="1.5"/><path d="M10 10l2.5 2.5" stroke={C.textMute} strokeWidth="1.5" strokeLinecap="round"/></svg>
        Suchen…
        <span style={{marginLeft:"auto",fontSize:10,color:C.textMute}}>⌘K</span>
      </div>
      <button style={{width:34,height:34,borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.textSoft}}>
        <Bell size={16} strokeWidth={IW}/>
      </button>
      <Btn onClick={onNew} style={{gap:5}}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
        Neuer Post
      </Btn>
    </div>
  );
}
