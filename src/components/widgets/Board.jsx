import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { C, FONT, IW } from "../../constants/colors.js";
import { CHANNELS, STAGES } from "../../constants/demo.js";
import { fmtDate, fpos } from "../../utils/store.js";
import { Btn } from "../ui/index.jsx";
import ChIco from "../ui/ChIco.jsx";

function KCard({post,items,onEdit,onDS,isDrag,isDrop}){
  const media=items.find(m=>m.id===post.mediaId);
  return(
    <div draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";onDS(post.id,post.status);}} onClick={()=>onEdit(post)}
      style={{background:isDrop?C.accentLight:C.surface,borderRadius:10,border:`1px solid ${isDrop?C.accent:C.border}`,overflow:"hidden",cursor:isDrag?"grabbing":"grab",transition:"all .2s",opacity:isDrag?.4:1,userSelect:"none",boxShadow:isDrag?"none":"0 1px 4px rgba(0,0,0,.05)"}}
      onMouseEnter={e=>{if(!isDrag){e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.05)";e.currentTarget.style.transform="";}}>
      {/* Thumbnail – tall enough to show focal point */}
      {media?.url&&<div style={{height:120,overflow:"hidden",position:"relative"}}>
        <img src={media.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:fpos(media),display:"block"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 50%,rgba(0,0,0,.35))"}}/>
        <div style={{position:"absolute",bottom:6,right:7,display:"flex",gap:3}}>
          {post.channels?.slice(0,3).map(c=><span key={c} style={{width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,.2)",backdropFilter:"blur(4px)",border:"1px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center"}}><ChIco id={c} size={10} color="#fff"/></span>)}
        </div>
      </div>}
      <div style={{padding:"10px 12px"}}>
        <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.title||"Kein Titel"}</div>
        <div style={{fontSize:11.5,color:C.textSoft,lineHeight:1.45,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:8}}>{post.content||"Kein Text…"}</div>
        <div style={{display:"flex",alignItems:"center",gap:5,borderTop:`1px solid ${C.borderLight}`,paddingTop:7,marginTop:2}}>
          {<div style={{display:"flex",gap:4}}>{post.channels?.slice(0,5).map(c=><ChIco key={c} id={c} size={12} color={C.textMute}/>)}</div>}
          {post.scheduledDate&&<span style={{marginLeft:"auto",fontSize:10,color:C.textMute,display:"flex",alignItems:"center",gap:3}}><Calendar size={10} strokeWidth={2}/>{fmtDate(post.scheduledDate)}</span>}
        </div>
      </div>
    </div>
  );
}

// ── KANBAN BOARD ───────────────────────────────────────────────────────────
function Board({posts,items,campaigns,onStatus,onCampaign,onEdit,onNew,canW}){
  const [dId,setDId]=useState(null); const [dSt,setDSt]=useState(null);
  const [over,setOver]=useState(null); const [dropped,setDropped]=useState(null);
  const [mode,setMode]=useState("status"); // "status"|"campaign"

  const endDrag=()=>{setDId(null);setDSt(null);setOver(null);};
  const drop=colId=>{
    if(dId&&dSt!==colId){
      mode==="status"?onStatus(dId,colId):onCampaign(dId,colId==="__none__"?null:colId);
      setDropped(dId); setTimeout(()=>setDropped(null),1200);
    }
    endDrag();
  };

  const cols=mode==="status"
    ?STAGES.map(s=>({id:s.id,label:s.label,color:s.color,bg:s.bg,bdr:s.border,hdr:s.header,posts:posts.filter(p=>p.status===s.id)}))
    :[
        {id:"__none__",label:"Ohne Kampagne",color:C.textSoft,bg:C.bg,bdr:C.border,hdr:C.borderLight,posts:posts.filter(p=>!p.campaignId)},
        ...campaigns.map(c=>({id:c.id,label:`${c.emoji} ${c.name}`,color:c.color,bg:c.color+"12",bdr:c.color+"45",hdr:c.color+"22",posts:posts.filter(p=>p.campaignId===c.id)}))
      ];

  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:C.text}}>Planner Board</div>
          <div style={{fontSize:12,color:dId?C.accent:C.textSoft,fontWeight:dId?700:400,marginTop:2}}>{dId?"Ziehe in eine andere Spalte…":"Drag & Drop zum Verschieben"}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <div style={{display:"flex",gap:2,background:C.borderLight,borderRadius:8,padding:3}}>
            {[["status","Status"],["campaign","Kampagnen"]].map(([v,l])=>(
              <button key={v} onClick={()=>setMode(v)} style={{padding:"5px 11px",borderRadius:6,border:"none",background:mode===v?C.surface:"transparent",color:mode===v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,boxShadow:mode===v?"0 1px 3px rgba(0,0,0,.07)":"none"}}>{l}</button>
            ))}
          </div>
          {canW&&<Btn onClick={onNew}><Plus size={14} strokeWidth={2.5}/>Neuer Post</Btn>}
        </div>
      </div>

      <div onDragEnd={endDrag} style={{display:"flex",gap:14,overflowX:"auto",alignItems:"start",paddingBottom:8,minHeight:400}}>
        {cols.map(col=>{
          const isO=over===col.id; const isS=dSt===col.id;
          return(
            <div key={col.id}
              onDragOver={e=>{e.preventDefault();if(dId&&!isS)setOver(col.id);}}
              onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(null);}}
              onDrop={e=>{e.preventDefault();drop(col.id);}}
              style={{flex:"0 0 232px",borderRadius:12,border:`1.5px solid ${isO?C.accent:C.border}`,background:isO?C.accentLight:C.bg,transition:"all .18s",opacity:dId&&isS?.5:1,minHeight:280}}>
              {/* Column header – monochrome, dot keeps semantic color */}
              <div style={{padding:"10px 13px",background:C.surface,borderRadius:"10px 10px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:col.color,flexShrink:0}}/>
                  <span style={{fontWeight:700,fontSize:13,color:C.text}}>{col.label}</span>
                </div>
                <span style={{background:C.borderLight,color:C.textMid,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{col.posts.length}</span>
              </div>
              {isO&&dId&&!isS&&<div style={{margin:"8px 8px 0",padding:10,borderRadius:8,border:`2px dashed ${C.accent}`,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.accent,fontWeight:700,gap:5}}><Plus size={13} strokeWidth={2.5}/>Hier ablegen</div>}
              <div style={{padding:8,display:"flex",flexDirection:"column",gap:8}}>
                {col.posts.length===0&&!isO&&<div style={{padding:"28px 12px",textAlign:"center",color:C.textMute,fontSize:12,border:`1.5px dashed ${C.border}`,borderRadius:8}}>
                  {dId&&!isS?<span style={{color:C.accent,fontWeight:600}}>Hier ablegen</span>:"Noch keine Posts"}
                </div>}
                {col.posts.map(p=><KCard key={p.id} post={p} items={items} onEdit={onEdit} onDS={(id,st)=>{setDId(id);setDSt(st);}} isDrag={dId===p.id} isDrop={dropped===p.id}/>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { KCard, Board };
export default Board;
