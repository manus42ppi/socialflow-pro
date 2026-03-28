import { useState, useEffect, useRef, useCallback } from "react";
import {
  RefreshCw, ExternalLink, TrendingUp, Flame, Clock,
  Newspaper, Instagram, Facebook, MessageCircle, Wifi, WifiOff,
  AlertCircle, Heart, MessageSquare, Share2, BadgeCheck,
} from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";

// ── Feed sources ──────────────────────────────────────────────────────────────
const NEWS_SOURCES = [
  { id:"all",        label:"Alle Quellen", color:"#6B7280",  url:null },
  { id:"tagesschau", label:"Tagesschau",   color:"#003399",  url:"https://www.tagesschau.de/xml/rss2/" },
  { id:"dw",         label:"DW",           color:"#0066B3",  url:"https://rss.dw.com/xml/rss-de-all" },
  { id:"ntv",        label:"n-tv",         color:"#CC1414",  url:"https://www.n-tv.de/rss" },
  { id:"heise",      label:"Heise",        color:"#009900",  url:"https://www.heise.de/rss/heise-atom.xml" },
  { id:"t3n",        label:"t3n",          color:"#E8501A",  url:"https://t3n.de/rss.xml" },
  { id:"golem",      label:"Golem",        color:"#2D6A4F",  url:"https://rss.golem.de/rss.php?feed=ATOM1.0" },
];
const ALL_SOURCE_IDS = ["tagesschau","dw","ntv","heise"];

// ── RSS fetch ─────────────────────────────────────────────────────────────────
const RSS_PROXY = "/rss?url=";
const RSS2JSON  = "https://api.rss2json.com/v1/api.json?count=25&rss_url=";

function withTimeout(ms) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

function parseRssXml(xml, src) {
  try {
    const doc   = new DOMParser().parseFromString(xml, "text/xml");
    const items = [...doc.querySelectorAll("item, entry")];
    return items.slice(0, 25).map(item => {
      const txt    = tag => item.querySelector(tag)?.textContent?.trim() || "";
      const linkEl = item.querySelector("link");
      const link   = linkEl?.textContent?.trim() || linkEl?.getAttribute("href") || "";
      const thumb  =
        item.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
        item.querySelector("enclosure")?.getAttribute("url") ||
        item.getElementsByTagNameNS("http://search.yahoo.com/mrss/","thumbnail")[0]?.getAttribute("url") ||
        item.getElementsByTagNameNS("http://search.yahoo.com/mrss/","content")[0]?.getAttribute("url") || null;
      const raw  = txt("description") || txt("summary") || txt("content");
      const desc = raw.replace(/<[^>]+>/g,"").replace(/&[a-z]+;/g," ").replace(/\s+/g," ").trim().slice(0,150);
      const title = (txt("title")||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
      return { id:link||txt("guid"), title, link, pubDate:txt("pubDate")||txt("published"), description:desc, thumbnail:thumb, sourceLabel:src.label, sourceColor:src.color };
    }).filter(a => a.title && a.link);
  } catch { return []; }
}

async function fetchFeed(src) {
  // Strategy 1: CF Pages Function /rss (server-side, no CORS)
  try {
    const { signal, clear } = withTimeout(10000);
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(src.url)}`, { signal });
    clear();
    if (res.ok) {
      const items = parseRssXml(await res.text(), src);
      if (items.length) return items;
    }
  } catch { /**/ }
  // Strategy 2: rss2json.com
  try {
    const { signal, clear } = withTimeout(8000);
    const res  = await fetch(`${RSS2JSON}${encodeURIComponent(src.url)}`, { signal });
    clear();
    const data = await res.json();
    if (data.status === "ok" && data.items?.length) {
      return data.items.map(item => ({
        id: item.link||item.guid, title:(item.title||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").trim(),
        link:item.link, pubDate:item.pubDate,
        description:(item.description||"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim().slice(0,150),
        thumbnail:item.thumbnail||item.enclosure?.link||null, sourceLabel:src.label, sourceColor:src.color,
      })).filter(a => a.title && a.link);
    }
  } catch { /**/ }
  // Strategy 3: allorigins fallback
  try {
    const { signal, clear } = withTimeout(10000);
    const res  = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(src.url)}`, { signal });
    clear();
    const json = await res.json();
    if (json?.contents) {
      const items = parseRssXml(json.contents, src);
      if (items.length) return items;
    }
  } catch { /**/ }
  return [];
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const s = (Date.now()-d)/1000;
  if (s < 60)    return "gerade";
  if (s < 3600)  return `${Math.round(s/60)} Min.`;
  if (s < 86400) return `${Math.round(s/3600)} Std.`;
  return `${Math.round(s/86400)} Tagen`;
}

// ── Viral posts mock data ─────────────────────────────────────────────────────
// Real post-level data requires private OAuth APIs.
// We simulate realistic viral posts based on publicly observable pattern data.

const VIRAL_POSTS = {
  instagram: {
    "1h": [
      { id:"ig1h1", user:"@diegosanchez.photo", verified:true,  caption:"Morgenrot über den Alpen – kein Filter, pure Magie 🌄 Aufgestanden um 4 Uhr für diesen Moment. #nature #alps #photography", img:"mountain", likes:"318K", comments:"14.2K", shares:"52K", growth:"+1.240%", type:"Reels", ago:"12 Min." },
      { id:"ig1h2", user:"@kochstudio.de",       verified:false, caption:"Dieses 5-Minuten-Pasta-Rezept hat meinen Alltag verändert 🍝 Einfacher geht's nicht! Speichern für später 👇 #foodie #pasta #cooking", img:"food", likes:"204K", comments:"8.7K", shares:"31K", growth:"+890%", type:"Reels", ago:"28 Min." },
      { id:"ig1h3", user:"@techinsider.de",      verified:true,  caption:"ChatGPT kann das jetzt auch?! 😱 Dieses neue Feature verändert alles für Content Creator. #ai #contentcreator #tech", img:"tech", likes:"156K", comments:"22.1K", shares:"44K", growth:"+760%", type:"Post", ago:"44 Min." },
    ],
    "6h": [
      { id:"ig6h1", user:"@minimaliving",        verified:true,  caption:"Mein Appartement mit 28qm in München – wie ich den Raum optimal nutze 🏠 Thread im Profil. #minimalism #smallspace #interior", img:"interior", likes:"892K", comments:"41K", shares:"118K", growth:"+430%", type:"Reels", ago:"2 Std." },
      { id:"ig6h2", user:"@dr.bewegung",         verified:true,  caption:"10 Minuten morgens – diese Routine hat mir 3 Jahre gegeben. Kein Witz. #fitness #health #morningroutine", img:"fitness", likes:"674K", comments:"28.4K", shares:"94K", growth:"+310%", type:"Reels", ago:"3 Std." },
      { id:"ig6h3", user:"@streetfood.world",    verified:false, caption:"Die besten Straßengerichte aus 40 Ländern in einem Video 🌍🍜 Wo als nächstes? #travel #food #streetfood", img:"streetfood", likes:"541K", comments:"19.2K", shares:"77K", growth:"+280%", type:"Reels", ago:"5 Std." },
    ],
    "24h": [
      { id:"ig24h1", user:"@nasa",               verified:true,  caption:"Webb Telescope just captured something we've never seen before. The universe never stops surprising us 🌌 #space #nasa #science", img:"space", likes:"4.2M", comments:"182K", shares:"560K", growth:"+124%", type:"Post", ago:"8 Std." },
      { id:"ig24h2", user:"@humansofberlin",     verified:true,  caption:"»Ich habe 30 Jahre gewartet, um diesen Satz zu sagen.« – Klaus, 67 #humansofberlin #story #berlin", img:"portrait", likes:"2.8M", comments:"94K", shares:"310K", growth:"+98%", type:"Post", ago:"14 Std." },
      { id:"ig24h3", user:"@sustainability.now", verified:false, caption:"Unser Ozean schluckt täglich 22 Millionen Tonnen CO₂. Dieser Clip zeigt, wie das aussieht. 🌊 #climate #ocean #environment", img:"ocean", likes:"1.9M", comments:"67K", shares:"248K", growth:"+87%", type:"Reels", ago:"19 Std." },
    ],
  },
  facebook: {
    "1h": [
      { id:"fb1h1", user:"ADAC",              verified:true,  caption:"WARNUNG: Diese Autobahnstrecken sind heute massiv überlastet – aktuelle Stauwarnungen für euren Weg nach Hause.", img:"traffic",  likes:"41K", comments:"8.9K", shares:"28K", growth:"+920%", type:"Beitrag", ago:"8 Min." },
      { id:"fb1h2", user:"ARD Tagesschau",    verified:true,  caption:"BREAKING: Bundesregierung beschließt neues Energiepaket. Was das für euren Strompreis bedeutet ›", img:"politics", likes:"29K", comments:"15.2K", shares:"19K", growth:"+680%", type:"Artikel", ago:"22 Min." },
      { id:"fb1h3", user:"Rezepte der Woche", verified:false, caption:"Dieses Erdbeer-Tiramisu ist gerade überall! Nur 4 Zutaten und 20 Minuten 🍓", img:"dessert",  likes:"18K", comments:"3.4K", shares:"22K", growth:"+540%", type:"Video", ago:"51 Min." },
    ],
    "6h": [
      { id:"fb6h1", user:"SWR",               verified:true,  caption:"Dieses Dorf in Baden-Württemberg produziert mehr Energie als es verbraucht – wie funktioniert das?", img:"solar",    likes:"124K", comments:"18.7K", shares:"67K", growth:"+290%", type:"Artikel", ago:"1 Std." },
      { id:"fb6h2", user:"Stern",             verified:true,  caption:"Das Foto eines 9-Jährigen gewinnt den renommiertesten Naturfoto-Preis der Welt 📸", img:"award",    likes:"98K", comments:"7.2K", shares:"81K", growth:"+240%", type:"Foto", ago:"4 Std." },
      { id:"fb6h3", user:"Focus Online",      verified:true,  caption:"Forscher entdecken: Diese eine Gewohnheit am Abend verdoppelt die Schlafqualität", img:"sleep",    likes:"76K", comments:"12.4K", shares:"54K", growth:"+210%", type:"Artikel", ago:"5 Std." },
    ],
    "24h": [
      { id:"fb24h1", user:"Spiegel Online",   verified:true,  caption:"Exklusiv: Das steckt wirklich hinter dem größten Datenleck in der deutschen Geschichte", img:"data",     likes:"312K", comments:"89K", shares:"144K", growth:"+88%", type:"Artikel", ago:"9 Std." },
      { id:"fb24h2", user:"ZDF",              verified:true,  caption:"Diese Dokumentation über die Arbeit in deutschen Krankenhäusern bewegt gerade ganz Deutschland.", img:"hospital", likes:"248K", comments:"54K", shares:"123K", growth:"+72%", type:"Video", ago:"15 Std." },
      { id:"fb24h3", user:"Hochzeitsmomente", verified:false, caption:"Er hatte keine Hände – und trotzdem diese Hochzeit 💍 Das bewegt gerade alle.", img:"wedding",  likes:"1.8M", comments:"142K", shares:"298K", growth:"+65%", type:"Video", ago:"21 Std." },
    ],
  },
  whatsapp: {
    "1h": [
      { id:"wa1h1", icon:"⚡", category:"Breaking", caption:"Strom wird ab Mai deutlich günstiger – Vergleichsrechner jetzt prüfen", fwds:"Sehr hoch", detail:"Wird in Familien- und Nachbarschaftsgruppen massiv geteilt", ago:"6 Min." },
      { id:"wa1h2", icon:"🚨", category:"Warnung",  caption:"Achtung: Neue Phishing-Welle mit gefälschten DHL-Nachrichten im Umlauf", fwds:"Sehr hoch", detail:"Verbreitet sich über Eltern- und Arbeits-Gruppen", ago:"19 Min." },
      { id:"wa1h3", icon:"😂", category:"Humor",    caption:"KI-generierter Sketch über deutsche Bürokratie – absolut legendär", fwds:"Hoch",      detail:"Viral in Freundesgruppen 25–45", ago:"38 Min." },
    ],
    "6h": [
      { id:"wa6h1", icon:"💡", category:"Tipp",     caption:"Stromverbrauch senken: 7 Tricks die wirklich funktionieren (Kurzanleitung)", fwds:"Sehr hoch", detail:"Top-Beitrag in Haus- und Familiengruppen", ago:"1 Std." },
      { id:"wa6h2", icon:"🏥", category:"Gesundheit",caption:"Neue Studie: Dieser Vitaminmangel betrifft 60% der Deutschen – Test zuhause",   fwds:"Hoch",      detail:"Starke Weiterleitung in Gesundheits-Gruppen", ago:"3 Std." },
      { id:"wa6h3", icon:"📺", category:"Medien",   caption:"Diese Doku sollte jeder gesehen haben – Link zur Mediathek (kostenlos)",          fwds:"Hoch",      detail:"Verbreitet sich über Kulturgruppenund Familien", ago:"5 Std." },
    ],
    "24h": [
      { id:"wa24h1", icon:"🌍", category:"Klima",   caption:"Klimaforscher live-erklärt: Warum 2025 das entscheidende Jahr wird (7 Min.)", fwds:"Sehr hoch", detail:"Millionenfach geteilt, auch über Plattformgrenzen hinweg", ago:"6 Std." },
      { id:"wa24h2", icon:"💰", category:"Geld",    caption:"Riester-Rente: Betroffene können jetzt Geld zurückverlangen – Anleitung", fwds:"Sehr hoch", detail:"Renner in Berater- und Elterngruppen", ago:"11 Std." },
      { id:"wa24h3", icon:"🎓", category:"Wissen",  caption:"Professorin erklärt in 3 Minuten warum KI Bildung nicht ersetzen kann", fwds:"Hoch",      detail:"Geteilt in Lehrer-, Eltern- und Studentengruppen", ago:"18 Std." },
    ],
  },
};

// Deterministic image seed per post id
const IMG_SEEDS = {
  mountain:"1040", food:"429", tech:"0", interior:"1029", fitness:"225",
  streetfood:"431", space:"911", portrait:"64", ocean:"1001",
  traffic:"177", politics:"374", dessert:"493", solar:"397",
  award:"584", sleep:"142", data:"366", hospital:"116", wedding:"219",
};
function postImg(key) {
  const seed = IMG_SEEDS[key] || "100";
  return `https://picsum.photos/id/${seed}/320/180`;
}

// ── Mock trends (hashtags / topics) ──────────────────────────────────────────
function buildInstaTrends(seed = 0) {
  const base = [
    { tag:"#sustainability",   posts:"14.2M", d:"+21%", hot:true  },
    { tag:"#ai",               posts:"9.8M",  d:"+38%", hot:true  },
    { tag:"#contentcreator",   posts:"7.4M",  d:"+28%", hot:true  },
    { tag:"#wellness",         posts:"6.1M",  d:"+14%"             },
    { tag:"#digitalmarketing", posts:"5.2M",  d:"+11%"             },
    { tag:"#entrepreneur",     posts:"4.7M",  d:"+9%"              },
    { tag:"#mentalhealth",     posts:"4.3M",  d:"+17%"             },
    { tag:"#smallbusiness",    posts:"3.8M",  d:"+8%"              },
  ];
  return base.map((item,i) => ({ ...item, posts:(parseFloat(item.posts)+((seed+i)%3)*0.1).toFixed(1)+"M" }));
}
function buildFbTrends() {
  return [
    { topic:"KI & Technologie",       engagement:"Sehr hoch", change:"+34%" },
    { topic:"Wirtschaft & Finanzen",  engagement:"Sehr hoch", change:"+18%" },
    { topic:"Gesundheit & Vorsorge",  engagement:"Hoch",      change:"+14%" },
    { topic:"Politik & Gesellschaft", engagement:"Hoch",      change:"+12%" },
    { topic:"Lokale Nachrichten",     engagement:"Hoch",      change:"+10%" },
    { topic:"Sport & Fitness",        engagement:"Mittel",    change:"+7%"  },
  ];
}
const ENG_CLR = { "Sehr hoch":"#16A34A", "Hoch":"#2563EB", "Mittel":"#D97706" };
const REFRESH_INTERVAL = 5 * 60 * 1000;

// ── Post card ─────────────────────────────────────────────────────────────────
function ViralPostCard({ post, platform, accent }) {
  const isWa = platform === "whatsapp";
  return (
    <div style={{
      borderRadius:10, overflow:"hidden",
      border:`1px solid ${C.border}`,
      background:"#fff",
      marginBottom:10,
    }}>
      {/* Image preview (Instagram + Facebook) */}
      {!isWa && post.img && (
        <div style={{ position:"relative" }}>
          <img
            src={postImg(post.img)}
            alt=""
            loading="lazy"
            style={{ width:"100%", height:130, objectFit:"cover", display:"block" }}
            onError={e => { e.currentTarget.style.display="none"; }}
          />
          {/* Badges overlay */}
          <div style={{ position:"absolute", top:7, left:8, display:"flex", gap:4 }}>
            <span style={{
              fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10,
              background:"rgba(0,0,0,.55)", color:"#fff", backdropFilter:"blur(4px)",
            }}>
              {post.type}
            </span>
          </div>
          <div style={{ position:"absolute", top:7, right:8 }}>
            <span style={{
              fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:10,
              background: "#EF4444", color:"#fff",
              display:"flex", alignItems:"center", gap:3,
            }}>
              <Flame size={8} strokeWidth={2.5}/>{post.growth}
            </span>
          </div>
        </div>
      )}

      <div style={{ padding:"9px 11px 10px" }}>
        {/* Author row */}
        {!isWa && (
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
            <div style={{
              width:22, height:22, borderRadius:"50%",
              background: accent + "22",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              <span style={{ fontSize:9, fontWeight:800, color:accent }}>
                {post.user.slice(1,3).toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize:11.5, fontWeight:700, color:C.text }}>{post.user}</span>
            {post.verified && <BadgeCheck size={11} color={accent} strokeWidth={2.5}/>}
            <span style={{ fontSize:10, color:C.textMute, marginLeft:"auto" }}>{post.ago}</span>
          </div>
        )}

        {/* WhatsApp header */}
        {isWa && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{post.icon}</span>
            <span style={{
              fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:5,
              color:"#16A34A", background:"#DCFCE7",
            }}>{post.category}</span>
            <span style={{ fontSize:10, color:C.textMute, marginLeft:"auto" }}>{post.ago}</span>
          </div>
        )}

        {/* Caption */}
        <div style={{
          fontSize:12, color:C.text, lineHeight:1.5, marginBottom: isWa ? 6 : 8,
          overflow:"hidden", display:"-webkit-box",
          WebkitLineClamp:2, WebkitBoxOrient:"vertical",
        }}>
          {post.caption}
        </div>

        {/* WhatsApp detail note */}
        {isWa && (
          <div style={{ fontSize:10.5, color:C.textSoft, lineHeight:1.4, marginBottom:6 }}>
            {post.detail}
          </div>
        )}

        {/* Metrics */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {!isWa && (<>
            <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:10.5, color:C.textMute }}>
              <Heart size={10} strokeWidth={2} color="#EF4444"/>{post.likes}
            </span>
            <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:10.5, color:C.textMute }}>
              <MessageSquare size={10} strokeWidth={2}/>{post.comments}
            </span>
            <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:10.5, color:C.textMute }}>
              <Share2 size={10} strokeWidth={2}/>{post.shares}
            </span>
          </>)}
          {isWa && (
            <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10.5, color:C.textMute }}>
              <Share2 size={10} strokeWidth={2}/>Weiterleitungsrate:
              <span style={{ fontWeight:700, color: ENG_CLR[post.fwds]||C.textMute }}>{post.fwds}</span>
            </span>
          )}
          {!isWa && (
            <span style={{
              marginLeft:"auto", fontSize:10, fontWeight:700,
              color:"#16A34A", display:"flex", alignItems:"center", gap:2,
            }}>
              <TrendingUp size={9} strokeWidth={2.5}/>{post.growth}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const [activeSrc,    setActiveSrc]    = useState("all");
  const [articles,     setArticles]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [stale,        setStale]        = useState(false);
  const [fetchError,   setFetchError]   = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [socialTab,    setSocialTab]    = useState("instagram");
  const [viralTf,      setViralTf]      = useState("1h");
  const [seed,         setSeed]         = useState(0);
  const [autoRefresh,  setAutoRefresh]  = useState(true);
  const [nextIn,       setNextIn]       = useState(REFRESH_INTERVAL / 1000);
  const timerRef     = useRef();
  const countdownRef = useRef();
  const articlesRef  = useRef([]);
  articlesRef.current = articles;

  const instaTrends = buildInstaTrends(seed);
  const fbTrends    = buildFbTrends();

  const doFetch = useCallback(async (bg = false) => {
    setLoading(true); setFetchError(false);
    if (bg || articlesRef.current.length > 0) setStale(true);
    try {
      const src = NEWS_SOURCES.find(s => s.id === activeSrc);
      let items = [];
      if (src?.url) {
        items = await fetchFeed(src);
      } else {
        const sources = NEWS_SOURCES.filter(s => ALL_SOURCE_IDS.includes(s.id));
        const results = await Promise.allSettled(sources.map(fetchFeed));
        const flat = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
        flat.sort((a,b) => new Date(b.pubDate||0)-new Date(a.pubDate||0));
        const seen = new Set();
        items = flat.filter(a => {
          const k = a.title?.slice(0,50).toLowerCase();
          if (!k||seen.has(k)) return false; seen.add(k); return true;
        }).slice(0, 30);
      }
      if (items.length > 0) {
        setArticles(items); setLastUpdate(new Date()); setSeed(s => s+1); setFetchError(false);
      } else if (articlesRef.current.length === 0) setFetchError(true);
    } catch { if (articlesRef.current.length===0) setFetchError(true); }
    finally { setLoading(false); setStale(false); }
  }, [activeSrc]);

  useEffect(() => { doFetch(false); }, [doFetch]);

  useEffect(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); clearInterval(countdownRef.current); return; }
    setNextIn(REFRESH_INTERVAL/1000);
    timerRef.current     = setInterval(() => { doFetch(true); setNextIn(REFRESH_INTERVAL/1000); }, REFRESH_INTERVAL);
    countdownRef.current = setInterval(() => setNextIn(n => Math.max(0,n-1)), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current); };
  }, [autoRefresh, doFetch]);

  const fmtCountdown = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  // ── Pressespiegel panel ────────────────────────────────────────────────────
  const pressPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Source tabs */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", paddingBottom:12, borderBottom:`1px solid ${C.borderLight}`, flexShrink:0 }}>
        {NEWS_SOURCES.map(s => {
          const on = activeSrc === s.id;
          return (
            <button key={s.id} onClick={() => setActiveSrc(s.id)} style={{
              padding:"5px 12px", borderRadius:20, cursor:"pointer", fontFamily:FONT,
              fontSize:11.5, fontWeight:on?700:500, transition:"all .12s",
              border:`1.5px solid ${on?s.color:C.border}`,
              background:on?s.color:"transparent", color:on?"#fff":C.textMid,
            }}>{s.label}</button>
          );
        })}
      </div>

      {/* Loading bar */}
      <div style={{ height:2, background:C.borderLight, flexShrink:0, overflow:"hidden", marginBottom:2 }}>
        {loading && (
          <div style={{
            height:"100%", width:"40%", background:C.accent,
            backgroundImage:`linear-gradient(90deg, transparent 0%, ${C.accent} 50%, transparent 100%)`,
            backgroundSize:"200% 100%", animation:"shimmer 1.2s ease-in-out infinite",
          }}/>
        )}
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingTop:4 }}>
        {loading && articles.length === 0 && Array.from({length:7}).map((_,i) => (
          <div key={i} style={{ padding:"12px 0", borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ height:11, width:"14%", borderRadius:4, marginBottom:8, background:"#E9EAEC" }}/>
            <div style={{ height:15, width:"88%", borderRadius:4, marginBottom:5, background:"#E9EAEC" }}/>
            <div style={{ height:11, width:"55%", borderRadius:4, background:"#F3F4F6" }}/>
          </div>
        ))}

        {fetchError && articles.length === 0 && (
          <div style={{ padding:"40px 0", textAlign:"center" }}>
            <AlertCircle size={28} strokeWidth={1} style={{ margin:"0 auto 10px", display:"block", opacity:.4 }}/>
            <div style={{ fontSize:13, fontWeight:600, color:C.textSoft, marginBottom:6 }}>Feed nicht verfügbar</div>
            <div style={{ fontSize:11.5, color:C.textMute, marginBottom:16 }}>Diese Quelle lässt sich momentan nicht laden.</div>
            <button onClick={() => doFetch(false)} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.text, cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:600 }}>
              Erneut versuchen
            </button>
          </div>
        )}

        {articles.length > 0 && (
          <div style={{ opacity: stale ? 0.55 : 1, transition:"opacity .2s" }}>
            {articles.map((art, i) => {
              const srcObj = NEWS_SOURCES.find(s => s.label === art.sourceLabel);
              return (
                <a key={art.id||i} href={art.link} target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"11px 2px", borderBottom:i<articles.length-1?`1px solid ${C.borderLight}`:"none", textDecoration:"none", color:"inherit", borderRadius:6, transition:"background .1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ minWidth:22, fontSize:12, fontWeight:800, color:i<3?C.accent:C.textMute, fontFamily:FONT_DISPLAY, paddingTop:2, flexShrink:0, textAlign:"right" }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:srcObj?.color||C.textMute, background:(srcObj?.color||"#6B7280")+"18", borderRadius:4, padding:"1px 6px" }}>{art.sourceLabel}</span>
                      {art.pubDate && <span style={{ fontSize:10, color:C.textMute, display:"flex", alignItems:"center", gap:3 }}><Clock size={9} strokeWidth={2}/>vor {timeAgo(art.pubDate)}</span>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, lineHeight:1.4, marginBottom:art.description?4:0 }}>{art.title}</div>
                    {art.description && <div style={{ fontSize:11.5, color:C.textSoft, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{art.description}</div>}
                  </div>
                  {art.thumbnail && <img src={art.thumbnail} alt="" loading="lazy" style={{ width:56, height:44, objectFit:"cover", borderRadius:7, flexShrink:0 }} onError={e=>e.currentTarget.style.display="none"}/>}
                  <div style={{ color:C.textMute, paddingTop:2, flexShrink:0 }}><ExternalLink size={12} strokeWidth={1.5}/></div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Social Trends panel ────────────────────────────────────────────────────
  const socialTabs = [
    { id:"instagram", label:"Instagram", I:Instagram,     color:"#E1306C" },
    { id:"facebook",  label:"Facebook",  I:Facebook,      color:"#1877F2" },
    { id:"whatsapp",  label:"WhatsApp",  I:MessageCircle, color:"#25D366" },
  ];
  const activeSocialTab = socialTabs.find(t => t.id === socialTab);
  const viralPosts      = VIRAL_POSTS[socialTab]?.[viralTf] || [];

  const socialPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Platform tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.borderLight}`, flexShrink:0 }}>
        {socialTabs.map(t => {
          const on = socialTab === t.id;
          return (
            <button key={t.id} onClick={() => setSocialTab(t.id)} style={{
              flex:1, padding:"9px 4px", border:"none", background:"none", cursor:"pointer",
              fontFamily:FONT, fontSize:11, fontWeight:on?700:500,
              color:on?t.color:C.textMute,
              borderBottom:on?`2px solid ${t.color}`:"2px solid transparent",
              display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all .12s",
            }}>
              <t.I size={13} strokeWidth={IW}/>{t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingTop:12 }}>

        {/* ── Viral Posts ── */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Flame size={13} color="#EF4444" strokeWidth={2.5}/>
              <span style={{ fontFamily:FONT_DISPLAY, fontSize:12.5, fontWeight:700, color:C.text }}>Viral Posts</span>
            </div>
            {/* Timeframe filter */}
            <div style={{ display:"flex", gap:3 }}>
              {["1h","6h","24h"].map(tf => (
                <button key={tf} onClick={() => setViralTf(tf)} style={{
                  padding:"3px 9px", borderRadius:6, cursor:"pointer",
                  fontFamily:FONT, fontSize:10.5, fontWeight:viralTf===tf?700:500,
                  border:`1px solid ${viralTf===tf ? activeSocialTab.color : C.border}`,
                  background:viralTf===tf ? activeSocialTab.color+"18" : "transparent",
                  color:viralTf===tf ? activeSocialTab.color : C.textMute,
                  transition:"all .12s",
                }}>{tf}</button>
              ))}
            </div>
          </div>

          {viralPosts.map(post => (
            <ViralPostCard key={post.id} post={post} platform={socialTab} accent={activeSocialTab.color}/>
          ))}
        </div>

        {/* ── Compact Trending ── */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingTop:4, borderTop:`1px solid ${C.borderLight}` }}>
            <TrendingUp size={12} strokeWidth={2} color={C.textMute}/>
            <span style={{ fontSize:11.5, fontWeight:700, color:C.textMid }}>
              {socialTab === "instagram" ? "Trending Hashtags" : socialTab === "facebook" ? "Trending Topics" : "Viral Topics"}
            </span>
          </div>

          {socialTab === "instagram" && (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {instaTrends.map((item,i) => (
                <div key={item.tag} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7, background:i<3?"#FFF0F6":C.surface, border:`1px solid ${i<3?"#FCB8D4":C.border}` }}>
                  <span style={{ fontSize:10, fontWeight:800, color:i<3?"#E1306C":C.textMute, minWidth:16, fontFamily:FONT_DISPLAY }}>{i+1}</span>
                  <span style={{ flex:1, fontSize:12, fontWeight:700, color:"#E1306C" }}>{item.tag}</span>
                  <span style={{ fontSize:9.5, color:C.textMute }}>{item.posts}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:"#16A34A" }}>{item.d}</span>
                  {item.hot && <Flame size={9} color="#E1306C" strokeWidth={2.5}/>}
                </div>
              ))}
            </div>
          )}

          {socialTab === "facebook" && (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {fbTrends.map((item,i) => (
                <div key={item.topic} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7, background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${i<3?"#1877F2":C.border}` }}>
                  <span style={{ flex:1, fontSize:11.5, fontWeight:600, color:C.text }}>{item.topic}</span>
                  <span style={{ fontSize:9.5, fontWeight:700, color:ENG_CLR[item.engagement]||C.textMute, background:(ENG_CLR[item.engagement]||C.textMute)+"14", borderRadius:4, padding:"1px 6px" }}>{item.engagement}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:"#16A34A" }}>{item.change}</span>
                </div>
              ))}
            </div>
          )}

          {socialTab === "whatsapp" && (
            <div style={{ fontSize:10.5, color:C.textSoft, lineHeight:1.6, padding:"8px 10px", background:"#F0FDF4", borderRadius:8, border:"1px solid #A7F3D0" }}>
              WhatsApp-Daten basieren auf Korrelation öffentlicher Trend-Signale. Einzelne Nachrichten sind nicht einsehbar.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px 10px", flexShrink:0, borderBottom:`1px solid ${C.borderLight}`, background:"#fff" }}>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:C.text, letterSpacing:"-.3px" }}>Research</div>
          <div style={{ fontSize:11.5, color:C.textMute, marginTop:2, display:"flex", alignItems:"center", gap:8 }}>
            {lastUpdate ? (
              <>
                <span style={{ display:"flex", alignItems:"center", gap:3 }}><Wifi size={10} strokeWidth={2} color="#16A34A"/>Zuletzt: {lastUpdate.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</span>
                {autoRefresh && <span>· Refresh in {fmtCountdown(nextIn)}</span>}
              </>
            ) : loading ? <span>Lade…</span> : null}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setAutoRefresh(s => !s)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:20, cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight:600, transition:"all .12s", border:`1.5px solid ${autoRefresh?"#16A34A":C.border}`, background:autoRefresh?"#F0FDF4":"transparent", color:autoRefresh?"#16A34A":C.textMute }}>
            {autoRefresh ? <Wifi size={11} strokeWidth={2}/> : <WifiOff size={11} strokeWidth={2}/>}
            Auto-Refresh {autoRefresh?"an":"aus"}
          </button>
          <button onClick={() => { doFetch(true); setNextIn(REFRESH_INTERVAL/1000); }} disabled={loading} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:loading?C.textMute:C.text, cursor:loading?"default":"pointer", fontSize:12, fontWeight:600, fontFamily:FONT }}>
            <RefreshCw size={13} strokeWidth={2} style={{ animation:loading?"spin .8s linear infinite":"none" }}/>
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Two columns */}
      <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
        {/* LEFT: Pressespiegel */}
        <div style={{ flex:"0 0 58%", display:"flex", flexDirection:"column", overflow:"hidden", borderRight:`1px solid ${C.borderLight}`, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexShrink:0 }}>
            <Newspaper size={16} strokeWidth={IW} color={C.textMid}/>
            <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:14, color:C.text }}>Pressespiegel</span>
            {articles.length > 0 && <span style={{ fontSize:10, fontWeight:700, color:C.textMute, background:C.borderLight, borderRadius:10, padding:"1px 7px" }}>{articles.length} Artikel</span>}
            {loading && articles.length > 0 && <div style={{ width:14, height:14, border:`2px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", marginLeft:"auto" }}/>}
          </div>
          <div style={{ flex:1, overflow:"hidden" }}>{pressPanel}</div>
        </div>

        {/* RIGHT: Social Trends */}
        <div style={{ flex:"0 0 42%", display:"flex", flexDirection:"column", overflow:"hidden", padding:"16px 20px", background:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexShrink:0 }}>
            <TrendingUp size={16} strokeWidth={IW} color={C.textMid}/>
            <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:14, color:C.text }}>Social Trends</span>
          </div>
          <div style={{ flex:1, overflow:"hidden" }}>{socialPanel}</div>
        </div>
      </div>
    </div>
  );
}
