import { useState } from "react";
import { Send, Plus, ArrowUpDown } from "lucide-react";
import { C, FONT, IW } from "../constants/colors.js";
import { CHANNELS, ROLES } from "../constants/demo.js";
import { Btn } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import PostCard from "../components/PostCard.jsx";
import Board from "../components/widgets/Board.jsx";

export default function PublisherPage({posts,items,campaigns,onEdit,onSched,onDel,onApprove,onStatus,onCampaign,onNew,role,filt,setFilt,chFilt,setChFilt}){
  const [view,setView]=useState("grid");
  const [sort,setSort]=useState("date_asc");
  const can=p=>ROLES[role]?.can.includes(p);

  // Exclude soft-deleted posts from publisher view
  const livePosts=posts.filter(p=>!p.deleted);

  // All channels used across posts (for filter pills)
  const usedChs=[...new Set(livePosts.flatMap(p=>p.channels||[]))];

  // Filter: status + channel
  const filtered=livePosts.filter(p=>{
    const stOk=filt==="all"||p.status===filt;
    const chOk=chFilt==="all"||p.channels?.includes(chFilt);
    return stOk&&chOk;
  });

  // Sort
  const ST_ORDER={scheduled:0,pending:1,draft:2,published:3};
  const shown=[...filtered].sort((a,b)=>{
    if(sort==="date_asc"){const da=a.scheduledDate||"9999-99-99",db=b.scheduledDate||"9999-99-99";return da<db?-1:da>db?1:0;}
    if(sort==="date_desc"){const da=a.scheduledDate||"0000-00-00",db=b.scheduledDate||"0000-00-00";return da>db?-1:da<db?1:0;}
    if(sort==="status")return(ST_ORDER[a.status]??9)-(ST_ORDER[b.status]??9);
    if(sort==="title")return(a.title||"").localeCompare(b.title||"","de");
    return 0;
  });

  // Per-status counts
  const cnt=v=>livePosts.filter(p=>p.status===v).length;

  return(
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      {/* ── Toolbar ── */}
      <div style={{padding:"10px 20px",borderBottom:`1px solid ${C.border}`,background:C.surface,display:"flex",gap:8,alignItems:"center",flexShrink:0,flexWrap:"wrap",rowGap:8}}>

        {/* View toggle */}
        <div style={{display:"flex",gap:2,background:C.borderLight,borderRadius:8,padding:3}}>
          {[["grid","⊞ Grid"],["board","⊟ Board"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:view===v?C.surface:"transparent",color:view===v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,boxShadow:view===v?"0 1px 3px rgba(0,0,0,.07)":"none"}}>{l}</button>
          ))}
        </div>

        {view==="grid"&&<>
          {/* Divider */}
          <div style={{width:1,height:20,background:C.border,flexShrink:0}}/>

          {/* Status filter */}
          <div style={{display:"flex",gap:2,background:C.borderLight,borderRadius:8,padding:3}}>
            {[["all","Alle",posts.length],["scheduled","Geplant",cnt("scheduled")],["draft","Entwürfe",cnt("draft")],["pending","Freigabe",cnt("pending")]].map(([v,l,c])=>(
              <button key={v} onClick={()=>setFilt(v)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:filt===v?C.surface:"transparent",color:filt===v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,transition:"all .1s"}}>
                {l}{" "}<span style={{opacity:.55,fontWeight:500}}>{c}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{width:1,height:20,background:C.border,flexShrink:0}}/>

          {/* Channel filter pills */}
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            {["all",...usedChs].map(cid=>{
              const ch=CHANNELS.find(x=>x.id===cid);
              const active=chFilt===cid;
              return(
                <button key={cid} onClick={()=>setChFilt(cid)} style={{
                  display:"flex",alignItems:"center",gap:4,
                  padding:"4px 11px",borderRadius:20,border:"none",
                  background:active?C.text:C.borderLight,
                  color:active?C.surface:C.textSoft,
                  fontWeight:600,fontSize:11.5,cursor:"pointer",fontFamily:FONT,
                  transition:"all .12s",lineHeight:1,
                }}>
                  {cid==="all"?<>Alle Kanäle</>:<><ChIco id={cid} size={11} color={active?"#fff":C.textMute}/>{ch?.label}</>}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{width:1,height:20,background:C.border,flexShrink:0}}/>

          {/* Sort */}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <ArrowUpDown size={13} strokeWidth={2} color={C.textMute}/>
            <select value={sort} onChange={e=>setSort(e.target.value)} style={{border:"none",background:"transparent",fontSize:12,color:C.textSoft,fontWeight:600,cursor:"pointer",fontFamily:FONT,outline:"none"}}>
              <option value="date_asc">Datum ↑</option>
              <option value="date_desc">Datum ↓</option>
              <option value="status">Status</option>
              <option value="title">Titel A–Z</option>
            </select>
          </div>
        </>}

        <div style={{flex:1}}/>
        {can("write")&&<Btn onClick={onNew}><Plus size={14} strokeWidth={2.5}/>Neuer Post</Btn>}
      </div>

      {/* ── Content ── */}
      {view==="grid"?(
        <div style={{flex:1,overflow:"auto",padding:22}}>
          {shown.length===0?(
            <div style={{textAlign:"center",padding:"80px 20px"}}>
              <Send size={44} color={C.textMute} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/>
              <div style={{fontSize:15,fontWeight:700,color:C.textMid}}>Keine Posts</div>
              <div style={{fontSize:13,color:C.textMute,marginTop:6}}>
                {chFilt!=="all"||filt!=="all"?"Filter anpassen oder ":""}
              </div>
              {can("write")&&<Btn style={{marginTop:14}} onClick={onNew}><Plus size={14} strokeWidth={2}/>Erstellen</Btn>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(295px,1fr))",gap:18,alignItems:"start"}}>
              {shown.map(p=><PostCard key={p.id} post={p} items={items} campaigns={campaigns} onEdit={onEdit} onSched={onSched} onDel={onDel} onApprove={onApprove} role={role}/>)}
            </div>
          )}
        </div>
      ):(
        <Board posts={posts} items={items} campaigns={campaigns} onStatus={onStatus} onCampaign={onCampaign} onEdit={onEdit} onNew={onNew} canW={can("write")}/>
      )}
    </div>
  );
}
