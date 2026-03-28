import { useState, useEffect, useRef, useCallback } from "react";
import {
  RefreshCw, ExternalLink, TrendingUp, Flame, Clock,
  Newspaper, Instagram, Facebook, MessageCircle, Wifi, WifiOff,
  AlertCircle,
} from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";

// ── Feed sources (only CORS-proxy-friendly feeds) ─────────────────────────────
// Paywalled sites (Spiegel, Zeit, FAZ, SZ) actively block all CORS proxies.
// We use public-broadcaster and open-web sources that reliably work.
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

// ── Fetch strategies ──────────────────────────────────────────────────────────
// Primary: own Cloudflare Pages Function at /rss?url= (server-side, no CORS issues)
// Fallback: rss2json.com then allorigins.win
const RSS_PROXY  = "/rss?url=";
const RSS2JSON   = "https://api.rss2json.com/v1/api.json?count=25&rss_url=";

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
      const txt  = tag => item.querySelector(tag)?.textContent?.trim() || "";
      const linkEl = item.querySelector("link");
      const link   = linkEl?.textContent?.trim() || linkEl?.getAttribute("href") || "";
      const thumb  =
        item.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
        item.querySelector("enclosure")?.getAttribute("url") ||
        item.getElementsByTagNameNS("http://search.yahoo.com/mrss/","thumbnail")[0]?.getAttribute("url") ||
        item.getElementsByTagNameNS("http://search.yahoo.com/mrss/","content")[0]?.getAttribute("url") ||
        null;
      const raw  = txt("description") || txt("summary") || txt("content");
      const desc = raw.replace(/<[^>]+>/g,"").replace(/&[a-z]+;/g," ").replace(/\s+/g," ").trim().slice(0,150);
      const title = (txt("title")||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
      return {
        id: link || txt("guid") || txt("id"),
        title, link,
        pubDate:     txt("pubDate") || txt("published") || txt("updated"),
        description: desc,
        thumbnail:   thumb,
        sourceLabel: src.label,
        sourceColor: src.color,
      };
    }).filter(a => a.title && a.link);
  } catch { return []; }
}

async function fetchFeed(src) {
  // Strategy 1: own CF Pages Function /rss?url= (server-side, always works)
  try {
    const { signal, clear } = withTimeout(10000);
    const res  = await fetch(`${RSS_PROXY}${encodeURIComponent(src.url)}`, { signal });
    clear();
    if (res.ok) {
      const xml   = await res.text();
      const items = parseRssXml(xml, src);
      if (items.length) return items;
    }
  } catch { /* fall through */ }

  // Strategy 2: rss2json.com (structured JSON)
  try {
    const { signal, clear } = withTimeout(8000);
    const res  = await fetch(`${RSS2JSON}${encodeURIComponent(src.url)}`, { signal });
    clear();
    const data = await res.json();
    if (data.status === "ok" && data.items?.length) {
      return data.items.map(item => ({
        id:          item.link || item.guid,
        title:       (item.title||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim(),
        link:        item.link,
        pubDate:     item.pubDate,
        description: (item.description||"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim().slice(0,150),
        thumbnail:   item.thumbnail || item.enclosure?.link || null,
        sourceLabel: src.label,
        sourceColor: src.color,
      })).filter(a => a.title && a.link);
    }
  } catch { /* fall through */ }

  // Strategy 3: allorigins.win JSON
  try {
    const { signal, clear } = withTimeout(10000);
    const res  = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(src.url)}`, { signal });
    clear();
    const json = await res.json();
    if (json?.contents) {
      const items = parseRssXml(json.contents, src);
      if (items.length) return items;
    }
  } catch { /* fall through */ }

  return [];
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  if (isNaN(d)) return "";
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)    return "gerade eben";
  if (diff < 3600)  return `vor ${Math.round(diff/60)} Min.`;
  if (diff < 86400) return `vor ${Math.round(diff/3600)} Std.`;
  return `vor ${Math.round(diff/86400)} Tagen`;
}

// ── Mock social trends ────────────────────────────────────────────────────────
function buildInstaTrends(seed = 0) {
  const base = [
    { tag:"#sustainability",   posts:"14.2M", d:"+21%", hot:true },
    { tag:"#ai",               posts:"9.8M",  d:"+38%", hot:true },
    { tag:"#contentcreator",   posts:"7.4M",  d:"+28%", hot:true },
    { tag:"#wellness",         posts:"6.1M",  d:"+14%" },
    { tag:"#digitalmarketing", posts:"5.2M",  d:"+11%" },
    { tag:"#entrepreneur",     posts:"4.7M",  d:"+9%"  },
    { tag:"#mentalhealth",     posts:"4.3M",  d:"+17%" },
    { tag:"#smallbusiness",    posts:"3.8M",  d:"+8%"  },
    { tag:"#reels",            posts:"3.2M",  d:"+6%"  },
    { tag:"#motivation",       posts:"2.9M",  d:"+5%"  },
    { tag:"#fashion",          posts:"2.6M",  d:"+4%"  },
    { tag:"#foodie",           posts:"2.1M",  d:"+3%"  },
  ];
  return base.map((item, i) => ({
    ...item,
    posts: (parseFloat(item.posts) + ((seed + i) % 3) * 0.1).toFixed(1) + "M",
  }));
}

function buildFbTrends() {
  return [
    { topic:"KI & Technologie",        engagement:"Sehr hoch", change:"+34%" },
    { topic:"Wirtschaft & Finanzen",   engagement:"Sehr hoch", change:"+18%" },
    { topic:"Gesundheit & Vorsorge",   engagement:"Hoch",      change:"+14%" },
    { topic:"Politik & Gesellschaft",  engagement:"Hoch",      change:"+12%" },
    { topic:"Lokale Nachrichten",      engagement:"Hoch",      change:"+10%" },
    { topic:"Sport & Fitness",         engagement:"Mittel",    change:"+7%"  },
    { topic:"Familie & Erziehung",     engagement:"Mittel",    change:"+6%"  },
    { topic:"Reise & Urlaub",          engagement:"Mittel",    change:"+5%"  },
  ];
}

function buildWaTrends() {
  return [
    { title:"Energiepreise & Haushalt",       freq:"Sehr hoch",  cat:"Wirtschaft", icon:"💡" },
    { title:"KI-Tools im Alltag",             freq:"Sehr hoch",  cat:"Tech",       icon:"🤖" },
    { title:"Gesundheitstipps der Woche",     freq:"Hoch",       cat:"Gesundheit", icon:"💚" },
    { title:"Aktuelle Sicherheitswarnungen",  freq:"Hoch",       cat:"Sicherheit", icon:"⚠️" },
    { title:"Politische Entwicklungen",       freq:"Hoch",       cat:"Politik",    icon:"🏛️" },
    { title:"Lokale Community-Infos",         freq:"Mittel",     cat:"Community",  icon:"📍" },
    { title:"Rabatte & Angebote",             freq:"Mittel",     cat:"Shopping",   icon:"🛍️" },
  ];
}

const ENGAGEMENT_COLOR = { "Sehr hoch":"#16A34A", "Hoch":"#2563EB", "Mittel":"#D97706" };

// ── Page ──────────────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function ResearchPage() {
  const [activeSrc,   setActiveSrc]   = useState("all");
  const [articles,    setArticles]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [stale,       setStale]       = useState(false);   // has old data while loading
  const [fetchError,  setFetchError]  = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState(null);
  const [socialTab,   setSocialTab]   = useState("instagram");
  const [seed,        setSeed]        = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nextIn,      setNextIn]      = useState(REFRESH_INTERVAL / 1000);
  const timerRef     = useRef();
  const countdownRef = useRef();
  const articlesRef  = useRef([]);
  articlesRef.current = articles;

  const instaTrends = buildInstaTrends(seed);
  const fbTrends    = buildFbTrends();
  const waTrends    = buildWaTrends();

  const doFetch = useCallback(async (background = false) => {
    setLoading(true);
    setFetchError(false);
    // Background: keep existing articles visible (mark as stale)
    if (background || articlesRef.current.length > 0) {
      setStale(true);
    }
    try {
      const src = NEWS_SOURCES.find(s => s.id === activeSrc);
      let items = [];
      if (src?.url) {
        items = await fetchFeed(src);
      } else {
        const sources = NEWS_SOURCES.filter(s => ALL_SOURCE_IDS.includes(s.id));
        const results = await Promise.allSettled(sources.map(fetchFeed));
        const flat = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
        flat.sort((a,b) => new Date(b.pubDate||0) - new Date(a.pubDate||0));
        const seen = new Set();
        items = flat.filter(a => {
          const key = a.title?.slice(0,50).toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 30);
      }
      if (items.length > 0) {
        setArticles(items);
        setLastUpdate(new Date());
        setSeed(s => s + 1);
        setFetchError(false);
      } else {
        // No items: keep old articles, show error banner only if we had nothing before
        if (articlesRef.current.length === 0) setFetchError(true);
      }
    } catch {
      if (articlesRef.current.length === 0) setFetchError(true);
    } finally {
      setLoading(false);
      setStale(false);
    }
  }, [activeSrc]);

  // Fetch on source change – always background if we already have articles
  useEffect(() => { doFetch(false); }, [doFetch]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); clearInterval(countdownRef.current); return; }
    setNextIn(REFRESH_INTERVAL / 1000);
    timerRef.current     = setInterval(() => { doFetch(true); setNextIn(REFRESH_INTERVAL / 1000); }, REFRESH_INTERVAL);
    countdownRef.current = setInterval(() => setNextIn(n => Math.max(0, n - 1)), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current); };
  }, [autoRefresh, doFetch]);

  const fmtCountdown = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  // ── Pressespiegel ───────────────────────────────────────────────────────────
  const pressPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Source tabs */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", paddingBottom:12, borderBottom:`1px solid ${C.borderLight}`, flexShrink:0 }}>
        {NEWS_SOURCES.map(s => {
          const on = activeSrc === s.id;
          return (
            <button key={s.id} onClick={() => setActiveSrc(s.id)}
              style={{
                padding:"5px 12px", borderRadius:20, cursor:"pointer", fontFamily:FONT,
                fontSize:11.5, fontWeight: on ? 700 : 500, transition:"all .12s",
                border:`1.5px solid ${on ? s.color : C.border}`,
                background: on ? s.color : "transparent",
                color: on ? "#fff" : C.textMid,
              }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Thin loading bar */}
      <div style={{
        height: 2, background:C.borderLight, flexShrink:0, overflow:"hidden",
        marginBottom: 2,
      }}>
        {loading && (
          <div style={{
            height:"100%", width:"40%", background:C.accent,
            animation:"shimmer 1.2s ease-in-out infinite",
            backgroundImage:`linear-gradient(90deg, transparent 0%, ${C.accent} 50%, transparent 100%)`,
            backgroundSize:"200% 100%",
          }}/>
        )}
      </div>

      {/* Article list */}
      <div style={{ flex:1, overflowY:"auto", paddingTop:4 }}>

        {/* First-load skeleton (no articles yet) */}
        {loading && articles.length === 0 && (
          Array.from({length:8}).map((_,i) => (
            <div key={i} style={{ padding:"12px 0", borderBottom:`1px solid ${C.borderLight}` }}>
              <div style={{ height:11, width:"14%", borderRadius:4, marginBottom:8, background:"#E9EAEC" }}/>
              <div style={{ height:15, width:"88%", borderRadius:4, marginBottom:5, background:"#E9EAEC" }}/>
              <div style={{ height:11, width:"55%", borderRadius:4, background:"#F3F4F6" }}/>
            </div>
          ))
        )}

        {/* Empty + error (no old data to show) */}
        {fetchError && articles.length === 0 && (
          <div style={{ padding:"40px 0", textAlign:"center", color:C.textMute }}>
            <AlertCircle size={28} strokeWidth={1} style={{ margin:"0 auto 10px", display:"block", opacity:.4 }}/>
            <div style={{ fontSize:13, fontWeight:600, color:C.textSoft, marginBottom:6 }}>Feed nicht verfügbar</div>
            <div style={{ fontSize:11.5, marginBottom:16 }}>Diese Quelle lässt sich momentan nicht laden.</div>
            <button onClick={() => doFetch(false)}
              style={{
                padding:"7px 16px", borderRadius:8, border:`1px solid ${C.border}`,
                background:C.surface, color:C.text, cursor:"pointer",
                fontFamily:FONT, fontSize:12, fontWeight:600,
              }}>
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Articles (stale = slightly dimmed while background-loading) */}
        {articles.length > 0 && (
          <div style={{ opacity: stale ? 0.55 : 1, transition:"opacity .2s" }}>
            {articles.map((art, i) => {
              const srcObj = NEWS_SOURCES.find(s => s.label === art.sourceLabel);
              return (
                <a key={art.id || i} href={art.link} target="_blank" rel="noopener noreferrer"
                  style={{
                    display:"flex", gap:12, alignItems:"flex-start",
                    padding:"11px 2px",
                    borderBottom: i < articles.length-1 ? `1px solid ${C.borderLight}` : "none",
                    textDecoration:"none", color:"inherit",
                    borderRadius:6, transition:"background .1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                  <div style={{
                    minWidth:22, fontSize:12, fontWeight:800,
                    color: i < 3 ? C.accent : C.textMute,
                    fontFamily:FONT_DISPLAY, paddingTop:2, flexShrink:0, textAlign:"right",
                  }}>
                    {i+1}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                      <span style={{
                        fontSize:10, fontWeight:700,
                        color: srcObj?.color || C.textMute,
                        background: (srcObj?.color || "#6B7280") + "18",
                        borderRadius:4, padding:"1px 6px",
                      }}>
                        {art.sourceLabel}
                      </span>
                      {art.pubDate && (
                        <span style={{ fontSize:10, color:C.textMute, display:"flex", alignItems:"center", gap:3 }}>
                          <Clock size={9} strokeWidth={2}/>{timeAgo(art.pubDate)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize:13, fontWeight:600, color:C.text, lineHeight:1.4,
                      marginBottom: art.description ? 4 : 0,
                    }}>
                      {art.title}
                    </div>
                    {art.description && (
                      <div style={{
                        fontSize:11.5, color:C.textSoft, lineHeight:1.5,
                        overflow:"hidden", display:"-webkit-box",
                        WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                      }}>
                        {art.description}
                      </div>
                    )}
                  </div>

                  {art.thumbnail && (
                    <img src={art.thumbnail} alt="" loading="lazy"
                      style={{ width:56, height:44, objectFit:"cover", borderRadius:7, flexShrink:0 }}
                      onError={e => { e.currentTarget.style.display="none"; }}/>
                  )}
                  <div style={{ color:C.textMute, paddingTop:2, flexShrink:0 }}>
                    <ExternalLink size={12} strokeWidth={1.5}/>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Social Trends ───────────────────────────────────────────────────────────
  const socialTabs = [
    { id:"instagram", label:"Instagram", I:Instagram,     color:"#E1306C" },
    { id:"facebook",  label:"Facebook",  I:Facebook,      color:"#1877F2" },
    { id:"whatsapp",  label:"WhatsApp",  I:MessageCircle, color:"#25D366" },
  ];

  const socialPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", borderBottom:`1px solid ${C.borderLight}`, flexShrink:0 }}>
        {socialTabs.map(t => {
          const on = socialTab === t.id;
          return (
            <button key={t.id} onClick={() => setSocialTab(t.id)}
              style={{
                flex:1, padding:"9px 4px", border:"none", background:"none",
                cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight: on ? 700 : 500,
                color: on ? t.color : C.textMute,
                borderBottom: on ? `2px solid ${t.color}` : "2px solid transparent",
                display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                transition:"all .12s",
              }}>
              <t.I size={13} strokeWidth={IW}/>{t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingTop:12 }}>
        <div style={{
          fontSize:10, color:C.textMute, background:C.borderLight,
          borderRadius:6, padding:"5px 8px", marginBottom:12,
          display:"flex", alignItems:"center", gap:5,
        }}>
          <TrendingUp size={10} strokeWidth={2}/>
          Basierend auf öffentlich verfügbaren Trend-Signalen
        </div>

        {socialTab === "instagram" && (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {instaTrends.map((item, i) => (
              <div key={item.tag} style={{
                display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8,
                background: i < 3 ? "#FFF0F6" : C.surface,
                border:`1px solid ${i < 3 ? "#FCB8D4" : C.border}`,
              }}>
                <div style={{ minWidth:20, fontSize:11, fontWeight:800, color: i < 3 ? "#E1306C" : C.textMute, fontFamily:FONT_DISPLAY }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:"#E1306C" }}>{item.tag}</div>
                  <div style={{ fontSize:10, color:C.textMute, marginTop:1 }}>{item.posts} Posts</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                  {item.hot && (
                    <div style={{ display:"flex", alignItems:"center", gap:3, fontSize:9, fontWeight:700, color:"#fff", background:"#E1306C", borderRadius:4, padding:"1px 6px" }}>
                      <Flame size={8} strokeWidth={2}/>Trend
                    </div>
                  )}
                  <span style={{ fontSize:10, fontWeight:600, color:"#16A34A" }}>{item.d}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {socialTab === "facebook" && (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {fbTrends.map((item, i) => (
              <div key={item.topic} style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:8,
                background:C.surface, border:`1px solid ${C.border}`,
                borderLeft:`3px solid ${i < 3 ? "#1877F2" : C.border}`,
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:C.text }}>{item.topic}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{ fontSize:9.5, fontWeight:700, color: ENGAGEMENT_COLOR[item.engagement]||C.textMute, background:(ENGAGEMENT_COLOR[item.engagement]||C.textMute)+"14", borderRadius:4, padding:"1px 7px" }}>{item.engagement}</span>
                  <span style={{ fontSize:10, fontWeight:600, color:"#16A34A" }}>{item.change}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {socialTab === "whatsapp" && (<>
          <div style={{ fontSize:10.5, color:C.textSoft, lineHeight:1.5, marginBottom:12, padding:"8px 10px", background:"#F0FDF4", borderRadius:8, border:"1px solid #A7F3D0" }}>
            Viralität basiert auf Korrelation mit News-Shares und öffentlichen Trend-Signalen.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {waTrends.map(item => (
              <div key={item.title} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:8, background:C.surface, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:18, flexShrink:0 }}>{item.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{item.title}</div>
                  <div style={{ fontSize:10, color:C.textMute, marginTop:1 }}>{item.cat}</div>
                </div>
                <span style={{ fontSize:9.5, fontWeight:700, flexShrink:0, color:ENGAGEMENT_COLOR[item.freq]||C.textMute, background:(ENGAGEMENT_COLOR[item.freq]||C.textMute)+"14", borderRadius:4, padding:"2px 7px" }}>{item.freq}</span>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </div>
  );

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>

      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 20px 10px", flexShrink:0,
        borderBottom:`1px solid ${C.borderLight}`, background:"#fff",
      }}>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:C.text, letterSpacing:"-.3px" }}>Research</div>
          <div style={{ fontSize:11.5, color:C.textMute, marginTop:2, display:"flex", alignItems:"center", gap:8 }}>
            {lastUpdate ? (
              <>
                <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <Wifi size={10} strokeWidth={2} color="#16A34A"/>
                  Zuletzt: {lastUpdate.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}
                </span>
                {autoRefresh && <span>· Refresh in {fmtCountdown(nextIn)}</span>}
              </>
            ) : loading ? <span>Lade…</span> : null}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setAutoRefresh(s => !s)}
            style={{
              display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:20,
              cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight:600, transition:"all .12s",
              border:`1.5px solid ${autoRefresh ? "#16A34A" : C.border}`,
              background: autoRefresh ? "#F0FDF4" : "transparent",
              color: autoRefresh ? "#16A34A" : C.textMute,
            }}>
            {autoRefresh ? <Wifi size={11} strokeWidth={2}/> : <WifiOff size={11} strokeWidth={2}/>}
            Auto-Refresh {autoRefresh ? "an" : "aus"}
          </button>

          <button onClick={() => { doFetch(true); setNextIn(REFRESH_INTERVAL/1000); }}
            disabled={loading}
            style={{
              display:"flex", alignItems:"center", gap:5, padding:"6px 13px",
              borderRadius:8, border:`1px solid ${C.border}`, background:C.surface,
              color: loading ? C.textMute : C.text, cursor: loading ? "default" : "pointer",
              fontSize:12, fontWeight:600, fontFamily:FONT, transition:"all .12s",
            }}>
            <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
            Aktualisieren
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
        <div style={{ flex:"0 0 62%", display:"flex", flexDirection:"column", overflow:"hidden", borderRight:`1px solid ${C.borderLight}`, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Newspaper size={16} strokeWidth={IW} color={C.textMid}/>
              <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:14, color:C.text }}>Pressespiegel</span>
              {articles.length > 0 && (
                <span style={{ fontSize:10, fontWeight:700, color:C.textMute, background:C.borderLight, borderRadius:10, padding:"1px 7px" }}>
                  {articles.length} Artikel
                </span>
              )}
            </div>
          </div>
          <div style={{ flex:1, overflow:"hidden" }}>{pressPanel}</div>
        </div>

        <div style={{ flex:"0 0 38%", display:"flex", flexDirection:"column", overflow:"hidden", padding:"16px 20px", background:"#fff" }}>
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
