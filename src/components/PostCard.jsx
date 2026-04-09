import { useState } from "react";
import { Edit2, Calendar, Check, X, Clock } from "lucide-react";
import { C, T, FONT, IW } from "../constants/colors.js";
import { CHANNELS, ROLES } from "../constants/demo.js";
import { fmtDate } from "../utils/store.js";
import { Btn, Card, SBadge } from "./ui/index.jsx";
import ChIco from "./ui/ChIco.jsx";
import { PREV } from "./previews/index.jsx";

export default function PostCard({post,items,campaigns,onEdit,onSched,onDel,onApprove,role}){
  const [tab,setTab]=useState(post.channels?.[0]||"instagram");
  const media=items.find(m=>m.id===post.mediaId);
  const camp=campaigns?.find(c=>c.id===post.campaignId);
  const PC=PREV[tab]||PREV.instagram;
  const can=p=>ROLES[role]?.can.includes(p);
  const chs=post.channels?.length>0?post.channels:["instagram"];

  return(
    <Card style={{overflow:"hidden",transition:"box-shadow .18s",display:"flex",flexDirection:"column",height:388,boxShadow:T.shadowSm,borderRadius:T.rLg,border:`1px solid ${C.border}`}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 28px rgba(10,13,18,.12)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow=T.shadowSm}>

      {/* ── Header: title + badge + delete ── 44px */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 12px 8px",flexShrink:0,minHeight:44}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.title||"Kein Titel"}</div>
          {camp?<div style={{fontSize:10.5,color:C.textSoft,marginTop:2,display:"flex",alignItems:"center",gap:3}}><span>{camp.emoji}</span>{camp.name}</div>:<div style={{height:14}}/>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,marginLeft:8,paddingTop:1}}>
          <SBadge status={post.status}/>
          {can("delete")&&<button onClick={()=>onDel(post.id)} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:2,display:"flex",lineHeight:0}} onMouseEnter={e=>e.currentTarget.style.color=C.accent} onMouseLeave={e=>e.currentTarget.style.color=C.textMute}><X size={13} strokeWidth={2}/></button>}
        </div>
      </div>

      {/* ── Channel tabs — always rendered, 30px ── */}
      <div style={{display:"flex",height:30,borderTop:`1px solid ${C.borderLight}`,borderBottom:`1px solid ${C.border}`,overflowX:"auto",background:C.bg,flexShrink:0}}>
        {chs.map(cid=>{
          const ch=CHANNELS.find(x=>x.id===cid);
          const on=tab===cid;
          return(
            <button key={cid} onClick={()=>setTab(cid)} style={{
              flexShrink:0,height:"100%",display:"flex",alignItems:"center",gap:4,
              padding:"0 10px",border:"none",
              borderBottom:`2px solid ${on?C.text:"transparent"}`,
              background:"transparent",color:on?C.text:C.textMute,
              fontWeight:on?700:500,fontSize:11,cursor:"pointer",fontFamily:FONT,transition:"all .12s",
            }}>
              <ChIco id={cid} size={11} color={on?C.text:C.textMute}/>{ch?.label}
            </button>
          );
        })}
      </div>

      {/* ── Preview – fixed height, always same ── flex:1 = fills remaining */}
      <div style={{flex:1,background:C.bg,padding:"8px",overflow:"hidden",minHeight:0}}>
        <div style={{width:"100%",height:"100%",overflow:"hidden",borderRadius:8,boxShadow:"0 1px 8px rgba(0,0,0,.09)"}}>
          <div style={{width:`${100/0.82}%`,transform:"scale(0.82)",transformOrigin:"top left"}}>
            <PC post={post} media={media}/>
          </div>
        </div>
      </div>

      {/* ── Info bar — always 34px: date OR approval OR placeholder ── */}
      <div style={{height:34,padding:"0 10px",background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
        {post.status==="pending"&&can("approve")?(
          <>
            <span style={{flex:1,fontSize:11,color:C.textSoft,fontWeight:600}}>Wartet auf Freigabe</span>
            <Btn size="sm" variant="success" onClick={()=>onApprove(post.id,"scheduled")}><Check size={11} strokeWidth={2.5}/>OK</Btn>
            <Btn size="sm" variant="danger"  onClick={()=>onApprove(post.id,"draft")}><X size={11} strokeWidth={2.5}/>Ablehnen</Btn>
          </>
        ):post.status==="pending"?(
          <span style={{fontSize:11,color:C.warning,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Clock size={11} strokeWidth={2}/>Wartet auf Freigabe</span>
        ):post.scheduledDate?(
          <span style={{fontSize:11.5,color:C.textMid,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Calendar size={12} strokeWidth={2} color={C.textMute}/>{fmtDate(post.scheduledDate)}{post.scheduledTime&&` · ${post.scheduledTime}`}</span>
        ):(
          <span style={{fontSize:11,color:C.textMute,display:"flex",alignItems:"center",gap:5}}><Clock size={11} strokeWidth={2}/>Noch nicht geplant</span>
        )}
      </div>

      {/* ── Action buttons — always 36px ── */}
      <div style={{display:"flex",borderTop:`1px solid ${C.borderLight}`,height:36,flexShrink:0}}>
        {can("write")&&(
          <button onClick={()=>onEdit(post)} style={{flex:1,height:"100%",background:"none",border:"none",color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,borderRight:`1px solid ${C.borderLight}`,fontFamily:FONT,transition:"all .12s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.brand25;e.currentTarget.style.color=C.textMid;}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.textSoft;}}>
            <Edit2 size={12} strokeWidth={IW}/>Bearbeiten
          </button>
        )}
        <button onClick={()=>onSched(post)} style={{flex:1,height:"100%",background:"none",border:"none",color:post.status==="scheduled"?C.success:C.accent,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:FONT,transition:"all .12s"}}
          onMouseEnter={e=>e.currentTarget.style.background=post.status==="scheduled"?C.successBg:T.brand25}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <Calendar size={12} strokeWidth={IW}/>{post.status==="scheduled"?"Ändern":"Planen"}
        </button>
      </div>
    </Card>
  );
}
