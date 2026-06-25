import { useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { C, T, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { getAuthHeader } from "../utils/store.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanDomainStr(s) {
  return s.trim().replace(/^https?:\/\/(www\.)?/, "").split("/")[0].replace(/\/$/, "").toLowerCase();
}

function fmtNum(n) {
  if (n == null) return "–";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WettbewerberPage() {
  const [domains,   setDomains]   = useState(["spiegel.de", "focus.de"]);
  const [input,     setInput]     = useState("");
  const [results,   setResults]   = useState({});
  const [loading,   setLoading]   = useState({});
  const [analyzed,  setAnalyzed]  = useState(false);

  function addDomain() {
    const d = cleanDomainStr(input);
    if (!d || domains.includes(d) || domains.length >= 4) return;
    setDomains(prev => [...prev, d]);
    setInput("");
  }

  function removeDomain(d) {
    setDomains(prev => prev.filter(x => x !== d));
    setResults(prev => { const n = {...prev}; delete n[d]; return n; });
  }

  async function analyzeAll() {
    setAnalyzed(true);
    const newLoading = {};
    domains.forEach(d => { newLoading[d] = true; });
    setLoading(newLoading);

    const tasks = domains.map(async d => {
      try {
        const auth = await getAuthHeader();
        const res  = await fetch("/analyze", { method:"POST", headers:{"Content-Type":"application/json",...(auth?{"Authorization":auth}:{})}, body:JSON.stringify({ domain: d }) });
        const json = await res.json();
        setResults(prev => ({ ...prev, [d]: json }));
      } catch {
        setResults(prev => ({ ...prev, [d]: { error: true } }));
      } finally {
        setLoading(prev => ({ ...prev, [d]: false }));
      }
    });
    await Promise.all(tasks);
  }

  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px" };

  function isWinner(domain, getter) {
    const vals = domains.map(d => getter(results[d])).filter(v => v != null && !isNaN(v));
    if (vals.length < 2) return false;
    const max = Math.max(...vals);
    const mine = getter(results[domain]);
    return mine != null && mine === max;
  }

  const allDone = domains.length > 0 && domains.every(d => results[d] && !loading[d]);

  return (
    <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>
      <div style={{ padding:"24px 24px", maxWidth:1000, margin:"0 auto", width:"100%", boxSizing:"border-box", paddingBottom:40 }}>

        {/* Add input */}
        <div style={{ ...card, marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10 }}>Domains vergleichen (max. 4)</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {domains.map(d => (
              <div key={d} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:C.accentLight, color:C.accent, border:`1px solid ${C.accent}33` }}>
                {d}
                <button onClick={() => removeDomain(d)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", padding:0, color:C.accent }}>
                  <X size={11} strokeWidth={2.5}/>
                </button>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDomain()}
              placeholder="domain.de eingeben…"
              disabled={domains.length >= 4}
              style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:8, outline:"none", padding:"7px 12px", fontFamily:FONT, fontSize:12.5, color:C.text, background:domains.length>=4?C.bg:C.surface }}
            />
            <button onClick={addDomain} disabled={domains.length >= 4 || !input.trim()}
              style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:700, color:C.textMid, opacity:domains.length>=4||!input.trim()?0.5:1 }}>
              <Plus size={14} strokeWidth={2.5}/>
            </button>
            <button onClick={analyzeAll} disabled={domains.length === 0}
              style={{ padding:"7px 18px", borderRadius:8, border:"none", background:C.accent, color:"#fff", cursor:domains.length===0?"default":"pointer", fontFamily:FONT, fontSize:12.5, fontWeight:700, opacity:domains.length===0?0.6:1 }}>
              Alle analysieren
            </button>
          </div>
        </div>

        {/* Per-domain loading spinners */}
        {analyzed && !allDone && (
          <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
            {domains.map(d => (
              <div key={d} style={{ ...card, flex:1, minWidth:140, display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
                {loading[d] ? (
                  <div style={{ width:16, height:16, border:`2px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }}/>
                ) : results[d]?.error ? (
                  <AlertCircle size={14} strokeWidth={2} color="#DC2626"/>
                ) : (
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#16A34A", flexShrink:0 }}/>
                )}
                <span style={{ fontSize:12.5, fontWeight:600, color:C.text }}>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Comparison table */}
        {allDone && (
          <>
            <div style={{ ...card, marginBottom:14, overflowX:"auto" }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:12 }}>Vergleich</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT, fontSize:12.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"6px 10px", color:C.textMute, fontSize:11, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Metrik</th>
                    {domains.map(d => (
                      <th key={d} style={{ textAlign:"center", padding:"6px 10px", color:C.text, fontSize:12, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label:"Monatl. Traffic",    get: r => r?.ai?.trafficEstimate?.monthly,                       fmt: v => fmtNum(v),   higher:"good" },
                    { label:"Global Rank",         get: r => r?.ai?.globalRank ? -r.ai.globalRank : null,           fmt: v => v!=null ? "#"+fmtNum(-v) : "–", higher:"good" },
                    { label:"Performance Score",   get: r => r?.pagespeed?.performance,                             fmt: v => v!=null ? v+"/100" : "–", higher:"good" },
                    { label:"Trend-Signal",        get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.trendSignal || "–", higher:null },
                    { label:"Kategorie",           get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.category || "–",       higher:null },
                    { label:"Zielgruppe",          get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.audienceType || "–",   higher:null },
                    { label:"Top Keywords",        get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.behavior?.topKeywords?.slice(0,3).join(", ") || "–", higher:null },
                  ].map(row => (
                    <tr key={row.label}>
                      <td style={{ padding:"8px 10px", color:C.textMid, fontWeight:600, borderBottom:`1px solid ${C.borderLight}`, whiteSpace:"nowrap" }}>{row.label}</td>
                      {domains.map(d => {
                        const r      = results[d];
                        const val    = row.get(r);
                        const winner = row.higher && isWinner(d, row.get);
                        return (
                          <td key={d} style={{
                            padding:"8px 10px", textAlign:"center", borderBottom:`1px solid ${C.borderLight}`,
                            background: winner ? "#DCFCE7" : "transparent",
                            color: winner ? "#16A34A" : C.text,
                            fontWeight: winner ? 700 : 400,
                          }}>
                            {row.fmt(val, d)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stärken per domain */}
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {domains.map(d => {
                const strengths = results[d]?.ai?.strengths || [];
                return (
                  <div key={d} style={{ ...card, flex:"1 1 200px", minWidth:200 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:C.text, marginBottom:8 }}>{d}</div>
                    {strengths.length > 0 ? strengths.map((s, i) => (
                      <div key={i} style={{ display:"flex", gap:6, marginBottom:5, fontSize:12, color:C.textMid, lineHeight:1.5 }}>
                        <span style={{ color:"#16A34A", fontWeight:700, flexShrink:0 }}>•</span>{s}
                      </div>
                    )) : <span style={{ fontSize:12, color:C.textMute }}>–</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
