import { useState, useRef } from "react";
import {
  Globe, Users, BarChart2, TrendingUp, Zap, Target, Plus, AlertCircle,
} from "lucide-react";
import { C, T, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { getAuthHeader } from "../utils/store.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanDomain(input) {
  try {
    let d = input.trim().toLowerCase();
    if (!d.startsWith("http")) d = "https://" + d;
    const url = new URL(d);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, "");
  }
}

function fmtNum(n) {
  if (n == null) return "–";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const ANALYZE_STEPS = ["Verbinde…", "Analysiere Tech-Stack…", "KI generiert Insights…"];

function ScoreBadge({ label, value }) {
  const v = value ?? 0;
  const color = v >= 90 ? "#16A34A" : v >= 50 ? "#D97706" : "#DC2626";
  const bg    = v >= 90 ? "#DCFCE7"  : v >= 50 ? "#FEF3C7"  : "#FEE2E2";
  const r     = 22;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * (v / 100);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={r} fill={bg} stroke={C.border} strokeWidth={2}/>
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 28 28)"/>
        <text x={28} y={33} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>{v}</text>
      </svg>
      <span style={{ fontSize:10.5, color:C.textMid, fontWeight:600 }}>{label}</span>
    </div>
  );
}

function TrendBadge({ signal }) {
  const map = { wachsend:["#16A34A","#DCFCE7","▲"], stabil:["#D97706","#FEF3C7","→"], rückläufig:["#DC2626","#FEE2E2","▼"] };
  const [clr, bg, icon] = map[signal] || [C.textMute, C.borderLight, "–"];
  return (
    <span style={{ fontSize:11, fontWeight:700, color:clr, background:bg, borderRadius:20, padding:"2px 10px" }}>
      {icon} {signal || "–"}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DomainAnalysePage() {
  const [domain,    setDomain]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [stepIdx,   setStepIdx]   = useState(0);
  const [data,      setData]      = useState(null);
  const [err,       setErr]       = useState(null);
  const [clients,   setClients]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("sf_research_clients") || "[]"); } catch { return []; }
  });
  const stepTimer = useRef();

  async function analyze(raw) {
    const d = cleanDomain(raw || domain);
    if (!d) return;
    setLoading(true); setErr(null); setData(null); setStepIdx(0);
    let si = 0;
    stepTimer.current = setInterval(() => {
      si = Math.min(si + 1, ANALYZE_STEPS.length - 1);
      setStepIdx(si);
    }, 3000);
    try {
      const auth = await getAuthHeader();
      const res  = await fetch("/analyze", { method:"POST", headers:{"Content-Type":"application/json",...(auth?{"Authorization":auth}:{})}, body:JSON.stringify({ domain: d }) });
      const json = await res.json();
      if (json.error) { setErr(json.error); return; }
      setData(json);
    } catch (e) {
      setErr(e.message || "Unbekannter Fehler");
    } finally {
      clearInterval(stepTimer.current);
      setLoading(false);
    }
  }

  function saveClient() {
    const d = data?.domain;
    if (!d) return;
    const next = [{ domain:d, ts: new Date().toISOString() }, ...clients.filter(c => c.domain !== d)].slice(0, 20);
    setClients(next);
    localStorage.setItem("sf_research_clients", JSON.stringify(next));
  }

  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", marginBottom:14 };
  const ai   = data?.ai;

  return (
    <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>
      <div style={{ padding:"24px 24px", maxWidth:860, margin:"0 auto", width:"100%", boxSizing:"border-box", paddingBottom:40 }}>

        {/* Search bar */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"0 12px" }}>
            <Globe size={15} strokeWidth={IW} color={C.textMute}/>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="domain.de oder https://example.com"
              style={{ flex:1, border:"none", outline:"none", fontFamily:FONT, fontSize:13, color:C.text, background:"transparent", padding:"10px 0" }}
            />
          </div>
          <button
            onClick={() => analyze()}
            disabled={loading || !domain.trim()}
            style={{ padding:"0 20px", borderRadius:10, border:"none", background:C.accent, color:"#fff", cursor:loading?"default":"pointer", fontFamily:FONT, fontSize:13, fontWeight:700, opacity:loading||!domain.trim()?0.6:1 }}>
            {loading ? "…" : "Analysieren"}
          </button>
        </div>

        {/* Previous clients */}
        {clients.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
            {clients.map(c => (
              <button key={c.domain} onClick={() => { setDomain(c.domain); analyze(c.domain); }}
                style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, border:`1px solid ${C.border}`, background:C.surface, color:C.textMid, cursor:"pointer", fontFamily:FONT }}>
                {c.domain}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ ...card, display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 18px", gap:16 }}>
            <div style={{ width:36, height:36, border:`3px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
            <div style={{ fontSize:14, fontWeight:600, color:C.textMid, fontFamily:FONT }}>
              {ANALYZE_STEPS[stepIdx]}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {ANALYZE_STEPS.map((s, i) => (
                <div key={s} style={{ width:6, height:6, borderRadius:"50%", background: i <= stepIdx ? C.accent : C.border, transition:"background .3s" }}/>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {err && !loading && (
          <div style={{ ...card, color:"#DC2626", fontSize:13 }}>
            <AlertCircle size={14} strokeWidth={2} style={{ marginRight:6, verticalAlign:"middle" }}/>{err}
          </div>
        )}

        {/* Results */}
        {data && !loading && ai && (
          <>
            {/* Header card */}
            <div style={{ ...card }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:C.text, letterSpacing:"-.3px" }}>{data.domain}</div>
                  <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                    {ai.category && <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20, background:C.accentLight, color:C.accent }}>{ai.category}</span>}
                    {ai.audienceType && <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20, background:"#F3F4F6", color:C.textMid }}>{ai.audienceType}</span>}
                    {ai.trendSignal && <TrendBadge signal={ai.trendSignal}/>}
                  </div>
                </div>
                <button onClick={saveClient} style={{ fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.textMid, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", gap:5 }}>
                  <Plus size={12} strokeWidth={2.5}/>Als Client speichern
                </button>
              </div>
            </div>

            {/* Traffic row */}
            <div style={{ display:"flex", gap:12, marginBottom:14 }}>
              {[
                { label:"Monatliche Besucher", value:fmtNum(ai.trafficEstimate?.monthly), icon:<Users size={16} strokeWidth={IW} color={C.accent}/> },
                { label:"Global Rank",          value:ai.globalRank ? "#"+fmtNum(ai.globalRank) : "–",  icon:<BarChart2 size={16} strokeWidth={IW} color={C.accent}/> },
                { label:"SEO-Wert (EUR/Monat)", value:ai.seo?.seoValue ? fmtNum(ai.seo.seoValue)+"€" : "–", icon:<TrendingUp size={16} strokeWidth={IW} color={C.accent}/> },
              ].map(m => (
                <div key={m.label} style={{ ...card, flex:1, marginBottom:0, textAlign:"center", padding:"16px 12px" }}>
                  <div style={{ marginBottom:6 }}>{m.icon}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:C.text }}>{m.value}</div>
                  <div style={{ fontSize:11, color:C.textMute, marginTop:4 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            {ai.summary && (
              <div style={{ ...card, background:C.accentLight, border:`1px solid ${C.accent}33` }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:C.accent, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                  <Zap size={12} strokeWidth={2.5}/>KI-Fazit
                </div>
                <p style={{ margin:0, fontSize:13, color:C.text, lineHeight:1.65 }}>{ai.summary}</p>
              </div>
            )}

            {/* Stärken & Schwächen */}
            {(ai.strengths?.length > 0 || ai.weaknesses?.length > 0) && (
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ ...card, flex:1, marginBottom:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#16A34A", marginBottom:8 }}>Stärken</div>
                  {ai.strengths?.map((s, i) => (
                    <div key={i} style={{ display:"flex", gap:7, marginBottom:5, fontSize:12.5, color:C.textMid, lineHeight:1.5 }}>
                      <span style={{ color:"#16A34A", fontWeight:700, flexShrink:0 }}>•</span>{s}
                    </div>
                  ))}
                </div>
                <div style={{ ...card, flex:1, marginBottom:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#DC2626", marginBottom:8 }}>Schwächen</div>
                  {ai.weaknesses?.map((w, i) => (
                    <div key={i} style={{ display:"flex", gap:7, marginBottom:5, fontSize:12.5, color:C.textMid, lineHeight:1.5 }}>
                      <span style={{ color:"#DC2626", fontWeight:700, flexShrink:0 }}>•</span>{w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tech-Stack */}
            {data.tech && Object.keys(data.tech).length > 0 && (
              <div style={{ ...card }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10 }}>Tech-Stack</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {Object.entries(data.tech).map(([cat, tools]) =>
                    Array.isArray(tools) && tools.map(t => (
                      <span key={cat+t} title={cat} style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:C.bg, border:`1px solid ${C.border}`, color:C.textMid }}>
                        {t}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Performance scores */}
            {data.pagespeed && (
              <div style={{ ...card }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:12 }}>PageSpeed Scores</div>
                <div style={{ display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap" }}>
                  <ScoreBadge label="Performance"    value={data.pagespeed.performance}    />
                  <ScoreBadge label="Accessibility"  value={data.pagespeed.accessibility}  />
                  <ScoreBadge label="SEO"            value={data.pagespeed.seo}            />
                  <ScoreBadge label="Best Practices" value={data.pagespeed.bestPractices}  />
                </div>
              </div>
            )}

            {/* Empfehlungen */}
            {ai.recommendations?.length > 0 && (
              <div style={{ ...card }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                  <Target size={13} strokeWidth={2}/>Empfehlungen
                </div>
                {ai.recommendations.map((r, i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:8, fontSize:12.5, color:C.textMid, lineHeight:1.55 }}>
                    <span style={{ minWidth:20, height:20, borderRadius:"50%", background:C.accentLight, color:C.accent, fontWeight:700, fontSize:10.5, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
                    {r}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
