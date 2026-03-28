import { useState, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { C, FONT } from "../../constants/colors.js";
import { CHANNELS } from "../../constants/demo.js";
import ChIco from "../ui/ChIco.jsx";
import { useApp } from "../../context/AppContext.jsx";

export default function GlobalRightSidebar(){
  const { posts: allPosts, campaigns, goNav: onNav } = useApp();
  const posts = allPosts.filter(p => !p.deleted);
  const [sbRight,setSbRight]=useState(()=>{try{return localStorage.getItem("sb_right")!=="0";}catch{return true;}});
  const toggleRight=()=>{const n=!sbRight;setSbRight(n);try{localStorage.setItem("sb_right",n?"1":"0");}catch{}};

  const DEFAULT_ORDER=["calendar","activity","channels","campaigns"];
  const [widgetOrder,setWidgetOrder]=useState(()=>{
    try{const s=localStorage.getItem("sb_widget_order");return s?JSON.parse(s):DEFAULT_ORDER;}
    catch{return DEFAULT_ORDER;}
  });
  const saveOrder=o=>{setWidgetOrder(o);try{localStorage.setItem("sb_widget_order",JSON.stringify(o));}catch{}};

  // Drag state
  const dragId=useRef(null);
  const [dragOver,setDragOver]=useState(null);
  const onDragStart=(id)=>{dragId.current=id;};
  const onDragOverW=(e,id)=>{e.preventDefault();if(dragId.current&&dragId.current!==id)setDragOver(id);};
  const onDropW=(targetId)=>{
    if(!dragId.current||dragId.current===targetId)return;
    const o=[...widgetOrder];
    const fi=o.indexOf(dragId.current),ti=o.indexOf(targetId);
    if(fi<0||ti<0)return;
    o.splice(fi,1);o.splice(ti,0,dragId.current);
    saveOrder(o);dragId.current=null;setDragOver(null);
  };
  const onDragEndW=()=>{dragId.current=null;setDragOver(null);};

  // Calendar
  const today=new Date();
  const todayD=today.getDate(),todayM=today.getMonth(),todayY=today.getFullYear();
  const [calMonth,setCalMonth]=useState(new Date());
  const calYear=calMonth.getFullYear(),calMon=calMonth.getMonth();
  const firstDay=new Date(calYear,calMon,1).getDay();
  const firstDayMon=firstDay===0?6:firstDay-1;
  const daysInMonth=new Date(calYear,calMon+1,0).getDate();
  const schedDays=useMemo(()=>new Set(posts.filter(p=>p.scheduledDate).map(p=>{
    const d=new Date(p.scheduledDate+"T12:00");
    return(d.getFullYear()===calYear&&d.getMonth()===calMon)?d.getDate():null;
  }).filter(Boolean)),[posts,calYear,calMon]);
  const calLabel=useMemo(()=>calMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),[calMonth]);

  const recent=useMemo(()=>[...posts].slice(-10).reverse(),[posts]);
  const actMap=useMemo(()=>({
    scheduled:{verb:"geplant",color:C.accent,icon:"📅"},
    pending:{verb:"zur Freigabe",color:C.warning,icon:"⏳"},
    published:{verb:"veröffentlicht",color:C.success,icon:"✅"},
    draft:{verb:"Entwurf",color:C.textSoft,icon:"📝"},
  }),[]);

  // Widget header shared style
  const WHeader=({title,right,dragHandleProps})=>(
    <div style={{display:"flex",alignItems:"center",height:38,padding:"0 14px",borderBottom:`1px solid ${C.borderLight}`,background:C.surface,cursor:"grab",...dragHandleProps}}>
      <div style={{display:"flex",flexDirection:"column",gap:2.5,marginRight:9,opacity:.3,flexShrink:0}}>
        {[0,1].map(i=><div key={i} style={{display:"flex",gap:2.5}}>{[0,1,2].map(j=><div key={j} style={{width:2,height:2,borderRadius:"50%",background:C.textMid}}/>)}</div>)}
      </div>
      <span style={{fontSize:11,fontWeight:400,color:C.textMid,textTransform:"uppercase",letterSpacing:".06em",fontFamily:FONT,flex:1}}>{title}</span>
      {right}
    </div>
  );

  const widgets={
    calendar:(
      <div key="calendar">
        <WHeader title="Kalender" right={
          <div style={{display:"flex",gap:0}}>
            <button onClick={()=>setCalMonth(new Date(calYear,calMon-1,1))} style={{background:"none",border:"none",cursor:"pointer",color:C.textSoft,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,fontFamily:FONT}}><ChevronLeft size={12} strokeWidth={2.5}/></button>
            <button onClick={()=>setCalMonth(new Date(calYear,calMon+1,1))} style={{background:"none",border:"none",cursor:"pointer",color:C.textSoft,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,fontFamily:FONT}}><ChevronRight size={12} strokeWidth={2.5}/></button>
          </div>
        }/>
        <div style={{background:C.surface,padding:"4px 12px 2px",display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:C.textMute,padding:"3px 0"}}>{d}</div>
          ))}
        </div>
        <div style={{background:C.surface,padding:"0 12px 10px",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
          {Array(firstDayMon).fill(null).map((_,i)=><div key={`e${i}`}/>)}
          {Array(daysInMonth).fill(null).map((_,i)=>{
            const day=i+1;
            const isToday=day===todayD&&calMon===todayM&&calYear===todayY;
            const hasPosts=schedDays.has(day);
            return(
              <div key={day} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"2px 0",cursor:hasPosts?"pointer":"default"}}
                onClick={hasPosts?()=>onNav("calendar"):undefined}>
                <div style={{width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                  background:isToday?C.accent:"transparent",
                  color:isToday?"#fff":C.textMid,fontSize:10.5,fontWeight:isToday?700:400}}>
                  {day}
                </div>
                {hasPosts&&<div style={{width:4,height:4,borderRadius:"50%",background:C.accent,marginTop:1}}/>}
              </div>
            );
          })}
        </div>
        <div style={{background:C.surface,padding:"4px 14px 8px",borderTop:`1px solid ${C.borderLight}`}}>
          <span style={{fontSize:10,color:C.textMute,fontWeight:600}}>{calLabel}</span>
        </div>
      </div>
    ),
    activity:(
      <div key="activity">
        <WHeader title="Letzte Aktionen" right={<Activity size={12} color={C.textMute} strokeWidth={2}/>}/>
        {recent.length===0
          ?<div style={{padding:"18px 14px",textAlign:"center",fontSize:11,color:C.textMute,background:C.surface}}>Noch keine Aktivität</div>
          :recent.slice(0,6).map((p,i)=>{
            const a=actMap[p.status]||actMap.draft;
            return(
              <div key={p.id} style={{padding:"8px 14px",borderBottom:i<Math.min(recent.length,6)-1?`1px solid ${C.borderLight}`:"none",display:"flex",gap:9,alignItems:"flex-start",cursor:"pointer",transition:"background .1s",background:C.surface}}
                onClick={()=>onNav("publisher")}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                onMouseLeave={e=>e.currentTarget.style.background=C.surface}>
                <div style={{width:24,height:24,borderRadius:6,background:a.color+"16",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11}}>{a.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:400,fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||"Kein Titel"}</div>
                  <div style={{fontSize:10,color:a.color,fontWeight:400,marginTop:1}}>{a.verb}</div>
                </div>
                {p.scheduledDate&&<span style={{fontSize:9,color:C.textMute,flexShrink:0,paddingTop:2}}>{p.scheduledDate.slice(5)}</span>}
              </div>
            );
          })
        }
      </div>
    ),
    channels:(
      <div key="channels">
        <WHeader title="Posts je Kanal"/>
        {CHANNELS.map((ch,i)=>{
          const n=posts.filter(p=>p.channels?.includes(ch.id)).length;
          const total=Math.max(1,posts.length);
          return <div key={ch.id} style={{padding:"7px 14px",borderBottom:i<CHANNELS.length-1?`1px solid ${C.borderLight}`:"none",display:"flex",alignItems:"center",gap:8,background:C.surface}}>
            <ChIco id={ch.id} size={12} color={C.textMid}/>
            <span style={{fontSize:11,color:C.textMid,flex:1}}>{ch.label}</span>
            <div style={{width:52,height:3,background:C.borderLight,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(n/total)*100}%`,background:C.accent,borderRadius:99}}/>
            </div>
            <span style={{fontSize:11,fontWeight:400,color:C.textSoft,width:14,textAlign:"right"}}>{n}</span>
          </div>;
        })}
      </div>
    ),
    campaigns:(
      <div key="campaigns">
        <WHeader title="Kampagnen" right={
          <button onClick={()=>onNav("campaigns")} style={{fontSize:10,color:C.accent,fontWeight:400,background:"none",border:"none",cursor:"pointer",fontFamily:FONT,padding:0}}>Alle →</button>
        }/>
        {campaigns.length===0
          ?<div style={{padding:"16px 14px",textAlign:"center",color:C.textMute,fontSize:11,background:C.surface}}>Keine Kampagnen</div>
          :campaigns.slice(0,5).map((c,i)=>{
            const n=posts.filter(p=>p.campaignId===c.id).length;
            return <div key={c.id} style={{padding:"7px 14px",borderBottom:i<Math.min(campaigns.length,5)-1?`1px solid ${C.borderLight}`:"none",display:"flex",alignItems:"center",gap:8,cursor:"pointer",transition:"background .1s",background:C.surface}}
              onClick={()=>onNav("campaigns")}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg}
              onMouseLeave={e=>e.currentTarget.style.background=C.surface}>
              <span style={{fontSize:14,flexShrink:0}}>{c.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:400,color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:9.5,color:C.textMute,marginTop:1}}>{n} Post{n!==1?"s":""}</div>
              </div>
              <div style={{width:6,height:6,borderRadius:"50%",background:c.color,flexShrink:0}}/>
            </div>;
          })
        }
      </div>
    ),
  };

  return(
    <div style={{display:"flex",flexDirection:"column",borderLeft:`1px solid ${C.borderLight}`,overflow:"hidden",background:C.surface,minHeight:0,height:"100%",transition:"width .2s cubic-bezier(.4,0,.2,1)",width:sbRight?268:36,flexShrink:0}}>

      {/* ── Toggle handle ── */}
      {sbRight?(
        <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px 0 14px",height:44,borderBottom:`1px solid ${C.borderLight}`,background:C.surface}}>
          <span style={{fontSize:10,fontWeight:800,color:C.textMute,textTransform:"uppercase",letterSpacing:".1em",fontFamily:FONT}}>Widgets</span>
          <span style={{fontSize:9,color:C.textMute,fontFamily:FONT,opacity:.6}}>ziehen zum sortieren</span>
          <button onClick={toggleRight} title="Sidebar einklappen"
            style={{width:26,height:26,borderRadius:7,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMute,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=C.borderLight;e.currentTarget.style.color=C.textMid;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.textMute;}}>
            <ChevronRight size={14} strokeWidth={2.5}/>
          </button>
        </div>
      ):(
        <div onClick={toggleRight} title="Sidebar ausklappen"
          style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:8,userSelect:"none",transition:"background .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background=C.borderLight}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{display:"flex",flexDirection:"column",gap:3,opacity:.4}}>
            {[0,1,2,3,4].map(i=><div key={i} style={{width:3,height:3,borderRadius:"50%",background:C.textMid}}/>)}
          </div>
          <div style={{width:24,height:24,borderRadius:7,background:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(0,0,0,.07)"}}>
            <ChevronLeft size={12} strokeWidth={2.5} color={C.textMid}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3,opacity:.4}}>
            {[0,1,2,3,4].map(i=><div key={i} style={{width:3,height:3,borderRadius:"50%",background:C.textMid}}/>)}
          </div>
        </div>
      )}

      {/* ── Widget list ── */}
      {sbRight&&(
        <div style={{flex:1,minHeight:0,overflowY:"auto",overflowX:"hidden"}}>
          {widgetOrder.filter(id=>widgets[id]).map((id,idx)=>(
            <div key={id}
              draggable
              onDragStart={()=>onDragStart(id)}
              onDragOver={e=>onDragOverW(e,id)}
              onDrop={()=>onDropW(id)}
              onDragEnd={onDragEndW}
              style={{
                borderBottom:`2px solid ${C.border}`,
                opacity:dragOver===id?.5:1,
                background:dragOver===id?C.accentLight:"transparent",
                transition:"opacity .15s, background .15s",
              }}>
              {widgets[id]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
