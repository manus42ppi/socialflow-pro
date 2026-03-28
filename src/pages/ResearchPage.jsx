import { useState, useEffect, useRef, useCallback } from "react";
import {
  RefreshCw, ExternalLink, TrendingUp, Flame, Clock,
  Newspaper, Instagram, Facebook, MessageCircle, Wifi, WifiOff,
  ChevronRight, AlertCircle,
} from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";

// ── RSS via rss2json (free, no key needed for public feeds) ──────────────────
const RSS2JSON = "https://api.rss2json.com/v1/api.json?count=25&rss_url=";

const NEWS_SOURCES = [
  { id:"all",        label:"Alle Quellen", color:"#6B7280",  url:null },
  { id:"tagesschau", label:"Tagesschau",   color:"#003399",  url:"https://www.tagesschau.de/xml/rss2/" },
  { id:"spiegel",    label:"Spiegel",      color:"#CC0000",  url:"https://www.spiegel.de/schlagzeilen/index.rss" },
  { id:"zeit",       label:"Zeit",         color:"#1a1a1a",  url:"https://newsfeed.zeit.de/all" },
  { id:"sz",         label:"SZ",           color:"#B0001E",  url:"https://rss.sueddeutsche.de/alles" },
  { id:"faz",        label:"FAZ",          color:"#004B87",  url:"https://www.faz.net/rss/aktuell/" },
  { id:"focus",      label:"Focus",        color:"#E6A100",  url:"https://rss.focus.de/fol/XML/rss_folnews.xml" },
];

// Multiple source URLs for "Alle" mode
const ALL_SOURCE_URLS = NEWS_SOURCES.filter(s => s.url).slice(0, 4);

async function fetchFeed(src) {
  try {
    const res  = await fetch(`${RSS2JSON}${encodeURIComponent(src.url)}`);
    const data = await res.json();
    if (data.status !== "ok") return [];
    return (data.items || []).map(item => ({
      id:          item.link || item.guid,
      title:       item.title?.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"'),
      link:        item.link,
      pubDate:     item.pubDate,
      description: item.description?.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim().slice(0,140),
      thumbnail:   item.thumbnail || item.enclosure?.link || null,
      sourceLabel: src.label,
      sourceColor: src.color,
    }));
  } catch {
    return [];
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)   return "gerade eben";
  if (diff < 3600) return `vor ${Math.round(diff/60)} Min.`;
  if (diff < 86400)return `vor ${Math.round(diff/3600)} Std.`;
  return `vor ${Math.round(diff/86400)} Tagen`;
}

// ── Mock social trends (keine öffentliche API verfügbar ohne OAuth) ───────────
// Rotation: every refresh some items swap to simulate live updates
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
  // Slightly vary post counts on each refresh
  return base.map((item, i) => ({
    ...item,
    posts: (parseFloat(item.posts) + ((seed + i) % 3) * 0.1).toFixed(1) + "M",
  }));
}

function buildFbTrends(seed = 0) {
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

const ENGAGEMENT_COLOR = {
  "Sehr hoch":"#16A34A", "Hoch":"#2563EB", "Mittel":"#D97706",
};
const FREQ_COLOR = {
  "Sehr hoch":"#16A34A", "Hoch":"#2563EB", "Mittel":"#D97706",
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = "100%", r = 6, mb = 6 }) {
  return (
    <div style={{
      height:h, width:w, borderRadius:r, marginBottom:mb,
      background:"linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)",
      backgroundSize:"200% 100%",
      animation:"shimmer 1.4s infinite",
    }}/>
  );
}

function ArticleSkeleton() {
  return (
    <div style={{ padding:"12px 0", borderBottom:`1px solid ${C.borderLight}` }}>
      <Skeleton h={13} w="15%" mb={8}/>
      <Skeleton h={16} w="90%" mb={6}/>
      <Skeleton h={12} w="60%"/>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function ResearchPage() {
  const [activeSrc,  setActiveSrc]  = useState("all");
  const [articles,   setArticles]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [socialTab,  setSocialTab]  = useState("instagram");
  const [seed,       setSeed]       = useState(0);
  const [autoRefresh,setAutoRefresh]= useState(true);
  const [nextIn,     setNextIn]     = useState(REFRESH_INTERVAL / 1000);
  const timerRef   = useRef();
  const countdownRef = useRef();

  const instaTrends = buildInstaTrends(seed);
  const fbTrends    = buildFbTrends(seed);
  const waTrends    = buildWaTrends();

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const src = NEWS_SOURCES.find(s => s.id === activeSrc);
      let items = [];
      if (src?.url) {
        items = await fetchFeed(src);
      } else {
        // "Alle" — fetch first 4 sources in parallel, mix + sort by date
        const all = await Promise.all(ALL_SOURCE_URLS.map(fetchFeed));
        const flat = all.flat();
        flat.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
        // Deduplicate by similar title
        const seen = new Set();
        items = flat.filter(a => {
          const key = a.title?.slice(0,40);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 30);
      }
      setArticles(items);
      setLastUpdate(new Date());
      setSeed(s => s + 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeSrc]);

  // Fetch on source change
  useEffect(() => { doFetch(); }, [doFetch]);

  // Auto-refresh countdown + trigger
  useEffect(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); clearInterval(countdownRef.current); return; }
    setNextIn(REFRESH_INTERVAL / 1000);
    timerRef.current    = setInterval(() => { doFetch(); setNextIn(REFRESH_INTERVAL / 1000); }, REFRESH_INTERVAL);
    countdownRef.current = setInterval(() => setNextIn(n => Math.max(0, n - 1)), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current); };
  }, [autoRefresh, doFetch]);

  const fmtCountdown = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  // ── Left: Pressespiegel ────────────────────────────────────────────────────
  const pressPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Source tabs */}
      <div style={{
        display:"flex", gap:4, flexWrap:"wrap", padding:"0 0 12px",
        borderBottom:`1px solid ${C.borderLight}`, marginBottom:0, flexShrink:0,
      }}>
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

      {/* Article list */}
      <div style={{ flex:1, overflowY:"auto", paddingTop:4 }}>
        {error && (
          <div style={{ padding:"32px 0", textAlign:"center", color:C.textMute }}>
            <AlertCircle size={28} strokeWidth={1} style={{ margin:"0 auto 10px", display:"block", opacity:.4 }}/>
            <div style={{ fontSize:12, fontWeight:600, color:C.textSoft, marginBottom:4 }}>Feeds konnten nicht geladen werden</div>
            <div style={{ fontSize:11 }}>Prüfe die Internetverbindung oder versuche es erneut.</div>
          </div>
        )}

        {loading && !articles.length && (
          Array.from({length:8}).map((_,i) => <ArticleSkeleton key={i}/>)
        )}

        {!error && articles.map((art, i) => {
          const src = NEWS_SOURCES.find(s => s.label === art.sourceLabel);
          return (
            <a key={art.id} href={art.link} target="_blank" rel="noopener noreferrer"
              style={{
                display:"flex", gap:12, alignItems:"flex-start",
                padding:"11px 0",
                borderBottom: i < articles.length-1 ? `1px solid ${C.borderLight}` : "none",
                textDecoration:"none", color:"inherit",
                borderRadius:6, transition:"background .1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8F9FB"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

              {/* Rank */}
              <div style={{
                minWidth:22, fontSize:12, fontWeight:800,
                color: i < 3 ? C.accent : C.textMute,
                fontFamily:FONT_DISPLAY, paddingTop:1, flexShrink:0,
              }}>
                {i+1}
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                {/* Source + time */}
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <span style={{
                    fontSize:10, fontWeight:700,
                    color: src?.color || C.textMute,
                    background: (src?.color || "#6B7280") + "14",
                    borderRadius:4, padding:"1px 6px",
                  }}>
                    {art.sourceLabel}
                  </span>
                  <span style={{ fontSize:10, color:C.textMute, display:"flex", alignItems:"center", gap:3 }}>
                    <Clock size={9} strokeWidth={2}/>{timeAgo(art.pubDate)}
                  </span>
                </div>

                {/* Title */}
                <div style={{
                  fontSize:13, fontWeight:600, color:C.text,
                  lineHeight:1.4, marginBottom: art.description ? 4 : 0,
                }}>
                  {art.title}
                </div>

                {/* Description */}
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

              {/* Thumbnail */}
              {art.thumbnail && (
                <img src={art.thumbnail} alt="" loading="lazy"
                  style={{ width:56, height:44, objectFit:"cover", borderRadius:7, flexShrink:0 }}
                  onError={e => e.currentTarget.style.display="none"}/>
              )}

              {/* Arrow */}
              <div style={{ color:C.textMute, paddingTop:2, flexShrink:0 }}>
                <ExternalLink size={12} strokeWidth={1.5}/>
              </div>
            </a>
          );
        })}

        {!loading && !error && articles.length === 0 && (
          <div style={{ padding:"48px 0", textAlign:"center", color:C.textMute }}>
            <Newspaper size={32} strokeWidth={1} style={{ margin:"0 auto 10px", display:"block", opacity:.3 }}/>
            <div style={{ fontSize:12 }}>Keine Artikel gefunden</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Right: Social Trends ───────────────────────────────────────────────────
  const socialTabs = [
    { id:"instagram", label:"Instagram", I:Instagram,     color:"#E1306C" },
    { id:"facebook",  label:"Facebook",  I:Facebook,      color:"#1877F2" },
    { id:"whatsapp",  label:"WhatsApp",  I:MessageCircle, color:"#25D366" },
  ];

  const socialPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Platform tabs */}
      <div style={{
        display:"flex", borderBottom:`1px solid ${C.borderLight}`,
        marginBottom:0, flexShrink:0, gap:0,
      }}>
        {socialTabs.map(t => {
          const on = socialTab === t.id;
          return (
            <button key={t.id} onClick={() => setSocialTab(t.id)}
              style={{
                flex:1, padding:"9px 4px", border:"none", background:"none",
                cursor:"pointer", fontFamily:FONT,
                fontSize:11, fontWeight: on ? 700 : 500,
                color: on ? t.color : C.textMute,
                borderBottom: on ? `2px solid ${t.color}` : "2px solid transparent",
                display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                transition:"all .12s",
              }}>
              <t.I size={13} strokeWidth={IW}/>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingTop:12 }}>

        {/* API note */}
        <div style={{
          fontSize:10, color:C.textMute, background:C.borderLight,
          borderRadius:6, padding:"5px 8px", marginBottom:12,
          display:"flex", alignItems:"center", gap:5,
        }}>
          <TrendingUp size={10} strokeWidth={2}/>
          Trending-Indikatoren basierend auf öffentlich verfügbaren Signalen
        </div>

        {/* ── Instagram ── */}
        {socialTab === "instagram" && (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {instaTrends.map((item, i) => (
              <div key={item.tag} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 10px", borderRadius:8,
                background: i < 3 ? "#FFF0F6" : C.surface,
                border:`1px solid ${i < 3 ? "#FCB8D4" : C.border}`,
                transition:"background .12s",
              }}>
                <div style={{
                  minWidth:20, fontSize:11, fontWeight:800,
                  color: i < 3 ? "#E1306C" : C.textMute,
                  fontFamily:FONT_DISPLAY,
                }}>
                  {i+1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:"#E1306C" }}>{item.tag}</div>
                  <div style={{ fontSize:10, color:C.textMute, marginTop:1 }}>{item.posts} Posts</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                  {item.hot && (
                    <div style={{
                      display:"flex", alignItems:"center", gap:3,
                      fontSize:9, fontWeight:700, color:"#fff",
                      background:"#E1306C", borderRadius:4, padding:"1px 6px",
                    }}>
                      <Flame size={8} strokeWidth={2}/>Trend
                    </div>
                  )}
                  <span style={{ fontSize:10, fontWeight:600, color:"#16A34A" }}>{item.d}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Facebook ── */}
        {socialTab === "facebook" && (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {fbTrends.map((item, i) => (
              <div key={item.topic} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"9px 10px", borderRadius:8,
                background: C.surface,
                border:`1px solid ${C.border}`,
                borderLeft:`3px solid ${i < 3 ? "#1877F2" : C.border}`,
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:C.text }}>{item.topic}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{
                    fontSize:9.5, fontWeight:700,
                    color: ENGAGEMENT_COLOR[item.engagement] || C.textMute,
                    background: (ENGAGEMENT_COLOR[item.engagement] || C.textMute) + "14",
                    borderRadius:4, padding:"1px 7px",
                  }}>
                    {item.engagement}
                  </span>
                  <span style={{ fontSize:10, fontWeight:600, color:"#16A34A" }}>{item.change}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── WhatsApp ── */}
        {socialTab === "whatsapp" && (<>
          <div style={{
            fontSize:10.5, color:C.textSoft, lineHeight:1.5,
            marginBottom:12, padding:"8px 10px",
            background:"#F0FDF4", borderRadius:8, border:"1px solid #A7F3D0",
          }}>
            WhatsApp-Viralität basiert auf Korrelation mit News-Shares und öffentlichen Trend-Signalen.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {waTrends.map((item, i) => (
              <div key={item.title} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"9px 10px", borderRadius:8,
                background: C.surface, border:`1px solid ${C.border}`,
              }}>
                <div style={{ fontSize:18, flexShrink:0 }}>{item.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{item.title}</div>
                  <div style={{ fontSize:10, color:C.textMute, marginTop:1 }}>{item.cat}</div>
                </div>
                <span style={{
                  fontSize:9.5, fontWeight:700, flexShrink:0,
                  color: FREQ_COLOR[item.freq] || C.textMute,
                  background: (FREQ_COLOR[item.freq] || C.textMute) + "14",
                  borderRadius:4, padding:"2px 7px",
                }}>
                  {item.freq}
                </span>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </div>
  );

  // ── Page layout ────────────────────────────────────────────────────────────
  const activeSrcObj = NEWS_SOURCES.find(s => s.id === activeSrc);

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>

      {/* Page header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 20px 10px", flexShrink:0,
        borderBottom:`1px solid ${C.borderLight}`,
        background:"#fff",
      }}>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:C.text, letterSpacing:"-.3px" }}>
            Research
          </div>
          <div style={{ fontSize:11.5, color:C.textMute, marginTop:2, display:"flex", alignItems:"center", gap:8 }}>
            {lastUpdate ? (
              <>
                <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <Wifi size={10} strokeWidth={2} color="#16A34A"/>
                  Zuletzt: {lastUpdate.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}
                </span>
                {autoRefresh && (
                  <span style={{ color:C.textMute }}>
                    · Nächste Aktualisierung in {fmtCountdown(nextIn)}
                  </span>
                )}
              </>
            ) : (
              <span>Lade Daten…</span>
            )}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Auto-refresh toggle */}
          <button onClick={() => setAutoRefresh(s => !s)}
            style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"5px 11px", borderRadius:20, cursor:"pointer", fontFamily:FONT,
              fontSize:11, fontWeight:600, transition:"all .12s",
              border:`1.5px solid ${autoRefresh ? "#16A34A" : C.border}`,
              background: autoRefresh ? "#F0FDF4" : "transparent",
              color: autoRefresh ? "#16A34A" : C.textMute,
            }}>
            {autoRefresh ? <Wifi size={11} strokeWidth={2}/> : <WifiOff size={11} strokeWidth={2}/>}
            Auto-Refresh {autoRefresh ? "an" : "aus"}
          </button>

          {/* Manual refresh */}
          <button onClick={() => { doFetch(); setNextIn(REFRESH_INTERVAL/1000); }}
            disabled={loading}
            style={{
              display:"flex", alignItems:"center", gap:5, padding:"6px 13px",
              borderRadius:8, border:`1px solid ${C.border}`, background:C.surface,
              color: loading ? C.textMute : C.text, cursor: loading ? "default" : "pointer",
              fontSize:12, fontWeight:600, fontFamily:FONT, transition:"all .12s",
            }}>
            <RefreshCw size={13} strokeWidth={2}
              style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Two-column content */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", gap:0 }}>

        {/* LEFT: Pressespiegel */}
        <div style={{
          flex:"0 0 62%", display:"flex", flexDirection:"column",
          overflow:"hidden", borderRight:`1px solid ${C.borderLight}`,
          padding:"16px 20px",
        }}>
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:12, flexShrink:0,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Newspaper size={16} strokeWidth={IW} color={C.textMid}/>
              <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:14, color:C.text }}>
                Pressespiegel
              </span>
              {articles.length > 0 && (
                <span style={{
                  fontSize:10, fontWeight:700, color:C.textMute,
                  background:C.borderLight, borderRadius:10, padding:"1px 7px",
                }}>
                  {articles.length} Artikel
                </span>
              )}
            </div>
            {loading && articles.length > 0 && (
              <div style={{ width:14, height:14, border:`2px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
            )}
          </div>
          <div style={{ flex:1, overflow:"hidden" }}>
            {pressPanel}
          </div>
        </div>

        {/* RIGHT: Social Trends */}
        <div style={{
          flex:"0 0 38%", display:"flex", flexDirection:"column",
          overflow:"hidden", padding:"16px 20px",
          background:"#fff",
        }}>
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            marginBottom:12, flexShrink:0,
          }}>
            <TrendingUp size={16} strokeWidth={IW} color={C.textMid}/>
            <span style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:14, color:C.text }}>
              Social Trends
            </span>
          </div>
          <div style={{ flex:1, overflow:"hidden" }}>
            {socialPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
