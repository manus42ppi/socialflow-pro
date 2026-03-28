import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Eye, Heart, MessageCircle, BarChart2, Clock, Trash2, Edit3, Film } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW, CSS } from "../constants/colors.js";
import { CHANNELS, DEMO_STORIES } from "../constants/demo.js";
import { fmtDate, uid } from "../utils/store.js";
import { Sp, Badge, Btn, FL, SBadge, SCrd } from "../components/ui/index.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import StoryEditorModal from "../modals/StoryEditorModal.jsx";

// ── STORIES PAGE ────────────────────────────────────────────────────────────
function StoriesPage({stories,items,onEdit,onNew,onDelete}){
  const {order,dragId:sDragId,setDragId:sSetDragId,overId:sOverId,setOverId:sSetOverId,drop:sDrop}=useSections("stories","default",['stories']);
  const [filt,setFilt]=useState("all");
  const [q,setQ]=useState("");
  const filtered=stories.filter(s=>{
    const fOk=filt==="all"||s.status===filt;
    const qOk=!q.trim()||(s.title||"").toLowerCase().includes(q.toLowerCase())||(s.subtitle||"").toLowerCase().includes(q.toLowerCase());
    return fOk&&qOk;
  });
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"};
  const catColors={"Politik":"#3B82F6","Wirtschaft":"#10B981","Tech":"#8B5CF6","Sport":"#F59E0B","Lifestyle":"#EC4899","Kultur":"#6366F1","Gesundheit":"#EF4444","Reise":"#14B8A6","Bildung":"#F97316","Andere":"#6B7280"};

  const StoryCard=({story})=>{
    const cover=items.find(m=>m.id===story.coverMediaId);
    const wc=(story.sections||[]).map(s=>`${s.heading} ${s.content}`).join(" ").trim().split(/\s+/).filter(Boolean).length;
    const sc={draft:{c:C.warning,l:"Entwurf"},published:{c:C.success,l:"Veröffentlicht"}}[story.status]||{c:C.textSoft,l:"–"};
    return(
      <div style={{...card,overflow:"hidden",cursor:"pointer",transition:"all .18s",breakInside:"avoid",marginBottom:10}}
        onClick={()=>onEdit(story)}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.04)";}}>
        {cover?(
          <>
            <div style={{position:"relative"}}>
              <img src={cover.url} alt={story.title||""} style={{width:"100%",height:160,objectFit:"cover",display:"block"}} loading="lazy"/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 40%,rgba(0,0,0,.65) 100%)"}}/>
              {story.category&&<div style={{position:"absolute",top:8,left:8,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:(catColors[story.category]||"#6B7280"),color:"#fff"}}>{story.category}</div>}
              <div style={{position:"absolute",top:8,right:8,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:5,background:"rgba(0,0,0,.55)",color:sc.c}}>{sc.l}</div>
              <div style={{position:"absolute",bottom:8,left:10,right:10}}>
                <div style={{fontWeight:800,fontSize:13,color:"#fff",lineHeight:1.3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{story.title||"Kein Titel"}</div>
              </div>
            </div>
            <div style={{padding:"10px 12px"}}>
              {story.subtitle&&<div style={{fontSize:11.5,color:C.textSoft,marginBottom:6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{story.subtitle}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:8,fontSize:10,color:C.textMute}}>
                  <span>{(story.sections||[]).length} Abschnitte</span>
                  <span>·</span>
                  <span>{wc} Wörter</span>
                </div>
                <div style={{display:"flex",gap:5}}>
                  <button onClick={e=>{e.stopPropagation();if(window.confirm("Story löschen?"))onDelete(story.id);}} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:"2px 4px"}}><Trash2 size={12} strokeWidth={2}/></button>
                </div>
              </div>
            </div>
          </>
        ):(
          <div style={{padding:"16px 16px 12px",background:`linear-gradient(135deg,${C.surface},${story.category?catColors[story.category]+"08":C.bg})`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{display:"flex",gap:5}}>
                {story.category&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:(catColors[story.category]||"#6B7280")+"15",color:catColors[story.category]||"#6B7280"}}>{story.category}</span>}
                <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:5,background:sc.c+"14",color:sc.c}}>{sc.l}</span>
              </div>
              <button onClick={e=>{e.stopPropagation();if(window.confirm("Story löschen?"))onDelete(story.id);}} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:"1px 3px"}}><Trash2 size={12} strokeWidth={2}/></button>
            </div>
            <div style={{fontWeight:800,fontSize:14,color:C.text,lineHeight:1.3,marginBottom:5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>{story.title||"Kein Titel"}</div>
            {story.subtitle&&<div style={{fontSize:11.5,color:C.textSoft,lineHeight:1.4,marginBottom:8,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{story.subtitle}</div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:`1px solid ${C.borderLight}`}}>
              <div style={{display:"flex",gap:8,fontSize:10,color:C.textMute}}>
                <span>{(story.sections||[]).length} Abschnitte</span>
                <span>·</span><span>{wc} Wörter</span>
              </div>
              <span style={{fontSize:10,color:C.textMute}}>{story.createdAt||""}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const storiesToolbar=(
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
      <div style={{position:"relative",flex:1,minWidth:200}}>
        <Search size={12} color={C.textMute} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Storys suchen…"
          style={{width:"100%",padding:"7px 12px 7px 28px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:2,background:C.borderLight,borderRadius:8,padding:3}}>
        {[["all","Alle"],["draft","Entwürfe"],["published","Veröffentlicht"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilt(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:filt===v?C.surface:"transparent",color:filt===v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>{l}</button>
        ))}
      </div>
      <Btn onClick={onNew}><Plus size={13} strokeWidth={2.5}/>Neue Story</Btn>
    </div>
  );

  const storiesGridContent=(
    <div>
      {storiesToolbar}
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"56px 20px",color:C.textMute}}>
          <BookOpen size={48} strokeWidth={1} style={{margin:"0 auto 14px",display:"block",opacity:.3}}/>
          <div style={{fontWeight:700,fontSize:15,color:C.textMid,marginBottom:4}}>
            {q?"Keine Treffer":"Noch keine Storys"}
          </div>
          <div style={{fontSize:13,marginBottom:16}}>{q?`Keine Storys für „${q}"`:"Erstelle Artikel und wandle sie in Social-Media-Posts um"}</div>
          {!q&&<Btn onClick={onNew}><Plus size={13} strokeWidth={2.5}/>Erste Story erstellen</Btn>}
        </div>
      ):(
        <div style={{columns:"3 240px",columnGap:10}}>
          {filtered.map(s=><StoryCard key={s.id} story={s}/>)}
        </div>
      )}
    </div>
  );

  const widgetMap={
    stories:{title:'Alle Storys',right:<span style={{fontSize:11,color:'#9CA3AF'}}>{filtered.length} Storys</span>,content:storiesGridContent},
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:"14px 18px",background:"#F9FAFB"}}>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:600,color:"#111827",letterSpacing:"-.3px"}}>Storys</div>
        <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>Artikel & Stories verwalten</div>
      </div>
      {order.map(id=>{
        const w=widgetMap[id];if(!w)return null;
        return <SecCard key={id} id={id} title={w.title} right={w.right} dragId={sDragId} overId={sOverId} setDragId={sSetDragId} setOverId={sSetOverId} drop={sDrop}>{w.content}</SecCard>;
      })}
    </div>
  );
}
export default StoriesPage;
