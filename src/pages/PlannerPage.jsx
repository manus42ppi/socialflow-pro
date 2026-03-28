import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, BarChart2, Calendar, Clock, Zap, Target, Award, Flag, CalendarRange } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW, CSS } from "../constants/colors.js";
import { CHANNELS, DEMO_CAMPAIGNS, DEMO_POSTS, CAMP_COLORS } from "../constants/demo.js";
import { fmtDate } from "../utils/store.js";
import { Sp, Badge, Btn, FL, SCrd } from "../components/ui/index.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";
import MiniGantt from "../components/widgets/MiniGantt.jsx";

// ── PLANNER PAGE ────────────────────────────────────────────────────────────
function PlannerPage({posts,campaigns,items,onEdit}){
  const {order,dragId:pDragId,setDragId:pSetDragId,overId:pOverId,setOverId:pSetOverId,drop:pDrop}=useSections("planner","planner",['timeline','campaigns','upcoming']);
  const today=new Date();
  const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const livePosts=posts.filter(p=>!p.deleted);
  const schedPosts=livePosts.filter(p=>p.scheduledDate);

  // ── Timeline: 6 months starting 1 month ago ──
  const [timeStart,setTimeStart]=useState(()=>{
    const d=new Date(today.getFullYear(),today.getMonth()-1,1);
    return d;
  });
  const MONTHS_VISIBLE=6;
  const timeEnd=new Date(timeStart.getFullYear(),timeStart.getMonth()+MONTHS_VISIBLE,0); // last day
  const totalDays=Math.round((timeEnd-timeStart)/(1000*60*60*24))+1;

  const dateToX=dateStr=>{
    if(!dateStr)return null;
    const d=new Date(dateStr+"T12:00");
    const diff=Math.round((d-timeStart)/(1000*60*60*24));
    return Math.max(0,Math.min(100,(diff/totalDays)*100));
  };

  const prevPeriod=()=>setTimeStart(d=>new Date(d.getFullYear(),d.getMonth()-1,1));
  const nextPeriod=()=>setTimeStart(d=>new Date(d.getFullYear(),d.getMonth()+1,1));
  const goToday=()=>setTimeStart(new Date(today.getFullYear(),today.getMonth()-1,1));

  // Month headers for timeline
  const monthHeaders=[];
  for(let i=0;i<MONTHS_VISIBLE;i++){
    const m=new Date(timeStart.getFullYear(),timeStart.getMonth()+i,1);
    const startX=(i/MONTHS_VISIBLE)*100;
    monthHeaders.push({label:m.toLocaleDateString("de-DE",{month:"short",year:"2-digit"}),x:startX,w:100/MONTHS_VISIBLE});
  }

  // Today X position
  const todayX=dateToX(todayStr);

  // Gantt rows: campaigns first, then ungrouped channel rows
  const rows=[];
  campaigns.forEach(camp=>{
    const cPosts=schedPosts.filter(p=>p.campaignId===camp.id&&p.scheduledDate>=`${timeStart.getFullYear()}-${String(timeStart.getMonth()+1).padStart(2,"0")}-01`&&p.scheduledDate<=`${timeEnd.getFullYear()}-${String(timeEnd.getMonth()+1).padStart(2,"0")}-${String(timeEnd.getDate()).padStart(2,"0")}`);
    const allCPosts=schedPosts.filter(p=>p.campaignId===camp.id);
    if(allCPosts.length===0)return;
    const dates=allCPosts.map(p=>p.scheduledDate).sort();
    const x1=dateToX(dates[0]);
    const x2=dateToX(dates[dates.length-1])+0.5;
    rows.push({type:"campaign",id:camp.id,label:camp.name,emoji:camp.emoji,color:camp.color,x1:Math.max(0,x1),x2:Math.min(100,x2),posts:allCPosts,visible:cPosts});
  });

  // Channel rows
  CHANNELS.forEach(ch=>{
    const chPosts=schedPosts.filter(p=>p.channels?.includes(ch.id));
    if(chPosts.length===0)return;
    const dates=chPosts.map(p=>p.scheduledDate).sort();
    const x1=dateToX(dates[0]);
    const x2=dateToX(dates[dates.length-1])+0.5;
    rows.push({type:"channel",id:ch.id,label:ch.label,color:ch.color,x1:Math.max(0,x1),x2:Math.min(100,x2),posts:chPosts});
  });

  // Individual post dots on timeline
  const allTimelinePosts=schedPosts.filter(p=>{
    return p.scheduledDate>= `${timeStart.getFullYear()}-${String(timeStart.getMonth()+1).padStart(2,"0")}-01` &&
           p.scheduledDate<=  `${timeEnd.getFullYear()}-${String(timeEnd.getMonth()+1).padStart(2,"0")}-${String(timeEnd.getDate()).padStart(2,"0")}`;
  });

  // ── Right panel: mini calendar ──
  const [calM,setCalM]=useState(new Date());
  const calY=calM.getFullYear(),calMon=calM.getMonth();
  const firstDay=new Date(calY,calMon,1).getDay();
  const firstDayMon=firstDay===0?6:firstDay-1;
  const dIM=new Date(calY,calMon+1,0).getDate();
  const calLabel=calM.toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  const postsByDay=schedPosts.reduce((acc,p)=>{
    if(p.scheduledDate){const d=new Date(p.scheduledDate+"T12:00");
      if(d.getFullYear()===calY&&d.getMonth()===calMon){
        const k=d.getDate();acc[k]=[...(acc[k]||[]),p];
      }}return acc;
  },{});

  // Today's posts
  const todayPosts=schedPosts.filter(p=>p.scheduledDate===todayStr).sort((a,b)=>(a.scheduledTime||"").localeCompare(b.scheduledTime||""));

  // Next 7 days (excluding today)
  const upcomingPosts=schedPosts.filter(p=>p.scheduledDate>todayStr).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)||(a.scheduledTime||"").localeCompare(b.scheduledTime||"")).slice(0,8);

  // Campaign progress cards
  const campCards=campaigns.map(c=>{
    const cp=livePosts.filter(p=>p.campaignId===c.id);
    const pub=cp.filter(p=>p.status==="published").length;
    const total=cp.length||1;
    const pct=Math.round((pub/total)*100);
    const dates=cp.filter(p=>p.scheduledDate).map(p=>p.scheduledDate).sort();
    const start=dates[0]||null,end=dates[dates.length-1]||null;
    return{...c,total:cp.length,pub,pct,start,end};
  }).filter(c=>c.total>0);

  const card={background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"};
  const SK={scheduled:{c:"#16A34A",l:"Geplant"},draft:{c:"#D97706",l:"Entwurf"},pending:{c:"#2563EB",l:"Review"},published:{c:"#7C3AED",l:"Live"}};

  // ── Gantt content (full width, no inner card wrapper) ──
  const ganttContent=(
    <div>
      {/* Month headers */}
      <div style={{position:"relative",height:28,marginTop:4,marginLeft:140}}>
        {monthHeaders.map((mh,i)=>(
          <div key={i} style={{position:"absolute",left:`${mh.x}%`,width:`${mh.w}%`,top:0,height:"100%",borderLeft:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",paddingLeft:6}}>
            <span style={{fontSize:10,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{mh.label}</span>
          </div>
        ))}
      </div>
      {/* Rows */}
      {rows.length===0?(
        <div style={{padding:"32px 0",textAlign:"center",color:C.textMute,fontSize:13}}>
          <CalendarRange size={32} strokeWidth={1} style={{margin:"0 auto 10px",display:"block",opacity:.3}}/>
          Keine geplanten Posts. Plane Posts im Publisher.
        </div>
      ):rows.map((row,ri)=>(
        <div key={row.id} style={{display:"flex",alignItems:"center",gap:0,height:38,borderBottom:ri<rows.length-1?`1px solid ${C.borderLight}`:"none"}}>
          <div style={{width:140,flexShrink:0,display:"flex",alignItems:"center",gap:7,paddingRight:12}}>
            {row.type==="campaign"?(
              <span style={{fontSize:13}}>{row.emoji}</span>
            ):(
              <div style={{width:8,height:8,borderRadius:"50%",background:row.color,flexShrink:0}}/>
            )}
            <span style={{fontSize:11.5,fontWeight:600,color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.label}</span>
            <span style={{fontSize:10,color:C.textMute,marginLeft:"auto",flexShrink:0}}>{row.posts.length}</span>
          </div>
          <div style={{flex:1,position:"relative",height:20}}>
            {monthHeaders.map((mh,i)=>(
              <div key={i} style={{position:"absolute",left:`${mh.x}%`,top:0,bottom:0,borderLeft:`1px dashed ${C.borderLight}`,pointerEvents:"none"}}/>
            ))}
            {todayX!==null&&todayX>=0&&todayX<=100&&(
              <div style={{position:"absolute",left:`${todayX}%`,top:-8,bottom:-8,width:1.5,background:C.accent,zIndex:3,pointerEvents:"none"}}>
                <div style={{position:"absolute",top:-2,left:-3,width:7,height:7,borderRadius:"50%",background:C.accent}}/>
              </div>
            )}
            {row.x1!==null&&row.x2!==null&&row.x2>row.x1&&(
              <div style={{position:"absolute",left:`${row.x1}%`,width:`${Math.max(0.5,row.x2-row.x1)}%`,height:10,top:5,borderRadius:5,background:`${row.color}30`,border:`1.5px solid ${row.color}60`}}/>
            )}
            {allTimelinePosts.filter(p=>row.type==="campaign"?p.campaignId===row.id:p.channels?.includes(row.id)).map((p,pi)=>{
              const x=dateToX(p.scheduledDate);
              if(x===null||x<0||x>100)return null;
              const sc=SK[p.status]||{c:C.textMute};
              return <div key={pi} title={`${p.title||"Post"} – ${p.scheduledDate}`}
                onClick={()=>onEdit(p)}
                style={{position:"absolute",left:`${x}%`,top:4,width:12,height:12,borderRadius:"50%",background:sc.c,border:"2px solid #fff",cursor:"pointer",zIndex:2,transform:"translateX(-50%)",boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"transform .1s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateX(-50%) scale(1.35)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateX(-50%) scale(1)"}/>;
            })}
          </div>
        </div>
      ))}
      {/* Legend */}
      <div style={{display:"flex",gap:12,marginTop:10,paddingTop:8,borderTop:`1px solid ${C.borderLight}`,flexWrap:"wrap"}}>
        {Object.entries(SK).map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:v.c}}/>
            <span style={{color:C.textMute,fontWeight:500}}>{v.l}</span>
          </div>
        ))}
        {todayX!==null&&todayX>=0&&todayX<=100&&(
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}>
            <div style={{width:1.5,height:10,background:C.accent}}/>
            <span style={{color:C.textMute,fontWeight:500}}>Heute</span>
          </div>
        )}
      </div>
    </div>
  );

  // ── Campaigns content ──
  const campaignsContent=(
    campCards.length===0?(
      <div style={{padding:"20px 0",textAlign:"center",fontSize:12,color:C.textMute}}>Keine Kampagnen mit Posts.</div>
    ):(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
        {campCards.map(c=>(
          <div key={c.id} style={{borderRadius:10,border:`1px solid ${C.border}`,padding:"12px 14px",background:C.bg,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color+"60";e.currentTarget.style.background="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bg;}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
              <div style={{width:34,height:34,borderRadius:9,background:c.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{c.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:12.5,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:10,color:C.textMute,marginTop:1}}>{c.total} Posts{c.start?` · ${new Date(c.start+"T12:00").toLocaleDateString("de-DE",{day:"numeric",month:"short"})}`:""}</div>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:c.color}}>{c.pct}%</div>
            </div>
            <div style={{height:4,borderRadius:4,background:C.borderLight,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:c.color,width:`${c.pct}%`,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
              <span style={{fontSize:10,color:C.textMute}}>{c.pub} veröffentlicht</span>
              <span style={{fontSize:10,color:C.textMute}}>{c.total-c.pub} ausstehend</span>
            </div>
            <div style={{display:"flex",gap:4,marginTop:8}}>
              {[...new Set(livePosts.filter(p=>p.campaignId===c.id).flatMap(p=>p.channels||[]))].map(ch=>(
                <ChIco key={ch} id={ch} size={12}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  );

  // ── Upcoming posts content ──
  const upcomingContent=(
    upcomingPosts.length===0?(
      <div style={{padding:"20px 0",textAlign:"center",fontSize:12,color:C.textMute}}>Keine geplanten Posts in den nächsten Tagen.</div>
    ):(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"80px 70px 1fr 100px 80px",padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`,marginBottom:2}}>
          {["Datum","Uhrzeit","Post","Kanäle","Status"].map((h,i)=>(
            <div key={i} style={{fontSize:9.5,fontWeight:700,color:C.textMute,letterSpacing:".05em",textTransform:"uppercase"}}>{h}</div>
          ))}
        </div>
        {upcomingPosts.map((p,i)=>{
          const sc=SK[p.status]||{c:C.textMute,l:p.status};
          const camp=campaigns.find(c=>c.id===p.campaignId);
          return(
            <div key={p.id} onClick={()=>onEdit(p)}
              style={{display:"grid",gridTemplateColumns:"80px 70px 1fr 100px 80px",padding:"9px 0",borderBottom:i<upcomingPosts.length-1?`1px solid ${C.borderLight}`:"none",cursor:"pointer",transition:"background .1s",alignItems:"center"}}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{fontSize:11,fontWeight:700,color:C.textMid}}>{new Date(p.scheduledDate+"T12:00").toLocaleDateString("de-DE",{day:"numeric",month:"short"})}</div>
              <div style={{fontSize:11,color:C.textSoft}}>{p.scheduledTime||"–"}</div>
              <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {camp&&<span style={{fontSize:10,marginRight:5}}>{camp.emoji}</span>}
                <span style={{fontSize:11.5,fontWeight:600,color:C.text}}>{p.title||"Kein Titel"}</span>
              </div>
              <div style={{display:"flex",gap:3}}>{p.channels?.slice(0,4).map(c=><ChIco key={c} id={c} size={11}/>)}</div>
              <div style={{padding:"2px 7px",borderRadius:5,background:sc.c+"15",display:"inline-flex",width:"fit-content"}}>
                <span style={{fontSize:10,fontWeight:700,color:sc.c}}>{sc.l}</span>
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  const timelineRight=<div style={{display:"flex",gap:6,alignItems:"center"}}>
    <button onClick={prevPeriod} style={{background:"transparent",border:`1px solid #E5E7EB`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid}}><ChevronLeft size={13}/></button>
    <span style={{fontSize:11,color:C.textMute}}>{timeStart.toLocaleDateString("de-DE",{month:"short",year:"2-digit"})} – {timeEnd.toLocaleDateString("de-DE",{month:"short",year:"2-digit"})}</span>
    <button onClick={goToday} style={{background:"transparent",border:`1px solid #E5E7EB`,borderRadius:6,height:26,padding:"0 8px",cursor:"pointer",fontSize:10,fontWeight:700,color:C.accent,fontFamily:FONT}}>Heute</button>
    <button onClick={nextPeriod} style={{background:"transparent",border:`1px solid #E5E7EB`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid}}><ChevronRight size={13}/></button>
  </div>;

  const widgetMap={
    timeline:{title:'Timeline',right:timelineRight,content:ganttContent},
    campaigns:{title:'Aktive Kampagnen',right:<span style={{fontSize:11,color:'#9CA3AF'}}>{campCards.length} Kampagnen</span>,content:campaignsContent},
    upcoming:{title:'Nächste Posts',right:<span style={{fontSize:11,color:'#9CA3AF'}}>{upcomingPosts.length} kommende</span>,content:upcomingContent},
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:"14px 18px",background:"#F9FAFB",fontFamily:FONT}}>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:600,color:"#111827",letterSpacing:"-.3px"}}>Planner</div>
        <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>Übersicht über alle geplanten Posts & Kampagnen</div>
      </div>
      {order.map(id=>{
        const w=widgetMap[id];if(!w)return null;
        return <SecCard key={id} id={id} title={w.title} right={w.right} dragId={pDragId} overId={pOverId} setDragId={pSetDragId} setOverId={pSetOverId} drop={pDrop}>{w.content}</SecCard>;
      })}
    </div>
  );
}
export default PlannerPage;
