import { useState } from "react";
import { Flag, Plus, Check, Trash2, Send } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { CHANNELS, CAMP_COLORS, CAMP_EMOJIS } from "../constants/demo.js";
import { uid } from "../utils/store.js";
import { Btn, Card, FL, TIn, SBadge } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";

export default function CampaignsPage({campaigns,setCampaigns,posts,onEditPost}){
  const [showNew,setShowNew]=useState(false);
  const [form,setForm]=useState({name:"",emoji:"🎯",color:C.accent,description:""});
  const [sel,setSel]=useState(null);
  const {order,dragId,setDragId,overId,setOverId,drop}=useSections("campaigns","default",['active','list']);

  const create=()=>{if(!form.name.trim())return;setCampaigns(p=>[...p,{id:uid(),...form}]);setShowNew(false);setForm({name:"",emoji:"🎯",color:C.accent,description:""}); };
  const del=id=>{if(window.confirm("Kampagne löschen?")){setCampaigns(p=>p.filter(c=>c.id!==id));if(sel===id)setSel(null);}};

  const selC=campaigns.find(c=>c.id===sel);
  const cPosts=posts.filter(p=>p.campaignId===sel);

  const activeContent=(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <Btn size="sm" onClick={()=>setShowNew(s=>!s)}><Plus size={13} strokeWidth={2}/>{showNew?"Schließen":"Neue Kampagne"}</Btn>
      </div>
      {showNew&&<Card style={{padding:"14px 16px",marginBottom:4}}>
        <div style={{fontWeight:500,fontSize:12,marginBottom:10}}>Neue Kampagne</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div><FL>Emoji</FL>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {CAMP_EMOJIS.map(e=><button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))} style={{width:32,height:32,borderRadius:7,border:`2px solid ${form.emoji===e?C.accent:C.border}`,background:form.emoji===e?C.accentLight:"#fff",fontSize:16,cursor:"pointer"}}>{e}</button>)}
            </div>
          </div>
          <TIn label="Name" placeholder="z.B. Sommer, Olympia, Ostern…" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <TIn label="Beschreibung (optional)" placeholder="Kurze Info…" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
          <div><FL>Farbe</FL>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {CAMP_COLORS.map(clr=><button key={clr} onClick={()=>setForm(f=>({...f,color:clr}))} style={{width:28,height:28,borderRadius:"50%",background:clr,border:"3px solid transparent",outline:form.color===clr?`2.5px solid ${clr}`:"none",outlineOffset:2,cursor:"pointer"}}/>)}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="secondary" size="sm" onClick={()=>setShowNew(false)} style={{flex:1,justifyContent:"center"}}>Abbrechen</Btn>
            <Btn size="sm" onClick={create} style={{flex:2,justifyContent:"center"}}><Check size={12} strokeWidth={2.5}/>Erstellen</Btn>
          </div>
        </div>
      </Card>}
      {campaigns.length===0&&!showNew&&<div style={{textAlign:"center",padding:"40px 16px",color:C.textMute}}>
        <Flag size={36} strokeWidth={1} style={{margin:"0 auto 10px",display:"block"}}/>
        <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>Noch keine Kampagnen</div>
        <div style={{fontSize:12}}>Erstelle z.B. „Sommer", „Olympia" oder „Ostern"</div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
        {campaigns.map(c=>{const n=posts.filter(p=>p.campaignId===c.id).length;const isS=sel===c.id;
          return <div key={c.id} onClick={()=>setSel(isS?null:c.id)} style={{background:isS?c.color+"12":C.surface,borderRadius:10,border:`1.5px solid ${isS?c.color:C.border}`,padding:"11px 14px",cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>{if(!isS)e.currentTarget.style.borderColor=c.color+"60";}}
            onMouseLeave={e=>{if(!isS)e.currentTarget.style.borderColor=C.border;}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:9,background:c.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
                <div style={{fontSize:12,color:C.textSoft}}>{n} Post{n!==1?"s":""}</div>
              </div>
              <button onClick={e=>{e.stopPropagation();del(c.id);}} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:4}}><Trash2 size={14} strokeWidth={IW}/></button>
            </div>
            {c.description&&<div style={{fontSize:12,color:C.textSoft,marginTop:6,paddingTop:6,borderTop:`1px solid ${C.borderLight}`}}>{c.description}</div>}
          </div>;
        })}
      </div>
    </div>
  );

  const listContent=(
    selC?(
      <>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:44,height:44,borderRadius:11,background:selC.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{selC.emoji}</div>
          <div><div style={{fontWeight:900,fontSize:18,color:C.text}}>{selC.name}</div><div style={{fontSize:13,color:C.textSoft}}>{cPosts.length} Posts</div></div>
        </div>
        {cPosts.length===0?<div style={{textAlign:"center",padding:"60px 20px",color:C.textMute}}>
          <Send size={36} strokeWidth={1} style={{margin:"0 auto 12px",display:"block"}}/>
          <div style={{fontWeight:700,fontSize:14,color:C.textMid}}>Noch keine Posts in dieser Kampagne</div>
          <div style={{fontSize:12,marginTop:4}}>Bearbeite einen Post und weise ihn dieser Kampagne zu.</div>
        </div>:(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {cPosts.map(p=><div key={p.id} onClick={()=>onEditPost(p)} style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,padding:"11px 14px",cursor:"pointer",transition:"all .15s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{p.title||"Kein Titel"}</div>
              <div style={{fontSize:12,color:C.textSoft,marginBottom:8,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.content}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:3}}>{p.channels?.map(c=><ChIco key={c} id={c} size={12}/>)}</div>
                <SBadge status={p.status}/>
              </div>
            </div>)}
          </div>
        )}
      </>
    ):(
      <div style={{textAlign:"center",padding:"48px 20px",color:C.textMute}}>
        <Flag size={48} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/>
        <div style={{fontSize:16,fontWeight:700,color:C.textMid}}>Kampagne auswählen</div>
        <div style={{fontSize:13,marginTop:4}}>Klicke oben auf eine Kampagne.</div>
      </div>
    )
  );

  const widgetMap={
    active:{title:'Aktive Kampagnen',right:<span style={{fontSize:11,color:'#9CA3AF'}}>{campaigns.length} Kampagnen</span>,content:activeContent},
    list:{title:'Alle Kampagnen',right:selC?<span style={{fontSize:11,color:'#9CA3AF'}}>{selC.name}</span>:null,content:listContent},
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:"14px 18px",background:"#F9FAFB"}}>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:600,color:"#111827",letterSpacing:"-.3px"}}>Kampagnen</div>
        <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>Projekte & Kampagnen verwalten</div>
      </div>
      {order.map(id=>{
        const w=widgetMap[id];if(!w)return null;
        return <SecCard key={id} id={id} title={w.title} right={w.right} dragId={dragId} overId={overId} setDragId={setDragId} setOverId={setOverId} drop={drop}>{w.content}</SecCard>;
      })}
    </div>
  );
}
