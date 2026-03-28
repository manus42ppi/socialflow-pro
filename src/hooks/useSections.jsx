import { useState } from "react";

// ── SHARED DRAGGABLE SECTION SYSTEM ──────────────────────────────────────
export function useSections(pageId,userId,defaults){
  const key=`sec_${pageId}_${userId||"guest"}`;
  const [order,setOrder]=useState(()=>{
    try{
      const s=localStorage.getItem(key);
      if(!s)return[...defaults];
      const saved=JSON.parse(s);
      // Merge: keep saved order, append any new defaults not yet in saved
      const merged=[...saved.filter(id=>defaults.includes(id)),...defaults.filter(id=>!saved.includes(id))];
      return merged.length?merged:[...defaults];
    }catch{return[...defaults];}
  });
  const [dragId,setDragId]=useState(null);
  const [overId,setOverId]=useState(null);
  const save=(o)=>{setOrder(o);try{localStorage.setItem(key,JSON.stringify(o));}catch{}};
  const drop=(targetId)=>{
    if(!dragId||dragId===targetId)return;
    const o=[...order];const fi=o.indexOf(dragId),ti=o.indexOf(targetId);
    o.splice(fi,1);o.splice(ti,0,dragId);save(o);setDragId(null);setOverId(null);
  };
  return{order,dragId,setDragId,overId,setOverId,drop};
}

export function SecCard({id,title,right,dragId,overId,setDragId,setOverId,drop,children}){
  return(
    <div
      onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setOverId(id);}}
      onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOverId(null);}}
      onDrop={e=>{e.preventDefault();drop(id);}}
      style={{
        background:"#fff",borderRadius:14,
        border:`1px solid ${overId===id&&dragId!==id?"#5B5BD650":"#E5E7EB"}`,
        boxShadow:'0 1px 4px rgba(0,0,0,.04)',
        marginBottom:8,overflow:'hidden',
        opacity:dragId===id?.4:1,
        transition:'opacity .15s,border-color .15s',
      }}
    >
      <div
        draggable
        onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);setTimeout(()=>setDragId(id),0);}}
        onDragEnd={()=>{setDragId(null);setOverId(null);}}
        style={{display:'flex',alignItems:'center',gap:8,padding:'11px 16px 8px',cursor:'grab',userSelect:'none',WebkitUserSelect:'none',borderBottom:'1px solid #F3F4F6'}}
      >
        <div style={{display:'flex',flexDirection:'column',gap:3.5,opacity:.35,flexShrink:0}}>
          {[0,1,2].map(r=><div key={r} style={{display:'flex',gap:3.5}}>{[0,1].map(c=><div key={c} style={{width:3,height:3,borderRadius:'50%',background:'#6B7280'}}/>)}</div>)}
        </div>
        <span style={{fontSize:10,fontWeight:400,textTransform:'uppercase',letterSpacing:'.1em',color:'#9CA3AF',fontFamily:"'Inter','DM Sans',system-ui,sans-serif"}}>{title}</span>
        {right&&<div style={{marginLeft:'auto'}}>{right}</div>}
      </div>
      <div draggable={false} style={{padding:'14px 16px 16px'}}>{children}</div>
    </div>
  );
}
