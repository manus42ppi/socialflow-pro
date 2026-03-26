import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, Send, Image, Calendar, BarChart2, Settings, Flag,
  Users, Bell, LogOut, Plus, Search, Clock, Check, X, Edit2, Trash2,
  Upload, Star, TrendingUp, ArrowUp, ArrowDown, Activity, Globe,
  Lock, Mail, Shield, AlertCircle, CheckCircle, Instagram,
  Twitter, Linkedin, Facebook, Hash, Layers, Inbox, Sparkles,
  Tag, MapPin, Zap, FileText, Eye
} from "lucide-react";

// ── FONT & COLORS ──────────────────────────────────────────────────────────
const FONT = "'Inter', 'DM Sans', system-ui, sans-serif";
const FONT_DISPLAY = "'Syne', 'Inter', system-ui, sans-serif";
const IW = 1.7;
const C = {
  bg:"#F7F7F5", sidebar:"#111110",
  sidebarMid:"#1A1A18",
  surface:"#FFFFFF", border:"#E8E8E4", borderLight:"#F0F0EC",
  text:"#111110", textMid:"#3D3D3A", textSoft:"#787873", textMute:"#AEAEA8",
  accent:"#5B5BD6", accentLight:"#EDEDFF", accentGlow:"rgba(91,91,214,0.12)",
  success:"#30A46C", successBg:"#E5F7EF",
  warning:"#C4511E", warningBg:"#FFF0E6",
  info:"#5B5BD6", infoBg:"#EDEDFF",
  purple:"#5B5BD6", purpleBg:"#EDEDFF",
  purpleGlow:"rgba(91,91,214,0.15)",
  ai1:"#5B5BD6", ai2:"#7C7CE8",
  red:"#E5484D", redLight:"#FFECEC",
  glass:"rgba(255,255,255,0.7)",
  glassStroke:"rgba(255,255,255,0.9)",
};
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap');
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(94,53,177,0.3)} 50%{box-shadow:0 0 18px rgba(94,53,177,0.6)} }
  * { box-sizing:border-box; }  body { margin:0; }
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}
  ::-webkit-scrollbar-thumb:hover{background:#94A3B8}
`;

// ── DOMAIN DATA ────────────────────────────────────────────────────────────
const CHANNELS = [
  { id:"instagram", label:"Instagram",  color:"#E1306C", bg:"#fff0f6", maxChars:2200  },
  { id:"twitter",   label:"X/Twitter",  color:"#000000", bg:"#f7f7f7", maxChars:280   },
  { id:"linkedin",  label:"LinkedIn",   color:"#0077B5", bg:"#f0f7fc", maxChars:3000  },
  { id:"facebook",  label:"Facebook",   color:"#1877F2", bg:"#f0f5ff", maxChars:63000 },
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
  { id:"p5", title:"Sommer Sale",       content:"☀️ Bis zu 40% Rabatt – nur kurze Zeit!", hashtags:"#sale", channels:["instagram","facebook"], scheduledDate:"2026-06-01", scheduledTime:"10:00", status:"draft", mediaId:null, campaignId:"c1" },
];

// ── UTILS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10);
const fileToDataURL = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
const getMediaType = f => f.type.startsWith("video/")?"video": f.name.toLowerCase().includes("logo")?"logo": f.type.startsWith("image/")?"image":"document";
const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}) : "";

// ── AI SERVICE (via Cloudflare Function Proxy) ────────────────────────────
async function aiCall(messages, max_tokens=800) {
  const r = await fetch("/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens,messages}),
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data?.error?.message||`HTTP ${r.status}`);
  return data.content?.[0]?.text||"";
}
const parseJSON = raw => { try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{return null;} };

// ── KV STORAGE HELPERS ──────────────────────────────────────────────────────
async function storeGet(path){try{const r=await fetch("/store",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({method:"get",path})});const d=await r.json();return d.ok?d.data:null;}catch{return null;}}
async function storeSet(path,value){try{await fetch("/store",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({method:"set",path,value})});}catch{}}
const AI = {
  optimize:(text,ch,tone)=>aiCall([{role:"user",content:`Du bist Social-Media-Experte. Optimiere fuer ${ch} im Ton "${tone}". NUR der optimierte Text:\n\n${text}`}]),
  hashtags:(text,ch)=>aiCall([{role:"user",content:`Generiere 8-12 performante Hashtags fuer ${ch}. Mische populaere, mittelgrosse und Nischen-Hashtags. NUR kommagetrennte Hashtags:\n\n${text}`}],300),
  variants:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`3 Post-Varianten fuer ${ch} nach AIDA, PAS und Hook+Value. NUR JSON:{"variants":[{"formula":"AIDA","tone":"Attention-Interest-Desire-Action","text":""},{"formula":"PAS","tone":"Problem-Agitation-Solution","text":""},{"formula":"Hook","tone":"Hook+Wert+CTA","text":""}]}\n\nOriginal:\n${text}`}],1500);
    return parseJSON(raw)?.variants||[];
  },
  score:async(text,ch,maxChars)=>{
    const raw=await aiCall([{role:"user",content:`Analysiere diesen Post fuer ${ch}. NUR JSON:{"total":0,"readability":{"score":0,"hint":""},"engagement":{"score":0,"hint":""},"cta":{"score":0,"hint":""},"platform":{"score":0,"hint":""},"topTip":""}\nJede Dimension max 25 Punkte. Kanal:${ch}, Limit:${maxChars}, Aktuell:${text.length} Zeichen\n\n${text}`}],500);
    return parseJSON(raw);
  },
  rewrite:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`Rewrite diesen Post optimal fuer ${ch}. Passe Laenge, Ton und Stil an die Plattformkultur an. NUR JSON:{"rewritten":"","changes":["","",""]}\n\nOriginal:\n${text}`}],800);
    return parseJSON(raw);
  },
  hook:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`4 starke Einstiegssaetze (Hooks) fuer ${ch}: Frage, Provokation, Zahl/Statistik, Storytelling. NUR JSON:{"hooks":[{"type":"Frage","text":""},{"type":"Provokation","text":""},{"type":"Statistik","text":""},{"type":"Story","text":""}]}\n\nThema:\n${text}`}],600);
    return parseJSON(raw)?.hooks||[];
  },
  ideas:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`4 kreative Content-Ideen fuer ${ch}. NUR JSON:{"ideas":[{"title":"","hook":"","format":"Karussell|Reel|Story|Post","emoji":""}]}\n\nThema: ${text}`}],900);
    return parseJSON(raw)?.ideas||[];
  },
  emojis:async(text)=>{
    const raw=await aiCall([{role:"user",content:`10 passende Emojis fuer diesen Post. NUR JSON:{"emojis":[]}\n\n${text}`}],200);
    return parseJSON(raw)?.emojis||[];
  },
  analyzeImg:async(dataUrl)=>{
    const b64=dataUrl.split(",")[1],mime=dataUrl.split(";")[0].split(":")[1]||"image/jpeg";
    const raw=await aiCall([{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mime,data:b64}},
      {type:"text",text:'Analysiere dieses Bild fuer Social Media. NUR JSON:{"tags":[],"description":"","suggestedAlt":"","mood":"","subjects":[],"focalPoint":{"x":50,"y":50,"reason":""},"colorPalette":["#hex"],"score":{"brightness":0,"contrast":0,"composition":0,"engagementPotential":0,"overall":0},"platformFit":{"instagram":"gut","linkedin":"gut","facebook":"gut"},"improvements":[""]}'}
    ]}],700);
    return parseJSON(raw)||{};
  },
};
// ── UI PRIMITIVES ──────────────────────────────────────────────────────────
function Sp({color="#fff"}){return <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${color}30`,borderTopColor:color,animation:"spin .7s linear infinite",flexShrink:0}}/>;}
function Badge({color,bg,children}){return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:bg||C.borderLight,color:color||C.textSoft,fontSize:10.5,fontWeight:700,padding:"2px 9px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:".01em"}}>{children}</span>;}
function Avatar({initials,size=32,color=C.accent}){return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color}30,${color}15)`,color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*.36,flexShrink:0,border:`1.5px solid ${color}40`,boxShadow:`0 0 0 2px ${color}10`}}>{initials}</div>;}

function Btn({children,variant="primary",size="md",onClick,disabled=false,style={}}){
  const V={
    primary:{background:C.text,color:"#fff",border:"none",boxShadow:"none"},
    secondary:{background:C.surface,color:C.textMid,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"},
    ghost:{background:"transparent",color:C.textSoft,border:"none"},
    danger:{background:C.accentLight,color:C.accent,border:`1px solid #FECACA`},
    success:{background:C.successBg,color:C.success,border:`1px solid #A7F3D0`},
    ai:{background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,color:"#fff",border:"none",boxShadow:`0 2px 12px ${C.purpleGlow}`},
  };
  const P={sm:"5px 12px",md:"8px 17px"};
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",gap:6,padding:P[size]||P.md,borderRadius:8,fontWeight:600,fontSize:size==="sm"?12:13,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all .18s",fontFamily:FONT,...V[variant],...style}}>{children}</button>;
}

function Card({children,style={},onClick}){return <div onClick={onClick} style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 6px rgba(13,21,38,.05)",...style}}>{children}</div>;}
function FL({children}){return <label style={{fontSize:11.5,fontWeight:700,color:C.textMid,display:"block",marginBottom:5,letterSpacing:".02em",textTransform:"uppercase"}}>{children}</label>;}

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
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:m.bg,color:m.color,fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:20,letterSpacing:".01em"}}><m.I size={10} strokeWidth={2.5}/>{m.label}</span>;
}

function SCrd({icon:Icon,label,value,delta,color,onClick}){
  return(
    <Card style={{padding:"20px 20px 16px",cursor:onClick?"pointer":"default",transition:"all .18s",userSelect:"none",overflow:"hidden",position:"relative"}} onClick={onClick}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow="0 6px 24px rgba(13,21,38,.1)";e.currentTarget.style.transform="translateY(-2px)";}}}
      onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow="0 1px 6px rgba(13,21,38,.05)";e.currentTarget.style.transform="";}}}>
      <div style={{position:"absolute",top:-10,right:-10,width:80,height:80,borderRadius:"50%",background:(color||C.accent)+"08",pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{width:38,height:38,borderRadius:11,background:(color||C.accent)+"15",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 8px ${(color||C.accent)}20`}}>
          <Icon size={17} color={color||C.accent} strokeWidth={IW}/>
        </div>
        {delta!==undefined&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,fontWeight:700,color:delta>=0?C.success:C.accent,background:delta>=0?C.successBg:C.accentLight,padding:"2px 7px",borderRadius:20}}>
          {delta>=0?<ArrowUp size={11} strokeWidth={2.5}/>:<ArrowDown size={11} strokeWidth={2.5}/>}{Math.abs(delta)}%
        </div>}
      </div>
      <div style={{marginTop:14,fontFamily:FONT_DISPLAY,fontSize:26,fontWeight:700,color:C.text,letterSpacing:"-.03em"}}>{value}</div>
      <div style={{fontSize:12,color:C.textSoft,marginTop:3,display:"flex",alignItems:"center"}}>
        {label}{onClick&&<span style={{marginLeft:"auto",fontSize:11,color:C.textMute,opacity:.6}}>→</span>}
      </div>
    </Card>
  );
}

// ── CHANNEL ICONS (custom SVG – brand color or monochrome via color prop) ──
const CHCLR={instagram:"#E1306C",twitter:"#000000",linkedin:"#0077B5",facebook:"#1877F2",whatsapp:"#25D366"};
function ChIco({id,size=14,color}){
  const col=color||CHCLR[id]||C.textSoft;
  if(id==="instagram") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke={col} strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" stroke={col} strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill={col}/>
    </svg>
  );
  if(id==="twitter") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill={col}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.838L2.016 2.25H8.48l4.26 5.632 5.504-5.632z"/>
    </svg>
  );
  if(id==="linkedin") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="3" stroke={col} strokeWidth="2"/>
      <path d="M7 10v7M7 7.5v.01M11 10v7M11 13a3 3 0 016 0v4" stroke={col} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if(id==="facebook") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke={col} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
  if(id==="whatsapp") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.954 9.954 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke={col} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8.5 8.5s.5 1 1.5 2 2 1.5 2 1.5l1.5-1 2 3.5s-2 1.5-3.5.5C10 14 8 12 7 10c-1-2 1.5-1.5 1.5-1.5z" stroke={col} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return <Globe size={size} color={col} strokeWidth={IW}/>;
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
        <div style={{fontSize:10,lineHeight:1.4,opacity:.9}}>{post.content?.slice(0,50)||"Video…"}</div>
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
const PREV={instagram:IGPrev,twitter:TWPrev,linkedin:LIPrev,facebook:FBPrev,whatsapp:WAPrev};
// ── LOGIN ──────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [ld,setLd]=useState(false); const [sl,setSl]=useState("");
  const go=()=>{setLd(true);setErr("");setTimeout(()=>{const u=DEMO_USERS.find(u=>u.email===email&&u.password===pw);u?onLogin(u):(setErr("E-Mail oder Passwort falsch."),setLd(false));},700);};
  const soc=p=>{setSl(p);setTimeout(()=>onLogin({...DEMO_USERS[0],name:p==="google"?"Google User":"Apple User"}),1200);};
  return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 50%,#1a0e2e 0%,#0A0C10 50%,#0d1420 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:16}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(circle at 80% 20%,${C.accent}08 0%,transparent 50%),radial-gradient(circle at 20% 80%,${C.purple}0A 0%,transparent 50%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:420,animation:"fadeUp .45s ease",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:11,marginBottom:8}}>
            <div style={{width:50,height:50,borderRadius:15,background:`linear-gradient(135deg,${C.accent},#8b0000)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 8px 32px ${C.accentGlow}`}}><Layers size={24} color="#fff" strokeWidth={1.5}/></div>
            <span style={{fontFamily:FONT_DISPLAY,fontSize:26,fontWeight:800,color:"#fff",letterSpacing:"-.03em"}}>SocialFlow</span>
          </div>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:13.5,margin:0,letterSpacing:".01em"}}>Dein Social Media Command Center</p>
        </div>
        <div style={{background:"rgba(255,255,255,.04)",backdropFilter:"blur(20px)",borderRadius:18,border:"1px solid rgba(255,255,255,.1)",padding:"28px 26px",boxShadow:"0 24px 64px rgba(0,0,0,.4)"}}>
          <h2 style={{margin:"0 0 22px",fontFamily:FONT_DISPLAY,fontSize:20,fontWeight:700,color:"#fff",letterSpacing:"-.02em"}}>Willkommen zurück</h2>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:18}}>
            <button onClick={()=>soc("google")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"10px 16px",borderRadius:10,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.9)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT,transition:"all .18s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
              {sl==="google"?<Sp color="#fff"/>:<><svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Mit Google anmelden</>}
            </button>
            <button onClick={()=>soc("apple")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"10px 16px",borderRadius:10,border:"none",background:"#fff",color:"#000",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT,transition:"all .18s"}} onMouseEnter={e=>e.currentTarget.style.background="#f0f0f0"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              {sl==="apple"?<Sp color="#000"/>:<><svg width="15" height="18" viewBox="0 0 814 1000"><path fill="#000" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.6-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 135.4-317.7 268.8-317.7 99.8 0 176.1 52.7 236.4 52.7 57.8 0 147.8-56.1 261.6-56.1l45.3.5zM600.3 80.1c28.5-35.9 48.5-86.2 48.5-136.5 0-7-.6-14.1-1.9-20.9-46.1 1.9-100.3 30.7-133.8 73.5-26.7 31.4-51.3 81.7-51.3 132.6 0 7.6 1.3 15.2 1.9 17.7 3.2.6 8.3 1.3 13.4 1.3 41.3 0 93.5-27.9 123.2-67.7z"/></svg>Mit Apple anmelden</>}
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/><span style={{fontSize:11.5,color:"rgba(255,255,255,.35)",fontWeight:600,letterSpacing:".03em"}}>ODER PER E-MAIL</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".06em"}}>E-MAIL</label>
              <div style={{position:"relative"}}>
                <Mail size={13} color="rgba(255,255,255,.3)" strokeWidth={IW} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
                <input type="email" placeholder="admin@demo.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={{width:"100%",padding:"9px 12px 9px 34px",borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.07)",color:"#fff",fontSize:13,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".06em"}}>PASSWORT</label>
              <div style={{position:"relative"}}>
                <Lock size={13} color="rgba(255,255,255,.3)" strokeWidth={IW} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
                <input type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={{width:"100%",padding:"9px 12px 9px 34px",borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.07)",color:"#fff",fontSize:13,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
              </div>
            </div>
            {err&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(214,59,59,.15)",border:`1px solid ${C.accent}40`,borderRadius:9,padding:"8px 12px",fontSize:13,color:"#fca5a5"}}><AlertCircle size={14} strokeWidth={2}/>{err}</div>}
            <button onClick={go} disabled={ld} style={{padding:"11px 16px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.accent},#4444b8)`,color:"#fff",fontWeight:700,fontSize:14,cursor:ld?"not-allowed":"pointer",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:`0 4px 20px ${C.accentGlow}`,transition:"all .18s"}}>
              {ld?<><Sp/>Anmelden…</>:"Anmelden"}
            </button>
          </div>
          <div style={{marginTop:16,padding:"12px 14px",background:"rgba(255,255,255,.04)",borderRadius:10,border:"1px solid rgba(255,255,255,.08)"}}>
            <div style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,.35)",marginBottom:7,display:"flex",alignItems:"center",gap:5,letterSpacing:".04em"}}><Shield size={10} strokeWidth={2}/>DEMO-ZUGÄNGE (klicken)</div>
            {DEMO_USERS.map(u=><div key={u.id} onClick={()=>{setEmail(u.email);setPw(u.password);}} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",cursor:"pointer"}}>
              <span style={{color:"#7dd3fc",fontFamily:"monospace"}}>{u.email}</span>
              <Badge color={ROLES[u.role].color}>{ROLES[u.role].label}</Badge>
            </div>)}
          </div>
        </div>
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
    <div style={{width:64,background:C.sidebar,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 0 12px",gap:2,flexShrink:0,borderRight:`1px solid rgba(255,255,255,.04)`}}>
      <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${C.accent},#4444b8)`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:`0 4px 16px ${C.accentGlow}`}}><Layers size={19} color="#fff" strokeWidth={1.5}/></div>
      {items.map(({id,label,I})=>{const on=active===id;
        return <button key={id} onClick={()=>onNav(id)} title={label} style={{position:"relative",width:44,height:44,borderRadius:12,border:"none",background:on?"rgba(255,255,255,.09)":"transparent",color:on?"#fff":"#4A5568",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .18s"}}
          onMouseEnter={e=>{if(!on){e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.color="#9CA3AF";}}}
          onMouseLeave={e=>{if(!on){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#4A5568";}}}>
          <I size={18} strokeWidth={IW}/>
          {on&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:20,background:C.accent,borderRadius:"0 3px 3px 0",boxShadow:`2px 0 8px ${C.accentGlow}`}}/>}
        </button>;
      })}
      <div style={{flex:1}}/>
      <button title="Benachrichtigungen" style={{position:"relative",width:44,height:44,borderRadius:12,border:"none",background:"transparent",color:"#4A5568",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .18s"}}
        onMouseEnter={e=>{e.currentTarget.style.color="#9CA3AF";}} onMouseLeave={e=>{e.currentTarget.style.color="#4A5568";}}>
        <Bell size={18} strokeWidth={IW}/>{pend>0&&<div style={{position:"absolute",top:9,right:9,width:7,height:7,borderRadius:"50%",background:C.accent,boxShadow:`0 0 6px ${C.accent}`}}/>}
      </button>
      <button onClick={onLogout} title="Abmelden" style={{width:44,height:44,borderRadius:12,border:"none",background:"transparent",color:"#4A5568",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .18s"}} onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#4A5568"}><LogOut size={18} strokeWidth={IW}/></button>
      <div style={{marginTop:6,marginBottom:2}}><Avatar initials={user.avatar} size={32} color={C.accent}/></div>
    </div>
  );
}
function TopBar({title,user,onNew}){
  return(
    <div style={{height:50,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 22px",gap:12,flexShrink:0}}>
      <div style={{fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:15,color:C.text,letterSpacing:"-.01em"}}>{title}</div>
      <div style={{flex:1}}/>
      <div style={{display:"flex",alignItems:"center",gap:7,background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 11px",fontSize:12,color:C.textSoft,width:190}}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="5" stroke={C.textMute} strokeWidth="1.5"/><path d="M10 10l2.5 2.5" stroke={C.textMute} strokeWidth="1.5" strokeLinecap="round"/></svg>
        Suchen…
        <span style={{marginLeft:"auto",fontSize:10,color:C.textMute}}>⌘K</span>
      </div>
      <button style={{width:34,height:34,borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.textSoft}}>
        <Bell size={16} strokeWidth={IW}/>
      </button>
      <Btn onClick={onNew} style={{gap:5}}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
        Neuer Post
      </Btn>
    </div>
  );
}

// ── AI PANEL ─────────────────────────────────────────────────────────────────
const AI_TABS=[
  {id:"score",  label:"Score",     icon:BarChart2},
  {id:"opt",    label:"Optimieren",icon:Zap},
  {id:"rewrite",label:"Rewrite",   icon:Edit2},
  {id:"hook",   label:"Hooks",     icon:Zap},
  {id:"ht",     label:"Hashtags",  icon:Hash},
  {id:"v3",     label:"Varianten", icon:Layers},
  {id:"ideas",  label:"Ideen",     icon:Sparkles},
];
const TONES=[
  {id:"professional",label:"Professionell",emoji:"💼"},
  {id:"casual",label:"Locker",emoji:"😎"},
  {id:"energetic",label:"Energetisch",emoji:"⚡"},
  {id:"inspiring",label:"Inspirierend",emoji:"✨"},
  {id:"funny",label:"Humorvoll",emoji:"😄"},
  {id:"urgent",label:"Dringend",emoji:"🔥"},
];
const BEST_TIMES={
  instagram:["Mo 9:00","Mi 11:00","Fr 18:00"],
  twitter:  ["Di 8:00","Mi 12:00","Do 17:00"],
  linkedin: ["Di 9:00","Mi 10:00","Do 8:00"],
  facebook: ["Mo 15:00","Mi 13:00","Fr 11:00"],
  whatsapp: ["Mo 11:00","Mi 16:00","Fr 10:00"],
};

// Score bar component
function ScoreBar({label,score,hint,color}){
  const pct=Math.min(100,Math.max(0,(score/25)*100));
  const barColor=score>=20?"#22C55E":score>=13?"#F59E0B":"#EF4444";
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontSize:11,fontWeight:700,color:C.navyMid||C.textMid}}>{label}</span>
        <span style={{fontSize:11,fontWeight:800,color:barColor}}>{score}/25</span>
      </div>
      <div style={{height:5,borderRadius:3,background:C.borderLight,overflow:"hidden",marginBottom:3}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:barColor,transition:"width .6s ease"}}/>
      </div>
      {hint&&<div style={{fontSize:10.5,color:C.textMute,lineHeight:1.4}}>{hint}</div>}
    </div>
  );
}

function AIPanel({content,chId,onApply,onApplyHT}){
  const [tab,setTab]=useState("score");
  const [tone,setTone]=useState("professional");
  const [ld,setLd]=useState(false);
  const [res,setRes]=useState("");
  const [vars,setVars]=useState([]);
  const [ideas,setIdeas]=useState([]);
  const [hooks,setHooks]=useState([]);
  const [scoreData,setScoreData]=useState(null);
  const [rewriteData,setRewriteData]=useState(null);
  const [emojis,setEmojis]=useState([]);
  const [copied,setCopied]=useState(null);
  const ch=CHANNELS.find(c=>c.id===chId)||CHANNELS[0];
  const maxC=ch.maxChars||2200;

  const copy=(text,key)=>{navigator.clipboard?.writeText(text);setCopied(key);setTimeout(()=>setCopied(null),1500);};
  const reset=()=>{setRes("");setVars([]);setIdeas([]);setHooks([]);setScoreData(null);setRewriteData(null);};

  const run=async()=>{
    if(!content.trim())return;
    setLd(true);reset();
    try{
      if(tab==="opt")   setRes(await AI.optimize(content,ch.label,tone));
      else if(tab==="ht") setRes(await AI.hashtags(content,ch.label));
      else if(tab==="v3") setVars(await AI.variants(content,ch.label));
      else if(tab==="ideas") setIdeas(await AI.ideas(content,ch.label));
      else if(tab==="hook")  setHooks(await AI.hook(content,ch.label));
      else if(tab==="score") setScoreData(await AI.score(content,ch.label,maxC));
      else if(tab==="rewrite"){ const d=await AI.rewrite(content,ch.label); setRewriteData(d); }
    }catch(err){setRes("Fehler: "+(err.message||"Bitte erneut versuchen."));}
    setLd(false);
  };

  const getEmojis=async()=>{
    if(!content.trim())return; setLd(true);
    setEmojis(await AI.emojis(content)); setLd(false);
  };

  // Live char count & simple rule-based score preview
  const charPct=Math.min(100,(content.length/maxC)*100);
  const charColor=charPct>90?"#EF4444":charPct>70?"#F59E0B":"#22C55E";

  return(
    <div style={{background:`linear-gradient(160deg,${C.purpleBg},#fdf5ff 60%,${C.accentLight})`,borderRadius:12,border:`1px solid ${C.purple}22`,overflow:"hidden",animation:"fadeIn .3s ease"}}>

      {/* ── Header ── */}
      <div style={{padding:"10px 14px",background:`linear-gradient(135deg,${C.purple}22,${C.accent}10)`,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.purple}15`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,borderRadius:7,background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 8px ${C.purpleGlow}`}}>
            <Sparkles size={12} color="#fff" strokeWidth={2}/>
          </div>
          <span style={{fontFamily:FONT_DISPLAY,fontWeight:700,fontSize:13,color:C.purple}}>KI-Assistent</span>
          <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,color:"#fff",letterSpacing:".04em"}}>PRO</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Live char counter */}
          <div style={{fontSize:10.5,fontWeight:700,color:charColor,background:charColor+"12",padding:"2px 8px",borderRadius:10,border:`1px solid ${charColor}30`}}>
            {content.length}/{maxC}
          </div>
          <button onClick={getEmojis} disabled={ld||!content.trim()} style={{background:C.purple+"15",border:`1px solid ${C.purple}25`,borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer",color:C.purple,fontWeight:600,fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}>
            {ld?"…":"😊"} Emojis
          </button>
        </div>
      </div>

      {/* ── Emoji strip ── */}
      {emojis.length>0&&(
        <div style={{padding:"7px 12px",background:"#fff",borderBottom:`1px solid ${C.border}`,display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:C.textMute,marginRight:2}}>EMOJIS:</span>
          {emojis.map((e,i)=>(
            <button key={i} onClick={()=>copy(e,`e${i}`)} style={{fontSize:16,background:copied===`e${i}`?"#f0fdf4":C.bg,border:`1px solid ${copied===`e${i}`?C.success:C.border}`,borderRadius:6,padding:"2px 5px",cursor:"pointer"}}>
              {copied===`e${i}`?<Check size={10} color={C.success} strokeWidth={3}/>:e}
            </button>
          ))}
          <button onClick={()=>setEmojis([])} style={{marginLeft:"auto",background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:2}}><X size={11} strokeWidth={2}/></button>
        </div>
      )}

      {/* ── Tabs (2-row for 7 tabs) ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2,padding:"8px 10px 2px"}}>
        {AI_TABS.slice(0,4).map(({id,label,icon:Ic})=>(
          <button key={id} onClick={()=>{setTab(id);reset();}} style={{padding:"5px 3px",borderRadius:7,border:"none",background:tab===id?`linear-gradient(135deg,${C.ai1},${C.ai2})`:"transparent",color:tab===id?"#fff":C.textSoft,fontWeight:600,fontSize:10,cursor:"pointer",fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"all .15s"}}>
            <Ic size={12} strokeWidth={2}/>{label}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,padding:"2px 10px 6px"}}>
        {AI_TABS.slice(4).map(({id,label,icon:Ic})=>(
          <button key={id} onClick={()=>{setTab(id);reset();}} style={{padding:"5px 3px",borderRadius:7,border:"none",background:tab===id?`linear-gradient(135deg,${C.ai1},${C.ai2})`:"transparent",color:tab===id?"#fff":C.textSoft,fontWeight:600,fontSize:10,cursor:"pointer",fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"all .15s"}}>
            <Ic size={12} strokeWidth={2}/>{label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{padding:"6px 12px 12px",display:"flex",flexDirection:"column",gap:8}}>

        {/* Tone selector (opt tab only) */}
        {tab==="opt"&&(
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.textMute,marginBottom:5,letterSpacing:".04em"}}>TON</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {TONES.map(t=>(
                <button key={t.id} onClick={()=>setTone(t.id)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${tone===t.id?C.purple:C.border}`,background:tone===t.id?C.purpleGlow:"#fff",color:tone===t.id?C.purple:C.textMid,fontSize:10.5,fontWeight:600,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:3}}>
                  <span>{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Run button */}
        <Btn variant="ai" size="sm" onClick={run} disabled={ld||!content.trim()} style={{justifyContent:"center",borderRadius:8}}>
          {ld?<><Sp/>Analysiere…</>:<><Zap size={13} strokeWidth={2}/>{AI_TABS.find(t=>t.id===tab)?.label||"Ausführen"}</>}
        </Btn>

        {/* ── SCORE result ── */}
        {tab==="score"&&scoreData&&(
          <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`,animation:"fadeUp .25s ease"}}>
            {/* Total donut-style */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.borderLight}`}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:`conic-gradient(${scoreData.total>=70?"#22C55E":scoreData.total>=45?"#F59E0B":"#EF4444"} ${scoreData.total*3.6}deg, #F0F0F0 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:13,fontWeight:900,color:scoreData.total>=70?"#22C55E":scoreData.total>=45?"#F59E0B":"#EF4444"}}>{scoreData.total}</span>
                </div>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:C.text}}>Content Score</div>
                <div style={{fontSize:11.5,color:C.textSoft}}>{scoreData.total>=70?"Sehr gut – bereit zum Posten":scoreData.total>=45?"Solide – kleine Optimierungen möglich":"Verbesserungspotential vorhanden"}</div>
              </div>
            </div>
            <ScoreBar label="Lesbarkeit" score={scoreData.readability?.score||0} hint={scoreData.readability?.hint}/>
            <ScoreBar label="Engagement-Potenzial" score={scoreData.engagement?.score||0} hint={scoreData.engagement?.hint}/>
            <ScoreBar label="CTA-Stärke" score={scoreData.cta?.score||0} hint={scoreData.cta?.hint}/>
            <ScoreBar label="Plattform-Fit" score={scoreData.platform?.score||0} hint={scoreData.platform?.hint}/>
            {scoreData.topTip&&(
              <div style={{marginTop:8,padding:"8px 10px",background:`${C.ai1}10`,borderRadius:8,border:`1px solid ${C.ai1}30`,fontSize:11.5,color:C.textMid,lineHeight:1.5}}>
                <span style={{fontWeight:700,color:C.purple}}>💡 Top-Tipp: </span>{scoreData.topTip}
              </div>
            )}
          </div>
        )}

        {/* ── REWRITE result ── */}
        {tab==="rewrite"&&rewriteData&&(
          <div style={{animation:"fadeUp .25s ease",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:9.5,fontWeight:700,color:C.textMute,marginBottom:7,letterSpacing:".05em"}}>REWRITE FÜR {ch.label.toUpperCase()}</div>
              <div style={{fontSize:12.5,lineHeight:1.7,color:C.textMid}}>{rewriteData.rewritten}</div>
              {rewriteData.changes?.length>0&&(
                <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.borderLight}`}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:C.textMute,marginBottom:5,letterSpacing:".05em"}}>ÄNDERUNGEN</div>
                  {rewriteData.changes.map((c,i)=>(
                    <div key={i} style={{fontSize:11,color:C.textSoft,display:"flex",gap:5,marginBottom:3}}>
                      <span style={{color:C.success,flexShrink:0}}>✓</span>{c}
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:"flex",gap:6,marginTop:10}}>
                <Btn size="sm" variant="success" onClick={()=>{onApply(rewriteData.rewritten);setRewriteData(null);}}><Check size={11} strokeWidth={2.5}/>Übernehmen</Btn>
                <Btn size="sm" variant="secondary" onClick={()=>copy(rewriteData.rewritten,"rw")}>{copied==="rw"?<Check size={11} color={C.success} strokeWidth={2.5}/>:"Kopieren"}</Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── HOOKS result ── */}
        {tab==="hook"&&hooks.length>0&&(
          <div style={{animation:"fadeUp .25s ease",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:9.5,fontWeight:700,color:C.textMute,letterSpacing:".05em"}}>HOOK-VORSCHLÄGE</div>
            {hooks.map((h,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:9,padding:"9px 12px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:4,letterSpacing:".04em"}}>{h.type?.toUpperCase()}</div>
                <div style={{fontSize:12.5,lineHeight:1.6,color:C.textMid}}>{h.text}</div>
                <Btn size="sm" variant="secondary" style={{marginTop:6}} onClick={()=>onApply(h.text+" ")}>
                  <Check size={11} strokeWidth={2}/>Als Einstieg übernehmen
                </Btn>
              </div>
            ))}
          </div>
        )}

        {/* ── OPT / HT text result ── */}
        {res&&(
          <div style={{background:"#fff",borderRadius:9,padding:"11px 13px",border:`1px solid ${C.border}`,fontSize:12.5,lineHeight:1.65,color:C.textMid,animation:"fadeUp .25s ease"}}>
            <div style={{fontSize:9.5,fontWeight:700,color:C.textMute,marginBottom:6,letterSpacing:".05em"}}>ERGEBNIS</div>
            <div>{res}</div>
            <div style={{marginTop:9,display:"flex",gap:6,flexWrap:"wrap"}}>
              <Btn size="sm" variant="success" onClick={()=>{(tab==="ht"?onApplyHT:onApply)(res);setRes("");}}><Check size={11} strokeWidth={2.5}/>Übernehmen</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>copy(res,"main")}>{copied==="main"?<Check size={11} color={C.success} strokeWidth={2.5}/>:"Kopieren"}</Btn>
              <Btn size="sm" variant="ghost" onClick={()=>setRes("")}><X size={11} strokeWidth={2}/></Btn>
            </div>
          </div>
        )}

        {/* ── VARIANTS ── */}
        {vars.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:7,animation:"fadeUp .25s ease"}}>
            {vars.map((v,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:9,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <div style={{width:18,height:18,borderRadius:5,background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:9,fontWeight:800,color:"#fff"}}>{i+1}</span>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:C.purple}}>{v.formula}</span>
                  <span style={{fontSize:9.5,color:C.textMute,fontStyle:"italic"}}>{v.tone}</span>
                </div>
                <div style={{fontSize:12.5,lineHeight:1.65,color:C.textMid}}>{v.text}</div>
                <div style={{display:"flex",gap:6,marginTop:7}}>
                  <Btn size="sm" variant="success" onClick={()=>{onApply(v.text);setVars([]);}}><Check size={11} strokeWidth={2.5}/>Verwenden</Btn>
                  <Btn size="sm" variant="secondary" onClick={()=>copy(v.text,`v${i}`)}>{copied===`v${i}`?<Check size={11} color={C.success} strokeWidth={2.5}/>:"Kopieren"}</Btn>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── IDEAS ── */}
        {ideas.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:7,animation:"fadeUp .25s ease"}}>
            <div style={{fontSize:9.5,fontWeight:700,color:C.textMute,letterSpacing:".05em"}}>CONTENT-IDEEN</div>
            {ideas.map((idea,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:9,padding:"10px 12px",border:`1px solid ${C.border}`,cursor:"pointer",transition:"border-color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.purple+"50"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{idea.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <div style={{fontWeight:700,fontSize:12.5,color:C.text}}>{idea.title}</div>
                      {idea.format&&<span style={{fontSize:9.5,fontWeight:700,color:C.purple,background:C.purpleGlow,padding:"1px 6px",borderRadius:4}}>{idea.format}</span>}
                    </div>
                    <div style={{fontSize:12,color:C.textSoft,lineHeight:1.55}}>{idea.hook}</div>
                  </div>
                </div>
                <Btn size="sm" variant="secondary" style={{marginTop:7}} onClick={()=>onApply(idea.hook)}>
                  <Check size={11} strokeWidth={2}/>Als Text übernehmen
                </Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MEDIA PICKER MODAL (inline – bleibt über dem Editor) ───────────────────
function MediaPicker({items,onSelect,onUpload,onUpdate,onClose}){
  const [q,setQ]=useState(""); const [f,setF]=useState("all");
  const ref=useRef();
  const upload=useCallback(async files=>{
    for(const file of Array.from(files)){
      const url=await fileToDataURL(file);
      const id=uid();
      const item={id,name:file.name,url,type:getMediaType(file),size:file.size,date:new Date().toLocaleDateString("de"),tags:"",description:"",altText:"",category:"",focusPoint:{x:50,y:50},mood:"",analyzing:true};
      onUpload(item); onSelect(item);
      if(item.type==="image"){
        AI.analyzeImg(url).then(r=>{
          onUpdate({...item,analyzing:false,tags:Array.isArray(r.tags)?r.tags.join(", "):"",description:r.description||"",altText:r.suggestedAlt||"",mood:r.mood||"",focusPoint:r.focalPoint?{x:r.focalPoint.x,y:r.focalPoint.y}:{x:50,y:50},aiAnalysis:r});
        }).catch(()=>onUpdate({...item,analyzing:false}));
      } else {
        onUpdate({...item,analyzing:false});
      }
      return;
    }
  },[onUpload,onSelect,onUpdate]);
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

// ── MEDIA DETAIL MODAL ───────────────────────────────────────────────────────
function MediaDetail({item,onSave,onClose}){
  const [form,setForm]=useState({...item});
  const [fp,setFp]=useState(item.focusPoint||{x:50,y:50});
  const [fmode,setFmode]=useState(false);
  const [aiLd,setAiLd]=useState(false);
  const [aiData,setAiData]=useState(null);
  const [activeTab,setActiveTab]=useState("meta"); // "meta"|"score"|"platforms"
  const imgRef=useRef();

  const imgMD=(e)=>{
    if(!fmode||!imgRef.current)return;
    const r=imgRef.current.getBoundingClientRect();
    setFp({x:Math.round(((e.clientX-r.left)/r.width)*100),y:Math.round(((e.clientY-r.top)/r.height)*100)});
  };

  const runAI=async()=>{
    if(!form.url||form.type==="video")return;
    setAiLd(true);
    try{
      const r=await AI.analyzeImg(form.url);
      setAiData(r);
      // Auto-fill fields from AI analysis
      setForm(f=>({
        ...f,
        tags: r.tags?.join(", ")||f.tags,
        description: r.description||f.description,
        altText: r.suggestedAlt||f.altText,
        mood: r.mood||f.mood,
      }));
      // Auto-set AI-suggested focal point
      if(r.focalPoint){
        setFp({x:r.focalPoint.x, y:r.focalPoint.y});
      }
    }catch(e){console.error(e);}
    setAiLd(false);
  };

  const scoreColor=s=>s>=80?"#22C55E":s>=55?"#F59E0B":"#EF4444";
  const fitIcon=f=>f==="gut"?"✅":f==="ok"?"🟡":"⚠️";

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{width:"100%",maxWidth:840,maxHeight:"93vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.22)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderBottom:`1px solid ${C.borderLight}`,flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text}}>Medien-Details</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
        </div>

        <div style={{flex:1,overflow:"hidden",display:"flex"}}>

          {/* ── Left: image + focal point + AI trigger ── */}
          <div style={{width:300,flexShrink:0,background:C.bg,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.borderLight}`}}>
            <div style={{position:"relative",flexShrink:0}}>
              {form.type==="video"
                ?<video src={form.url} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}} controls muted/>
                :<img ref={imgRef} src={form.url} alt="" onMouseDown={imgMD}
                  style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block",cursor:fmode?"crosshair":"default",userSelect:"none"}}/>
              }
              {/* Focal point dot */}
              <div style={{position:"absolute",left:`${fp.x}%`,top:`${fp.y}%`,transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:2}}>
                <div style={{width:24,height:24,borderRadius:"50%",border:"3px solid #fff",background:`${C.accent}90`,boxShadow:"0 0 0 2px rgba(0,0,0,.4),0 0 12px rgba(0,0,0,.3)"}}/>
              </div>
              {/* Crosshair lines */}
              {fmode&&<>
                <div style={{position:"absolute",left:`${fp.x}%`,top:0,bottom:0,width:1,background:"rgba(255,255,255,.4)",pointerEvents:"none"}}/>
                <div style={{position:"absolute",top:`${fp.y}%`,left:0,right:0,height:1,background:"rgba(255,255,255,.4)",pointerEvents:"none"}}/>
              </>}
              {/* Color palette strip from AI */}
              {aiData?.colorPalette?.length>0&&(
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:20,display:"flex"}}>
                  {aiData.colorPalette.slice(0,6).map((col,i)=>(
                    <div key={i} style={{flex:1,background:col,title:col}}/>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8,flex:1,overflow:"auto"}}>
              {/* Focal point toggle */}
              <button onMouseDown={e=>{e.stopPropagation();setFmode(v=>!v);}} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderRadius:8,border:`1px solid ${fmode?C.accent:C.border}`,background:fmode?C.accentLight:C.surface,color:fmode?C.accent:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,justifyContent:"center"}}>
                <MapPin size={13} strokeWidth={2}/>{fmode?`Klicke aufs Bild · ${fp.x}% / ${fp.y}%`:"Fokuspunkt setzen"}
              </button>

              {/* AI Analyse Button */}
              {form.type!=="video"&&(
                <Btn variant="ai" size="sm" onClick={runAI} disabled={aiLd} style={{justifyContent:"center"}}>
                  {aiLd?<><Sp/>Analysiere Bild…</>:<><Sparkles size={13} strokeWidth={2}/>KI-Vollanalyse</>}
                </Btn>
              )}

              {/* AI subjects detected */}
              {aiData?.subjects?.length>0&&(
                <div style={{padding:"8px 10px",background:"#fff",borderRadius:8,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.textMute,marginBottom:5,letterSpacing:".04em"}}>ERKANNTE ELEMENTE</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {aiData.subjects.map((s,i)=>(
                      <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:`${C.ai1}15`,color:C.purple,fontWeight:600,border:`1px solid ${C.ai1}30`}}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI focal point reason */}
              {aiData?.focalPoint?.reason&&(
                <div style={{fontSize:11,color:C.textSoft,padding:"6px 9px",background:"#fffbe6",borderRadius:7,border:"1px solid #fde68a",lineHeight:1.5}}>
                  🎯 <strong>KI-Fokuspunkt:</strong> {aiData.focalPoint.reason}
                </div>
              )}

              {/* Mood */}
              {form.mood&&(
                <div style={{fontSize:11.5,color:C.textSoft,padding:"5px 9px",background:C.bg,borderRadius:7,border:`1px solid ${C.border}`}}>
                  Stimmung: <strong>{form.mood}</strong>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: tabs – Meta / Score / Platform-Fit ── */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Tab bar */}
            <div style={{display:"flex",borderBottom:`1px solid ${C.borderLight}`,background:C.bg,flexShrink:0}}>
              {[["meta","📝 Metadaten"],["score","📊 Bild-Score"],["platforms","📱 Plattform-Fit"]].map(([id,label])=>(
                <button key={id} onClick={()=>setActiveTab(id)} style={{padding:"10px 16px",border:"none",borderBottom:`2px solid ${activeTab===id?C.accent:"transparent"}`,background:"transparent",color:activeTab===id?C.accent:C.textMid,fontWeight:activeTab===id?700:500,fontSize:12,cursor:"pointer",fontFamily:FONT,transition:"all .12s"}}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{flex:1,overflow:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>

              {/* ── META TAB ── */}
              {activeTab==="meta"&&<>
                <TIn label="Dateiname" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
                <TIn label="Beschreibung" icon={FileText} textarea value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Was zeigt dieses Medium?"/>
                <TIn label="Alt-Text (Barrierefreiheit)" value={form.altText||""} onChange={e=>setForm({...form,altText:e.target.value})} placeholder="Beschreibung für Screenreader"/>
                <TIn label="Tags (kommagetrennt)" icon={Tag} value={form.tags||""} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="produkt, team, outdoor…"/>
                <div>
                  <FL>Kategorie</FL>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {["Marketing","Produkt","Team","Event","Brand","Kampagne","Sonstiges"].map(cat=>(
                      <button key={cat} onClick={()=>setForm(f=>({...f,category:f.category===cat?"":cat}))} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${form.category===cat?C.accent:C.border}`,background:form.category===cat?C.accentLight:C.surface,color:form.category===cat?C.accent:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT}}>{cat}</button>
                    ))}
                  </div>
                </div>
              </>}

              {/* ── SCORE TAB ── */}
              {activeTab==="score"&&(
                aiData?.score
                  ?<div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {/* Overall */}
                    <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
                      <div style={{width:60,height:60,borderRadius:"50%",background:`conic-gradient(${scoreColor(aiData.score.overall)} ${aiData.score.overall*3.6}deg, #F0F0F0 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <div style={{width:46,height:46,borderRadius:"50%",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:16,fontWeight:900,color:scoreColor(aiData.score.overall)}}>{aiData.score.overall}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:C.text}}>Gesamt-Score</div>
                        <div style={{fontSize:12,color:C.textSoft}}>{aiData.score.overall>=80?"Ausgezeichnetes Bild für Social Media":aiData.score.overall>=55?"Gutes Bild mit Optimierungspotenzial":"Überarbeitung empfohlen"}</div>
                      </div>
                    </div>
                    {/* Individual scores */}
                    {[["Helligkeit","brightness","☀️"],["Kontrast","contrast","🎨"],["Komposition","composition","📐"],["Engagement-Potenzial","engagementPotential","🔥"]].map(([label,key,icon])=>(
                      <div key={key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#fff",borderRadius:8,border:`1px solid ${C.border}`}}>
                        <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:12,fontWeight:600,color:C.textMid}}>{label}</span>
                            <span style={{fontSize:12,fontWeight:800,color:scoreColor(aiData.score[key])}}>{aiData.score[key]}/100</span>
                          </div>
                          <div style={{height:5,borderRadius:3,background:C.borderLight}}>
                            <div style={{height:"100%",width:`${aiData.score[key]}%`,borderRadius:3,background:scoreColor(aiData.score[key]),transition:"width .5s ease"}}/>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Improvements */}
                    {aiData.improvements?.length>0&&(
                      <div style={{padding:"10px 12px",background:`${C.ai1}08`,borderRadius:9,border:`1px solid ${C.ai1}25`}}>
                        <div style={{fontSize:10.5,fontWeight:700,color:C.purple,marginBottom:7,letterSpacing:".04em"}}>💡 VERBESSERUNGEN</div>
                        {aiData.improvements.map((tip,i)=>(
                          <div key={i} style={{fontSize:12,color:C.textMid,display:"flex",gap:6,marginBottom:5,lineHeight:1.5}}>
                            <span style={{color:C.ai1,flexShrink:0,fontWeight:700}}>{i+1}.</span>{tip}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  :<div style={{textAlign:"center",padding:"40px 20px",color:C.textMute}}>
                    <BarChart2 size={36} strokeWidth={1} style={{margin:"0 auto 12px",display:"block",opacity:.4}}/>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Kein Bild-Score vorhanden</div>
                    <div style={{fontSize:12,marginBottom:16}}>Führe die KI-Vollanalyse durch, um Helligkeits-, Kontrast- und Kompositions-Scores zu erhalten.</div>
                    <Btn variant="ai" size="sm" onClick={()=>{runAI();setActiveTab("score");}} disabled={aiLd} style={{justifyContent:"center",margin:"0 auto"}}>
                      {aiLd?<><Sp/>Analysiere…</>:<><Sparkles size={13} strokeWidth={2}/>Jetzt analysieren</>}
                    </Btn>
                  </div>
              )}

              {/* ── PLATFORM FIT TAB ── */}
              {activeTab==="platforms"&&(
                aiData?.platformFit
                  ?<div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontSize:12,color:C.textSoft,marginBottom:4}}>Wie gut passt dieses Bild auf die verschiedenen Plattformen?</div>
                    {Object.entries(aiData.platformFit).map(([plat,fit])=>{
                      const ch=CHANNELS.find(c=>c.id===plat);
                      if(!ch)return null;
                      const fitColor=fit==="gut"?"#22C55E":fit==="ok"?"#F59E0B":"#EF4444";
                      const fitBg=fit==="gut"?"#F0FDF4":fit==="ok"?"#FFFBEB":"#FEF2F2";
                      return(
                        <div key={plat} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,border:`1px solid ${fitColor}30`,background:fitBg}}>
                          <ChIco id={plat} size={20}/>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:13,color:C.text}}>{ch.label}</div>
                            <div style={{fontSize:11,color:C.textSoft}}>{fit==="gut"?"Sehr gut geeignet":fit==="ok"?"Geeignet, aber Anpassungen empfohlen":"Nicht optimal – Bild anpassen"}</div>
                          </div>
                          <span style={{fontSize:14,fontWeight:700,color:fitColor,background:`${fitColor}18`,padding:"4px 10px",borderRadius:7,border:`1px solid ${fitColor}40`}}>{fitIcon(fit)} {fit}</span>
                        </div>
                      );
                    })}
                    <div style={{padding:"10px 12px",background:C.bg,borderRadius:9,border:`1px solid ${C.border}`,fontSize:11.5,color:C.textSoft,lineHeight:1.6}}>
                      💡 <strong>Tipp:</strong> Optimales Seitenverhältnis: 1:1 (Instagram), 1.91:1 (LinkedIn/Facebook), 4:5 (Instagram Feed-Posts).
                    </div>
                  </div>
                  :<div style={{textAlign:"center",padding:"40px 20px",color:C.textMute}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Kein Plattform-Fit vorhanden</div>
                    <div style={{fontSize:12,marginBottom:16}}>Die KI-Vollanalyse bewertet das Bild für jede Plattform.</div>
                    <Btn variant="ai" size="sm" onClick={()=>{runAI();setActiveTab("platforms");}} disabled={aiLd} style={{justifyContent:"center",margin:"0 auto"}}>
                      {aiLd?<><Sp/>Analysiere…</>:<><Sparkles size={13} strokeWidth={2}/>Jetzt analysieren</>}
                    </Btn>
                  </div>
              )}

            </div>

            {/* Footer actions */}
            <div style={{padding:"10px 20px",borderTop:`1px solid ${C.borderLight}`,display:"flex",gap:8,flexShrink:0,background:C.surface}}>
              <Btn variant="secondary" onClick={onClose} style={{flex:1,justifyContent:"center"}}>Abbrechen</Btn>
              <Btn onClick={()=>onSave({...form,focusPoint:fp})} style={{flex:2,justifyContent:"center"}}><Check size={14} strokeWidth={2.5}/>Speichern</Btn>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── EDITOR MODAL ───────────────────────────────────────────────────────────
function Editor({post,items,campaigns,onSave,onClose,onUpload,onUpdate,user}){
  const [form,setForm]=useState({...post});
  const [pch,setPch]=useState(post.channels?.[0]||"instagram");
  const [rightPane,setRightPane]=useState("preview");
  const [picker,setPicker]=useState(false);
  const media=items.find(m=>m.id===form.mediaId);
  const PC=PREV[pch]||PREV.instagram;
  const maxC=form.channels?.length>0?Math.min(...form.channels.map(id=>CHANNELS.find(c=>c.id===id)?.maxChars||9999)):9999;
  const togCh=id=>setForm(f=>({...f,channels:f.channels?.includes(id)?f.channels.filter(c=>c!==id):[...(f.channels||[]),id]}));
  const isAdm=user.role==="admin";
  const charLen=form.content?.length||0;
  const charPct=maxC<9999?charLen/maxC*100:0;
  const charColor=charPct>90?C.accent:charPct>70?"#F59E0B":C.textMute;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:1060,maxHeight:"94vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)",border:`1px solid ${C.border}`}}>

        {/* Modal top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",borderBottom:`1px solid ${C.borderLight}`,flexShrink:0}}>
          <h2 style={{margin:0,fontFamily:FONT_DISPLAY,fontSize:16,fontWeight:700,color:C.text,letterSpacing:"-.01em"}}>{form.id?"Post bearbeiten":"Neuer Post"}</h2>
          <div style={{display:"flex",gap:3,background:C.bg,borderRadius:9,padding:3,border:`1px solid ${C.border}`}}>
            {[["preview","Vorschau",Eye],["ai","KI-Assistent",Sparkles]].map(([id,label,Ic])=>(
              <button key={id} onClick={()=>setRightPane(id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,border:"none",background:rightPane===id?(id==="ai"?`linear-gradient(135deg,${C.ai1},${C.ai2})`:C.surface):"transparent",color:rightPane===id?(id==="ai"?"#fff":C.text):C.textSoft,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:FONT,boxShadow:rightPane===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .15s"}}>
                <Ic size={12} strokeWidth={2}/>{label}
                {id==="ai"&&<span style={{fontSize:9,fontWeight:700,padding:"0 5px",borderRadius:8,background:rightPane==="ai"?"rgba(255,255,255,.25)":C.purpleGlow,color:rightPane==="ai"?"#fff":C.purple}}>PRO</span>}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:4}}><X size={20} strokeWidth={2}/></button>
        </div>

        <div style={{flex:1,overflow:"hidden",display:"flex"}}>

          {/* LEFT: Form */}
          <div style={{flex:1,overflow:"auto",padding:"16px 20px",borderRight:`1px solid ${C.borderLight}`,display:"flex",flexDirection:"column",gap:11}}>

            <div><FL>Kanäle</FL>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {CHANNELS.map(c=>(
                  <button key={c.id} onClick={()=>togCh(c.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,border:`1.5px solid ${form.channels?.includes(c.id)?c.color:C.border}`,background:form.channels?.includes(c.id)?c.color+"12":"#fff",color:form.channels?.includes(c.id)?c.color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,transition:"all .12s"}}>
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
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <FL style={{margin:0}}>Text</FL>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,fontWeight:600,color:charColor}}>{charLen}{maxC<9999?`/${maxC}`:""}</span>
                  {maxC<9999&&<div style={{width:36,height:4,borderRadius:2,background:C.borderLight,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,charPct)}%`,background:charColor,borderRadius:2,transition:"width .2s"}}/></div>}
                </div>
              </div>
              <textarea value={form.content||""} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Was möchtest du teilen?" style={{width:"100%",minHeight:110,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:FONT,resize:"vertical",boxSizing:"border-box",color:C.text,lineHeight:1.6}}/>
              {charLen>5&&charLen<40&&rightPane!=="ai"&&(
                <div onClick={()=>setRightPane("ai")} style={{marginTop:4,fontSize:11,color:C.purple,cursor:"pointer",display:"flex",alignItems:"center",gap:4,opacity:.75}}>
                  <Sparkles size={11} strokeWidth={2}/>KI-Assistent: Text optimieren, Hooks oder Varianten generieren →
                </div>
              )}
            </div>

            <TIn label="Hashtags" icon={Hash} placeholder="#marketing #launch" value={form.hashtags||""} onChange={e=>setForm({...form,hashtags:e.target.value})}/>

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
          </div>

          {/* RIGHT: Preview or AI */}
          <div style={{width:320,flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden",background:rightPane==="ai"?`linear-gradient(170deg,${C.purpleBg} 0%,#fff 60%)`:C.bg}}>
            <div style={{flex:1,overflow:"auto",padding:"14px 13px"}}>

              {/* PREVIEW */}
              {rightPane==="preview"&&<>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                  {CHANNELS.map(c=>(
                    <button key={c.id} onClick={()=>setPch(c.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:6,border:`1.5px solid ${pch===c.id?c.color:C.border}`,background:pch===c.id?c.color:"#fff",color:pch===c.id?"#fff":C.textSoft,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                      <ChIco id={c.id} size={11}/>{c.label}
                    </button>
                  ))}
                </div>
                <Card style={{padding:10}}><PC post={form} media={media}/></Card>
                <div onClick={()=>setRightPane("ai")} style={{marginTop:10,padding:"10px 12px",borderRadius:10,border:`1px dashed ${C.purple}45`,background:C.purpleGlow+"35",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.purpleGlow+"70"}
                  onMouseLeave={e=>e.currentTarget.style.background=C.purpleGlow+"35"}>
                  <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 8px ${C.purpleGlow}`}}>
                    <Sparkles size={14} color="#fff" strokeWidth={2}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.purple,marginBottom:1}}>KI-Assistent öffnen →</div>
                    <div style={{fontSize:10.5,color:C.textSoft,lineHeight:1.4}}>Score · Hooks · Varianten · Hashtags</div>
                  </div>
                </div>
              </>}

              {/* AI PANEL */}
              {rightPane==="ai"&&(
                form.channels?.length>0
                  ?<AIPanel content={form.content||""} chId={form.channels[0]} onApply={t=>setForm(f=>({...f,content:t}))} onApplyHT={t=>setForm(f=>({...f,hashtags:t}))}/>
                  :<div style={{textAlign:"center",padding:"48px 20px",color:C.textMute}}>
                    <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${C.ai1}20,${C.ai2}10)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
                      <Sparkles size={22} strokeWidth={1.5} color={C.purple} style={{opacity:.5}}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:C.textSoft,marginBottom:6}}>Kanal auswählen</div>
                    <div style={{fontSize:12,lineHeight:1.5}}>Wähle mindestens einen Kanal links aus, um den KI-Assistenten zu nutzen.</div>
                  </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{padding:"12px 13px",borderTop:`1px solid ${C.borderLight}`,background:C.surface,display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="secondary" onClick={onClose} style={{flex:1,justifyContent:"center",fontSize:12}}>Abbrechen</Btn>
                <Btn variant="secondary" onClick={()=>onSave({...form,id:form.id||uid(),status:"draft"})} style={{flex:1,justifyContent:"center",fontSize:12}}><FileText size={12} strokeWidth={IW}/>Entwurf</Btn>
              </div>
              {isAdm
                ?<Btn onClick={()=>onSave({...form,id:form.id||uid(),status:form.scheduledDate?"scheduled":"draft"})} style={{width:"100%",justifyContent:"center"}}><Calendar size={13} strokeWidth={IW}/>{form.scheduledDate?"Planen":"Speichern"}</Btn>
                :<Btn onClick={()=>onSave({...form,id:form.id||uid(),status:"pending"})} style={{width:"100%",justifyContent:"center"}}><Send size={13} strokeWidth={IW}/>Zur Freigabe senden</Btn>
              }
            </div>
          </div>
        </div>
      </div>
      {picker&&<MediaPicker items={items} onSelect={item=>{setForm(f=>({...f,mediaId:item.id}));setPicker(false);}} onUpload={onUpload} onUpdate={onUpdate} onClose={()=>setPicker(false)}/>}
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
  const chColor=CHANNELS.find(c=>c.id===tab)?.color||C.accent;
  const chBg=CHANNELS.find(c=>c.id===tab)?.bg||C.bg;

  return(
    <Card style={{overflow:"hidden",transition:"all .18s",display:"flex",flexDirection:"column"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 28px rgba(13,21,38,.12)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 6px rgba(13,21,38,.05)"}>

      {/* ── Header: title + badge + delete ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 12px",height:44,flexShrink:0}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.title||"Kein Titel"}</div>
          {camp&&<div style={{fontSize:10.5,color:C.textSoft,marginTop:1,display:"flex",alignItems:"center",gap:3}}><span>{camp.emoji}</span>{camp.name}</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,marginLeft:8}}>
          <SBadge status={post.status}/>
          {can("delete")&&<button onClick={()=>onDel(post.id)} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:2,display:"flex",lineHeight:0}} onMouseEnter={e=>e.currentTarget.style.color=C.accent} onMouseLeave={e=>e.currentTarget.style.color=C.textMute}><X size={13} strokeWidth={2}/></button>}
        </div>
      </div>

      {/* ── Channel tabs (fixed height) ── */}
      {post.channels?.length>0&&(
        <div style={{display:"flex",height:32,borderTop:`1px solid ${C.borderLight}`,borderBottom:`1px solid ${C.borderLight}`,overflowX:"auto",background:C.bg,flexShrink:0}}>
          {post.channels.map(cid=>{
            const ch=CHANNELS.find(x=>x.id===cid);
            const on=tab===cid;
            return(
              <button key={cid} onClick={()=>setTab(cid)} style={{
                flexShrink:0,height:"100%",display:"flex",alignItems:"center",gap:4,
                padding:"0 10px",border:"none",
                borderBottom:`2px solid ${on?ch?.color:"transparent"}`,
                background:on?`${ch?.color}08`:"transparent",
                color:on?ch?.color:C.textMute,
                fontWeight:on?700:500,fontSize:11,cursor:"pointer",fontFamily:FONT,
                transition:"all .12s",
              }}>
                <ChIco id={cid} size={11}/>{ch?.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Preview – clipped tight around the social post ── */}
      <div style={{background:chBg, padding:"8px 8px 0"}}>
        <div style={{
          width:"100%",
          overflow:"hidden",
          borderRadius:8,
          boxShadow:"0 1px 8px rgba(0,0,0,.09)",
          /* clip the scaled content so no whitespace leaks below */
          maxHeight: tab==="instagram" ? 310 : 240,
        }}>
          <div style={{
            width:`${100/0.82}%`,
            transform:"scale(0.82)",
            transformOrigin:"top left",
          }}>
            <PC post={post} media={media}/>
          </div>
        </div>
        <div style={{height:8}}/>
      </div>

      {/* ── Schedule bar ── */}
      {post.status==="scheduled"&&post.scheduledDate&&(
        <div style={{height:36,padding:"0 12px",background:C.successBg,borderTop:`1px solid #A7F3D0`,display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:C.success,fontWeight:700,flexShrink:0}}>
          <Calendar size={12} strokeWidth={2.5}/>{fmtDate(post.scheduledDate)}{post.scheduledTime&&` · ${post.scheduledTime}`}
        </div>
      )}

      {/* ── Approval bar ── */}
      {post.status==="pending"&&can("approve")&&(
        <div style={{height:36,padding:"0 12px",background:C.infoBg,borderTop:`1px solid #BFDBFE`,display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
          <span style={{flex:1,fontSize:11.5,color:C.info,fontWeight:600}}>Wartet auf Freigabe</span>
          <Btn size="sm" variant="success" onClick={()=>onApprove(post.id,"scheduled")}><Check size={11} strokeWidth={2.5}/>OK</Btn>
          <Btn size="sm" variant="danger"  onClick={()=>onApprove(post.id,"draft")}><X size={11} strokeWidth={2.5}/>Ablehnen</Btn>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{display:"flex",borderTop:`1px solid ${C.borderLight}`,height:36,flexShrink:0}}>
        {can("write")&&(
          <button onClick={()=>onEdit(post)} style={{
            flex:1,height:"100%",background:"none",border:"none",
            color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:4,
            borderRight:`1px solid ${C.borderLight}`,fontFamily:FONT,
            transition:"all .12s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.color=C.textMid;}}
          onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.textSoft;}}>
            <Edit2 size={12} strokeWidth={IW}/>Bearbeiten
          </button>
        )}
        <button onClick={()=>onSched(post)} style={{
          flex:1,height:"100%",background:"none",border:"none",
          color:post.status==="scheduled"?C.success:C.accent,
          fontWeight:700,fontSize:12,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:4,
          fontFamily:FONT,transition:"all .12s",
        }}
        onMouseEnter={e=>e.currentTarget.style.background=post.status==="scheduled"?C.successBg:C.accentLight}
        onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <Calendar size={12} strokeWidth={IW}/>{post.status==="scheduled"?"Ändern":"Planen"}
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
      const id=uid();
      const item={id,name:file.name,url,type:getMediaType(file),size:file.size,date:new Date().toLocaleDateString("de"),tags:"",description:"",altText:"",category:"",focusPoint:{x:50,y:50},mood:"",analyzing:true};
      onUpload(item);
      if(item.type==="image"){
        AI.analyzeImg(url).then(r=>{
          onUpdate({...item,analyzing:false,tags:Array.isArray(r.tags)?r.tags.join(", "):"",description:r.description||"",altText:r.suggestedAlt||"",mood:r.mood||"",focusPoint:r.focalPoint?{x:r.focalPoint.x,y:r.focalPoint.y}:{x:50,y:50},aiAnalysis:r});
        }).catch(()=>onUpdate({...item,analyzing:false}));
      } else {
        onUpdate({...item,analyzing:false});
      }
    }
  },[onUpload,onUpdate]);
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
                  {item.analyzing&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.55)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
                    <div style={{width:22,height:22,border:`3px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                    <div style={{color:"#fff",fontSize:10,fontWeight:700,letterSpacing:.3}}>KI analysiert…</div>
                  </div>}
                  {!item.analyzing&&item.focusPoint&&item.type!=="video"&&<div style={{position:"absolute",left:`${item.focusPoint.x}%`,top:`${item.focusPoint.y}%`,transform:"translate(-50%,-50%)",pointerEvents:"none"}}><div style={{width:12,height:12,borderRadius:"50%",border:"2px solid rgba(255,255,255,.9)",background:C.accent+"80"}}/></div>}
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
  const recent=[...posts].slice(-6).reverse();

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
      <div style={{fontSize:19,fontWeight:800,color:C.text,letterSpacing:"-.02em",lineHeight:1.1,fontFamily:FONT}}>{value}</div>
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

  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.05)"};
  const hoverCard=e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.transform="translateY(-1px)";};
  const leaveCard=e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.transform="";};

  return(
    <div style={{flex:1,overflow:"auto",padding:"20px 22px",display:"flex",flexDirection:"column",gap:12,background:C.bg}}>

      {/* ── HERO: dark clock | greeting | KPIs ── */}
      <div style={{...card,borderRadius:14,display:"grid",gridTemplateColumns:"auto 1fr auto",overflow:"hidden",minHeight:124}}>
        {/* Clock block */}
        <div style={{background:C.text,padding:"20px 26px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:164}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:38,fontWeight:800,color:"#fff",lineHeight:1,letterSpacing:"-1px"}}>{timeStr}</div>
          <div style={{fontSize:10,fontWeight:600,color:"#555550",textTransform:"uppercase",letterSpacing:".6px",marginTop:4}}>Uhr</div>
          <div style={{fontSize:11,fontWeight:500,color:"#666660",marginTop:8,lineHeight:1.4}}>{dateStr}</div>
          <div style={{fontSize:10,color:"#3a3a38",marginTop:2}}>KW {kw}</div>
        </div>

        {/* Greeting */}
        <div style={{padding:"20px 26px",display:"flex",flexDirection:"column",justifyContent:"center",borderLeft:`1px solid ${C.borderLight}`,borderRight:`1px solid ${C.borderLight}`}}>
          <div style={{fontSize:10,fontWeight:600,color:C.textMute,textTransform:"uppercase",letterSpacing:".7px",marginBottom:5}}>Willkommen zurück</div>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:21,fontWeight:800,color:C.text,lineHeight:1.15}}>{greeting}, {user.name.split(" ")[0]} 👋</div>
          <div style={{display:"flex",gap:6,marginTop:9,flexWrap:"wrap"}}>
            {pend.length>0&&<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:6,background:C.redLight,color:C.red}}>{pend.length} zur Freigabe</span>}
            {sched.length>0&&<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:6,background:C.accentLight,color:C.accent}}>{sched.length} heute geplant</span>}
          </div>
        </div>

        {/* KPIs */}
        <div style={{display:"flex"}}>
          <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",justifyContent:"center",borderRight:`1px solid ${C.borderLight}`}}>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text,lineHeight:1}}>44.3K</div>
            <div style={{fontSize:11,color:C.textSoft,marginTop:2}}>Reichweite</div>
            <div style={{fontSize:10,fontWeight:700,color:C.success,marginTop:4}}>↑ 18% diese Woche</div>
          </div>
          <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text,lineHeight:1}}>5.7%</div>
            <div style={{fontSize:11,color:C.textSoft,marginTop:2}}>Ø Engagement</div>
            <div style={{fontSize:10,fontWeight:700,color:C.success,marginTop:4}}>↑ 2% vs. Vorwoche</div>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {[
          {type:"post",  label:"Post erstellen",  sub:"Neuer Inhalt",    nav:"publisher"},
          {type:"cal",   label:"Kalender",         sub:"Zeitplan",        nav:"calendar"},
          {type:"upload",label:"Medien hochladen", sub:"Bilder & Videos", nav:"media"},
          {type:"perf",  label:"Performance",      sub:"Auswertungen",    nav:"performance"},
          {type:"camp",  label:"Kampagne",          sub:"Neue Kampagne",   nav:"campaigns"},
        ].map((qa,i)=>(
          <div key={i} onClick={()=>onNav(qa.nav)}
            style={{...card,padding:14,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:10,cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#888";hoverCard(e);}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;leaveCard(e);}}>
            <div style={{width:30,height:30,borderRadius:7,background:C.bg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <QaIcon type={qa.type}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.textMid}}>{qa.label}</div>
              <div style={{fontSize:10,color:C.textMute,marginTop:2}}>{qa.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[
          {Ico:SvgCheck,label:"Geplante Posts", value:sched.length, delta:"+12%", up:true,  barW:"35%",barC:C.accent, nav:()=>onFilterNav("publisher","scheduled")},
          {Ico:SvgDoc,  label:"Entwürfe",       value:drafts.length,delta:"−3%",  up:false, barW:"20%",barC:C.warning,nav:()=>onFilterNav("publisher","draft")},
          {Ico:SvgClock,label:"Zur Freigabe",   value:pend.length,  delta:"±0%",  up:null,  barW:"10%",barC:C.red,   nav:()=>onFilterNav("publisher","pending")},
          {Ico:SvgTrend,label:"Ø Engagement",   value:"5.7%",       delta:"+2%",  up:true,  barW:"57%",barC:C.success},
        ].map((sc,i)=>(
          <div key={i} onClick={sc.nav}
            style={{...card,padding:"14px 16px",cursor:sc.nav?"pointer":"default",transition:"all .15s"}}
            onMouseEnter={e=>{if(sc.nav)hoverCard(e);}}
            onMouseLeave={e=>{if(sc.nav)leaveCard(e);}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{width:28,height:28,borderRadius:7,background:C.bg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <sc.Ico/>
              </div>
              <span style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:5,background:sc.up===true?C.successBg:sc.up===false?C.redLight:C.bg,color:sc.up===true?C.success:sc.up===false?C.red:C.textSoft}}>{sc.delta}</span>
            </div>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:26,fontWeight:800,lineHeight:1,color:C.text}}>{sc.value}</div>
            <div style={{fontSize:11,color:C.textSoft,marginTop:3}}>{sc.label}</div>
            <div style={{height:3,borderRadius:99,marginTop:12,background:C.borderLight,overflow:"hidden"}}>
              <div style={{height:"100%",width:sc.barW,borderRadius:99,background:sc.barC}}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── TWO COL: posts list + right panel ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:12}}>

        {/* Posts list */}
        <div style={{...card,overflow:"hidden"}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontWeight:700,fontSize:13}}>Letzte Posts</span>
              <div style={{display:"flex",gap:1,padding:3,background:C.bg,borderRadius:7,border:`1px solid ${C.border}`}}>
                {["Alle","Geplant","Entwürfe"].map((t,i)=>(
                  <span key={i} style={{padding:"3px 10px",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer",color:i===0?C.text:C.textSoft,background:i===0?C.surface:"transparent"}}>{t}</span>
                ))}
              </div>
            </div>
            <button onClick={()=>onNav("publisher")} style={{fontSize:12,color:C.accent,fontWeight:500,background:"none",border:"none",cursor:"pointer",fontFamily:FONT}}>Alle →</button>
          </div>
          {recent.length===0
            ?<div style={{padding:"32px 0",textAlign:"center",color:C.textMute,fontSize:12}}>Noch keine Posts</div>
            :recent.slice(0,5).map((p,i)=>{
              const sMap={scheduled:{c:C.accent,bg:C.accentLight,l:"Geplant"},draft:{c:C.textSoft,bg:C.bg,l:"Entwurf"},pending:{c:C.warning,bg:C.warningBg,l:"Review"},published:{c:C.success,bg:C.successBg,l:"Live"}};
              const s=sMap[p.status]||sMap.draft;
              return <div key={p.id} style={{padding:"9px 16px",borderBottom:i<Math.min(recent.length,5)-1?`1px solid ${C.borderLight}`:"none",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background .1s"}}
                onClick={()=>onNav("publisher")}
                onMouseEnter={e=>e.currentTarget.style.background="#F5F5FF"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:32,height:32,borderRadius:7,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.border}`,background:C.bg,fontSize:14}}>
                  {campaigns.find(c=>c.id===p.campaignId)?.emoji||"📄"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:12,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.title||"Kein Titel"}</div>
                  <div style={{fontSize:11,color:C.textSoft,marginTop:2,display:"flex",alignItems:"center",gap:5}}>
                    {p.channels?.slice(0,3).map(c=><ChIco key={c} id={c} size={11} color={C.textMute}/>)}
                    <span>{p.scheduledDate?`· ${p.scheduledDate}`:p.status==="pending"?"· Zur Freigabe":"· Entwurf"}</span>
                  </div>
                </div>
                <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:5,background:s.bg,color:s.c,flexShrink:0}}>{s.l}</span>
              </div>;
            })
          }
        </div>

        {/* Right panel */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>

          {/* Posts je Kanal */}
          <div style={{...card,overflow:"hidden"}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.borderLight}`}}>
              <span style={{fontWeight:700,fontSize:13}}>Posts je Kanal</span>
            </div>
            {CHANNELS.map((ch,i)=>{
              const n=posts.filter(p=>p.channels?.includes(ch.id)).length;
              const total=Math.max(1,posts.length);
              return <div key={ch.id} style={{padding:"8px 16px",borderBottom:i<CHANNELS.length-1?`1px solid ${C.borderLight}`:"none",display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:12,fontWeight:600,color:C.textMid,width:82,display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <ChIco id={ch.id} size={13} color={C.text}/>
                  {ch.label}
                </div>
                <div style={{flex:1,height:5,background:C.borderLight,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(n/total)*100}%`,background:C.text,borderRadius:99}}/>
                </div>
                <span style={{fontSize:11,fontWeight:600,color:C.textSoft,width:16,textAlign:"right",flexShrink:0}}>{n}</span>
              </div>;
            })}
          </div>

          {/* Kampagnen */}
          <div style={{...card,overflow:"hidden"}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:13}}>Kampagnen</span>
              <button onClick={()=>onNav("campaigns")} style={{fontSize:12,color:C.accent,fontWeight:500,background:"none",border:"none",cursor:"pointer",fontFamily:FONT}}>Alle →</button>
            </div>
            {campaigns.length===0
              ?<div style={{padding:"20px 16px",textAlign:"center",color:C.textMute,fontSize:12}}>Keine Kampagnen</div>
              :campaigns.slice(0,4).map((c,i)=>{
                const n=posts.filter(p=>p.campaignId===c.id).length;
                return <div key={c.id} style={{padding:"9px 16px",borderBottom:i<Math.min(campaigns.length,4)-1?`1px solid ${C.borderLight}`:"none",display:"flex",alignItems:"center",gap:8,cursor:"pointer",transition:"background .1s"}}
                  onClick={()=>onNav("campaigns")}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.textMid}}>{c.name}</div>
                    <div style={{fontSize:11,color:C.textMute,marginTop:1}}>{n} Post{n!==1?"s":""} · aktiv</div>
                  </div>
                </div>;
              })
            }
          </div>
        </div>
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

// ── PERFORMANCE PAGE ─────────────────────────────────────────────────────
const MOCK={
  instagram:{reach:12400,imp:34200,eng:"5.4%",fol:2340,clk:890},
  twitter:  {reach:8900, imp:21000,eng:"3.2%",fol:1120,clk:340},
  linkedin: {reach:6700, imp:15800,eng:"4.8%",fol:890, clk:520},
  facebook: {reach:5200, imp:11200,eng:"2.1%",fol:3400,clk:210},
  whatsapp: {reach:3200, imp:3200, eng:"12.4%",fol:890, clk:890},
};
function PerformancePage({posts}){
  const [per,setPer]=useState("30d");
  const top=[...posts].slice(0,5).map(p=>({...p,reach:Math.floor(Math.random()*5000+500),eng:(Math.random()*8+1).toFixed(1)+"%"}));
  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontFamily:FONT_DISPLAY,fontSize:17,fontWeight:700,color:C.text,letterSpacing:"-.01em"}}>Performance</div><div style={{fontSize:13,color:C.textSoft,marginTop:2}}>Social Media Resultate</div></div>
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

// ── CALENDAR PAGE (Kordiam-inspired) ──────────────────────────────────────
const WEEKDAYS_FULL=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const WEEKDAYS_SHORT=["Mo","Di","Mi","Do","Fr","Sa","So"];
const MONTH_NAMES=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const MONTH_SHORT=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

// Kordiam design tokens
const K = {
  bg:       "#F8F9FC",
  surface:  "#FFFFFF",
  border:   "#E8EBF2",
  borderMid:"#D0D5E8",
  navy:     "#1A2340",
  navyMid:  "#2E3F6A",
  navySoft: "#5C6A8A",
  navyMute: "#9AA3BF",
  indigo:   "#5B4FE8",
  indigoSoft:"#EEF0FD",
  indigoMid: "#8B84F0",
  rowHover: "#F4F5FA",
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

function CalendarPage({posts,onEdit}){
  const today=new Date();
  const [cur,setCur]=useState({y:today.getFullYear(),m:today.getMonth()});
  const [viewMode,setViewMode]=useState("month"); // "month" | "agenda"
  const [hovRow,setHovRow]=useState(null);

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
  const STATUS_BAR={scheduled:"#4CAF50",draft:"#FF9800",pending:"#5B4FE8",published:"#9C27B0"};

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
                      {p.hashtags&&<div style={{fontSize:10.5,color:K.indigo,marginTop:2,opacity:.7}}>{p.hashtags.split(" ").slice(0,3).join(" ")}</div>}
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

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:K.bg,fontFamily:FONT}}>

      {/* ── Toolbar ── */}
      <div style={{
        display:"flex",alignItems:"center",gap:12,padding:"12px 20px",
        background:K.surface,borderBottom:`1px solid ${K.borderMid}`,
        flexShrink:0,
      }}>
        {/* Month nav */}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button onClick={prevMonth} style={{width:28,height:28,borderRadius:6,border:`1px solid ${K.border}`,background:K.surface,color:K.navySoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=K.indigoSoft;e.currentTarget.style.borderColor=K.indigo;e.currentTarget.style.color=K.indigo;}} onMouseLeave={e=>{e.currentTarget.style.background=K.surface;e.currentTarget.style.borderColor=K.border;e.currentTarget.style.color=K.navySoft;}}>‹</button>
          <div style={{minWidth:160,textAlign:"center",fontFamily:FONT_DISPLAY,fontWeight:700,fontSize:15,color:K.navy,letterSpacing:"-.01em"}}>
            {MONTH_NAMES[cur.m]} {cur.y}
          </div>
          <button onClick={nextMonth} style={{width:28,height:28,borderRadius:6,border:`1px solid ${K.border}`,background:K.surface,color:K.navySoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=K.indigoSoft;e.currentTarget.style.borderColor=K.indigo;e.currentTarget.style.color=K.indigo;}} onMouseLeave={e=>{e.currentTarget.style.background=K.surface;e.currentTarget.style.borderColor=K.border;e.currentTarget.style.color=K.navySoft;}}>›</button>
        </div>

        <button onClick={goToday} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${K.border}`,background:K.surface,color:K.navySoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background=K.indigoSoft;e.currentTarget.style.color=K.indigo;e.currentTarget.style.borderColor=K.indigo;}} onMouseLeave={e=>{e.currentTarget.style.background=K.surface;e.currentTarget.style.color=K.navySoft;e.currentTarget.style.borderColor=K.border;}}>Heute</button>

        <div style={{flex:1}}/>

        {/* Stats */}
        <div style={{fontSize:12,color:K.navySoft,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontWeight:700,color:K.indigo}}>{monthPosts.length}</span> Posts im {MONTH_NAMES[cur.m]}
        </div>

        {/* View toggle */}
        <div style={{display:"flex",gap:1,background:K.bg,borderRadius:7,padding:3,border:`1px solid ${K.border}`}}>
          {[["month","Monat",Calendar],["agenda","Agenda",BarChart2]].map(([v,l,Ic])=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{
              display:"flex",alignItems:"center",gap:5,
              padding:"5px 11px",borderRadius:5,border:"none",
              background:viewMode===v?K.surface:"transparent",
              color:viewMode===v?K.navy:K.navySoft,
              fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,
              boxShadow:viewMode===v?"0 1px 3px rgba(26,35,64,.08)":"none",
              transition:"all .15s",
            }}>
              <Ic size={13} strokeWidth={2}/>{l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend strip ── */}
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"7px 20px",background:K.surface,borderBottom:`1px solid ${K.border}`,flexShrink:0}}>
        <span style={{fontSize:10.5,fontWeight:700,color:K.navyMute,letterSpacing:".05em"}}>STATUS:</span>
        {Object.entries(STATUS_COLOR).map(([s,t])=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:2,background:t.color,opacity:.8}}/>
            <span style={{fontSize:10.5,color:K.navySoft,fontWeight:600}}>{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      {viewMode==="month"?<MonthView/>:<AgendaView/>}
    </div>
  );
}

// ── ADMIN PAGE ─────────────────────────────────────────────────────────────
function AdminPage({me}){
  const [users,setUsers]=useState(DEMO_USERS.map(u=>({...u})));
  const [tab,setTab]=useState("users");
  const [invE,setInvE]=useState(""); const [invR,setInvR]=useState("editor"); const [ok,setOk]=useState(false);
  const [notif,setNotif]=useState({onSched:true,onAppr:true,onPub:true,onErr:true});
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
  const mediaLoaded=useRef(false);
  const postsLoaded=useRef(false);
  const campsLoaded=useRef(false);

  // Posts aus KV laden (beim Start)
  useEffect(()=>{
    storeGet("posts").then(data=>{
      postsLoaded.current=true;
      if(data?.length) setPosts(data);
    });
  },[]);

  // Posts in KV speichern (bei Änderungen)
  useEffect(()=>{
    if(!postsLoaded.current)return;
    storeSet("posts",posts);
  },[posts]);

  // Kampagnen aus KV laden (beim Start)
  useEffect(()=>{
    storeGet("campaigns").then(data=>{
      campsLoaded.current=true;
      if(data?.length) setCampaigns(data);
    });
  },[]);

  // Kampagnen in KV speichern (bei Änderungen)
  useEffect(()=>{
    if(!campsLoaded.current)return;
    storeSet("campaigns",campaigns);
  },[campaigns]);

  // Medien aus KV laden (beim Start)
  useEffect(()=>{
    storeGet("media:index").then(async index=>{
      if(index?.length){
        const loaded=await Promise.all(index.map(async meta=>{
          const img=await storeGet(`media:img:${meta.id}`);
          return{...meta,url:img?.url||""};
        }));
        mediaLoaded.current=true;
        setItems(loaded);
      } else {
        mediaLoaded.current=true;
      }
    });
  },[]);

  // Medien in KV speichern (bei Änderungen)
  useEffect(()=>{
    if(!mediaLoaded.current)return;
    const index=items.map(({url,analyzing,...rest})=>rest);
    storeSet("media:index",index);
    items.filter(i=>!i.analyzing&&i.url).forEach(i=>storeSet(`media:img:${i.id}`,{url:i.url}));
  },[items]);

  if(!user) return <Login onLogin={setUser}/>;

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
        <TopBar title={TITLE[nav]||"SocialFlow"} user={user} onNew={newPost}/>
        {nav==="dashboard"   &&<Dashboard posts={posts} items={items} campaigns={campaigns} user={user} onNav={goNav} onFilterNav={goFilter}/>}
        {nav==="publisher"   &&<PublisherPage posts={posts} items={items} campaigns={campaigns} onEdit={setEdPost} onSched={setSchPost} onDel={del} onApprove={approve} onStatus={chSt} onCampaign={chCamp} onNew={newPost} role={user.role} filt={filt} setFilt={setFilt}/>}
        {nav==="campaigns"   &&<CampaignsPage campaigns={campaigns} setCampaigns={setCampaigns} posts={posts} onEditPost={setEdPost}/>}
        {nav==="media"       &&<MediaPage items={items} onUpload={i=>setItems(p=>[...p,i])} onUpdate={u=>setItems(p=>p.map(x=>x.id===u.id?u:x))}/>}
        {nav==="calendar"    &&<CalendarPage posts={posts} onEdit={setEdPost}/>}
        {nav==="performance" &&<PerformancePage posts={posts}/>}
        {nav==="admin"       &&user.role==="admin"&&<AdminPage me={user}/>}
      </div>
      {edPost&&<Editor post={edPost} items={items} campaigns={campaigns} onSave={save} onClose={()=>setEdPost(null)} onUpload={i=>setItems(p=>[...p,i])} onUpdate={u=>setItems(p=>p.map(x=>x.id===u.id?u:x))} user={user}/>}
      {schPost&&<SchedModal post={schPost} onSave={saveSch} onClose={()=>setSchPost(null)}/>}
    </div>
  );
}
