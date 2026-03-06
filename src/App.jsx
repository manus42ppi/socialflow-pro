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

// ── FONT & COLORS ──────────────────────────────────────────────────────────
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

// ── DOMAIN DATA ────────────────────────────────────────────────────────────
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
  { id:"published", label:"Veröffentlicht", color:"#6941C6", bg:"#F9F5FF", border:"#DDD6FE", header:"#EDE9FE" },
];
const CAMP_COLORS = ["#E53E3E","#0077B5","#027A48","#B54708","#6941C6","#E1306C","#25D366","#F59E0B","#06B6D4","#EC4899"];
const CAMP_EMOJIS = ["🎯","🏆","🎪","🌸","🎄","🏖","🎃","❤️","🚀","🌟","🎁","🔥","💡","☀️","⚡","🌈"];
const DEMO_CAMPAIGNS = [
  { id:"c1", name:"Sommer-Sale",   emoji:"☀️", color:"#F59E0B", description:"Posts für den Sommer Sale" },
  { id:"c2", name:"Produktlaunch", emoji:"🚀", color:"#6941C6", description:"Launch Q2 2026" },
];
const DEMO_POSTS = [
  { id:"p1", title:"Produktlaunch Q2",  content:"Unser neues Produkt ist da! 🚀", hashtags:"#launch #neu",     channels:["instagram","linkedin"], scheduledDate:"2026-03-15", scheduledTime:"09:00", status:"scheduled", mediaId:null, campaignId:"c2" },
  { id:"p2", title:"Tipp der Woche",    content:"Regelmäßiges Posting steigert deine Reichweite um 40%.", hashtags:"#marketing", channels:["twitter","facebook"],  scheduledDate:"",          scheduledTime:"",      status:"draft",     mediaId:null, campaignId:null },
  { id:"p3", title:"Behind the Scenes", content:"Blick hinter die Kulissen! 💪", hashtags:"#team #bts",       channels:["instagram","whatsapp"],  scheduledDate:"2026-03-20", scheduledTime:"18:00", status:"scheduled", mediaId:null, campaignId:null },
  { id:"p4", title:"Kundenreview",      content:"Was unsere Kunden sagen. Danke! ❤️", hashtags:"#review",    channels:["instagram","linkedin"],  scheduledDate:"",          scheduledTime:"",      status:"pending",   mediaId:null, campaignId:null },
  { id:"p5", title:"Sommer Sale",       content:"☀️ Bis zu 40% Rabatt – nur kurze Zeit!", hashtags:"#sale", channels:["instagram","facebook","tiktok"], scheduledDate:"2026-06-01", scheduledTime:"10:00", status:"draft", mediaId:null, campaignId:"c1" },
];

// ── UTILS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10);
const fileToDataURL = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
const getMediaType = f => f.type.startsWith("video/")?"video": f.name.toLowerCase().includes("logo")?"logo": f.type.startsWith("image/")?"image":"document";
const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}) : "";

// ── AI SERVICE ─────────────────────────────────────────────────────────────
async function aiCall(messages, max_tokens=800) {
  const r = await fetch("/.netlify/functions/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens,messages}),
  });
  return (await r.json()).content?.[0]?.text||"";
}
const AI = {
  optimize:(text,ch,tone)=>aiCall([{role:"user",content:`Optimiere für ${ch}. Ton:${tone}. NUR Text:\n${text}`}]),
  hashtags:(text,ch)=>aiCall([{role:"user",content:`5-10 Hashtags für ${ch}. NUR Hashtags:\n${text}`}],200),
  variants:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`3 Varianten für ${ch}: professionell,locker,aufmerksamkeitsstark. NUR JSON:{"variants":[{"tone":"","text":""}]}`}],1200);
    try{return JSON.parse(raw.replace(/```json|```/g,"").trim()).variants||[];}catch{return[];}
  },
  analyzeImg:async(dataUrl)=>{
    const b64=dataUrl.split(",")[1],mime=dataUrl.split(";")[0].split(":")[1]||"image/jpeg";
    const raw=await aiCall([{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mime,data:b64}},
      {type:"text",text:'Analysiere für Social Media. NUR JSON:{"tags":[],"description":"","suggestedAlt":"","mood":""}'}
    ]}],400);
    try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{return{};}
  },
};
// ── UI PRIMITIVES ──────────────────────────────────────────────────────────
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
  return(
    <Card style={{padding:"18px 20px",cursor:onClick?"pointer":"default",transition:"all .15s",userSelect:"none"}} onClick={onClick}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow="0 4px 18px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)";e.currentTarget.style.transform="";}}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{width:36,height:36,borderRadius:10,background:(color||C.accent)+"15",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon size={17} color={color||C.accent} strokeWidth={IW}/>
        </div>
        {delta!==undefined&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:12,fontWeight:700,color:delta>=0?C.success:C.accent}}>
          {delta>=0?<ArrowUp size={12} strokeWidth={2}/>:<ArrowDown size={12} strokeWidth={2}/>}{Math.abs(delta)}%
        </div>}
      </div>
      <div style={{marginTop:12,fontSize:24,fontWeight:900,color:C.text,letterSpacing:"-.5px"}}>{value}</div>
      <div style={{fontSize:12,color:C.textSoft,marginTop:3,display:"flex",alignItems:"center"}}>
        {label}{onClick&&<span style={{marginLeft:"auto",fontSize:10,color:C.textMute}}>→</span>}
      </div>
    </Card>
  );
}

// ── CHANNEL ICONS ──────────────────────────────────────────────────────────
function WAIco({size=14,color="#25D366"}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path fill={color} d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path fill={color} d="M12 2C6.477 2 2 6.477 2 12c0 1.89.524 3.655 1.435 5.163L2 22l4.956-1.405A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.088-1.128l-.292-.174-3.037.86.862-3.043-.19-.311A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
  </svg>;
}
const CHICO={instagram:Instagram,twitter:Twitter,linkedin:Linkedin,facebook:Facebook,tiktok:Music};
const CHCLR={instagram:"#E1306C",twitter:"#000",linkedin:"#0077B5",facebook:"#1877F2",tiktok:"#010101",whatsapp:"#25D366"};
function ChIco({id,size=14}){
  if(id==="whatsapp")return <WAIco size={size} color="#25D366"/>;
  const Ic=CHICO[id]||Globe;
  return <Ic size={size} color={CHCLR[id]||C.textSoft} strokeWidth={IW}/>;
}

// ── CHANNEL PREVIEWS ───────────────────────────────────────────────────────
function IGPrev({post,media}){
  return <div style={{fontFamily:"'Helvetica Neue',sans-serif",background:"#fff",border:"1px solid #dbdbdb",borderRadius:8,overflow:"hidden",fontSize:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(45deg,#f09433,#dc2743,#bc1888)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:11}}>{post.title?.[0]||"U"}</div>
      <div><div style={{fontWeight:700}}>dein_account</div><div style={{fontSize:11,color:"#8e8e8e"}}>Gesponsert</div></div>
      <span style={{marginLeft:"auto",fontSize:18}}>···</span>
    </div>
    {media?.url?<img src={media.url} alt="" style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}}/>:<div style={{aspectRatio:"1/1",background:"linear-gradient(135deg,#fce4ec,#f8bbd0)",display:"flex",alignItems:"center",justifyContent:"center"}}><Instagram size={36} color="#E1306C" strokeWidth={1}/></div>}
    <div style={{padding:"10px 12px"}}>
      <div style={{display:"flex",gap:12,fontSize:18,marginBottom:6}}>🤍 💬 ↗ <span style={{marginLeft:"auto"}}>🔖</span></div>
      <div><span style={{fontWeight:700}}>dein_account</span> {post.content||"Text hier…"}</div>
      {post.hashtags&&<div style={{color:"#00376b",marginTop:3,fontSize:12}}>{post.hashtags}</div>}
    </div>
  </div>;
}
function TWPrev({post,media}){
  return <div style={{fontFamily:"-apple-system,sans-serif",background:"#fff",border:"1px solid #e1e8ed",borderRadius:12,padding:14,fontSize:13}}>
    <div style={{display:"flex",gap:10}}>
      <div style={{width:38,height:38,borderRadius:"50%",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:13,flexShrink:0}}>{post.title?.[0]||"U"}</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700}}>Dein Name <span style={{color:"#536471",fontWeight:400}}>@handle · 2h</span></div>
        <div style={{lineHeight:1.5,marginTop:4}}>{post.content||"Tweet…"}</div>
        {post.hashtags&&<div style={{color:"#1d9bf0",marginTop:3}}>{post.hashtags}</div>}
        {media?.type==="image"&&<img src={media.url} alt="" style={{width:"100%",borderRadius:10,marginTop:8,aspectRatio:"16/9",objectFit:"cover"}}/>}
        <div style={{display:"flex",gap:16,marginTop:10,color:"#536471",fontSize:11}}>💬 24 &nbsp;🔁 12 &nbsp;🤍 89</div>
      </div>
    </div>
  </div>;
}
function LIPrev({post,media}){
  return <div style={{fontFamily:"-apple-system,sans-serif",background:"#fff",border:"1px solid #e0e0e0",borderRadius:8,overflow:"hidden",fontSize:13}}>
    <div style={{padding:"12px 14px",display:"flex",gap:10}}>
      <div style={{width:40,height:40,borderRadius:"50%",background:"#0077B5",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13}}>{post.title?.[0]||"U"}</div>
      <div><div style={{fontWeight:700}}>Dein Name</div><div style={{fontSize:11,color:"#666"}}>Position · 1. Grad</div></div>
    </div>
    <div style={{padding:"0 14px 10px",lineHeight:1.6}}>{post.content||"Post…"}{post.hashtags&&<span style={{color:"#0077B5"}}> {post.hashtags}</span>}</div>
    {media?.url&&<img src={media.url} alt="" style={{width:"100%",aspectRatio:"1.91/1",objectFit:"cover",display:"block"}}/>}
    <div style={{display:"flex",borderTop:"1px solid #e0e0e0"}}>
      {["👍","💬","↗"].map(a=><button key={a} style={{flex:1,background:"none",border:"none",color:"#666",fontSize:12,fontWeight:700,padding:"7px 0",cursor:"pointer"}}>{a}</button>)}
    </div>
  </div>;
}
function FBPrev({post,media}){
  return <div style={{fontFamily:"Helvetica,sans-serif",background:"#fff",border:"1px solid #dddfe2",borderRadius:8,overflow:"hidden",fontSize:13}}>
    <div style={{padding:"10px 12px",display:"flex",gap:8}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:"#1877F2",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12}}>{post.title?.[0]||"U"}</div>
      <div><div style={{fontWeight:700}}>Deine Seite</div><div style={{fontSize:11,color:"#65676b"}}>Gerade · 🌐</div></div>
    </div>
    <div style={{padding:"0 12px 10px",lineHeight:1.5}}>{post.content||"Post…"}{post.hashtags&&<span style={{color:"#1877F2"}}> {post.hashtags}</span>}</div>
    {media?.url&&<img src={media.url} alt="" style={{width:"100%",aspectRatio:"1.91/1",objectFit:"cover",display:"block"}}/>}
    <div style={{display:"flex",borderTop:"1px solid #dddfe2"}}>
      {["👍","💬","↗"].map(a=><button key={a} style={{flex:1,background:"none",border:"none",color:"#65676b",fontSize:12,fontWeight:700,padding:"7px 0",cursor:"pointer"}}>{a}</button>)}
    </div>
  </div>;
}
function TKPrev({post,media}){
  return <div style={{background:"#000",borderRadius:10,maxWidth:200,color:"#fff",overflow:"hidden",margin:"0 auto"}}>
    <div style={{aspectRatio:"9/16",background:"linear-gradient(180deg,#111,#333)",position:"relative"}}>
      {media?.url&&<img src={media.url} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:8,background:"linear-gradient(transparent,rgba(0,0,0,.8))"}}>
        <div style={{fontWeight:700,fontSize:11}}>@dein_account</div>
        <div style={{fontSize:10,lineHeight:1.4,opacity:.9}}>{post.content?.slice(0,50)||"TikTok…"}</div>
      </div>
    </div>
  </div>;
}
function WAPrev({post,media}){
  return <div style={{background:"#ECE5DD",borderRadius:10,overflow:"hidden",fontSize:13}}>
    <div style={{background:"#075E54",padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12}}>{post.title?.[0]||"B"}</div>
      <div><div style={{fontWeight:700,color:"#fff",fontSize:13}}>Dein Business</div><div style={{fontSize:10,color:"rgba(255,255,255,.65)"}}>Aktiv</div></div>
    </div>
    <div style={{padding:"12px 10px",minHeight:80}}>
      <div style={{background:"#fff",borderRadius:"0 10px 10px 10px",padding:"8px 12px",display:"inline-block",maxWidth:"85%",boxShadow:"0 1px 2px rgba(0,0,0,.1)"}}>
        {media?.url&&<img src={media.url} alt="" style={{width:"100%",borderRadius:6,marginBottom:6,maxHeight:100,objectFit:"cover",display:"block"}}/>}
        <div style={{fontSize:12,color:"#111",lineHeight:1.5}}>{post.content||"Nachricht…"}</div>
        <div style={{fontSize:10,color:"#999",textAlign:"right",marginTop:3}}>10:32 ✓✓</div>
      </div>
    </div>
  </div>;
}
const PREV={instagram:IGPrev,twitter:TWPrev,linkedin:LIPrev,facebook:FBPrev,tiktok:TKPrev,whatsapp:WAPrev};
// ── LOGIN ──────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [ld,setLd]=useState(false); const [sl,setSl]=useState("");
  const go=()=>{setLd(true);setErr("");setTimeout(()=>{const u=DEMO_USERS.find(u=>u.email===email&&u.password===pw);u?onLogin(u):(setErr("E-Mail oder Passwort falsch."),setLd(false));},700);};
  const soc=p=>{setSl(p);setTimeout(()=>onLogin({...DEMO_USERS[0],name:p==="google"?"Google User":"Apple User"}),1200);};
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(150deg,#0D0F12,#1a1d24 60%,#0D0F12)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:16}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:420,animation:"fadeUp .4s ease",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10}}>
            <div style={{width:46,height:46,borderRadius:13,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center"}}><Layers size={22} color="#fff" strokeWidth={1.5}/></div>
            <span style={{fontSize:24,fontWeight:900,color:"#fff",letterSpacing:"-.5px"}}>SocialFlow</span>
          </div>
          <p style={{color:"#6B7280",fontSize:14,margin:"8px 0 0"}}>Dein Social Media Command Center</p>
        </div>
        <Card style={{padding:"28px 26px"}}>
          <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:800,color:C.text}}>Willkommen zurück</h2>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:18}}>
            <button onClick={()=>soc("google")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:10,borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT}}>
              {sl==="google"?<Sp color={C.text}/>:<><svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Mit Google anmelden</>}
            </button>
            <button onClick={()=>soc("apple")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:10,borderRadius:9,border:"none",background:"#000",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT}}>
              {sl==="apple"?<Sp/>:<><svg width="15" height="18" viewBox="0 0 814 1000"><path fill="#fff" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.6-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 135.4-317.7 268.8-317.7 99.8 0 176.1 52.7 236.4 52.7 57.8 0 147.8-56.1 261.6-56.1l45.3.5zM600.3 80.1c28.5-35.9 48.5-86.2 48.5-136.5 0-7-.6-14.1-1.9-20.9-46.1 1.9-100.3 30.7-133.8 73.5-26.7 31.4-51.3 81.7-51.3 132.6 0 7.6 1.3 15.2 1.9 17.7 3.2.6 8.3 1.3 13.4 1.3 41.3 0 93.5-27.9 123.2-67.7z"/></svg>Mit Apple anmelden</>}
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{flex:1,height:1,background:C.border}}/><span style={{fontSize:12,color:C.textMute,fontWeight:600}}>oder per E-Mail</span><div style={{flex:1,height:1,background:C.border}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <TIn label="E-Mail" icon={Mail} type="email" placeholder="admin@demo.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/>
            <TIn label="Passwort" icon={Lock} type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/>
            {err&&<div style={{display:"flex",alignItems:"center",gap:8,background:C.accentLight,border:`1px solid #FECACA`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.accent}}><AlertCircle size={14} strokeWidth={2}/>{err}</div>}
            <button onClick={go} disabled={ld} style={{padding:10,borderRadius:8,border:"none",background:C.accent,color:"#fff",fontWeight:700,fontSize:14,cursor:ld?"not-allowed":"pointer",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {ld?<><Sp/>Anmelden…</>:"Anmelden"}
            </button>
          </div>
          <div style={{marginTop:16,padding:"12px 14px",background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textSoft,marginBottom:7,display:"flex",alignItems:"center",gap:5}}><Shield size={11} strokeWidth={2}/>Demo-Zugänge (klicken)</div>
            {DEMO_USERS.map(u=><div key={u.id} onClick={()=>{setEmail(u.email);setPw(u.password);}} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",cursor:"pointer"}}>
              <span style={{color:C.info,fontFamily:"monospace"}}>{u.email}</span>
              <Badge color={ROLES[u.role].color}>{ROLES[u.role].label}</Badge>
            </div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── SIDEBAR + TOPBAR ───────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",  label:"Dashboard",   I:LayoutDashboard},
  {id:"publisher",  label:"Publisher",   I:Send},
  {id:"campaigns",  label:"Kampagnen",   I:Flag},
  {id:"media",      label:"Medien",      I:Image},
  {id:"calendar",   label:"Kalender",    I:Calendar},
  {id:"performance",label:"Performance", I:BarChart2},
  {id:"admin",      label:"Admin",       I:Settings, adm:true},
];
function Sidebar({active,onNav,user,onLogout,pend}){
  const items=NAV.filter(n=>!n.adm||user.role==="admin");
  return(
    <div style={{width:60,background:C.sidebar,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:2,flexShrink:0}}>
      <div style={{width:38,height:38,borderRadius:10,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}><Layers size={18} color="#fff" strokeWidth={1.5}/></div>
      {items.map(({id,label,I})=>{const on=active===id;
        return <button key={id} onClick={()=>onNav(id)} title={label} style={{position:"relative",width:42,height:42,borderRadius:10,border:"none",background:on?"rgba(255,255,255,.1)":"transparent",color:on?"#fff":"#4B5563",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
          onMouseEnter={e=>{if(!on)e.currentTarget.style.background="rgba(255,255,255,.06)"}}
          onMouseLeave={e=>{if(!on)e.currentTarget.style.background="transparent"}}>
          <I size={18} strokeWidth={IW}/>
          {on&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,background:C.accent,borderRadius:"0 3px 3px 0"}}/>}
        </button>;
      })}
      <div style={{flex:1}}/>
      <button title="Benachrichtigungen" style={{position:"relative",width:42,height:42,borderRadius:10,border:"none",background:"transparent",color:"#4B5563",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Bell size={18} strokeWidth={IW}/>{pend>0&&<div style={{position:"absolute",top:8,right:8,width:7,height:7,borderRadius:"50%",background:C.accent}}/>}
      </button>
      <button onClick={onLogout} title="Abmelden" style={{width:42,height:42,borderRadius:10,border:"none",background:"transparent",color:"#4B5563",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><LogOut size={18} strokeWidth={IW}/></button>
      <Avatar initials={user.avatar} size={32} color={C.accent}/><div style={{height:6}}/>
    </div>
  );
}
function TopBar({title,user,saving}){
  return(
    <div style={{height:54,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 22px",gap:14,flexShrink:0}}>
      <div style={{fontWeight:800,fontSize:15,color:C.text}}>{title}</div>
      <div style={{flex:1}}/>
      {saving&&<div style={{fontSize:11,color:"#48BB78",display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:"#48BB78",display:"inline-block"}}/>Gespeichert ✓</div>}
      <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:14,borderLeft:`1px solid ${C.border}`}}>
        <Avatar initials={user.avatar} size={28}/>
        <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{user.name}</div><Badge color={ROLES[user.role].color}>{ROLES[user.role].label}</Badge></div>
      </div>
    </div>
  );
}

// ── AI PANEL ───────────────────────────────────────────────────────────────
function AIPanel({content,chId,onApply,onApplyHT}){
  const [tab,setTab]=useState("opt"); const [tone,setTone]=useState("professional");
  const [ld,setLd]=useState(false); const [res,setRes]=useState(""); const [vars,setVars]=useState([]);
  const ch=CHANNELS.find(c=>c.id===chId)||CHANNELS[0];
  const run=async()=>{
    if(!content.trim())return; setLd(true); setRes(""); setVars([]);
    try{
      if(tab==="opt")setRes(await AI.optimize(content,ch.label,tone));
      else if(tab==="ht")setRes(await AI.hashtags(content,ch.label));
      else setVars(await AI.variants(content,ch.label));
    }catch{setRes("Fehler – nochmal versuchen.");}
    setLd(false);
  };
  return(
    <div style={{background:C.purpleBg,borderRadius:10,border:`1px solid ${C.purple}25`,overflow:"hidden"}}>
      <div style={{padding:"8px 14px",background:`linear-gradient(135deg,${C.purple}18,${C.accent}10)`,display:"flex",alignItems:"center",gap:7,borderBottom:`1px solid ${C.purple}18`}}>
        <Sparkles size={13} color={C.purple} strokeWidth={2}/><span style={{fontWeight:700,fontSize:12,color:C.purple}}>KI-Assistent</span>
      </div>
      <div style={{display:"flex",padding:"8px 10px",gap:3}}>
        {[["opt","Optimieren"],["ht","Hashtags"],["v3","3 Varianten"]].map(([id,l])=>(
          <button key={id} onClick={()=>{setTab(id);setRes("");setVars([]);}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",background:tab===id?C.purple:"transparent",color:tab===id?"#fff":C.textSoft,fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:FONT}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"0 10px 10px",display:"flex",flexDirection:"column",gap:8}}>
        {tab==="opt"&&<select value={tone} onChange={e=>setTone(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,fontFamily:FONT,color:C.text}}>
          <option value="professional">Professionell</option><option value="casual">Locker</option>
          <option value="energetic">Energetisch</option><option value="informative">Informativ</option><option value="inspiring">Inspirierend</option>
        </select>}
        <Btn variant="ai" size="sm" onClick={run} disabled={ld||!content.trim()} style={{justifyContent:"center"}}>
          {ld?<><Sp/>Verarbeite…</>:<><Zap size={13} strokeWidth={2}/>{tab==="opt"?"Optimieren":tab==="ht"?"Hashtags":"3 Varianten"}</>}
        </Btn>
        {res&&<div style={{background:C.surface,borderRadius:8,padding:"9px 11px",border:`1px solid ${C.border}`,fontSize:12,lineHeight:1.6,color:C.textMid}}>
          <div style={{fontSize:10,fontWeight:700,color:C.textSoft,marginBottom:5}}>Ergebnis:</div>{res}
          <div style={{marginTop:8,display:"flex",gap:6}}>
            <Btn size="sm" variant="success" onClick={()=>{(tab==="ht"?onApplyHT:onApply)(res);setRes("");}}><Check size={12} strokeWidth={2.5}/>Übernehmen</Btn>
            <Btn size="sm" variant="ghost" onClick={()=>setRes("")}><X size={12} strokeWidth={2}/></Btn>
          </div>
        </div>}
        {vars.map((v,i)=><div key={i} style={{background:C.surface,borderRadius:8,padding:"9px 11px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:4}}>{v.tone}</div>
          <div style={{fontSize:12,lineHeight:1.6,color:C.textMid}}>{v.text}</div>
          <Btn size="sm" variant="success" style={{marginTop:6}} onClick={()=>{onApply(v.text);setVars([]);}}><Check size={12} strokeWidth={2.5}/>Verwenden</Btn>
        </div>)}
      </div>
    </div>
  );
}

// ── MEDIA PICKER MODAL (inline – bleibt über dem Editor) ───────────────────
function MediaPicker({items,onSelect,onUpload,onClose}){
  const [q,setQ]=useState(""); const [f,setF]=useState("all");
  const ref=useRef();
  const upload=useCallback(async files=>{
    for(const file of Array.from(files)){
      const url=await fileToDataURL(file);
      const item={id:uid(),name:file.name,url,type:getMediaType(file),size:file.size,date:new Date().toLocaleDateString("de"),tags:"",description:"",altText:"",category:"",focusPoint:{x:50,y:50},mood:""};
      onUpload(item); onSelect(item); return;
    }
  },[onUpload,onSelect]);
  const list=items.filter(m=>(m.name.toLowerCase().includes(q.toLowerCase())||(m.tags||"").toLowerCase().includes(q.toLowerCase()))&&(f==="all"||m.type===f));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{width:"100%",maxWidth:700,maxHeight:"78vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.25)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontWeight:800,fontSize:15,color:C.text}}>Medium auswählen</div>
          <Btn size="sm" onClick={()=>ref.current?.click()}><Upload size={13} strokeWidth={2}/>Hochladen</Btn>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
          <input ref={ref} type="file" multiple accept="image/*,video/*" style={{display:"none"}} onChange={e=>upload(e.target.files)}/>
        </div>
        <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",gap:10}}>
          <div style={{position:"relative",flex:1}}>
            <Search size={13} color={C.textMute} strokeWidth={IW} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Suche…" style={{width:"100%",padding:"7px 10px 7px 28px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
          </div>
          {["all","image","video","logo"].map(t=>(
            <button key={t} onClick={()=>setF(t)} style={{padding:"6px 12px",borderRadius:7,border:"none",background:f===t?C.text:C.borderLight,color:f===t?"#fff":C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>
              {{all:"Alle",image:"Bilder",video:"Videos",logo:"Logos"}[t]}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflow:"auto",padding:16}}>
          {list.length===0?(
            <div style={{textAlign:"center",padding:"40px 20px",color:C.textMute}}>
              <Image size={34} strokeWidth={1} style={{margin:"0 auto 10px",display:"block"}}/>
              <div style={{fontWeight:600,marginBottom:10}}>{items.length===0?"Noch keine Medien":"Keine Treffer"}</div>
              <Btn size="sm" onClick={()=>ref.current?.click()}><Upload size={13} strokeWidth={2}/>Bild hochladen</Btn>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
              {list.map(item=>(
                <div key={item.id} onClick={()=>onSelect(item)} style={{borderRadius:9,overflow:"hidden",cursor:"pointer",border:`2px solid transparent`,transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";}}>
                  <img src={item.url} alt={item.name} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}}/>
                  <div style={{padding:"6px 8px",background:C.surface}}>
                    <div style={{fontSize:11,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                    <div style={{fontSize:10,color:C.textMute}}>{item.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── MEDIA DETAIL MODAL (FIX: onMouseDown statt onClick für Fokuspunkt) ──────
function MediaDetail({item,onSave,onClose}){
  const [form,setForm]=useState({...item});
  const [fp,setFp]=useState(item.focusPoint||{x:50,y:50});
  const [fmode,setFmode]=useState(false);
  const [aiLd,setAiLd]=useState(false);
  const imgRef=useRef();

  // FIX: onMouseDown fires before button blur, prevents focus stealing
  const imgMD=(e)=>{
    if(!fmode||!imgRef.current)return;
    const r=imgRef.current.getBoundingClientRect();
    setFp({x:Math.round(((e.clientX-r.left)/r.width)*100),y:Math.round(((e.clientY-r.top)/r.height)*100)});
  };
  const runAI=async()=>{
    if(!form.url||form.type==="video")return; setAiLd(true);
    try{const r=await AI.analyzeImg(form.url);setForm(f=>({...f,tags:r.tags?.join(", ")||f.tags,description:r.description||f.description,altText:r.suggestedAlt||f.altText,mood:r.mood||f.mood}));}catch{}
    setAiLd(false);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{width:"100%",maxWidth:780,maxHeight:"92vh",overflow:"hidden",display:"flex",boxShadow:"0 24px 64px rgba(0,0,0,.22)"}}>
        <div style={{width:290,flexShrink:0,background:C.bg,display:"flex",flexDirection:"column"}}>
          <div style={{position:"relative"}}>
            {form.type==="video"
              ?<video src={form.url} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}} controls muted/>
              :<img ref={imgRef} src={form.url} alt="" onMouseDown={imgMD} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block",cursor:fmode?"crosshair":"default",userSelect:"none"}}/>
            }
            <div style={{position:"absolute",left:`${fp.x}%`,top:`${fp.y}%`,transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
              <div style={{width:22,height:22,borderRadius:"50%",border:"3px solid #fff",background:`${C.accent}90`,boxShadow:"0 0 0 2px rgba(0,0,0,.4)"}}/>
            </div>
          </div>
          <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
            {/* FIX: stopPropagation prevents image click from firing */}
            <button onMouseDown={e=>{e.stopPropagation();setFmode(v=>!v);}} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderRadius:8,border:`1px solid ${fmode?C.accent:C.border}`,background:fmode?C.accentLight:C.surface,color:fmode?C.accent:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>
              <MapPin size={14} strokeWidth={2}/>{fmode?"Bild anklicken…":"Fokuspunkt setzen"}
            </button>
            {fmode&&<div style={{fontSize:11,color:C.textSoft,background:"#fffbe6",padding:"5px 8px",borderRadius:6,border:"1px solid #fde68a",textAlign:"center"}}>
              Klicke aufs Bild · {fp.x}% / {fp.y}%
            </div>}
            {form.type!=="video"&&<Btn variant="ai" size="sm" onClick={runAI} disabled={aiLd} style={{justifyContent:"center"}}>
              {aiLd?<><Sp/>Analysiere…</>:<><Sparkles size={13} strokeWidth={2}/>KI-Analyse</>}
            </Btn>}
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:"20px 22px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:800,fontSize:16,color:C.text}}>Medien-Details</div>
            <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
          </div>
          <TIn label="Dateiname" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <TIn label="Beschreibung" icon={FileText} textarea value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Was zeigt dieses Medium?"/>
          <TIn label="Tags (kommagetrennt)" icon={Tag} value={form.tags||""} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="produkt, team…"/>
          <TIn label="Alt-Text" value={form.altText||""} onChange={e=>setForm({...form,altText:e.target.value})} placeholder="Für Screenreader"/>
          <div>
            <FL>Kategorie</FL>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["Marketing","Produkt","Team","Event","Brand","Kampagne","Sonstiges"].map(cat=>(
                <button key={cat} onClick={()=>setForm(f=>({...f,category:f.category===cat?"":cat}))} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${form.category===cat?C.accent:C.border}`,background:form.category===cat?C.accentLight:C.surface,color:form.category===cat?C.accent:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>{cat}</button>
              ))}
            </div>
          </div>
          {form.mood&&<div style={{fontSize:12,color:C.textSoft}}>KI-Stimmung: <strong>{form.mood}</strong></div>}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <Btn variant="secondary" onClick={onClose} style={{flex:1,justifyContent:"center"}}>Abbrechen</Btn>
            <Btn onClick={()=>onSave({...form,focusPoint:fp})} style={{flex:2,justifyContent:"center"}}><Check size={14} strokeWidth={2.5}/>Speichern</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
// ── EDITOR MODAL ───────────────────────────────────────────────────────────
function Editor({post,items,campaigns,onSave,onClose,onUpload,user}){
  const [form,setForm]=useState({...post});
  const [pch,setPch]=useState(post.channels?.[0]||"instagram");
  const [aiOn,setAiOn]=useState(false);
  const [picker,setPicker]=useState(false);
  const media=items.find(m=>m.id===form.mediaId);
  const PC=PREV[pch]||PREV.instagram;
  const maxC=form.channels?.length>0?Math.min(...form.channels.map(id=>CHANNELS.find(c=>c.id===id)?.maxChars||9999)):9999;
  const togCh=id=>setForm(f=>({...f,channels:f.channels?.includes(id)?f.channels.filter(c=>c!==id):[...(f.channels||[]),id]}));
  const isAdm=user.role==="admin";

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:980,maxHeight:"94vh",overflow:"hidden",display:"flex",boxShadow:"0 24px 64px rgba(0,0,0,.2)",border:`1px solid ${C.border}`}}>

        {/* ── Form ── */}
        <div style={{flex:1,overflow:"auto",padding:"22px 24px",borderRight:`1px solid ${C.borderLight}`,display:"flex",flexDirection:"column",gap:13}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h2 style={{margin:0,fontSize:17,fontWeight:800,color:C.text}}>{form.id?"Post bearbeiten":"Neuer Post"}</h2>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setAiOn(s=>!s)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,border:`1px solid ${aiOn?C.purple:C.border}`,background:aiOn?C.purpleBg:C.surface,color:aiOn?C.purple:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>
                <Sparkles size={13} strokeWidth={2}/>KI
              </button>
              <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
            </div>
          </div>

          <div><FL>Kanäle</FL>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {CHANNELS.map(c=>(
                <button key={c.id} onClick={()=>togCh(c.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,border:`1.5px solid ${form.channels?.includes(c.id)?c.color:C.border}`,background:form.channels?.includes(c.id)?c.color+"12":"#fff",color:form.channels?.includes(c.id)?c.color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>
                  <ChIco id={c.id} size={13}/>{c.label}
                </button>
              ))}
            </div>
          </div>

          {campaigns?.length>0&&<div><FL>Kampagne (optional)</FL>
            <select value={form.campaignId||""} onChange={e=>setForm(f=>({...f,campaignId:e.target.value||null}))} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT,color:C.text}}>
              <option value="">— Keine Kampagne —</option>
              {campaigns.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>}

          <TIn label="Titel (intern)" icon={FileText} placeholder="Kurzer Arbeitstitel…" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/>

          <div>
            <FL>Text {(form.content?.length||0)>0&&<span style={{float:"right",color:(form.content?.length||0)>maxC?C.accent:C.textMute,fontWeight:400,fontSize:11}}>{form.content?.length}/{maxC===9999?"∞":maxC}</span>}</FL>
            <textarea value={form.content||""} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Was möchtest du teilen?" style={{width:"100%",minHeight:100,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:FONT,resize:"vertical",boxSizing:"border-box",color:C.text}}/>
          </div>

          <TIn label="Hashtags" icon={Hash} placeholder="#marketing #launch" value={form.hashtags||""} onChange={e=>setForm({...form,hashtags:e.target.value})}/>

          {aiOn&&form.channels?.length>0&&<AIPanel content={form.content||""} chId={form.channels[0]} onApply={t=>setForm(f=>({...f,content:t}))} onApplyHT={t=>setForm(f=>({...f,hashtags:t}))}/>}

          {/* MEDIA — inline picker, never navigates away */}
          <div><FL>Mediendatei</FL>
            {media?(
              <div style={{display:"flex",gap:10,alignItems:"center",background:C.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.border}`}}>
                <img src={media.url} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:6,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{media.name}</div>
                  <div style={{fontSize:11,color:C.textMute}}>{media.type}</div>
                </div>
                <Btn size="sm" variant="secondary" onClick={()=>setPicker(true)}><Edit2 size={11} strokeWidth={2}/>Ändern</Btn>
                <button onClick={()=>setForm({...form,mediaId:null})} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={16} strokeWidth={2}/></button>
              </div>
            ):(
              <button onClick={()=>setPicker(true)} style={{width:"100%",padding:12,borderRadius:8,border:`1.5px dashed ${C.border}`,background:C.bg,color:C.textSoft,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT,transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSoft;}}>
                <Image size={16} strokeWidth={IW}/>Aus Medienbibliothek wählen oder hochladen
              </button>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <TIn label="Datum" type="date" value={form.scheduledDate||""} onChange={e=>setForm({...form,scheduledDate:e.target.value})}/>
            <TIn label="Uhrzeit" type="time" value={form.scheduledTime||"12:00"} onChange={e=>setForm({...form,scheduledTime:e.target.value})}/>
          </div>

          <div style={{display:"flex",gap:8,paddingTop:4}}>
            <Btn variant="secondary" onClick={onClose} style={{flex:1,justifyContent:"center"}}>Abbrechen</Btn>
            <Btn variant="secondary" onClick={()=>onSave({...form,id:form.id||uid(),status:"draft"})} style={{flex:1,justifyContent:"center"}}><FileText size={13} strokeWidth={IW}/>Entwurf</Btn>
            {isAdm
              ?<Btn onClick={()=>onSave({...form,id:form.id||uid(),status:form.scheduledDate?"scheduled":"draft"})} style={{flex:2,justifyContent:"center"}}><Calendar size={13} strokeWidth={IW}/>{form.scheduledDate?"Planen":"Speichern"}</Btn>
              :<Btn onClick={()=>onSave({...form,id:form.id||uid(),status:"pending"})} style={{flex:2,justifyContent:"center"}}><Send size={13} strokeWidth={IW}/>Zur Freigabe</Btn>
            }
          </div>
        </div>

        {/* ── Preview ── */}
        <div style={{width:290,background:C.bg,overflow:"auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:12,flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:13,color:C.textMid}}>Vorschau</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {CHANNELS.map(c=>(
              <button key={c.id} onClick={()=>setPch(c.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:6,border:`1.5px solid ${pch===c.id?c.color:C.border}`,background:pch===c.id?c.color:"#fff",color:pch===c.id?"#fff":C.textSoft,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                <ChIco id={c.id} size={11}/>{c.label}
              </button>
            ))}
          </div>
          <Card style={{padding:10}}><PC post={form} media={media}/></Card>
        </div>
      </div>

      {picker&&<MediaPicker items={items} onSelect={item=>{setForm(f=>({...f,mediaId:item.id}));setPicker(false);}} onUpload={onUpload} onClose={()=>setPicker(false)}/>}
    </div>
  );
}

// ── SCHEDULE MODAL ─────────────────────────────────────────────────────────
function SchedModal({post,onSave,onClose}){
  const [date,setDate]=useState(post.scheduledDate||"");
  const [time,setTime]=useState(post.scheduledTime||"12:00");
  const [chs,setChs]=useState(post.channels?.length?post.channels:["instagram"]);
  const tog=id=>setChs(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
        <div style={{padding:"18px 22px 0",display:"flex",justifyContent:"space-between"}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:800,color:C.text,display:"flex",alignItems:"center",gap:8}}><Calendar size={16} color={C.accent} strokeWidth={IW}/>Post planen</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
        </div>
        <div style={{padding:"14px 22px 22px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
            <div style={{fontWeight:700,fontSize:13}}>{post.title||"Kein Titel"}</div>
            <div style={{color:C.textSoft,fontSize:12,marginTop:2}}>{post.content?.slice(0,80)}{(post.content?.length||0)>80?"…":""}</div>
          </div>
          <TIn label="Datum *" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <TIn label="Uhrzeit" type="time" value={time} onChange={e=>setTime(e.target.value)}/>
          <div><FL>Kanäle</FL>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {CHANNELS.map(c=>(
                <button key={c.id} onClick={()=>tog(c.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,border:`1.5px solid ${chs.includes(c.id)?c.color:C.border}`,background:chs.includes(c.id)?c.color+"12":"#fff",color:chs.includes(c.id)?c.color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>
                  <ChIco id={c.id} size={12}/>{c.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="secondary" onClick={onClose} style={{flex:1,justifyContent:"center"}}>Abbrechen</Btn>
            <Btn onClick={()=>{if(!date){alert("Bitte Datum wählen.");return;}onSave({...post,scheduledDate:date,scheduledTime:time,channels:chs,status:"scheduled"});}} style={{flex:2,justifyContent:"center"}}><Check size={14} strokeWidth={2.5}/>Planen</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── POST CARD ──────────────────────────────────────────────────────────────
function PostCard({post,items,campaigns,onEdit,onSched,onDel,onApprove,role}){
  const [tab,setTab]=useState(post.channels?.[0]||"instagram");
  const media=items.find(m=>m.id===post.mediaId);
  const camp=campaigns?.find(c=>c.id===post.campaignId);
  const PC=PREV[tab]||PREV.instagram;
  const can=p=>ROLES[role]?.can.includes(p);
  return(
    <Card style={{overflow:"hidden",transition:"box-shadow .2s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)"}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.borderLight}`}}>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{post.title||"Kein Titel"}</div>
          {camp&&<div style={{fontSize:11,color:C.textSoft,marginTop:1}}>{camp.emoji} {camp.name}</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <SBadge status={post.status}/>
          {can("delete")&&<button onClick={()=>onDel(post.id)} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:2,display:"flex"}}><X size={14} strokeWidth={2}/></button>}
        </div>
      </div>
      {post.channels?.length>0&&<div style={{display:"flex",borderBottom:`1px solid ${C.borderLight}`,overflowX:"auto"}}>
        {post.channels.map(cid=>{const c=CHANNELS.find(x=>x.id===cid);const on=tab===cid;
          return <button key={cid} onClick={()=>setTab(cid)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,padding:"7px 11px",border:"none",borderBottom:`2px solid ${on?c?.color:"transparent"}`,background:"transparent",color:on?c?.color:C.textMute,fontWeight:on?700:500,fontSize:11,cursor:"pointer",fontFamily:FONT}}>
            <ChIco id={cid} size={12}/>{c?.label}
          </button>;
        })}
      </div>}
      <div style={{padding:10,background:CHANNELS.find(c=>c.id===tab)?.bg||C.bg}}>
        <div style={{transform:"scale(0.83)",transformOrigin:"top center"}}><PC post={post} media={media}/></div>
      </div>
      {post.status==="scheduled"&&post.scheduledDate&&<div style={{padding:"6px 14px",background:C.successBg,borderTop:`1px solid #A7F3D0`,display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.success,fontWeight:600}}>
        <Calendar size={12} strokeWidth={2}/>{fmtDate(post.scheduledDate)}{post.scheduledTime&&` · ${post.scheduledTime}`}
      </div>}
      {post.status==="pending"&&can("approve")&&<div style={{padding:"8px 14px",background:C.infoBg,borderTop:`1px solid #BFDBFE`,display:"flex",gap:8,alignItems:"center"}}>
        <span style={{flex:1,fontSize:12,color:C.info,fontWeight:600}}>Wartet auf Freigabe</span>
        <Btn size="sm" variant="success" onClick={()=>onApprove(post.id,"scheduled")}><Check size={12} strokeWidth={2.5}/>OK</Btn>
        <Btn size="sm" variant="danger"  onClick={()=>onApprove(post.id,"draft")}><X size={12} strokeWidth={2.5}/>Ablehnen</Btn>
      </div>}
      <div style={{display:"flex",borderTop:`1px solid ${C.borderLight}`}}>
        {can("write")&&<button onClick={()=>onEdit(post)} style={{flex:1,padding:"9px 0",background:"none",border:"none",color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,borderRight:`1px solid ${C.borderLight}`,fontFamily:FONT}}><Edit2 size={13} strokeWidth={IW}/>Bearbeiten</button>}
        <button onClick={()=>onSched(post)} style={{flex:1,padding:"9px 0",background:"none",border:"none",color:post.status==="scheduled"?C.success:C.accent,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:FONT}}>
          <Calendar size={13} strokeWidth={IW}/>{post.status==="scheduled"?"Ändern":"Planen"}
        </button>
      </div>
    </Card>
  );
}
// ── KANBAN CARD ────────────────────────────────────────────────────────────
function KCard({post,items,onEdit,onDS,isDrag,isDrop}){
  const media=items.find(m=>m.id===post.mediaId);
  return(
    <div draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";onDS(post.id,post.status);}} onClick={()=>onEdit(post)}
      style={{background:isDrop?"#ECFDF3":"#fff",borderRadius:10,border:`1px solid ${isDrop?"#6EE7B7":C.border}`,overflow:"hidden",cursor:isDrag?"grabbing":"grab",transition:"all .2s",opacity:isDrag?.4:1,userSelect:"none",boxShadow:isDrag?"none":"0 1px 3px rgba(0,0,0,.05)"}}
      onMouseEnter={e=>{if(!isDrag){e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.transform="";}}>
      {/* Thumbnail */}
      {media?.url&&<div style={{height:68,overflow:"hidden",position:"relative"}}>
        <img src={media.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 55%,rgba(0,0,0,.4))"}}/>
        <div style={{position:"absolute",bottom:5,right:6,display:"flex",gap:3}}>
          {post.channels?.slice(0,3).map(c=><span key={c} style={{width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}><ChIco id={c} size={11}/></span>)}
        </div>
      </div>}
      <div style={{padding:"9px 11px"}}>
        <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.title||"Kein Titel"}</div>
        <div style={{fontSize:11,color:C.textSoft,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:7}}>{post.content||"Kein Text…"}</div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          {!media?.url&&<div style={{display:"flex",gap:3}}>{post.channels?.slice(0,5).map(c=><ChIco key={c} id={c} size={12}/>)}</div>}
          {post.scheduledDate&&<span style={{marginLeft:"auto",fontSize:10,color:C.textSoft,display:"flex",alignItems:"center",gap:3}}><Calendar size={10} strokeWidth={2}/>{post.scheduledDate}</span>}
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
              style={{flex:"0 0 230px",borderRadius:12,border:`2px solid ${isO?col.color:col.bdr}`,background:isO?col.bg:"#F8F9FB",transition:"all .18s",opacity:dId&&isS?.55:1,minHeight:280}}>
              <div style={{padding:"11px 13px",background:isO?col.color+"22":col.hdr,borderRadius:"10px 10px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${col.bdr}`}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:col.color,boxShadow:isO?`0 0 0 3px ${col.color}33`:"none",transition:"box-shadow .18s"}}/>
                  <span style={{fontWeight:800,fontSize:13,color:col.color}}>{col.label}</span>
                </div>
                <span style={{background:"#fff",color:col.color,fontSize:12,fontWeight:800,padding:"2px 9px",borderRadius:20,border:`1px solid ${col.bdr}`}}>{col.posts.length}</span>
              </div>
              {isO&&dId&&!isS&&<div style={{margin:"8px 8px 0",padding:10,borderRadius:8,border:`2px dashed ${col.color}`,background:col.color+"0A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:col.color,fontWeight:700}}>📌 Hier ablegen</div>}
              <div style={{padding:8,display:"flex",flexDirection:"column",gap:8}}>
                {col.posts.length===0&&!isO&&<div style={{padding:"28px 12px",textAlign:"center",color:C.textMute,fontSize:12,border:`1.5px dashed ${col.bdr}`,borderRadius:8}}>
                  {dId&&!isS?<span style={{color:col.color,fontWeight:600}}>Hier ablegen</span>:"Noch keine Posts"}
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

// ── CAMPAIGNS PAGE ─────────────────────────────────────────────────────────
function CampaignsPage({campaigns,setCampaigns,posts,onEditPost}){
  const [showNew,setShowNew]=useState(false);
  const [form,setForm]=useState({name:"",emoji:"🎯",color:C.accent,description:""});
  const [sel,setSel]=useState(null);

  const create=()=>{if(!form.name.trim())return;setCampaigns(p=>[...p,{id:uid(),...form}]);setShowNew(false);setForm({name:"",emoji:"🎯",color:C.accent,description:""}); };
  const del=id=>{if(window.confirm("Kampagne löschen?")){setCampaigns(p=>p.filter(c=>c.id!==id));if(sel===id)setSel(null);}};

  const selC=campaigns.find(c=>c.id===sel);
  const cPosts=posts.filter(p=>p.campaignId===sel);

  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",gap:20}}>
      {/* List */}
      <div style={{width:280,flexShrink:0,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text}}>Kampagnen</div>
          <Btn size="sm" onClick={()=>setShowNew(s=>!s)}><Plus size={13} strokeWidth={2}/>{showNew?"Schließen":"Neu"}</Btn>
        </div>

        {showNew&&<Card style={{padding:"14px 16px"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Neue Kampagne</div>
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

      {/* Posts */}
      <div style={{flex:1,minWidth:0}}>
        {selC?(
          <>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
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
          <div style={{textAlign:"center",padding:"80px 20px",color:C.textMute}}>
            <Flag size={48} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/>
            <div style={{fontSize:16,fontWeight:700,color:C.textMid}}>Kampagne auswählen</div>
            <div style={{fontSize:13,marginTop:4}}>Klicke links auf eine Kampagne.</div>
          </div>
        )}
      </div>
    </div>
  );
}
// ── MEDIA PAGE ─────────────────────────────────────────────────────────────
function MediaPage({items,onUpload,onUpdate}){
  const [q,setQ]=useState(""); const [f,setF]=useState("all");
  const [drag,setDrag]=useState(false); const [det,setDet]=useState(null);
  const ref=useRef();
  const upload=useCallback(async files=>{
    for(const file of Array.from(files)){
      const url=await fileToDataURL(file);
      onUpload({id:uid(),name:file.name,url,type:getMediaType(file),size:file.size,date:new Date().toLocaleDateString("de"),tags:"",description:"",altText:"",category:"",focusPoint:{x:50,y:50},mood:""});
    }
  },[onUpload]);
  const list=items.filter(m=>(m.name.toLowerCase().includes(q.toLowerCase())||(m.tags||"").toLowerCase().includes(q.toLowerCase()))&&(f==="all"||m.type===f));
  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:180,maxWidth:300}}>
          <Search size={13} color={C.textMute} strokeWidth={IW} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Name, Tags suchen…" style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",gap:3,background:C.borderLight,borderRadius:7,padding:3}}>
          {[["all","Alle"],["image","Bilder"],["video","Videos"],["logo","Logos"]].map(([t,l])=>(
            <button key={t} onClick={()=>setF(t)} style={{padding:"5px 11px",borderRadius:5,border:"none",background:f===t?C.surface:"transparent",color:f===t?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>{l}</button>
          ))}
        </div>
        <Btn onClick={()=>ref.current?.click()}><Upload size={13} strokeWidth={2}/>Hochladen</Btn>
        <input ref={ref} type="file" multiple accept="image/*,video/*" style={{display:"none"}} onChange={e=>upload(e.target.files)}/>
      </div>
      <div style={{flex:1}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files);}}>
        {drag&&<div style={{border:`2px dashed ${C.accent}`,borderRadius:10,padding:32,textAlign:"center",color:C.accent,marginBottom:12,background:C.accentLight}}><Upload size={24} style={{margin:"0 auto 6px",display:"block"}}/><div style={{fontWeight:700}}>Loslassen zum Hochladen</div></div>}
        {items.length===0?(
          <div style={{textAlign:"center",padding:"80px 20px"}}>
            <Image size={52} color={C.textMute} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/>
            <div style={{fontSize:15,fontWeight:700,color:C.textMid}}>Noch keine Medien</div>
            <div style={{fontSize:13,color:C.textMute,marginTop:4,marginBottom:16}}>Dateien hochladen oder hierher ziehen</div>
            <Btn onClick={()=>ref.current?.click()}><Upload size={14} strokeWidth={2}/>Hochladen</Btn>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:12}}>
            {list.map(item=>(
              <div key={item.id} style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,background:C.surface,transition:"all .15s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.1)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                <div style={{position:"relative"}}>
                  {item.type==="video"?<video src={item.url} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}} muted/>:<img src={item.url} alt={item.name} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}}/>}
                  {item.focusPoint&&item.type!=="video"&&<div style={{position:"absolute",left:`${item.focusPoint.x}%`,top:`${item.focusPoint.y}%`,transform:"translate(-50%,-50%)",pointerEvents:"none"}}><div style={{width:12,height:12,borderRadius:"50%",border:"2px solid rgba(255,255,255,.9)",background:C.accent+"80"}}/></div>}
                </div>
                <div style={{padding:"8px 10px"}}>
                  <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                  <div style={{fontSize:11,color:C.textMute,marginTop:1}}>{item.type} · {item.date}</div>
                  {item.tags&&<div style={{fontSize:10,color:C.purple,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🏷 {item.tags}</div>}
                  <button onClick={()=>setDet(item)} style={{marginTop:6,background:"none",border:"none",color:C.textSoft,fontSize:11,fontWeight:600,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:3,fontFamily:FONT}}>
                    <Edit2 size={11} strokeWidth={2}/>Details & Fokus
                  </button>
                </div>
              </div>
            ))}
            {list.length===0&&q&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:C.textMute}}>Keine Treffer für „{q}"</div>}
          </div>
        )}
      </div>
      {det&&<MediaDetail item={det} onSave={u=>{onUpdate(u);setDet(null);}} onClose={()=>setDet(null)}/>}
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────
function Dashboard({posts,items,campaigns,user,onNav,onFilterNav}){
  const sched=posts.filter(p=>p.status==="scheduled");
  const drafts=posts.filter(p=>p.status==="draft");
  const pend=posts.filter(p=>p.status==="pending");
  const recent=[...posts].slice(-5).reverse();
  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column",gap:16}}>
      <Card style={{padding:"20px 24px",background:"linear-gradient(135deg,#0D0F12,#1f2937)",border:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:19,fontWeight:900,color:"#fff"}}>Guten Tag, {user.name.split(" ")[0]}! 👋</div>
            <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>
              <strong style={{color:"#fff"}}>{sched.length} geplant</strong> · <strong style={{color:"#fff"}}>{pend.length} zur Freigabe</strong> · <strong style={{color:"#fff"}}>{campaigns.length} Kampagnen</strong>
            </div>
          </div>
          <div style={{width:48,height:48,borderRadius:13,background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center"}}><Activity size={24} color="#fff" strokeWidth={1.5}/></div>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:12}}>
        <SCrd icon={Send}     label="Geplant"   value={sched.length}  delta={12} color={C.success} onClick={()=>onFilterNav("publisher","scheduled")}/>
        <SCrd icon={FileText} label="Entwürfe"  value={drafts.length} delta={-3} color={C.warning} onClick={()=>onFilterNav("publisher","draft")}/>
        <SCrd icon={Inbox}    label="Freigabe"  value={pend.length}   delta={0}  color={C.info}    onClick={()=>onFilterNav("publisher","pending")}/>
        <SCrd icon={Flag}     label="Kampagnen" value={campaigns.length}          color={C.purple}  onClick={()=>onNav("campaigns")}/>
        <SCrd icon={Image}    label="Medien"    value={items.length}  delta={8}  color="#0077B5"   onClick={()=>onNav("media")}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16}}>
        <Card>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.borderLight}`,fontWeight:800,fontSize:13,color:C.text,display:"flex",alignItems:"center",gap:7}}><Clock size={14} color={C.textMute} strokeWidth={IW}/>Letzte Posts</div>
          {recent.length===0?<div style={{padding:24,textAlign:"center",color:C.textMute,fontSize:13}}>Noch keine Posts</div>:recent.map((p,i)=>(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 18px",borderBottom:i<recent.length-1?`1px solid ${C.borderLight}`:"none"}}>
              <div style={{width:32,height:32,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><FileText size={14} color={C.textMute} strokeWidth={IW}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||"Kein Titel"}</div>
                <div style={{fontSize:11,color:C.textSoft,display:"flex",gap:4,marginTop:1}}>{p.channels?.map(c=><ChIco key={c} id={c} size={11}/>)}</div>
              </div>
              <SBadge status={p.status}/>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.borderLight}`,fontWeight:800,fontSize:13,color:C.text}}>Posts je Kanal</div>
          <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:9}}>
            {CHANNELS.map(ch=>{const n=posts.filter(p=>p.channels?.includes(ch.id)).length;const pct=posts.length?Math.round(n/posts.length*100):0;
              return <div key={ch.id} style={{display:"flex",alignItems:"center",gap:9}}>
                <ChIco id={ch.id} size={13}/>
                <div style={{width:72,fontSize:12,fontWeight:600,color:C.textMid}}>{ch.label}</div>
                <div style={{flex:1,height:6,background:C.borderLight,borderRadius:3,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:ch.color,borderRadius:3}}/></div>
                <div style={{width:20,fontSize:12,color:C.textSoft,textAlign:"right"}}>{n}</div>
              </div>;
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── PUBLISHER PAGE ─────────────────────────────────────────────────────────
function PublisherPage({posts,items,campaigns,onEdit,onSched,onDel,onApprove,onStatus,onCampaign,onNew,role,filt,setFilt}){
  const [view,setView]=useState("grid");
  const can=p=>ROLES[role]?.can.includes(p);
  const shown=posts.filter(p=>filt==="all"?true:p.status===filt);
  return(
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"10px 22px",borderBottom:`1px solid ${C.border}`,background:C.surface,display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",gap:2,background:C.borderLight,borderRadius:8,padding:3}}>
          {[["grid","⊞ Grid"],["board","⊟ Board"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:view===v?C.surface:"transparent",color:view===v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,boxShadow:view===v?"0 1px 3px rgba(0,0,0,.07)":"none"}}>{l}</button>
          ))}
        </div>
        {view==="grid"&&<div style={{display:"flex",gap:3,background:C.borderLight,borderRadius:8,padding:3}}>
          {[["all","Alle",posts.length],["scheduled","Geplant",posts.filter(p=>p.status==="scheduled").length],["draft","Entwürfe",posts.filter(p=>p.status==="draft").length],["pending","Freigabe",posts.filter(p=>p.status==="pending").length]].map(([v,l,c])=>(
            <button key={v} onClick={()=>setFilt(v)} style={{padding:"5px 11px",borderRadius:6,border:"none",background:filt===v?C.surface:"transparent",color:filt===v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>
              {l} <span style={{opacity:.6}}>{c}</span>
            </button>
          ))}
        </div>}
        <div style={{flex:1}}/>
        {can("write")&&<Btn onClick={onNew}><Plus size={14} strokeWidth={2.5}/>Neuer Post</Btn>}
      </div>
      {view==="grid"?(
        <div style={{flex:1,overflow:"auto",padding:22}}>
          {shown.length===0?<div style={{textAlign:"center",padding:"80px 20px"}}>
            <Send size={44} color={C.textMute} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/>
            <div style={{fontSize:15,fontWeight:700,color:C.textMid}}>Keine Posts</div>
            {can("write")&&<Btn style={{marginTop:14}} onClick={onNew}><Plus size={14} strokeWidth={2}/>Erstellen</Btn>}
          </div>:(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:18}}>
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

// ── PERFORMANCE PAGE ───────────────────────────────────────────────────────
function PerformancePage({posts}){
  const [per,setPer]=useState("30d");
  const MOCK={instagram:{reach:12400,imp:34200,eng:"5.4%",fol:2340,clk:890},twitter:{reach:8900,imp:21000,eng:"3.2%",fol:1120,clk:340},linkedin:{reach:6700,imp:15800,eng:"4.8%",fol:890,clk:520},facebook:{reach:5200,imp:11200,eng:"2.1%",fol:3400,clk:210},tiktok:{reach:9800,imp:28000,eng:"6.1%",fol:1800,clk:620},whatsapp:{reach:3200,imp:3200,eng:"12.4%",fol:890,clk:890}};
  const top=[...posts].slice(0,5).map(p=>({...p,reach:Math.floor(Math.random()*5000+500),eng:(Math.random()*8+1).toFixed(1)+"%"}));
  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:17,fontWeight:900,color:C.text}}>Performance</div><div style={{fontSize:13,color:C.textSoft,marginTop:2}}>Social Media Resultate</div></div>
        <div style={{display:"flex",gap:3,background:C.borderLight,borderRadius:8,padding:3}}>
          {[["7d","7T"],["30d","30T"],["90d","90T"]].map(([v,l])=><button key={v} onClick={()=>setPer(v)} style={{padding:"5px 11px",borderRadius:6,border:"none",background:per===v?C.surface:"transparent",color:per===v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>{l}</button>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
        <SCrd icon={Eye}          label="Reichweite"   value="44.3K" delta={18} color={C.accent}/>
        <SCrd icon={TrendingUp}   label="Impressionen" value="114K"  delta={12} color={C.info}/>
        <SCrd icon={Star}         label="Ø Engagement" value="5.7%"  delta={2}  color={C.warning}/>
        <SCrd icon={Activity}     label="Klicks"       value="3.07K" delta={24} color={C.success}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
        {CHANNELS.map(ch=>{const d=MOCK[ch.id];if(!d)return null;
          return <Card key={ch.id} style={{padding:"15px 18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:ch.color+"15",display:"flex",alignItems:"center",justifyContent:"center"}}><ChIco id={ch.id} size={15}/></div>
              <div style={{fontWeight:800,fontSize:14}}>{ch.label}</div>
            </div>
            {[["Reichweite",d.reach.toLocaleString("de")],["Impressionen",d.imp.toLocaleString("de")],["Engagement",d.eng],["Follower",d.fol.toLocaleString("de")],["Klicks",d.clk]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0"}}><span style={{color:C.textSoft}}>{l}</span><span style={{fontWeight:700}}>{v}</span></div>
            ))}
          </Card>;
        })}
      </div>
      {top.length>0&&<Card>
        <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.borderLight}`,fontWeight:800,fontSize:14}}>Top Posts</div>
        {top.map((p,i)=><div key={p.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 18px",borderBottom:i<top.length-1?`1px solid ${C.borderLight}`:"none"}}>
          <div style={{width:26,height:26,borderRadius:7,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:i===0?C.accent:C.textMute}}>{i+1}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div><div style={{display:"flex",gap:3,marginTop:2}}>{p.channels?.map(c=><ChIco key={c} id={c} size={11}/>)}</div></div>
          <div style={{display:"flex",gap:14,fontSize:12}}>
            <div style={{textAlign:"center"}}><div style={{fontWeight:700}}>{(p.reach/1000).toFixed(1)}K</div><div style={{color:C.textMute,fontSize:10}}>Reach</div></div>
            <div style={{textAlign:"center"}}><div style={{fontWeight:700}}>{p.eng}</div><div style={{color:C.textMute,fontSize:10}}>Eng.</div></div>
          </div>
        </div>)}
      </Card>}
    </div>
  );
}

// ── CALENDAR PAGE ──────────────────────────────────────────────────────────
function CalendarPage({posts}){
  const sched=posts.filter(p=>p.scheduledDate).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate));
  const grp=sched.reduce((acc,p)=>{acc[p.scheduledDate]=[...(acc[p.scheduledDate]||[]),p];return acc;},{});
  return(
    <div style={{flex:1,overflow:"auto",padding:22}}>
      <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:16}}>Posting-Kalender</div>
      {Object.keys(grp).length===0?<div style={{textAlign:"center",padding:"80px 20px",color:C.textMute}}>
        <Calendar size={48} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/>
        <div style={{fontSize:15,fontWeight:700,color:C.textMid}}>Keine geplanten Posts</div>
      </div>:Object.entries(grp).map(([date,dPosts])=>(
        <div key={date} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:36,height:36,borderRadius:9,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:900,color:"#fff"}}>{new Date(date).getDate()}</span>
            </div>
            <div><div style={{fontWeight:800,fontSize:14,color:C.text}}>{fmtDate(date)}</div><div style={{fontSize:12,color:C.textSoft}}>{dPosts.length} Post{dPosts.length>1?"s":""}</div></div>
          </div>
          <div style={{marginLeft:46,display:"flex",flexDirection:"column",gap:7}}>
            {dPosts.map(p=><Card key={p.id} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:12}}>
              {p.scheduledTime&&<div style={{fontSize:12,fontWeight:700,color:C.textSoft,width:40,flexShrink:0}}>{p.scheduledTime}</div>}
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{p.title||"Kein Titel"}</div><div style={{display:"flex",gap:4,marginTop:2}}>{p.channels?.map(c=><ChIco key={c} id={c} size={12}/>)}</div></div>
              <SBadge status={p.status}/>
            </Card>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ADMIN PAGE ─────────────────────────────────────────────────────────────
function AdminPage({me}){
  const [users,setUsers]=useState(DEMO_USERS.map(u=>({...u})));
  const [tab,setTab]=useState("users");
  const [invE,setInvE]=useState(""); const [invR,setInvR]=useState("editor"); const [ok,setOk]=useState(false);
  const [notif,setNotif]=useState({onSched:true,onAppr:true,onPub:true,onErr:true});
  const chs=[{id:"instagram",on:true,acc:"@mein_brand",since:"01.02.2026"},{id:"linkedin",on:true,acc:"Mein Unternehmen",since:"15.01.2026"},{id:"twitter",on:false},{id:"facebook",on:false},{id:"tiktok",on:false},{id:"whatsapp",on:false}];
  const invite=()=>{if(!invE)return;setOk(true);setTimeout(()=>setOk(false),2500);setInvE("");};
  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:3,background:C.borderLight,borderRadius:9,padding:4,alignSelf:"flex-start"}}>
        {[["users","Benutzer",Users],["channels","Kanäle",Globe],["settings","Einstellungen",Settings]].map(([id,l,Ic])=>(
          <button key={id} onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 15px",borderRadius:7,border:"none",background:tab===id?C.surface:"transparent",color:tab===id?C.text:C.textSoft,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FONT,boxShadow:tab===id?"0 1px 3px rgba(0,0,0,.07)":"none"}}>
            <Ic size={14} strokeWidth={IW}/>{l}
          </button>
        ))}
      </div>

      {tab==="users"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card style={{padding:"16px 20px"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Mitglied einladen</div>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <div style={{flex:1}}><TIn label="E-Mail" icon={Mail} placeholder="kollege@firma.com" value={invE} onChange={e=>setInvE(e.target.value)}/></div>
            <div><FL>Rolle</FL><select value={invR} onChange={e=>setInvR(e.target.value)} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT}}><option value="editor">Editor</option><option value="viewer">Betrachter</option><option value="admin">Admin</option></select></div>
            <Btn onClick={invite}><Send size={13} strokeWidth={2}/>Einladen</Btn>
          </div>
          {ok&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:6,color:C.success,fontSize:13,fontWeight:600}}><CheckCircle size={14} strokeWidth={2}/>Einladung gesendet!</div>}
        </Card>
        <Card>
          {users.map((u,i)=><div key={u.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 18px",borderBottom:i<users.length-1?`1px solid ${C.borderLight}`:"none"}}>
            <Avatar initials={u.avatar} size={36} color={ROLES[u.role].color}/>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{u.name}{u.id===me.id&&<span style={{fontSize:11,color:C.textMute,marginLeft:6}}>(Du)</span>}</div><div style={{fontSize:12,color:C.textSoft}}>{u.email}</div></div>
            <select value={u.role} disabled={u.id===me.id} onChange={e=>setUsers(p=>p.map(x=>x.id===u.id?{...x,role:e.target.value}:x))} style={{padding:"5px 9px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontWeight:700,color:ROLES[u.role].color,fontFamily:FONT,background:ROLES[u.role].color+"10"}}>
              <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Betrachter</option>
            </select>
            {u.id!==me.id&&<button onClick={()=>setUsers(p=>p.filter(x=>x.id!==u.id))} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><Trash2 size={15} strokeWidth={IW}/></button>}
          </div>)}
        </Card>
      </div>}

      {tab==="channels"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
        {chs.map(ch=>{const info=CHANNELS.find(c=>c.id===ch.id);
          return <Card key={ch.id} style={{padding:"15px 18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:34,height:34,borderRadius:8,background:info?.color+"15",display:"flex",alignItems:"center",justifyContent:"center"}}><ChIco id={ch.id} size={17}/></div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{info?.label}</div>{ch.on&&<div style={{fontSize:12,color:C.textSoft}}>{ch.acc}</div>}</div>
              <Badge color={ch.on?C.success:C.textMute} bg={ch.on?C.successBg:C.borderLight}>{ch.on?<><Check size={10} strokeWidth={2.5}/>Aktiv</>:"Getrennt"}</Badge>
            </div>
            {ch.on?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:C.textSoft}}>Seit {ch.since}</span><Btn variant="danger" size="sm"><X size={12} strokeWidth={2}/>Trennen</Btn></div>:<Btn size="sm" style={{justifyContent:"center",width:"100%"}}><Plus size={13} strokeWidth={2}/>Verbinden</Btn>}
          </Card>;
        })}
      </div>}

      {tab==="settings"&&<div style={{maxWidth:520,display:"flex",flexDirection:"column",gap:14}}>
        <Card style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
          <TIn label="Workspace-Name" defaultValue="SocialFlow Demo"/>
          <TIn label="Zeitzone" defaultValue="Europe/Berlin"/>
          <div><FL>Sprache</FL><select style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT}}><option>Deutsch</option><option>English</option></select></div>
        </Card>
        <Card style={{padding:"14px 18px"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>E-Mail Benachrichtigungen</div>
          {[["onSched","Post geplant"],["onAppr","Freigabe angefordert"],["onPub","Post veröffentlicht"],["onErr","Fehler beim Posten"]].map(([key,label])=>(
            <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.borderLight}`}}>
              <span style={{fontSize:13,color:C.textMid}}>{label}</span>
              <div onClick={()=>setNotif(n=>({...n,[key]:!n[key]}))} style={{width:36,height:20,borderRadius:10,background:notif[key]?C.accent:C.border,display:"flex",alignItems:"center",padding:"0 2px",cursor:"pointer",transition:"all .2s",justifyContent:notif[key]?"flex-end":"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"#fff"}}/>
              </div>
            </div>
          ))}
        </Card>
        <Btn style={{alignSelf:"flex-start"}}><Check size={14} strokeWidth={2}/>Speichern</Btn>
      </div>}
    </div>
  );
}
// ── APP ROOT ───────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [nav,setNav]=useState("dashboard");
  const [posts,setPosts]=useState(DEMO_POSTS);
  const [items,setItems]=useState([]);
  const [campaigns,setCampaigns]=useState(DEMO_CAMPAIGNS);
  const [edPost,setEdPost]=useState(null);
  const [schPost,setSchPost]=useState(null);
  const [filt,setFilt]=useState("all");
  const [dbReady,setDbReady]=useState(false);
  const [saving,setSaving]=useState(false);
  const saveTimer=useRef(null);

  // Daten laden nach Login
  useEffect(()=>{
    if(!user){setDbReady(false);return;}
    const ukey="user_"+user.email.replace(/[^a-z0-9]/gi,"_");
    (async()=>{
      const saved=await dbGet(ukey);
      if(saved){
        if(saved.posts?.length)setPosts(saved.posts);
        if(saved.campaigns?.length)setCampaigns(saved.campaigns);
        if(saved.items?.length)setItems(saved.items);
      }
      setDbReady(true);
    })();
  },[user]);

  // Auto-save bei Änderungen
  useEffect(()=>{
    if(!user||!dbReady)return;
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current=setTimeout(async()=>{
      const ukey="user_"+user.email.replace(/[^a-z0-9]/gi,"_");
      await dbSet(ukey,{posts,campaigns,items});
      setSaving(false);
    },1500);
  },[posts,campaigns,items]);

  if(!user) return <Login onLogin={setUser}/>;
  if(!dbReady&&user) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:16}}>
      <div style={{width:40,height:40,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontSize:14,color:C.textMute}}>Deine Daten werden geladen…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const save=p=>{setPosts(prev=>prev.find(x=>x.id===p.id)?prev.map(x=>x.id===p.id?p:x):[...prev,p]);setEdPost(null);};
  const saveSch=p=>{setPosts(prev=>prev.map(x=>x.id===p.id?p:x));setSchPost(null);};
  const del=id=>{if(window.confirm("Post löschen?"))setPosts(prev=>prev.filter(p=>p.id!==id));};
  const approve=(id,st)=>setPosts(prev=>prev.map(p=>p.id===id?{...p,status:st}:p));
  const chSt=(id,st)=>setPosts(prev=>prev.map(p=>p.id===id?{...p,status:st}:p));
  const chCamp=(id,cid)=>setPosts(prev=>prev.map(p=>p.id===id?{...p,campaignId:cid}:p));
  const newPost=()=>setEdPost({id:null,title:"",content:"",hashtags:"",channels:[],scheduledDate:"",scheduledTime:"",status:"draft",mediaId:null,campaignId:null});
  const goNav=n=>{setNav(n);setFilt("all");};
  const goFilter=(pg,f)=>{setNav(pg);setFilt(f);};

  const TITLE={dashboard:"Dashboard",publisher:"Publisher",campaigns:"Kampagnen",media:"Medienbibliothek",calendar:"Kalender",performance:"Performance",admin:"Admin"};

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:FONT,background:C.bg,overflow:"hidden"}}>
      <style>{CSS}</style>
      <Sidebar active={nav} onNav={goNav} user={user} onLogout={()=>setUser(null)} pend={posts.filter(p=>p.status==="pending").length}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <TopBar title={TITLE[nav]||"SocialFlow"} user={user} saving={saving}/>
        {nav==="dashboard"   &&<Dashboard posts={posts} items={items} campaigns={campaigns} user={user} onNav={goNav} onFilterNav={goFilter}/>}
        {nav==="publisher"   &&<PublisherPage posts={posts} items={items} campaigns={campaigns} onEdit={setEdPost} onSched={setSchPost} onDel={del} onApprove={approve} onStatus={chSt} onCampaign={chCamp} onNew={newPost} role={user.role} filt={filt} setFilt={setFilt}/>}
        {nav==="campaigns"   &&<CampaignsPage campaigns={campaigns} setCampaigns={setCampaigns} posts={posts} onEditPost={setEdPost}/>}
        {nav==="media"       &&<MediaPage items={items} onUpload={i=>setItems(p=>[...p,i])} onUpdate={u=>setItems(p=>p.map(x=>x.id===u.id?u:x))}/>}
        {nav==="calendar"    &&<CalendarPage posts={posts}/>}
        {nav==="performance" &&<PerformancePage posts={posts}/>}
        {nav==="admin"       &&user.role==="admin"&&<AdminPage me={user}/>}
      </div>
      {edPost&&<Editor post={edPost} items={items} campaigns={campaigns} onSave={save} onClose={()=>setEdPost(null)} onUpload={i=>setItems(p=>[...p,i])} user={user}/>}
      {schPost&&<SchedModal post={schPost} onSave={saveSch} onClose={()=>setSchPost(null)}/>}
    </div>
  );
}
