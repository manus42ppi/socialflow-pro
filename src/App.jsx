import { useState, useRef, useCallback, useEffect } from "react";
// Persistenz via Netlify Blobs
async function dbGet(key) {
  try {
    const r = await fetch("/.netlify/functions/store", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "get", path: key })
    });
    const d = await r.json();
    return d.ok ? d.data : null;
  } catch { return null; }
}
async function dbSet(key, value) {
  try {
    await fetch("/.netlify/functions/store", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "set", path: key, value })
    });
  } catch {}
}

import {
  LayoutDashboard, Send, Image, Calendar, BarChart2, Settings, Flag,
  Users, Bell, LogOut, Plus, Search, Clock, Check, X, Edit2, Trash2,
  Upload, Star, TrendingUp, ArrowUp, ArrowDown, Activity, Globe,
  Lock, Mail, Shield, AlertCircle, CheckCircle, Instagram,
  Twitter, Linkedin, Facebook, Music, Hash, Layers, Inbox, Sparkles,
  Tag, MapPin, Zap, FileText, Eye
} from "lucide-react";

// ââ FONT & COLORS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const FONT = "'DM Sans', system-ui, sans-serif";
const IW = 1.7;
const C = {
  bg:"#F7F8FA", sidebar:"#0D0F12",
  surface:"#FFFFFF", border:"#E4E7EC", borderLight:"#F2F4F7",
  text:"#101828", textMid:"#344054", textSoft:"#667085", textMute:"#98A2B3",
  accent:"#E53E3E", accentLight:"#FEF2F2",
  success:"#027A48", successBg:"#ECFDF3",
  warning:"#B54708", warningBg:"#FFFAEB",
  info:"#175CD3", infoBg:"#EFF8FF",
  purple:"#6941C6", purpleBg:"#F9F5FF",
};
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  * { box-sizing:border-box; }  body { margin:0; }
`;

// ââ DOMAIN DATA ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const CHANNELS = [
  { id:"instagram", label:"Instagram",  color:"#E1306C", bg:"#fff0f6", maxChars:2200  },
  { id:"twitter",   label:"X/Twitter",  color:"#000000", bg:"#f7f7f7", maxChars:280   },
  { id:"linkedin",  label:"LinkedIn",   color:"#0077B5", bg:"#f0f7fc", maxChars:3000  },
  { id:"facebook",  label:"Facebook",   color:"#1877F2", bg:"#f0f5ff", maxChars:63000 },
  { id:"tiktok",    label:"TikTok",     color:"#010101", bg:"#f5f5f5", maxChars:2200  },
  { id:"whatsapp",  label:"WhatsApp",   color:"#25D366", bg:"#f0fdf4", maxChars:65536 },
];
const ROLES = {
  admin:  { label:"Admin",      color:"#E53E3E", can:["read","write","schedule","delete","admin","approve"] },
  editor: { label:"Editor",     color:"#175CD3", can:["read","write","schedule"] },
  viewer: { label:"Betrachter", color:"#667085", can:["read"] },
};
const DEMO_USERS = [
  { id:"1", email:"admin@demo.com",  password:"admin123",  name:"Dietmar S.", role:"admin",  avatar:"DS" },
  { id:"2", email:"editor@demo.com", password:"editor123", name:"Maria K.",   role:"editor", avatar:"MK" },
  { id:"3", email:"viewer@demo.com", password:"view123",   name:"Lukas M.",   role:"viewer", avatar:"LM" },
];
const STAGES = [
  { id:"draft",     label:"Entwurf",        color:"#B54708", bg:"#FFFAEB", border:"#FDE68A", header:"#FEF3C7" },
  { id:"pending",   label:"Zur Freigabe",   color:"#175CD3", bg:"#EFF8FF", border:"#BFDBFE", header:"#DBEAFE" },
  { id:"scheduled", label:"Geplant",        color:"#027A48", bg:"#ECFDF3", border:"#A7F3D0", header:"#D1FAE5" },
  { id:"published", label:"VerÃ¶ffentlicht", color:"#6941C6", bg:"#F9F5FF", border:"#DDD6FE", header:"#EDE9FE" },
];
const CAMP_COLORS = ["#E53E3E","#0077B5","#027A48","#B54708","#6941C6","#E1306C","#25D366","#F59E0B","#06B6D4","#EC4899"];
const CAMP_EMOJIS = ["ð¯","ð","ðª","ð¸","ð","ð","ð","â¤ï¸","ð","ð","ð","ð¥","ð¡","âï¸","â¡","ð"];
const DEMO_CAMPAIGNS = [
  { id:"c1", name:"Sommer-Sale",   emoji:"âï¸", color:"#F59E0B", description:"Posts fÃ¼r den Sommer Sale" },
  { id:"c2", name:"Produktlaunch", emoji:"ð", color:"#6941C6", description:"Launch Q2 2026" },
];
const DEMO_POSTS = [
  { id:"p1", title:"Produktlaunch Q2",  content:"Unser neues Produkt ist da! ð", hashtags:"#launch #neu",     channels:["instagram","linkedin"], scheduledDate:"2026-03-15", scheduledTime:"09:00", status:"scheduled", mediaId:null, campaignId:"c2" },
  { id:"p2", title:"Tipp der Woche",    content:"RegelmÃ¤Ãiges Posting steigert deine Reichweite um 40%.", hashtags:"#marketing", channels:["twitter","facebook"],  scheduledDate:"",          scheduledTime:"",      status:"draft",     mediaId:null, campaignId:null },
  { id:"p3", title:"Behind the Scenes", content:"Blick hinter die Kulissen! ðª", hashtags:"#team #bts",       channels:["instagram","whatsapp"],  scheduledDate:"2026-03-20", scheduledTime:"18:00", status:"scheduled", mediaId:null, campaignId:null },
  { id:"p4", title:"Kundenreview",      content:"Was unsere Kunden sagen. Danke! â¤ï¸", hashtags:"#review",    channels:["instagram","linkedin"],  scheduledDate:"",          scheduledTime:"",      status:"pending",   mediaId:null, campaignId:null },
  { id:"p5", title:"Sommer Sale",       content:"âï¸ Bis zu 40% Rabatt â nur kurze Zeit!", hashtags:"#sale", channels:["instagram","facebook","tiktok"], scheduledDate:"2026-06-01", scheduledTime:"10:00", status:"draft", mediaId:null, campaignId:"c1" },
];

// ââ UTILS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const uid = () => Math.random().toString(36).slice(2,10);
const fileToDataURL = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
const getMediaType = f => f.type.startsWith("video/")?"video": f.name.toLowerCase().includes("logo")?"logo": f.type.startsWith("image/")?"image":"document";
const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}) : "";

// ââ AI SERVICE âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
async function aiCall(messages, max_tokens=800) {
  const r = await fetch("/.netlify/functions/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens,messages}),
  });
  return (await r.json()).content?.[0]?.text||"";
}
const AI = {
  optimize:(text,ch,tone)=>aiCall([{role:"user",content:`Optimiere fÃ¼r ${ch}. Ton:${tone}. NUR Text:\n${text}`}]),
  hashtags:(text,ch)=>aiCall([{role:"user",content:`5-10 Hashtags fÃ¼r ${ch}. NUR Hashtags:\n${text}`}],200),
  variants:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`3 Varianten fÃ¼r ${ch}: professionell,locker,aufmerksamkeitsstark. NUR JSON:{"variants":[{"tone":"","text":""}]}`}],1200);
    try{return JSON.parse(raw.replace(/```json|```/g,"").trim()).variants||[];}catch{return[];}
  },
  analyzeImg:async(dataUrl)=>{
    const b64=dataUrl.split(",")[1],mime=dataUrl.split(";")[0].split(":")[1]||"image/jpeg";
    const raw=await aiCall([{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mime,data:b64}},
      {type:"text",text:'Analysiere fÃ¼r Social Media. NUR JSON:{"tags":[],"description":"","suggestedAlt":"","mood":""}'}
    ]}],400);
    try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{return{};}
  },
};
// ââ UI PRIMITIVES ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Sp({color="#fff"}){return <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${color}30`,borderTopColor:color,animation:"spin .7s linear infinite",flexShrink:0}}/>;}
function Badge({color,bg,children}){return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:bg||C.borderLight,color:color||C.textSoft,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{children}</span>;}
function Avatar({initials,size=32,color=C.accent}){return <div style={{width:size,height:size,borderRadius:"50%",background:color+"22",color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*.36,flexShrink:0,border:`1.5px solid ${color}33`}}>{initials}</div>;}

function Btn({children,variant="primary",size="md",onClick,disabled=false,style={}}){
  const V={
    primary:{background:C.accent,color:"#fff",border:"none"},
    secondary:{background:C.surface,color:C.textMid,border:`1px solid ${C.border}`},
    ghost:{background:"transparent",color:C.textSoft,border:"none"},
    danger:{background:C.accentLight,color:C.accent,border:`1px solid #FECACA`},
    success:{background:C.successBg,color:C.success,border:`1px solid #A7F3D0`},
    ai:{background:"linear-gradient(135deg,#6941C6,#E53E3E)",color:"#fff",border:"none"},
  };
  const P={sm:"5px 11px",md:"8px 16px"};
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",gap:6,padding:P[size]||P.md,borderRadius:8,fontWeight:600,fontSize:size==="sm"?12:13,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.55:1,transition:"all .15s",fontFamily:FONT,...V[variant],...style}}>{children}</button>;
}

function Card({children,style={},onClick}){return <div onClick={onClick} style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,.04)",...style}}>{children}</div>;}
function FL({children}){return <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:5}}>{children}</label>;}

function TIn({label,icon:Icon,textarea=false,minH,...props}){
  const base={width:"100%",padding:Icon?"9px 12px 9px 34px":"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",color:C.text,background:C.surface,boxSizing:"border-box",fontFamily:FONT,...props.style};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<FL>{label}</FL>}
      <div style={{position:"relative"}}>
        {Icon&&<Icon size={14} color={C.textMute} strokeWidth={IW} style={{position:"absolute",left:11,top:textarea?11:"50%",transform:textarea?"none":"translateY(-50%)",pointerEvents:"none"}}/>}
        {textarea?<textarea {...props} style={{...base,minHeight:minH||90,resize:"vertical"}}/>:<input {...props} style={base}/>}
      </div>
    </div>
  );
}

function SBadge({status}){
  const M={
    scheduled:{color:C.success,bg:C.successBg,label:"Geplant",I:CheckCircle},
    draft:    {color:C.warning,bg:C.warningBg,label:"Entwurf", I:FileText},
    pending:  {color:C.info,  bg:C.infoBg,   label:"Freigabe",I:Clock},
    published:{color:C.purple,bg:C.purpleBg, label:"Live",     I:Globe},
  };
  const m=M[status]||M.draft;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:m.bg,color:m.color,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20}}><m.I size={11} strokeWidth={2}/>{m.label}</span>;
}

function SCrd({icon:Icon,label,value,delta,color,onClick}){
  const c=color||C.accent;
  return(
    <div onClick={onClick} style={{
      background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,
      padding:"20px 20px 16px",cursor:onClick?"pointer":"default",
      transition:"all .2s",userSelect:"none",position:"relative",overflow:"hidden",
      boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=c+"55";}}}
      onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)";e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;}}}>
      <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:c+"0D",pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:12,background:c+"15",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${c}22`}}>
          <Icon size={18} color={c} strokeWidth={1.8}/>
        </div>
        {delta!==undefined&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:20,background:delta>=0?C.successBg:C.accentLight,color:delta>=0?C.success:C.accent}}>
          {delta>=0?<ArrowUp size={10} strokeWidth={2.5}/>:<ArrowDown size={10} strokeWidth={2.5}/>}{Math.abs(delta)}%
        </div>}
      </div>
      <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:"-.8px",lineHeight:1}}>{value}</div>
      <div style={{fontSize:12,fontWeight:500,color:C.textSoft,marginTop:5,display:"flex",alignItems:"center"}}>
        {label}{onClick&&<span style={{marginLeft:"auto",fontSize:11,color:c,fontWeight:700}}>→</span>}
      </div>
    </div>
  );
}

