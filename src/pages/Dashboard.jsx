import { useState, useEffect, useRef, useMemo } from "react";
import { BarChart2, TrendingUp, Calendar, Clock, Zap, CheckCircle, AlertCircle, Edit3, Trash2, Plus, Eye, Heart, MessageCircle, Share2, RefreshCw, ChevronRight, Star, Award, Target, Activity, Send, ArrowUp, ArrowDown, FileText, CalendarRange, Image, Flag } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW, CSS } from "../constants/colors.js";
import { CHANNELS, ROLES, DEMO_USERS, STAGES, CAMP_COLORS, DEMO_CAMPAIGNS, DEMO_POSTS } from "../constants/demo.js";
import { fmtDate, fpos } from "../utils/store.js";
import { Sp, Badge, Avatar, Btn, Card, FL, TIn, SBadge, SCrd } from "../components/ui/index.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { PREV } from "../components/previews/index.jsx";
import MiniGantt from "../components/widgets/MiniGantt.jsx";
import WeekStrip from "../components/widgets/WeekStrip.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── DASHBOARD ──────────────────────────────────────────────────────────────
function Dashboard(){
  const { posts: allPosts, items, campaigns, user, goNav: onNav, goFilter: onFilterNav } = useApp();
  const posts = allPosts.filter(p => !p.deleted);
  const sched=useMemo(()=>posts.filter(p=>p.status==="scheduled"),[posts]);
  const drafts=useMemo(()=>posts.filter(p=>p.status==="draft"),[posts]);
  const pend=useMemo(()=>posts.filter(p=>p.status==="pending"),[posts]);
  const pub=useMemo(()=>posts.filter(p=>p.status==="published"),[posts]);
  const recent=useMemo(()=>[...posts].slice(-12).reverse(),[posts]);
  const [hovCard,setHovCard]=useState(null);

  // Widget order + drag state (uses shared useSections hook)
  const {order:wOrder,dragId,setDragId,overId,setOverId,drop:dropOn}=useSections("dashboard",user.id,['hero','stats','actions','gantt','week','posts']);

  // Live clock
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),10000);return()=>clearInterval(t);},[]);
  const hour=now.getHours();
  const greeting=hour<12?"Guten Morgen":hour<18?"Guten Tag":"Guten Abend";
  const timeStr=now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  const dateStr=now.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const kw=Math.ceil((now-new Date(now.getFullYear(),0,1)+new Date(now.getFullYear(),0,1).getDay()*86400000)/(7*86400000));

  // Sparkline SVG
  const sparkData=[3,7,4,9,6,11,8,14,10,16,12,18];
  const Spark=({data,color})=>{
    const h=24,max=Math.max(...data),min=Math.min(...data);
    const pts=data.map((v,i)=>`${(i/(data.length-1))*100},${h-((v-min)/(max-min||1))*(h-4)+2}`).join(" ");
    return <svg width="100%" height={h} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
      <defs><linearGradient id={`g${color.replace(/[#,()]/g,"")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`0,${h} ${pts} 100,${h}`} fill={`url(#g${color.replace(/[#,()]/g,"")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>;
  };

  // KPI Card – subtler numbers
  const KpiCard=({icon:Icon,label,value,delta,color,trend,onClick,id})=>{
    const hov=hovCard===id;
    return <div onClick={onClick} onMouseEnter={()=>setHovCard(id)} onMouseLeave={()=>setHovCard(null)}
      style={{
        position:"relative",background:hov?`linear-gradient(145deg,${color}10,#fff)`:C.surface,
        borderRadius:14,border:`1px solid ${hov?color+"35":C.border}`,
        padding:"16px 18px 12px",cursor:onClick?"pointer":"default",
        transition:"all .2s",overflow:"hidden",
        boxShadow:hov?`0 6px 24px ${color}18`:"0 1px 4px rgba(0,0,0,.04)",
      }}>
      <div style={{position:"absolute",top:-16,right:-16,width:72,height:72,borderRadius:"50%",background:color+"07",pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:color+"15",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon size={16} color={color} strokeWidth={2}/>
        </div>
        {delta!==undefined&&<div style={{display:"flex",alignItems:"center",gap:2,fontSize:10.5,fontWeight:700,color:delta>=0?"#16A34A":"#DC2626",background:delta>=0?"#F0FDF4":"#FEF2F2",padding:"2px 7px",borderRadius:20,border:`1px solid ${delta>=0?"#BBF7D0":"#FECACA"}`}}>
          {delta>=0?<ArrowUp size={9} strokeWidth={3}/>:<ArrowDown size={9} strokeWidth={3}/>}{Math.abs(delta)}%
        </div>}
      </div>
      <div style={{fontSize:19,fontWeight:800,color:C.text,letterSpacing:"-.02em",lineHeight:1.1,fontFamily:FONT_DISPLAY}}>{value}</div>
      <div style={{fontSize:11.5,color:C.textSoft,marginTop:3,fontWeight:500}}>{label}</div>
      {trend&&<div style={{marginTop:8}}><Spark data={trend} color={color}/></div>}
    </div>;
  };

  // Slim status row
  const StatusRow=({post,last})=>{
    const s={scheduled:{color:"#16A34A",bg:"#F0FDF4",label:"Geplant"},draft:{color:"#D97706",bg:"#FFFBEB",label:"Entwurf"},pending:{color:"#2563EB",bg:"#EFF6FF",label:"Review"},published:{color:"#7C3AED",bg:"#F5F3FF",label:"Live"}}[post.status]||{color:C.textSoft,bg:C.bg,label:post.status};
    return <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:last?"none":`1px solid ${C.borderLight}`}}>
      <div style={{width:32,height:32,borderRadius:9,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <FileText size={13} color={C.textMute} strokeWidth={1.8}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:12.5,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.title||"Kein Titel"}</div>
        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
          {post.channels?.slice(0,3).map(c=><ChIco key={c} id={c} size={10}/>)}
          {post.scheduledDate&&<span style={{fontSize:10,color:C.textMute}}>{post.scheduledDate}</span>}
        </div>
      </div>
      <div style={{padding:"2px 8px",borderRadius:20,background:s.bg,flexShrink:0}}>
        <span style={{fontSize:10.5,fontWeight:700,color:s.color}}>{s.label}</span>
      </div>
    </div>;
  };

  // Donut chart
  const DonutChart=()=>{
    const data=CHANNELS.map(ch=>({...ch,n:posts.filter(p=>p.channels?.includes(ch.id)).length}));
    const total=data.reduce((a,b)=>a+b.n,0)||1;
    let cum=0;
    const R=32,cx=40,cy=40,sw=8;
    const arcs=data.filter(d=>d.n>0).map(d=>{
      const pct=d.n/total,s=cum,e=cum+pct; cum+=pct;
      const a1=s*2*Math.PI-Math.PI/2,a2=e*2*Math.PI-Math.PI/2;
      const large=pct>.5?1:0;
      return {d:`M ${cx+R*Math.cos(a1)} ${cy+R*Math.sin(a1)} A ${R} ${R} 0 ${large} 1 ${cx+R*Math.cos(a2)} ${cy+R*Math.sin(a2)}`,color:d.color,n:d.n,label:d.label};
    });
    return <div style={{display:"flex",alignItems:"center",gap:14}}>
      <svg width={80} height={80} viewBox="0 0 80 80" style={{flexShrink:0}}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.borderLight} strokeWidth={sw}/>
        {arcs.map((a,i)=><path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="round"/>)}
        <text x={cx} y={cy-3} textAnchor="middle" fontSize="12" fontWeight="800" fill={C.text}>{total}</text>
        <text x={cx} y={cy+9} textAnchor="middle" fontSize="7.5" fill={C.textMute}>Posts</text>
      </svg>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
        {CHANNELS.map(ch=>{const n=posts.filter(p=>p.channels?.includes(ch.id)).length;
          return <div key={ch.id} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:7,height:7,borderRadius:2,background:ch.color,flexShrink:0}}/>
            <span style={{fontSize:11,color:C.textMid,flex:1}}>{ch.label}</span>
            <span style={{fontSize:11.5,fontWeight:700,color:C.text}}>{n}</span>
          </div>;
        })}
      </div>
    </div>;
  };

  // ── SVG icon helpers (monochrome, inline) ──────────────────────────────
  const SvgCheck =()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 7l4 5 8-9" stroke={C.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const SvgDoc   =()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2h10a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke={C.text} strokeWidth="1.4"/><path d="M4 5h6M4 7h3" stroke={C.text} strokeWidth="1.4" strokeLinecap="round"/></svg>;
  const SvgClock =()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke={C.text} strokeWidth="1.4"/><path d="M7 4v3.5l2 1.5" stroke={C.text} strokeWidth="1.4" strokeLinecap="round"/></svg>;
  const SvgTrend =()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 10l3-4 3 3 2.5-4L13 8" stroke={C.text} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const QaIcon=({type})=>{
    const s={stroke:C.text,strokeWidth:"1.4",strokeLinecap:"round",strokeLinejoin:"round"};
    if(type==="post")   return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5a1.5 1.5 0 012.1 2.1L5 13H2.5l.5-2.5L11.5 2.5z" {...s}/></svg>;
    if(type==="cal")    return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="1.5" stroke={C.text} strokeWidth="1.4"/><path d="M5 1v4M11 1v4M1 7h14" {...s}/></svg>;
    if(type==="upload") return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3" {...s}/><path d="M2 12v1.5a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V12" {...s}/></svg>;
    if(type==="perf")   return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 13V9M6 13V6M10 13V3M14 13V1" {...s}/></svg>;
    if(type==="camp")   return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke={C.text} strokeWidth="1.4"/><path d="M8 4.5v3.5l2.5 1.5" {...s}/></svg>;
    return null;
  };

  // Image cover helper
  const getCover=p=>{if(p.mediaId){const m=items.find(x=>x.id===p.mediaId);return m?.url;}return null;};

  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"};
  const lift=e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,.09)";};
  const drop=e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.04)";};

  // ── Image-forward post card ──
  const PostCard=({post})=>{
    const cover=getCover(post);
    const camp=campaigns.find(c=>c.id===post.campaignId);
    const isHov=hovCard===post.id;
    const sc={scheduled:{c:C.accent,l:"Geplant"},draft:{c:C.warning,l:"Entwurf"},pending:{c:"#818CF8",l:"Freigabe"},published:{c:C.success,l:"Live"}}[post.status]||{c:C.textSoft,l:"–"};
    return(
      <div onClick={()=>onNav("publisher")} onMouseEnter={()=>setHovCard(post.id)} onMouseLeave={()=>setHovCard(null)}
        style={{borderRadius:10,overflow:"hidden",cursor:"pointer",position:"relative",breakInside:"avoid",marginBottom:10,
          border:`1.5px solid ${isHov?C.accent+"55":C.border}`,transition:"all .18s",
          transform:isHov?"translateY(-2px)":"none",boxShadow:isHov?"0 8px 22px rgba(0,0,0,.1)":"0 1px 3px rgba(0,0,0,.04)",
          background:cover?"#111":C.surface}}>
        {cover?(
          <>
            <img src={cover} alt={post.title||""} style={{width:"100%",display:"block",objectFit:"contain",height:180,background:"#111"}} loading="lazy"/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.05) 0%,transparent 35%,rgba(0,0,0,.72) 100%)"}}/>
            <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.58)",borderRadius:5,padding:"2px 7px",backdropFilter:"blur(6px)"}}>
              <span style={{fontSize:9.5,fontWeight:700,color:sc.c}}>{sc.l}</span>
            </div>
            {camp&&<div style={{position:"absolute",top:8,left:8,fontSize:14,filter:"drop-shadow(0 1px 2px rgba(0,0,0,.5))"}}>{camp.emoji}</div>}
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 10px"}}>
              <div style={{fontWeight:700,fontSize:12,color:"#fff",lineHeight:1.3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{post.title||"Kein Titel"}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
                <div style={{display:"flex",gap:3}}>{post.channels?.slice(0,3).map(c=><ChIco key={c} id={c} size={11}/>)}</div>
                {post.scheduledDate&&<span style={{fontSize:9,color:"rgba(255,255,255,.55)"}}>{post.scheduledDate}</span>}
              </div>
            </div>
          </>
        ):(
          <div style={{padding:"13px 13px 11px",background:`linear-gradient(135deg,${C.surface} 60%,${camp?camp.color+"0a":C.bg})`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{display:"flex",gap:3}}>{post.channels?.slice(0,3).map(c=><ChIco key={c} id={c} size={13}/>)}</div>
              <span style={{fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:5,background:sc.c+"15",color:sc.c}}>{sc.l}</span>
            </div>
            <div style={{fontWeight:700,fontSize:12.5,color:C.text,lineHeight:1.35,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>{post.title||"Kein Titel"}</div>
            {post.content&&<div style={{fontSize:11,color:C.textSoft,marginTop:5,lineHeight:1.45,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{post.content}</div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:9,paddingTop:7,borderTop:`1px solid ${C.borderLight}`}}>
              <span style={{fontSize:10,color:C.textMute}}>{camp?`${camp.emoji} ${camp.name}`:"Kein Projekt"}</span>
              <span style={{fontSize:10,color:C.textMute}}>{post.scheduledDate||"–"}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Widget content map
  const heroContent=(
    <div style={{...card,borderRadius:14,display:"grid",gridTemplateColumns:"auto 1fr auto",overflow:"hidden",minHeight:108}}>
      <div style={{background:C.text,padding:"18px 24px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:148}}>
        <div style={{fontFamily:FONT,fontSize:38,fontWeight:200,color:"#fff",lineHeight:1,letterSpacing:"2px"}}>{timeStr}</div>
        <div style={{fontSize:9,fontWeight:400,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".8px",marginTop:6}}>KW {kw}</div>
        <div style={{fontSize:11.5,fontWeight:300,color:"rgba(255,255,255,.65)",marginTop:5,lineHeight:1.5}}>{dateStr}</div>
      </div>
      <div style={{padding:"18px 24px",display:"flex",flexDirection:"column",justifyContent:"center",borderLeft:`1px solid ${C.borderLight}`,borderRight:`1px solid ${C.borderLight}`}}>
        <div style={{fontSize:10,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".7px",marginBottom:5}}>Willkommen zurück</div>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:20,fontWeight:600,color:C.text,lineHeight:1.15}}>{greeting}, {user.name.split(" ")[0]}</div>
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
          {pend.length>0&&<span onClick={()=>onFilterNav("publisher","pending")} style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:6,background:C.warningBg,color:C.warning,cursor:"pointer"}}>{pend.length} zur Freigabe</span>}
          {sched.length>0&&<span onClick={()=>onFilterNav("publisher","scheduled")} style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:6,background:C.accentLight,color:C.accent,cursor:"pointer"}}>{sched.length} geplant</span>}
          {posts.length===0&&<span style={{fontSize:12,color:C.textSoft,fontStyle:"italic"}}>Erstelle deinen ersten Post ✨</span>}
        </div>
      </div>
      <div style={{display:"flex"}}>
        <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",justifyContent:"center",borderRight:`1px solid ${C.borderLight}`}}>
          <div style={{fontSize:9.5,fontWeight:400,textTransform:"uppercase",letterSpacing:".11em",color:C.textMute,marginBottom:6}}>Posts gesamt</div>
          <div style={{fontFamily:FONT,fontSize:34,fontWeight:600,color:C.text,lineHeight:1,letterSpacing:"-.5px"}}>{posts.length}</div>
        </div>
        <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:9.5,fontWeight:400,textTransform:"uppercase",letterSpacing:".11em",color:C.textMute,marginBottom:6}}>Kampagnen</div>
          <div style={{fontFamily:FONT,fontSize:34,fontWeight:600,color:C.text,lineHeight:1,letterSpacing:"-.5px"}}>{campaigns.length}</div>
        </div>
      </div>
    </div>
  );

  const statsContent=(
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
      {[
        {label:"Aktive Posts",  value:sched.length,  sub:"Geplant",         color:"#3B82F6", nav:()=>onFilterNav("publisher","scheduled")},
        {label:"Zur Freigabe",  value:pend.length,   sub:"Ausstehend",       color:C.warning, nav:()=>onFilterNav("publisher","pending")},
        {label:"Entwürfe",      value:drafts.length, sub:"Nicht geplant",    color:"#8B5CF6", nav:()=>onFilterNav("publisher","draft")},
        {label:"Veröffentlicht",value:pub.length,    sub:"Alle Zeiten",      color:C.success, nav:()=>onFilterNav("publisher","published")},
        {label:"Kampagnen",     value:campaigns.length,sub:"Aktiv",          color:"#EC4899", nav:()=>onNav("campaigns")},
      ].map((st,i)=>(
        <div key={i} onClick={st.nav}
          style={{padding:"16px 0 14px",cursor:"pointer",transition:"background .15s",borderTop:`2px solid ${st.color}`,paddingTop:14}}
          onMouseEnter={e=>e.currentTarget.style.background=`${st.color}06`}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <div style={{fontSize:9.5,fontWeight:400,textTransform:"uppercase",letterSpacing:".1em",color:C.textMute,marginBottom:8}}>{st.label}</div>
          <div style={{fontFamily:FONT,fontSize:40,fontWeight:600,color:C.text,lineHeight:1,letterSpacing:"-.5px"}}>{st.value}</div>
          <div style={{fontSize:10,fontWeight:300,color:C.textSoft,marginTop:6,letterSpacing:".02em"}}>{st.sub}</div>
        </div>
      ))}
    </div>
  );

  const actionsContent=(
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
      {[
        {I:Send,          label:"Post erstellen",  sub:"Neuer Inhalt",    nav:"publisher",   color:"#3B82F6"},
        {I:CalendarRange, label:"Planner",         sub:"Timeline & Plan", nav:"planner",     color:"#5B5BD6"},
        {I:Calendar,      label:"Kalender",        sub:"Monatsansicht",   nav:"calendar",    color:"#8B5CF6"},
        {I:Image,         label:"Medien",          sub:"Bilder & Videos", nav:"media",       color:"#10B981"},
        {I:BarChart2,     label:"Performance",     sub:"Auswertungen",    nav:"performance", color:"#F59E0B"},
        {I:Flag,          label:"Kampagnen",       sub:"Projekte",        nav:"campaigns",   color:"#EC4899"},
      ].map((qa,i)=>(
        <div key={i} onClick={()=>onNav(qa.nav)}
          style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background .15s",borderRadius:8}}
          onMouseEnter={e=>e.currentTarget.style.background=`${qa.color}08`}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <div style={{width:32,height:32,borderRadius:8,background:qa.color+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <qa.I size={15} color={qa.color} strokeWidth={1.8}/>
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:400,color:C.textMid,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{qa.label}</div>
            <div style={{fontSize:10,fontWeight:300,color:C.textMute,marginTop:1}}>{qa.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const postsRight=<button onClick={()=>onNav("publisher")} style={{fontSize:11,color:C.accent,fontWeight:400,background:"none",border:"none",cursor:"pointer",fontFamily:FONT}}>Alle anzeigen →</button>;
  const postsContent=(
    recent.length===0?(
      <div style={{...card,padding:"48px 20px",textAlign:"center",color:C.textMute}}>
        <Send size={40} strokeWidth={1} style={{margin:"0 auto 12px",display:"block",opacity:.35}}/>
        <div style={{fontWeight:700,fontSize:14,color:C.textMid,marginBottom:4}}>Noch keine Posts</div>
        <div style={{fontSize:12,marginBottom:16}}>Erstelle deinen ersten Social-Media-Post</div>
        <Btn onClick={()=>onNav("publisher")}><Plus size={13}/>Post erstellen</Btn>
      </div>
    ):(
      <div style={{columns:"3 180px",columnGap:10}}>
        {recent.map(p=><PostCard key={p.id} post={p}/>)}
      </div>
    )
  );

  const widgetMap={
    hero: {title:'',content:heroContent},
    stats: {title:'Übersicht',content:statsContent},
    actions: {title:'Schnellzugriff',content:actionsContent},
    gantt: {title:'Timeline',content:<MiniGantt posts={posts} campaigns={campaigns} onNav={onNav}/>},
    week: {title:'Nächste 7 Tage',content:<WeekStrip posts={posts} campaigns={campaigns} now={now} onNav={onNav}/>},
    posts: {title:'Letzte Posts',right:postsRight,content:postsContent},
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:"14px 18px",background:C.bg}}>
      {wOrder.map(id=>{
        const w=widgetMap[id];
        if(!w)return null;
        return <SecCard key={id} id={id} title={w.title} right={w.right} dragId={dragId} overId={overId} setDragId={setDragId} setOverId={setOverId} drop={dropOn}>{w.content}</SecCard>;
      })}
    </div>
  );
}
export default Dashboard;
