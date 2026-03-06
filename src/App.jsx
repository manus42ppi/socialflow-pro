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

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ FONT & COLORS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
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

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ DOMAIN DATA ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
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
  { id:"published", label:"VerÃÂÃÂÃÂÃÂ¶ffentlicht", color:"#6941C6", bg:"#F9F5FF", border:"#DDD6FE", header:"#EDE9FE" },
];
const CAMP_COLORS = ["#E53E3E","#0077B5","#027A48","#B54708","#6941C6","#E1306C","#25D366","#F59E0B","#06B6D4","#EC4899"];
const CAMP_EMOJIS = ["ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ¯","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂª","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ¸","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ","ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¤ÃÂÃÂ¯ÃÂÃÂ¸ÃÂÃÂ","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ¥","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ¡","ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂ¸ÃÂÃÂ","ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¡","ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ"];
const DEMO_CAMPAIGNS = [
  { id:"c1", name:"Sommer-Sale",   emoji:"ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂ¸ÃÂÃÂ", color:"#F59E0B", description:"Posts fÃÂÃÂÃÂÃÂ¼r den Sommer Sale" },
  { id:"c2", name:"Produktlaunch", emoji:"ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ", color:"#6941C6", description:"Launch Q2 2026" },
];
const DEMO_POSTS = [
  { id:"p1", title:"Produktlaunch Q2",  content:"Unser neues Produkt ist da! ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ", hashtags:"#launch #neu",     channels:["instagram","linkedin"], scheduledDate:"2026-03-15", scheduledTime:"09:00", status:"scheduled", mediaId:null, campaignId:"c2" },
  { id:"p2", title:"Tipp der Woche",    content:"RegelmÃÂÃÂÃÂÃÂ¤ÃÂÃÂÃÂÃÂiges Posting steigert deine Reichweite um 40%.", hashtags:"#marketing", channels:["twitter","facebook"],  scheduledDate:"",          scheduledTime:"",      status:"draft",     mediaId:null, campaignId:null },
  { id:"p3", title:"Behind the Scenes", content:"Blick hinter die Kulissen! ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂª", hashtags:"#team #bts",       channels:["instagram","whatsapp"],  scheduledDate:"2026-03-20", scheduledTime:"18:00", status:"scheduled", mediaId:null, campaignId:null },
  { id:"p4", title:"Kundenreview",      content:"Was unsere Kunden sagen. Danke! ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¤ÃÂÃÂ¯ÃÂÃÂ¸ÃÂÃÂ", hashtags:"#review",    channels:["instagram","linkedin"],  scheduledDate:"",          scheduledTime:"",      status:"pending",   mediaId:null, campaignId:null },
  { id:"p5", title:"Sommer Sale",       content:"ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂ¸ÃÂÃÂ Bis zu 40% Rabatt ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ nur kurze Zeit!", hashtags:"#sale", channels:["instagram","facebook","tiktok"], scheduledDate:"2026-06-01", scheduledTime:"10:00", status:"draft", mediaId:null, campaignId:"c1" },
];

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ UTILS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
const uid = () => Math.random().toString(36).slice(2,10);
const fileToDataURL = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
const getMediaType = f => f.type.startsWith("video/")?"video": f.name.toLowerCase().includes("logo")?"logo": f.type.startsWith("image/")?"image":"document";
const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}) : "";

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AI SERVICE ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
async function aiCall(messages, max_tokens=800) {
  const r = await fetch("/.netlify/functions/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens,messages}),
  });
  return (await r.json()).content?.[0]?.text||"";
}
const AI = {
  optimize:(text,ch,tone)=>aiCall([{role:"user",content:`Optimiere fÃÂÃÂÃÂÃÂ¼r ${ch}. Ton:${tone}. NUR Text:\n${text}`}]),
  hashtags:(text,ch)=>aiCall([{role:"user",content:`5-10 Hashtags fÃÂÃÂÃÂÃÂ¼r ${ch}. NUR Hashtags:\n${text}`}],200),
  variants:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`3 Varianten fÃÂÃÂÃÂÃÂ¼r ${ch}: professionell,locker,aufmerksamkeitsstark. NUR JSON:{"variants":[{"tone":"","text":""}]}`}],1200);
    try{return JSON.parse(raw.replace(/```json|```/g,"").trim()).variants||[];}catch{return[];}
  },
  analyzeImg:async(dataUrl)=>{
    const b64=dataUrl.split(",")[1],mime=dataUrl.split(";")[0].split(":")[1]||"image/jpeg";
    const raw=await aiCall([{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mime,data:b64}},
      {type:"text",text:'Analysiere fÃÂÃÂÃÂÃÂ¼r Social Media. NUR JSON:{"tags":[],"description":"","suggestedAlt":"","mood":""}'}
    ]}],400);
    try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{return{};}
  },
};
// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ UI PRIMITIVES ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
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
        {label}{onClick&&<span style={{marginLeft:"auto",fontSize:11,color:c,fontWeight:700}}>ÃÂ¢ÃÂÃÂ</span>}
      </div>
    </div>
  );
}
function PostCard({post,items,campaigns,onEdit,onSched,onDel,onApprove,role}){
  const [tab,setTab]=useState(post.channels?.[0]||"instagram");
  const media=items.find(m=>m.id===post.mediaId);
  const camp=campaigns?.find(c=>c.id===post.campaignId);
  const PC=PREV[tab]||PREV.instagram;
  const can=p=>ROLES[role]?.can.includes(p);
  const bg=CHANNELS.find(c=>c.id===tab)?.bg||C.bg;
  return(
    <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",transition:"box-shadow .2s",display:"flex",flexDirection:"column",height:560,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)"}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderBottom:`1px solid ${C.borderLight}`,flexShrink:0}}>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{post.title||"Kein Titel"}</div>
          {camp&&<div style={{fontSize:10,color:C.textSoft,marginTop:1}}>{camp.emoji} {camp.name}</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
          <SBadge status={post.status}/>
          {can("delete")&&<button onClick={()=>onDel(post.id)} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:2,display:"flex"}}><X size={13} strokeWidth={2}/></button>}
        </div>
      </div>
      {post.channels?.length>0&&<div style={{display:"flex",borderBottom:`1px solid ${C.borderLight}`,overflowX:"auto",flexShrink:0}}>
        {post.channels.map(cid=>{const c=CHANNELS.find(x=>x.id===cid);const on=tab===cid;
          return <button key={cid} onClick={()=>setTab(cid)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,padding:"6px 10px",border:"none",borderBottom:`2px solid ${on?c?.color:"transparent"}`,background:"transparent",color:on?c?.color:C.textMute,fontWeight:on?700:500,fontSize:11,cursor:"pointer",fontFamily:FONT}}>
            <ChIco id={cid} size={11}/>{c?.label}
          </button>;
        })}
      </div>}
      <div style={{flex:1,background:bg,overflow:"hidden",padding:"8px 8px 0"}}>
        <PC post={post} media={media}/>
      </div>
      {post.status==="scheduled"&&post.scheduledDate&&<div style={{padding:"5px 12px",background:C.successBg,borderTop:`1px solid #A7F3D0`,display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.success,fontWeight:600,flexShrink:0}}>
        <Calendar size={11} strokeWidth={2}/>{fmtDate(post.scheduledDate)}{post.scheduledTime&&` Â· ${post.scheduledTime}`}
      </div>}
      {post.status==="pending"&&can("approve")&&<div style={{padding:"7px 12px",background:C.infoBg,borderTop:`1px solid #BFDBFE`,display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
        <span style={{flex:1,fontSize:11,color:C.info,fontWeight:600}}>Wartet auf Freigabe</span>
        <Btn size="sm" variant="success" onClick={()=>onApprove(post.id,"scheduled")}><Check size={11} strokeWidth={2.5}/>OK</Btn>
        <Btn size="sm" variant="danger"  onClick={()=>onApprove(post.id,"draft")}><X size={11} strokeWidth={2.5}/>Ablehnen</Btn>
      </div>}
      <div style={{display:"flex",borderTop:`1px solid ${C.borderLight}`,flexShrink:0}}>
        {can("write")&&<button onClick={()=>onEdit(post)} style={{flex:1,padding:"9px 0",background:"none",border:"none",color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,borderRight:`1px solid ${C.borderLight}`,fontFamily:FONT}}><Edit2 size={12} strokeWidth={IW}/>Bearbeiten</button>}
        <button onClick={()=>onSched(post)} style={{flex:1,padding:"9px 0",background:"none",border:"none",color:post.status==="scheduled"?C.success:C.accent,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:FONT}}>
          <Calendar size={12} strokeWidth={IW}/>{post.status==="scheduled"?"Ãndern":"Planen"}
        </button>
      </div>
    </div>
  );
}function PublisherPage({posts,items,campaigns,onEdit,onSched,onDel,onApprove,onStatus,onCampaign,onNew,role,filt,setFilt}){
  const [view,setView]=useState("list");
  const can=p=>ROLES[role]?.can.includes(p);
  const shown=posts.filter(p=>filt==="all"?true:p.status===filt);
  const counts={all:posts.length,scheduled:posts.filter(p=>p.status==="scheduled").length,draft:posts.filter(p=>p.status==="draft").length,pending:posts.filter(p=>p.status==="pending").length};
  return(
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"0 22px",borderBottom:`1px solid ${C.border}`,background:C.surface,display:"flex",gap:0,alignItems:"stretch",flexShrink:0}}>
        <div style={{display:"flex",gap:0}}>
          {[["all","Alle"],["scheduled","Geplant"],["draft","Entwürfe"],["pending","Freigabe"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilt(v)} style={{padding:"14px 18px",border:"none",borderBottom:`2px solid ${filt===v?C.accent:"transparent"}`,background:"transparent",color:filt===v?C.accent:C.textSoft,fontWeight:filt===v?700:500,fontSize:13,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
              {l}<span style={{background:filt===v?C.accentLight:C.borderLight,color:filt===v?C.accent:C.textMute,fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{counts[v]}</span>
            </button>
          ))}
        </div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 8px"}}>
          <div style={{display:"flex",gap:1,background:C.borderLight,borderRadius:7,padding:2}}>
            {[["list","☰"],["grid","⊞"],["board","⊟"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"5px 10px",borderRadius:5,border:"none",background:view===v?C.surface:"transparent",color:view===v?C.text:C.textSoft,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT,boxShadow:view===v?"0 1px 3px rgba(0,0,0,.07)":"none"}}>{l}</button>
            ))}
          </div>
          {can("write")&&<Btn onClick={onNew}><Plus size={14} strokeWidth={2.5}/>Neuer Post</Btn>}
        </div>
      </div>
      {view==="list"&&(
        <div style={{flex:1,overflow:"auto"}}>
          {shown.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:C.textMute}}><Send size={44} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/><div style={{fontSize:15,fontWeight:700,color:C.textMid}}>Keine Posts</div>{can("write")&&<Btn style={{marginTop:14}} onClick={onNew}><Plus size={14} strokeWidth={2}/>Erstellen</Btn>}</div>:(
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.bg,borderBottom:`1px solid ${C.border}`}}>
                  <th style={{padding:"10px 22px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMute,letterSpacing:".06em",textTransform:"uppercase",width:"35%"}}>Titel</th>
                  <th style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMute,letterSpacing:".06em",textTransform:"uppercase",width:"15%"}}>Kanäle</th>
                  <th style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMute,letterSpacing:".06em",textTransform:"uppercase",width:"15%"}}>Datum</th>
                  <th style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMute,letterSpacing:".06em",textTransform:"uppercase",width:"12%"}}>Status</th>
                  <th style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMute,letterSpacing:".06em",textTransform:"uppercase",width:"12%"}}>Kampagne</th>
                  <th style={{padding:"10px 22px",textAlign:"right",fontSize:11,fontWeight:700,color:C.textMute,letterSpacing:".06em",textTransform:"uppercase",width:"11%"}}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p,i)=>{
                  const camp=campaigns?.find(c=>c.id===p.campaignId);
                  const can2=perm=>ROLES[role]?.can.includes(perm);
                  return(
                    <tr key={p.id} style={{borderBottom:`1px solid ${C.borderLight}`,background:i%2===0?C.surface:"#FAFBFC",transition:"background .1s",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#F0F4FF"}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.surface:"#FAFBFC"}>
                      <td style={{padding:"13px 22px"}} onClick={()=>onEdit(p)}>
                        <div style={{fontWeight:600,fontSize:13,color:C.text}}>{p.title||"Kein Titel"}</div>
                        {p.content&&<div style={{fontSize:12,color:C.textSoft,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:280}}>{p.content}</div>}
                      </td>
                      <td style={{padding:"13px 16px"}} onClick={()=>onEdit(p)}>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {p.channels?.map(cid=>{const ch=CHANNELS.find(c=>c.id===cid);return(
                            <span key={cid} style={{display:"inline-flex",alignItems:"center",gap:3,background:ch?.color+"15",color:ch?.color,fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:20,border:`1px solid ${ch?.color}30`}}>
                              <ChIco id={cid} size={10}/>{ch?.label}
                            </span>
                          );})}
                        </div>
                      </td>
                      <td style={{padding:"13px 16px"}} onClick={()=>onEdit(p)}>
                        {p.scheduledDate?<div><div style={{fontSize:12,fontWeight:600,color:C.textMid}}>{fmtDate(p.scheduledDate)}</div>{p.scheduledTime&&<div style={{fontSize:11,color:C.textSoft,marginTop:1}}>{p.scheduledTime} Uhr</div>}</div>:<span style={{fontSize:12,color:C.textMute}}>–</span>}
                      </td>
                      <td style={{padding:"13px 16px"}} onClick={()=>onEdit(p)}>
                        <SBadge status={p.status}/>
                        {p.status==="pending"&&can2("approve")&&<div style={{display:"flex",gap:4,marginTop:5}}>
                          <Btn size="sm" variant="success" onClick={e=>{e.stopPropagation();onApprove(p.id,"scheduled")}}><Check size={10} strokeWidth={2.5}/>OK</Btn>
                          <Btn size="sm" variant="danger" onClick={e=>{e.stopPropagation();onApprove(p.id,"draft")}}><X size={10} strokeWidth={2}/></Btn>
                        </div>}
                      </td>
                      <td style={{padding:"13px 16px"}} onClick={()=>onEdit(p)}>
                        {camp?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:camp.color+"15",color:camp.color,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>{camp.emoji} {camp.name}</span>:<span style={{fontSize:12,color:C.textMute}}>–</span>}
                      </td>
                      <td style={{padding:"13px 22px",textAlign:"right"}}>
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          {can2("write")&&<button onClick={e=>{e.stopPropagation();onEdit(p);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.textSoft,cursor:"pointer",padding:"5px 9px",fontSize:11,fontWeight:600,fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}><Edit2 size={11} strokeWidth={2}/>Edit</button>}
                          <button onClick={e=>{e.stopPropagation();onSched(p);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:p.status==="scheduled"?C.success:C.accent,cursor:"pointer",padding:"5px 9px",fontSize:11,fontWeight:600,fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}><Calendar size={11} strokeWidth={2}/>{p.status==="scheduled"?"Ändern":"Planen"}</button>
                          {can2("delete")&&<button onClick={e=>{e.stopPropagation();onDel(p.id);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.textMute,cursor:"pointer",padding:"5px 7px",display:"flex",alignItems:"center"}}><X size={12} strokeWidth={2}/></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {view==="grid"&&(
        <div style={{flex:1,overflow:"auto",padding:22}}>
          {shown.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:C.textMute}}><Send size={44} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/><div style={{fontSize:15,fontWeight:700,color:C.textMid}}>Keine Posts</div>{can("write")&&<Btn style={{marginTop:14}} onClick={onNew}><Plus size={14} strokeWidth={2}/>Erstellen</Btn>}</div>:(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16,alignItems:"start"}}>
              {shown.map(p=><PostCard key={p.id} post={p} items={items} campaigns={campaigns} onEdit={onEdit} onSched={onSched} onDel={onDel} onApprove={onApprove} role={role}/>)}
            </div>
          )}
        </div>
      )}
      {view==="board"&&<Board posts={posts} items={items} campaigns={campaigns} onStatus={onStatus} onCampaign={onCampaign} onEdit={onEdit} onNew={onNew} canW={can("write")}/>}
    </div>
  );
}
