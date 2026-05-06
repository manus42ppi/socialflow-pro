import { useState } from "react";
import {
  RefreshCw, ExternalLink, AlertCircle, CheckCircle,
  Calendar, Sparkles, Zap, Play, Activity,
  Instagram, Facebook, Linkedin, Twitter, Youtube, Music2,
} from "lucide-react";
import { C, T, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { Card, Btn } from "../components/ui/index.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanDomainStr(s) {
  return s.trim().replace(/^https?:\/\/(www\.)?/, "").split("/")[0].replace(/\/$/, "").toLowerCase();
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SI_PLATFORMS = [
  { key:"linkedin",  label:"LinkedIn",    Icon:Linkedin,  color:"#0A66C2" },
  { key:"twitter",   label:"X / Twitter", Icon:Twitter,   color:"#000000" },
  { key:"instagram", label:"Instagram",   Icon:Instagram, color:"#E1306C" },
  { key:"facebook",  label:"Facebook",    Icon:Facebook,  color:"#1877F2" },
  { key:"youtube",   label:"YouTube",     Icon:Youtube,   color:"#FF0000" },
  { key:"tiktok",    label:"TikTok",      Icon:Music2,    color:"#010101" },
];
const SI_MATURITY = {
  beginner:    { label:"Einsteiger",   color:"#ef4444" },
  developing:  { label:"Aufbauend",    color:"#f59e0b" },
  established: { label:"Etabliert",    color:"#3b82f6" },
  leader:      { label:"Marktführer",  color:"#22c55e" },
};
const SI_SOURCE_BADGES = {
  website_crawl:           { label:"Website",         color:"#0A66C2", bg:"#0A66C218" },
  youtube_rss:             { label:"YouTube RSS",      color:"#FF0000", bg:"#FF000018" },
  linkedin_public:         { label:"LinkedIn",         color:"#0A66C2", bg:"#0A66C218" },
  ai_estimate_real_handle: { label:"KI (echtes Handle)",color:"#7c3aed",bg:"#7c3aed18" },
  ai_estimate:             { label:"KI-Schätzung",    color:"#6b7280", bg:"#6b728018" },
};

function siFmt(n) {
  if (!n&&n!==0) return "–";
  if (n>=1_000_000) return (n/1_000_000).toFixed(1)+"M";
  if (n>=1_000)     return (n/1_000).toFixed(1)+"K";
  return String(n);
}
function siDaysSince(d) { if (!d) return null; return Math.floor((Date.now()-new Date(d).getTime())/86_400_000); }
function siActivity(days) {
  if (days===null) return { label:"Unbekannt",     color:C.textSoft };
  if (days<=3)   return { label:"Täglich aktiv", color:"#22c55e" };
  if (days<=7)   return { label:"Sehr aktiv",    color:"#22c55e" };
  if (days<=30)  return { label:"Aktiv",          color:"#84cc16" };
  if (days<=90)  return { label:"Wenig aktiv",   color:"#f59e0b" };
  return            { label:"Inaktiv",          color:"#ef4444" };
}

function SIPlatformCard({ platform, profile, metrics, onAddHandle }) {
  const { Icon, label, color } = SI_PLATFORMS.find(p=>p.key===platform);
  const has   = !!profile?.url;
  const days  = siDaysSince(metrics?.last_post);
  const act   = siActivity(days);
  const [inputVal,  setInputVal]  = useState("");
  const [inputOpen, setInputOpen] = useState(false);
  const sb = SI_SOURCE_BADGES[metrics?.source||profile?.source] || SI_SOURCE_BADGES.ai_estimate;

  return (
    <div style={{ background:C.surface, border:`1px solid ${has?color+"30":C.border}`, borderRadius:T.rLg, padding:16, display:"flex", flexDirection:"column", gap:10, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:has?color:C.border, borderRadius:`${T.rLg}px ${T.rLg}px 0 0` }}/>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:T.rMd, background:has?color+"18":C.border+"40", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon size={15} strokeWidth={IW} color={has?color:C.textSoft}/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:has?C.text:C.textSoft }}>{label}</span>
        </div>
        {has ? (
          <div style={{ fontSize:10, fontWeight:700, borderRadius:20, padding:"2px 8px", color:act.color, background:act.color+"18" }}>{act.label}</div>
        ) : (
          <div style={{ fontSize:10, fontWeight:600, borderRadius:20, padding:"2px 8px", color:"#b45309", background:"#fef3c7" }}>Nicht verlinkt</div>
        )}
      </div>

      {has ? (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <a href={profile.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color, textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>
              @{profile.handle}<ExternalLink size={10} strokeWidth={IW}/>
            </a>
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20, color:sb.color, background:sb.bg }}>{sb.label}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {[{ val:siFmt(metrics?.followers), lbl:"Follower" },{ val:metrics?.engagement_rate!=null?(metrics.engagement_rate*100).toFixed(1)+"%":"–", lbl:"Engagement" },{ val:metrics?.posts_per_month??"–", lbl:"Posts/Mo" }].map(({val,lbl}) => (
              <div key={lbl} style={{ textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:800, fontFamily:FONT_DISPLAY, color:C.text }}>{val}</div>
                <div style={{ fontSize:9, color:C.textSoft, marginTop:2, textTransform:"uppercase", letterSpacing:"0.04em" }}>{lbl}</div>
              </div>
            ))}
          </div>
          {metrics?.posts_per_month!=null && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                <div style={{ width:`${Math.min((metrics.posts_per_month/30)*100,100)}%`, height:"100%",
                  background:metrics.posts_per_month>=8?"#22c55e":metrics.posts_per_month>=3?"#f59e0b":"#ef4444",
                  borderRadius:3, transition:"width 0.6s ease" }}/>
              </div>
              <span style={{ fontSize:11, color:C.textMid, fontWeight:600, whiteSpace:"nowrap" }}>{metrics.posts_per_month}/Mo</span>
            </div>
          )}
          {metrics?.last_post && (
            <div style={{ display:"flex", alignItems:"center", gap:5, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
              <Calendar size={11} strokeWidth={IW} color={C.textSoft}/>
              <span style={{ fontSize:11, color:C.textSoft }}>
                Letzter Post: {days===0?"Heute":days===1?"Gestern":days!==null?`vor ${days} Tagen`:"–"}
              </span>
            </div>
          )}
          {platform==="youtube" && metrics?.recentVideos?.length > 0 && (
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, display:"flex", flexDirection:"column", gap:6 }}>
              <span style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:"0.04em" }}>Letzte Videos ({metrics.last30Days||0} in 30 Tagen)</span>
              {metrics.recentVideos.slice(0,3).map((v,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <div style={{ width:28, height:20, borderRadius:4, background:"#FF000020", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Play size={10} strokeWidth={IW} color="#FF0000" fill="#FF0000"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {v.url ? (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:C.text, textDecoration:"none", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{v.title}</a>
                    ) : <span style={{ fontSize:11, color:C.textMid }}>{v.title}</span>}
                    <div style={{ display:"flex", gap:8, marginTop:2 }}>
                      <span style={{ fontSize:10, color:C.textSoft }}>{v.published ? new Date(v.published).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"}) : ""}</span>
                      {v.views && <span style={{ fontSize:10, color:C.textSoft }}>{v.views>=1_000_000?(v.views/1_000_000).toFixed(1)+"M Views":v.views>=1_000?(v.views/1_000).toFixed(1)+"K Views":v.views+" Views"}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ background:"#fef3c720", border:"1px solid #fcd34d40", borderRadius:T.rMd, padding:"10px 12px" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#92400e", marginBottom:3 }}>Kein Link auf Website gefunden</div>
            <div style={{ fontSize:11, color:"#b45309", lineHeight:1.5 }}>Kein {label}-Link auf der Website verlinkt.</div>
          </div>
          {inputOpen ? (
            <div style={{ display:"flex", gap:6 }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:T.rMd, border:`1px solid ${color}50`, background:C.bg, fontSize:12 }}>
                <span style={{ color:C.textSoft, fontSize:13 }}>@</span>
                <input autoFocus value={inputVal} onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key==="Enter"&&inputVal.trim()) { onAddHandle(platform,inputVal.trim().replace(/^@/,"")); setInputOpen(false); setInputVal(""); }
                    if (e.key==="Escape") { setInputOpen(false); setInputVal(""); }
                  }}
                  placeholder={`${label}-Handle`}
                  style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:12, color:C.text, fontFamily:FONT }}/>
              </div>
              <button onClick={() => { if(inputVal.trim()) onAddHandle(platform,inputVal.trim().replace(/^@/,"")); setInputOpen(false); setInputVal(""); }}
                style={{ padding:"6px 12px", borderRadius:T.rMd, border:"none", background:color, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>OK</button>
              <button onClick={() => { setInputOpen(false); setInputVal(""); }}
                style={{ padding:"6px 10px", borderRadius:T.rMd, border:`1px solid ${C.border}`, background:C.surface, color:C.textSoft, fontSize:12, cursor:"pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setInputOpen(true)}
              style={{ padding:"7px 12px", borderRadius:T.rMd, border:`1px dashed ${color}50`, background:color+"08", color, fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
              <span style={{ fontSize:15, lineHeight:1 }}>+</span> Handle manuell eingeben
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SocialIntelligencePage() {
  const [domain,          setDomain]          = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [result,          setResult]          = useState(null);
  const [compDomain,      setCompDomain]      = useState("");
  const [compLoading,     setCompLoading]     = useState(false);
  const [compError,       setCompError]       = useState(null);
  const [compResult,      setCompResult]      = useState(null);
  const [insights,        setInsights]        = useState(null);
  const [insLoading,      setInsLoading]      = useState(false);
  const [manualHandles,   setManualHandles]   = useState({});
  const [manualLoading,   setManualLoading]   = useState({});

  async function fetchSocial(d) {
    const r = await fetch("/social-analyze", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({domain:d}), signal:AbortSignal.timeout(90000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  async function run() {
    const d = cleanDomainStr(domain);
    if (!d) return;
    setLoading(true); setError(null); setResult(null); setCompResult(null); setInsights(null);
    try {
      const data = await fetchSocial(d);
      setResult(data);
      setInsLoading(true);
      loadInsights(d, data, null, null).then(ins => { if(ins) setInsights(ins); }).finally(() => setInsLoading(false));
    } catch(e) {
      setError(e.name==="TimeoutError"?"Zeitüberschreitung (90s) – bitte nochmal versuchen":"Analyse fehlgeschlagen: "+e.message);
    } finally { setLoading(false); }
  }

  async function runCompare() {
    const cd = cleanDomainStr(compDomain);
    if (!cd||!result) return;
    setCompLoading(true); setCompError(null); setInsights(null);
    try {
      const data = await fetchSocial(cd);
      setCompResult(data);
      setInsLoading(true);
      loadInsights(domain, result, cd, data).then(ins => { if(ins) setInsights(ins); }).finally(() => setInsLoading(false));
    } catch(e) { setCompError("Wettbewerber-Analyse fehlgeschlagen: "+e.message); }
    finally { setCompLoading(false); }
  }

  async function loadInsights(d, res, cd, compRes) {
    const pText = Object.entries(res.profiles||{}).filter(([,p])=>p?.url).map(([p,dd])=>`${p}: @${dd.handle}`).join(", ")||"keine";
    const mText = Object.entries(res.metrics||{}).filter(([,m])=>m?.followers||m?.posts_per_month).map(([p,m])=>`${p}: ${m.followers?siFmt(m.followers)+" Follower":""} ${m.posts_per_month?m.posts_per_month+" Posts/Mo":""}`).join("; ");
    const compText = compRes ? `\nWettbewerber "${cd}": ${JSON.stringify(compRes.metrics)}` : "";
    const prompt = `Analysiere die Social-Media-Präsenz von "${d}" als Marketing-Strategieberater.\nProfile: ${pText}\nMetriken: ${mText}${compText}\n\nGib 3 konkrete Stärken, 3 Handlungslücken und 3 sofort umsetzbare Quick Wins.\nReturn ONLY valid JSON (no markdown):\n{"strengths":["...","...","..."],"gaps":["...","...","..."],"quick_wins":["...","...","..."]}`;
    try {
      const r = await fetch("/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:[{role:"user",content:prompt}], max_tokens:800 }), signal:AbortSignal.timeout(40000) });
      if (!r.ok) return null;
      const d2 = await r.json();
      const text = d2.content?.[0]?.text ?? "";
      const m = text.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    } catch { return null; }
  }

  async function handleAddHandle(platform, handle) {
    if (!handle||!result) return;
    const plat = SI_PLATFORMS.find(p=>p.key===platform);
    if (!plat) return;
    setManualHandles(prev => ({ ...prev, [platform]:{ url:`${plat.base||"https://"}${handle}`, handle, source:"manual" } }));
    setManualLoading(prev => ({ ...prev, [platform]:true }));
    try {
      const d = cleanDomainStr(domain);
      const prompt = `Estimate social media metrics for ${platform} handle "@${handle}" of the company "${d}". Return ONLY valid JSON: { "followers": <int|null>, "posts_per_month": <int|null>, "engagement_rate": <0.001-0.1|null>, "last_post": "<ISO|null>" }`;
      const r = await fetch("/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:[{role:"user",content:prompt}], max_tokens:200 }), signal:AbortSignal.timeout(20000) });
      if (r.ok) {
        const data = await r.json();
        const text = data.content?.[0]?.text??"";
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const metrics = JSON.parse(m[0]);
          setResult(prev => ({ ...prev, metrics:{ ...prev.metrics, [platform]:{ ...metrics, source:"ai_estimate_real_handle" } } }));
        }
      }
    } catch {}
    setManualLoading(prev => ({ ...prev, [platform]:false }));
  }

  const displayProfiles = result ? { ...result.profiles, ...manualHandles } : null;
  const activePlatforms = displayProfiles ? SI_PLATFORMS.filter(p=>displayProfiles[p.key]?.url) : [];
  const maturityInfo    = result?.maturity ? SI_MATURITY[result.maturity] : null;

  return (
    <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>
      <div style={{ padding:"24px 24px", maxWidth:1080, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>

        {/* Search */}
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input value={domain} onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key==="Enter" && !loading && run()}
            placeholder="z.B. adidas.de"
            style={{ flex:1, padding:"9px 13px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:FONT, outline:"none", background:C.bg }}/>
          <Btn onClick={run} disabled={loading || !domain.trim()}>{loading ? "Analysiere…" : "Analysieren"}</Btn>
        </div>

        {loading && (
          <div style={{ marginBottom:12, fontSize:12, color:C.textSoft, display:"flex", alignItems:"center", gap:8 }}>
            <RefreshCw size={12} strokeWidth={IW} color={C.accent} style={{ animation:"spin 1s linear infinite" }}/>
            Website wird gecrawlt · YouTube RSS wird geladen · KI analysiert…
          </div>
        )}

        {error && (
          <div style={{ padding:"12px 16px", borderRadius:T.rMd, background:"#fee2e2", border:"1px solid #fca5a5", color:"#991b1b", fontSize:13, marginBottom:16 }}>{error}</div>
        )}

        {result && (
          <>
            {/* Company header */}
            <Card style={{ padding:20, marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>
                {(() => {
                  const score = result.score ?? 0;
                  const size  = 100;
                  const radius = (size-14)/2;
                  const circ   = 2*Math.PI*radius;
                  const offset = circ-(score/100)*circ;
                  const col    = score>=70?"#22c55e":score>=40?"#f59e0b":"#ef4444";
                  return (
                    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
                      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
                        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={C.border} strokeWidth={7}/>
                        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={col} strokeWidth={7}
                          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.8s ease" }}/>
                      </svg>
                      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:22, fontFamily:FONT_DISPLAY, fontWeight:800, color:col, lineHeight:1 }}>{score}</span>
                        <span style={{ fontSize:9, color:C.textSoft, marginTop:1 }}>/ 100</span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ flex:1, minWidth:220 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:17, fontWeight:800, color:C.text, fontFamily:FONT_DISPLAY }}>{result.ogData?.title||domain.trim()}</span>
                    {maturityInfo && (
                      <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:maturityInfo.color+"18", color:maturityInfo.color }}>{maturityInfo.label}</span>
                    )}
                  </div>
                  {result.ogData?.description && (
                    <p style={{ fontSize:12, color:C.textSoft, margin:"0 0 10px", lineHeight:1.5, maxWidth:600 }}>
                      {result.ogData.description.slice(0,180)}{result.ogData.description.length>180?"…":""}
                    </p>
                  )}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                    {result.company_type && <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:C.accentLight, color:C.accent }}>{result.company_type}</span>}
                    {result.industry     && <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:C.border, color:C.textMid }}>{result.industry}</span>}
                    {result.primary_platform && (() => { const p=SI_PLATFORMS.find(x=>x.key===result.primary_platform); return p?<span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:p.color+"18", color:p.color }}>Hauptkanal: {p.label}</span>:null; })()}
                    <span style={{ fontSize:11, color:C.textSoft, padding:"3px 6px" }}>{activePlatforms.length}/{SI_PLATFORMS.length} Plattformen aktiv</span>
                  </div>
                  {result.dataSource && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
                      <span style={{ fontSize:11, color:C.textSoft, marginRight:4 }}>Datenquellen:</span>
                      {result.dataSource.crawled?.length>0 && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#0057D918", color:"#0057D9" }}>Website-Crawl: {result.dataSource.crawled.length} Profile</span>}
                      {result.dataSource.realData?.includes("youtube") && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#FF000018", color:"#FF0000" }}>YouTube RSS</span>}
                      {result.dataSource.realData?.includes("linkedin") && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#0A66C218", color:"#0A66C2" }}>LinkedIn Public</span>}
                      {result.dataSource.aiOnly?.length>0 && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:C.border+"80", color:C.textSoft }}>KI-Schätzung für {result.dataSource.aiOnly.length}</span>}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Platform grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14, marginBottom:16 }}>
              {SI_PLATFORMS.map(({key}) => (
                <SIPlatformCard key={key} platform={key}
                  profile={displayProfiles?.[key]}
                  metrics={manualLoading[key]?{_loading:true}:result.metrics?.[key]}
                  onAddHandle={handleAddHandle}/>
              ))}
            </div>

            {/* Competitor compare */}
            <Card style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>Wettbewerber vergleichen</div>
              <div style={{ display:"flex", gap:10 }}>
                <input value={compDomain} onChange={e => setCompDomain(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && !compLoading && runCompare()}
                  placeholder="Wettbewerber-Domain"
                  disabled={compLoading}
                  style={{ flex:1, padding:"8px 12px", borderRadius:T.rMd, border:`1px solid ${C.border}`, background:C.bg, fontSize:13, fontFamily:FONT, outline:"none" }}/>
                <Btn onClick={runCompare} disabled={!compDomain.trim()||compLoading}>{compLoading?"Lädt…":"Vergleichen"}</Btn>
              </div>
              {compError && <div style={{ marginTop:8, fontSize:12, color:"#dc2626" }}>{compError}</div>}
            </Card>

            {/* Comparison bars */}
            {compResult && activePlatforms.length>0 && (
              <Card style={{ padding:20, marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>
                  Follower-Vergleich: {domain} vs. {compDomain}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:20 }}>
                  {activePlatforms.slice(0,6).map(({key}) => {
                    const { Icon, label, color } = SI_PLATFORMS.find(p=>p.key===key);
                    const val1 = result.metrics?.[key]?.followers;
                    const val2 = compResult.metrics?.[key]?.followers;
                    const max  = Math.max(val1??0, val2??0, 1);
                    return (
                      <div key={key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <Icon size={12} strokeWidth={IW} color={color}/>
                          <span style={{ fontSize:11, fontWeight:700, color:C.textSoft }}>{label}</span>
                        </div>
                        {[{d:domain,val:val1,c:color},{d:compDomain,val:val2,c:color+"70"}].map(({d,val,c}) => (
                          <div key={d} style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:11, color:C.textMid, width:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d}</span>
                            <div style={{ flex:1, height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
                              <div style={{ width:`${((val??0)/max)*100}%`, height:"100%", background:c, borderRadius:4, transition:"width 0.6s ease" }}/>
                            </div>
                            <span style={{ fontSize:11, color:C.textMid, fontWeight:700, width:44, textAlign:"right" }}>{siFmt(val)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* AI insights */}
            {insLoading && (
              <Card style={{ padding:20, display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <div style={{ width:32, height:32, borderRadius:T.rMd, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Sparkles size={16} strokeWidth={IW} color={C.accent}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ height:11, background:C.border, borderRadius:6, width:"55%", marginBottom:7 }}/>
                  <div style={{ height:10, background:C.border, borderRadius:5, width:"80%" }}/>
                </div>
              </Card>
            )}
            {!insLoading && (insights||result.ai_summary) && (
              <Card style={{ padding:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <div style={{ width:32, height:32, borderRadius:T.rMd, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Sparkles size={16} strokeWidth={IW} color={C.accent}/>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT_DISPLAY }}>KI-Empfehlungen</div>
                    <div style={{ fontSize:11, color:C.textSoft }}>Basierend auf Echtdaten + KI-Analyse</div>
                  </div>
                </div>
                {result.ai_summary && <p style={{ fontSize:13, color:C.textMid, lineHeight:1.7, margin:"0 0 16px", fontFamily:FONT }}>{result.ai_summary}</p>}
                {insights && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px,1fr))", gap:10 }}>
                    {[
                      { key:"strengths",  label:"Stärken",    Icon:CheckCircle, color:"#22c55e", bg:"#22c55e0d", border:"#22c55e25", items:insights.strengths  },
                      { key:"gaps",       label:"Lücken",     Icon:AlertCircle, color:"#ef4444", bg:"#ef44440d", border:"#ef444425", items:insights.gaps       },
                      { key:"quick_wins", label:"Quick Wins", Icon:Zap,         color:"#f59e0b", bg:"#f59e0b0d", border:"#f59e0b25", items:insights.quick_wins },
                    ].filter(s=>s.items?.length).map(({key,label,Icon,color,bg,border,items}) => (
                      <div key={key} style={{ background:bg, border:`1px solid ${border}`, borderRadius:T.rMd, padding:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                          <Icon size={13} strokeWidth={IW} color={color}/>
                          <span style={{ fontSize:11, fontWeight:700, color }}>{label}</span>
                        </div>
                        <ul style={{ margin:0, padding:0, listStyle:"none" }}>
                          {items.slice(0,3).map((item,i) => (
                            <li key={i} style={{ fontSize:11, color:C.text, marginBottom:4, paddingLeft:12, position:"relative" }}>
                              <span style={{ position:"absolute", left:0, color }}>•</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <Card style={{ padding:56, textAlign:"center" }}>
            <Activity size={44} color={C.textSoft} strokeWidth={IW} style={{ margin:"0 auto 16px", display:"block" }}/>
            <div style={{ fontSize:15, fontWeight:700, color:C.textMid, marginBottom:8 }}>Social-Media-Präsenz analysieren</div>
            <p style={{ fontSize:13, color:C.textSoft, maxWidth:420, margin:"0 auto 20px" }}>
              Crawlt die Website für echte Social-Links · Lädt YouTube RSS-Daten · Analysiert LinkedIn · KI füllt Lücken
            </p>
            <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
              {[{label:"Website-Crawl",color:"#0057D9"},{label:"YouTube RSS",color:"#FF0000"},{label:"LinkedIn Public",color:"#0A66C2"},{label:"KI-Anreicherung",color:"#7c3aed"}].map(({label,color}) => (
                <span key={label} style={{ fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, background:color+"18", color }}>{label}</span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
