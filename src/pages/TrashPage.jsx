import { Trash2, FileText, RotateCcw } from "lucide-react";
import { C, FONT } from "../constants/colors.js";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function TrashPage(){
  const { posts, restore: onRestore, purge: onPurge, purgeAll: onPurgeAll } = useApp();
  const trashed=posts.filter(p=>p.deleted);
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:12};
  return(
    <div style={{flex:1,overflow:"auto",padding:"22px 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontFamily:FONT,fontWeight:800,fontSize:16,color:C.text}}>Papierkorb</div>
          <div style={{fontFamily:FONT,fontSize:12,color:C.textSoft,marginTop:2}}>{trashed.length} {trashed.length===1?"Eintrag":"Einträge"} im Papierkorb</div>
        </div>
        {trashed.length>0&&<button onClick={()=>{if(window.confirm(`Alle ${trashed.length} Posts endgültig löschen?`))onPurgeAll();}}
          style={{background:C.red,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,padding:"8px 16px",cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:6}}>
          <Trash2 size={13} strokeWidth={2}/>Alle endgültig löschen
        </button>}
      </div>
      {trashed.length===0?(
        <div style={{...card,padding:"72px 24px",textAlign:"center",color:C.textMute}}>
          <Trash2 size={48} strokeWidth={1} style={{margin:"0 auto 14px",display:"block",opacity:.3}}/>
          <div style={{fontWeight:700,fontSize:15,color:C.textMid,marginBottom:4}}>Papierkorb ist leer</div>
          <div style={{fontSize:13}}>Gelöschte Posts erscheinen hier und können wiederhergestellt werden.</div>
        </div>
      ):(
        <div style={{...card,overflow:"hidden"}}>
          {trashed.map((p,i)=>{
            const sc={scheduled:{c:C.accent,l:"Geplant"},draft:{c:C.textSoft,l:"Entwurf"},pending:{c:C.warning,l:"Freigabe"},published:{c:C.success,l:"Live"}}[p.status]||{c:C.textSoft,l:"–"};
            return(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<trashed.length-1?`1px solid ${C.borderLight}`:"none",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:36,height:36,borderRadius:8,background:C.bg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:.5}}>
                  <FileText size={15} color={C.textMute} strokeWidth={1.5}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||"Kein Titel"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                    {p.channels?.slice(0,3).map(c=><ChIco key={c} id={c} size={11} color={C.textMute}/>)}
                    <span style={{fontSize:10.5,color:C.textMute}}>{p.scheduledDate?`· ${p.scheduledDate}`:""}</span>
                    <span style={{fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:5,background:sc.c+"14",color:sc.c}}>{sc.l}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>onRestore(p.id)} title="Wiederherstellen"
                    style={{background:C.accentLight,border:"none",borderRadius:7,color:C.accent,fontSize:11,fontWeight:700,padding:"6px 12px",cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:5}}>
                    <RotateCcw size={12} strokeWidth={2.5}/>Wiederherstellen
                  </button>
                  <button onClick={()=>{if(window.confirm("Endgültig löschen?"))onPurge(p.id);}} title="Endgültig löschen"
                    style={{background:C.borderLight,border:"none",borderRadius:7,color:C.textSoft,fontSize:11,fontWeight:600,padding:"6px 10px",cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}>
                    <Trash2 size={12} strokeWidth={2}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{marginTop:14,fontSize:11,color:C.textMute,textAlign:"center"}}>Posts im Papierkorb werden nach 30 Tagen automatisch endgültig gelöscht.</div>
    </div>
  );
}
