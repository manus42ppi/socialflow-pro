import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, List, Grid, Filter, MoreHorizontal, Check, X, BarChart2 } from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { CHANNELS, DEMO_POSTS } from "../constants/demo.js";
import { fmtDate } from "../utils/store.js";
import { Sp, Badge, Btn, FL } from "../components/ui/index.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── CALENDAR PAGE (Kordiam-inspired) ──────────────────────────────────────
const WEEKDAYS_FULL=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const WEEKDAYS_SHORT=["Mo","Di","Mi","Do","Fr","Sa","So"];
const MONTH_NAMES=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const MONTH_SHORT=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

// CX Fusion design tokens (replaces local Kordiam K object)
const K = {
  bg:        T.appBg,
  surface:   T.white,
  border:    T.gray200,
  borderMid: T.gray300,
  navy:      T.gray900,
  navyMid:   T.gray800,
  navySoft:  T.gray600,
  navyMute:  T.gray400,
  indigo:    T.brand600,
  indigoSoft:T.brand50,
  indigoMid: T.brand500,
  rowHover:  T.brand25,
  tagColors:[
    {bg:"#FFF3E0",color:"#E65100",border:"#FFCC80"},
    {bg:"#E8F5E9",color:"#2E7D32",border:"#A5D6A7"},
    {bg:"#E3F2FD",color:"#1565C0",border:"#90CAF9"},
    {bg:"#F3E5F5",color:"#6A1B9A",border:"#CE93D8"},
    {bg:"#FCE4EC",color:"#C62828",border:"#F48FB1"},
    {bg:"#E0F7FA",color:"#006064",border:"#80DEEA"},
  ],
};

// Assign stable color per channel
const CH_COLOR_MAP={instagram:0,twitter:1,linkedin:2,facebook:3,whatsapp:4};

function KTag({label,colorIdx=0}){
  const t=K.tagColors[colorIdx%K.tagColors.length];
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:5,background:t.bg,color:t.color,border:`1px solid ${t.border}`,fontSize:10.5,fontWeight:700,whiteSpace:"nowrap",letterSpacing:".01em"}}>{label}</span>;
}

function CalendarPage(){
  const { posts: allPosts, setEdPost: onEdit, currentWorkspaceId } = useApp();
  const posts = allPosts.filter(p => !p.deleted);
  const {order,dragId:cDragId,setDragId:cSetDragId,overId:cOverId,setOverId:cSetOverId,drop:cDrop}=useSections("calendar","default",['calendar','list']);
  const today=new Date();
  const [cur,setCur]=useState({y:today.getFullYear(),m:today.getMonth()});
  const [viewMode,setViewMode]=useState("month"); // "month" | "agenda"
  const [hovRow,setHovRow]=useState(null);

  // Reset to current month when workspace changes
  useEffect(()=>{
    setCur({y:today.getFullYear(),m:today.getMonth()});
    setHovRow(null);
  },[currentWorkspaceId]); // eslint-disable-line

  const pad=n=>String(n).padStart(2,"0");
  const dateStr=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
  const todayStr=dateStr(today.getFullYear(),today.getMonth(),today.getDate());

  const prevMonth=()=>setCur(c=>c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1});
  const nextMonth=()=>setCur(c=>c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1});
  const goToday=()=>setCur({y:today.getFullYear(),m:today.getMonth()});

  const daysInMonth=new Date(cur.y,cur.m+1,0).getDate();
  const firstDayOffset=(new Date(cur.y,cur.m,1).getDay()+6)%7;

  // posts for this month, sorted
  const monthStr=`${cur.y}-${pad(cur.m+1)}`;
  const monthPosts=posts
    .filter(p=>p.scheduledDate&&p.scheduledDate.startsWith(monthStr))
    .sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)||(a.scheduledTime||"").localeCompare(b.scheduledTime||""));

  // all scheduled posts for agenda view (current month forward)
  const agendaPosts=posts
    .filter(p=>p.scheduledDate&&p.scheduledDate>=monthStr)
    .sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)||(a.scheduledTime||"").localeCompare(b.scheduledTime||""));

  // build day → posts map
  const postMap=monthPosts.reduce((acc,p)=>{
    acc[p.scheduledDate]=[...(acc[p.scheduledDate]||[]),p];
    return acc;
  },{});

  const STATUS_COLOR={scheduled:K.tagColors[1],draft:K.tagColors[0],pending:K.tagColors[2],published:K.tagColors[3]};
  const STATUS_LABEL={scheduled:"Geplant",draft:"Entwurf",pending:"Freigabe",published:"Live"};
  const STATUS_BAR={scheduled:T.success500,draft:T.warning500,pending:T.brand600,published:T.brand500};

  // ── Agenda / Table view ──────────────────────────────────────────────────
  const AgendaView=()=>{
    // group by date
    const grouped=agendaPosts.reduce((acc,p)=>{
      acc[p.scheduledDate]=[...(acc[p.scheduledDate]||[]),p];
      return acc;
    },{});

    if(Object.keys(grouped).length===0) return(
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,color:K.navyMute,padding:40}}>
        <Calendar size={48} strokeWidth={1}/>
        <div style={{fontSize:15,fontWeight:600,color:K.navySoft}}>Keine geplanten Posts</div>
        <div style={{fontSize:13}}>Plane Posts im Publisher, um sie hier zu sehen.</div>
      </div>
    );

    return(
      <div style={{flex:1,overflow:"auto"}}>
        {/* Table header */}
        <div style={{
          display:"grid", gridTemplateColumns:"36px 100px 70px 1fr 120px 130px",
          background:K.bg, borderBottom:`2px solid ${K.borderMid}`,
          padding:"8px 16px 8px 0", position:"sticky", top:0, zIndex:2,
        }}>
          {["","Datum","Uhrzeit","Beschreibung","Kanäle","Status"].map((h,i)=>(
            <div key={i} style={{fontSize:10.5,fontWeight:700,color:K.navyMute,letterSpacing:".06em",paddingLeft:i===0?0:8}}>{h}</div>
          ))}
        </div>

        {Object.entries(grouped).map(([date,dPosts])=>{
          const d=new Date(date+"T12:00");
          const isToday=date===todayStr;
          const isPast=date<todayStr;
          return(
            <div key={date}>
              {/* Date separator */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px 6px",background:K.bg,borderBottom:`1px solid ${K.border}`,position:"sticky",top:37,zIndex:1}}>
                <div style={{
                  width:32,height:32,borderRadius:8,flexShrink:0,
                  background:isToday?K.indigo:K.indigoSoft,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                }}>
                  <span style={{fontSize:14,fontWeight:800,color:isToday?"#fff":K.indigo,lineHeight:1.1}}>{d.getDate()}</span>
                  <span style={{fontSize:8,fontWeight:700,color:isToday?"rgba(255,255,255,.7)":K.indigoMid,textTransform:"uppercase",letterSpacing:".05em"}}>{MONTH_SHORT[d.getMonth()]}</span>
                </div>
                <div>
                  <span style={{fontSize:13,fontWeight:700,color:isToday?K.indigo:K.navy}}>{WEEKDAYS_FULL[((d.getDay()+6)%7)]}</span>
                  {isToday&&<span style={{marginLeft:8,fontSize:10.5,fontWeight:700,background:K.indigo,color:"#fff",padding:"1px 7px",borderRadius:10}}>Heute</span>}
                  {isPast&&!isToday&&<span style={{marginLeft:6,fontSize:11,color:K.navyMute}}>(vergangen)</span>}
                </div>
                <span style={{marginLeft:"auto",fontSize:11,color:K.navyMute}}>{dPosts.length} Post{dPosts.length!==1?"s":""}</span>
              </div>

              {/* Post rows */}
              {dPosts.map((p,idx)=>{
                const barColor=STATUS_BAR[p.status]||"#CBD5E1";
                const isHov=hovRow===p.id;
                return(
                  <div key={p.id}
                    onMouseEnter={()=>setHovRow(p.id)}
                    onMouseLeave={()=>setHovRow(null)}
                    onClick={()=>onEdit&&onEdit(p)}
                    style={{
                      display:"grid", gridTemplateColumns:"36px 100px 70px 1fr 120px 130px",
                      padding:"10px 16px 10px 0",
                      borderBottom:`1px solid ${K.border}`,
                      background:isHov?K.rowHover:K.surface,
                      cursor:onEdit?"pointer":"default",
                      transition:"background .1s",
                      alignItems:"center",
                    }}>
                    {/* Color bar */}
                    <div style={{display:"flex",justifyContent:"center"}}>
                      <div style={{width:3,height:32,borderRadius:2,background:barColor}}/>
                    </div>
                    {/* Date (empty, already in separator) */}
                    <div style={{paddingLeft:8}}>
                      <div style={{fontSize:12,color:K.navySoft}}>{p.scheduledDate}</div>
                    </div>
                    {/* Time */}
                    <div style={{paddingLeft:8}}>
                      <span style={{fontSize:12.5,fontWeight:600,color:p.scheduledTime?K.navy:K.navyMute}}>{p.scheduledTime||"—"}</span>
                    </div>
                    {/* Description */}
                    <div style={{paddingLeft:8,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:K.navy,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||"Kein Titel"}</div>
                      {p.content&&<div style={{fontSize:11.5,color:K.navySoft,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",opacity:.8}}>{p.content.slice(0,60)}{p.content.length>60?"…":""}</div>}
                    </div>
                    {/* Channels */}
                    <div style={{paddingLeft:8,display:"flex",flexWrap:"wrap",gap:3}}>
                      {p.channels?.slice(0,3).map(c=>(
                        <KTag key={c} label={CHANNELS.find(ch=>ch.id===c)?.label||c} colorIdx={CH_COLOR_MAP[c]||0}/>
                      ))}
                      {(p.channels?.length||0)>3&&<KTag label={`+${p.channels.length-3}`} colorIdx={5}/>}
                    </div>
                    {/* Status */}
                    <div style={{paddingLeft:8}}>
                      {(()=>{const sc=STATUS_COLOR[p.status]||K.tagColors[0];return(
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:5,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`,fontSize:10.5,fontWeight:700}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:sc.color,flexShrink:0}}/>
                          {STATUS_LABEL[p.status]||p.status}
                        </span>
                      );})()}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Month Grid view ──────────────────────────────────────────────────────
  const MonthView=()=>{
    const cells=[...Array(firstDayOffset).fill(null),...Array(daysInMonth).fill(0).map((_,i)=>i+1)];
    while(cells.length%7!==0)cells.push(null);

    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"auto"}}>
        {/* Weekday header */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`2px solid ${K.borderMid}`,flexShrink:0}}>
          {WEEKDAYS_SHORT.map((d,i)=>(
            <div key={d} style={{
              padding:"8px 0",textAlign:"center",
              fontSize:11,fontWeight:700,color:i>=5?K.indigo:K.navyMute,
              letterSpacing:".06em",background:K.bg,
              borderRight:i<6?`1px solid ${K.border}`:"none",
            }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",flex:1,alignItems:"start"}}>
          {cells.map((day,idx)=>{
            if(!day)return <div key={`e${idx}`} style={{borderRight:`1px solid ${K.border}`,borderBottom:`1px solid ${K.border}`,minHeight:110,background:K.bg}}/>;
            const ds=dateStr(cur.y,cur.m,day);
            const dayPosts=postMap[ds]||[];
            const isToday=ds===todayStr;
            const isWknd=(idx%7)>=5;
            return(
              <div key={ds} style={{
                borderRight:idx%7<6?`1px solid ${K.border}`:"none",
                borderBottom:`1px solid ${K.border}`,
                minHeight:110,padding:"6px 7px",
                background:isWknd?"#FAFAFD":K.surface,
                transition:"background .12s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background=K.rowHover}
              onMouseLeave={e=>e.currentTarget.style.background=isWknd?"#FAFAFD":K.surface}>
                {/* Day number */}
                <div style={{marginBottom:4}}>
                  <span style={{
                    display:"inline-flex",alignItems:"center",justifyContent:"center",
                    width:22,height:22,borderRadius:"50%",fontSize:12,fontWeight:isToday?800:500,
                    background:isToday?K.indigo:"transparent",
                    color:isToday?"#fff":isWknd?K.indigo:K.navyMid,
                  }}>{day}</span>
                </div>
                {/* Post pills */}
                {dayPosts.slice(0,3).map(p=>(
                  <div key={p.id} onClick={()=>onEdit&&onEdit(p)}
                    style={{
                      display:"flex",alignItems:"center",gap:4,
                      marginBottom:3,padding:"2px 5px",borderRadius:4,
                      background:STATUS_BAR[p.status]+"18",
                      borderLeft:`2.5px solid ${STATUS_BAR[p.status]||"#CBD5E1"}`,
                      cursor:onEdit?"pointer":"default",
                      overflow:"hidden",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background=STATUS_BAR[p.status]+"30"}
                    onMouseLeave={e=>e.currentTarget.style.background=STATUS_BAR[p.status]+"18"}>
                    {p.scheduledTime&&<span style={{fontSize:9.5,fontWeight:700,color:K.navyMute,flexShrink:0}}>{p.scheduledTime}</span>}
                    <span style={{fontSize:10.5,fontWeight:600,color:K.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||"Post"}</span>
                  </div>
                ))}
                {dayPosts.length>3&&(
                  <div style={{fontSize:10,color:K.indigo,fontWeight:700,paddingLeft:5,marginTop:1}}>+{dayPosts.length-3} mehr</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Calendar toolbar (shared across both views)
  const calToolbar=(
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <button onClick={prevMonth} style={{width:28,height:28,borderRadius:6,border:`1px solid ${K.border}`,background:K.surface,color:K.navySoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=K.indigoSoft;e.currentTarget.style.borderColor=K.indigo;e.currentTarget.style.color=K.indigo;}} onMouseLeave={e=>{e.currentTarget.style.background=K.surface;e.currentTarget.style.borderColor=K.border;e.currentTarget.style.color=K.navySoft;}}>‹</button>
        <div style={{minWidth:160,textAlign:"center",fontFamily:FONT,fontWeight:700,fontSize:15,color:K.navy,letterSpacing:"-.01em"}}>{MONTH_NAMES[cur.m]} {cur.y}</div>
        <button onClick={nextMonth} style={{width:28,height:28,borderRadius:6,border:`1px solid ${K.border}`,background:K.surface,color:K.navySoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=K.indigoSoft;e.currentTarget.style.borderColor=K.indigo;e.currentTarget.style.color=K.indigo;}} onMouseLeave={e=>{e.currentTarget.style.background=K.surface;e.currentTarget.style.borderColor=K.border;e.currentTarget.style.color=K.navySoft;}}>›</button>
      </div>
      <button onClick={goToday} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${K.border}`,background:K.surface,color:K.navySoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=K.indigoSoft;e.currentTarget.style.color=K.indigo;e.currentTarget.style.borderColor=K.indigo;}} onMouseLeave={e=>{e.currentTarget.style.background=K.surface;e.currentTarget.style.color=K.navySoft;e.currentTarget.style.borderColor=K.border;}}>Heute</button>
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:12,color:K.navySoft,display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontWeight:700,color:K.indigo}}>{monthPosts.length}</span> Posts im {MONTH_NAMES[cur.m]}
        </div>
        <div style={{display:"flex",gap:1,background:K.bg,borderRadius:7,padding:3,border:`1px solid ${K.border}`}}>
          {[["month","Monat",Calendar],["agenda","Agenda",BarChart2]].map(([v,l,Ic])=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:5,border:"none",background:viewMode===v?K.surface:"transparent",color:viewMode===v?K.navy:K.navySoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,boxShadow:viewMode===v?"0 1px 3px rgba(26,35,64,.08)":"none",transition:"all .15s"}}>
              <Ic size={13} strokeWidth={2}/>{l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const legendStrip=(
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10,flexWrap:"wrap"}}>
      <span style={{fontSize:10.5,fontWeight:700,color:K.navyMute,letterSpacing:".05em"}}>STATUS:</span>
      {Object.entries(STATUS_COLOR).map(([s,t])=>(
        <div key={s} style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:8,height:8,borderRadius:2,background:t.color,opacity:.8}}/>
          <span style={{fontSize:10.5,color:K.navySoft,fontWeight:600}}>{STATUS_LABEL[s]}</span>
        </div>
      ))}
    </div>
  );

  const calendarContent=(
    <div style={{fontFamily:FONT}}>
      {calToolbar}
      {legendStrip}
      <MonthView/>
    </div>
  );

  const agendaContent=(
    <div style={{fontFamily:FONT}}>
      {calToolbar}
      <AgendaView/>
    </div>
  );

  const widgetMap={
    calendar:{title:'Kalender',right:<span style={{fontSize:11,color:C.textMute}}>{viewMode==="month"?"Monatsansicht":"Agenda"}</span>,content:calendarContent},
    list:{title:'Posts',right:<span style={{fontSize:11,color:C.textMute}}>{monthPosts.length} Posts</span>,content:agendaContent},
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:"14px 18px",background:C.bg,fontFamily:FONT}}>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:FONT,fontSize:22,fontWeight:600,color:C.text,letterSpacing:"-.3px"}}>Kalender</div>
        <div style={{fontSize:12,color:C.textMute,marginTop:2}}>Alle geplanten Posts im Überblick</div>
      </div>
      {order.map(id=>{
        const w=widgetMap[id];if(!w)return null;
        return <SecCard key={id} id={id} title={w.title} right={w.right} dragId={cDragId} overId={cOverId} setDragId={cSetDragId} setOverId={cSetOverId} drop={cDrop}>{w.content}</SecCard>;
      })}
    </div>
  );
}
export default CalendarPage;
