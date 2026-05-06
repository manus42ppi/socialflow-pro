import { useState } from "react";
import {
  RefreshCw, AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  Calendar, Smile, Frown, Meh, Image, Monitor, Smartphone,
  Shield, BookOpen, Sparkles, Zap, Info,
} from "lucide-react";
import { C, T, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { Card, Btn } from "../components/ui/index.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function researchAI(messages, system = "") {
  const res = await fetch("/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, system, messages }),
  });
  const d = await res.json();
  if (d?.error) throw new Error(d.error.message || "KI-Fehler");
  return d?.content?.[0]?.text || "";
}

function parseJSONBlock(text) {
  try {
    const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    return JSON.parse(m ? m[1] : text);
  } catch { return null; }
}

function cleanDomainStr(s) {
  return s.trim().replace(/^https?:\/\/(www\.)?/, "").split("/")[0].replace(/\/$/, "").toLowerCase();
}

// ── Tone & Sentiment meta ─────────────────────────────────────────────────────
const TONE_META_CA = {
  sachlich:      { color:"#6366f1", bg:"#eef2ff", label:"Sachlich" },
  informativ:    { color:"#0891b2", bg:"#e0f2fe", label:"Informativ" },
  professionell: { color:"#1d4ed8", bg:"#dbeafe", label:"Professionell" },
  technisch:     { color:"#7c3aed", bg:"#ede9fe", label:"Technisch" },
  analytisch:    { color:"#059669", bg:"#d1fae5", label:"Analytisch" },
  humorvoll:     { color:"#f59e0b", bg:"#fef3c7", label:"Humorvoll" },
  emotional:     { color:"#ec4899", bg:"#fce7f3", label:"Emotional" },
  meinungsstark: { color:"#dc2626", bg:"#fee2e2", label:"Meinungsstark" },
  unterhaltend:  { color:"#f97316", bg:"#ffedd5", label:"Unterhaltend" },
  werblich:      { color:"#84cc16", bg:"#f7fee7", label:"Werblich" },
};
const SENT_COLOR_CA = { positiv: C.success, neutral: C.warning, negativ: "#ef4444" };
const SENT_ICON_CA  = { positiv: Smile, neutral: Meh, negativ: Frown };

function ToneBadgeCA({ tone }) {
  const key = (tone || "").toLowerCase();
  const m = TONE_META_CA[key] || { color: C.accent, bg: C.accentLight, label: tone };
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, color:m.color, background:m.bg, border:`1px solid ${m.color}30` }}>
      {m.label}
    </span>
  );
}

function SeoCheckCardCA({ check, idx }) {
  const [open, setOpen] = useState(idx < 2);
  const ST = {
    ok:      { color:"#16a34a", bg:"#dcfce7", icon:CheckCircle   },
    warning: { color:"#d97706", bg:"#fef3c7", icon:AlertTriangle },
    error:   { color:"#dc2626", bg:"#fee2e2", icon:AlertCircle   },
  };
  const sm = ST[check.status] || ST.warning;
  const Ico = sm.icon;
  return (
    <div style={{ borderBottom:`1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:10,
        padding:"12px 4px", background:"none", border:"none", cursor:"pointer", textAlign:"left", fontFamily:FONT,
      }}>
        <Ico size={15} color={sm.color} strokeWidth={IW} style={{ flexShrink:0 }} />
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99, color:sm.color, background:sm.bg, flexShrink:0 }}>
          {check.category}
        </span>
        <div style={{ flex:1, fontSize:13, fontWeight:600, color:C.text }}>{check.title}</div>
        {open ? <ChevronUp size={13} color={C.textSoft} strokeWidth={IW}/> : <ChevronDown size={13} color={C.textSoft} strokeWidth={IW}/>}
      </button>
      {open && (
        <div style={{ padding:"0 4px 14px 25px" }}>
          <div style={{ fontSize:12, color:C.textSoft, lineHeight:1.6, marginBottom:8 }}>{check.description}</div>
          {check.affectedUrls?.length > 0 && (
            <div style={{ marginBottom:8 }}>
              {check.affectedUrls.slice(0,3).map(u => (
                <div key={u} style={{ fontSize:11, color:C.textMute, fontFamily:"monospace", padding:"2px 0" }}>→ {u}</div>
              ))}
            </div>
          )}
          {check.fix && (
            <div style={{ padding:"8px 12px", borderRadius:T.rSm, background:"#dcfce7", fontSize:12, color:"#14532d" }}>
              <strong>Fix:</strong> {check.fix}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function aiAuditSeoCA(domain, pages) {
  const sample = pages.slice(0,8);
  const pageTexts = sample.map(p =>
    `URL: ${p.url}\nTitel: ${p.title || "(fehlt)"}\nDesc: ${p.desc || "(fehlt)"}\nText: ${p.text.slice(0,300)}`
  ).join("\n---\n");
  const raw = await researchAI(
    [{ role:"user", content:`SEO-Audit für ${domain}. Genau 8 Checks, jeder kurz und präzise. Nur JSON zurückgeben.\n\nSeiten (${sample.length}):\n${pageTexts}` }],
    `Du bist SEO-Experte. Antworte NUR mit diesem JSON (keine Erklärungen, kein Markdown):\n{"score":75,"summary":"2 Sätze","checks":[{"category":"Meta","title":"kurz","status":"warning","description":"kurz","affectedUrls":["url"],"fix":"kurz"}],"topIssues":["issue1","issue2","issue3"],"strengths":["s1","s2"]}`
  );
  let parsed = null;
  try { parsed = JSON.parse(raw.trim()); } catch {}
  if (!parsed) { const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/); try { parsed = JSON.parse(m?.[1] || m?.[0] || ""); } catch {} }
  if (!parsed && raw.includes('"score"')) {
    let attempt = raw.replace(/,?\s*$/, "");
    const opens = (attempt.match(/\[/g)||[]).length - (attempt.match(/\]/g)||[]).length;
    const objs  = (attempt.match(/\{/g)||[]).length - (attempt.match(/\}/g)||[]).length;
    attempt += "]".repeat(Math.max(0,opens)) + "}".repeat(Math.max(0,objs));
    try { parsed = JSON.parse(attempt); } catch {}
  }
  if (!parsed) throw new Error("SEO-Audit-Antwort konnte nicht verarbeitet werden.");
  return parsed;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentAuditPage() {
  const [domain,     setDomain]     = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [phase,      setPhase]      = useState("");
  const [activeTab,  setActiveTab]  = useState("content");
  const [seoResult,  setSeoResult]  = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError,   setSeoError]   = useState("");
  const [serpMobile, setSerpMobile] = useState(false);

  async function fetchFeedCA(d) {
    try {
      const r = await fetch(`/rss?domain=${d}`);
      if (!r.ok) return { feedUrl:null, items:[] };
      const data = await r.json();
      return { feedUrl:data?.feedUrl||null, items:Array.isArray(data?.items)?data.items:[] };
    } catch { return { feedUrl:null, items:[] }; }
  }

  async function fetchWebContentCA(d) {
    try {
      const r = await fetch("/content", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({domain:d}), signal:AbortSignal.timeout(30000) });
      if (!r.ok) return [];
      const data = await r.json();
      return data?.pages?.length > 0 ? data.pages : [];
    } catch { return []; }
  }

  async function run() {
    const d = cleanDomainStr(domain);
    if (!d) return;
    setLoading(true); setError(""); setResult(null); setActiveTab("content"); setSeoResult(null); setSeoError("");
    try {
      setPhase("Seiteninhalte abrufen…");
      const [feed, webPages] = await Promise.all([fetchFeedCA(d), fetchWebContentCA(d)]);
      setPhase("Inhalte mit KI analysieren…");
      const hasFeed = feed.items.length > 0;
      const hasWebContent = webPages.length > 0;
      let contentBlock = "";
      if (hasFeed) {
        const s = feed.items.slice(0,25).map((a,i) =>
          `${i+1}. "${a.title}"${a.desc?` — ${a.desc.slice(0,180)}`:""}${a.link?` | URL: ${a.link}`:""}`
        ).join("\n");
        contentBlock = `RSS-FEED (${feed.items.length} Artikel):\n${s}`;
      }
      if (hasWebContent) {
        const pt = webPages.map(p => `[Seite: ${p.url}]\nTitel: ${p.title}\nInhalt: ${p.text.slice(0,1500)}`).join("\n\n---\n\n");
        contentBlock += (contentBlock?"\n\n":"") + `GESCRAPTE SEITENINHALTE (${webPages.length} Seiten):\n${pt}`;
      }
      if (!contentBlock) throw new Error(`Inhalte von ${d} konnten nicht abgerufen werden.`);

      const raw = await researchAI(
        [{ role:"user", content:`Analysiere die folgenden ECHTEN Inhalte der Website ${d}. Basiere deine Analyse AUSSCHLIESSLICH auf den bereitgestellten Texten.\n\n${contentBlock}\n\nGib eine vollständige Content-Analyse zurück.` }],
        `Du bist ein Content-Analyse-Experte. Antworte AUSSCHLIESSLICH mit validem JSON ohne Markdown.\nAntworte NUR mit diesem JSON-Schema:\n{"hasFeed":boolean,"articleCount":number,"pubFrequency":string,"contentTypes":string[],"primaryTone":string,"tones":string[],"sentiment":{"positiv":number,"neutral":number,"negativ":number},"topics":[{"label":string,"count":number,"color":string}],"consistencyScore":number,"consistencyNote":string,"readability":string,"readabilityNote":string,"targetAudience":string,"styleCharacteristics":string[],"articles":[{"url":string,"title":string,"tone":string,"sentiment":"positiv"|"neutral"|"negativ","isOutlier":boolean,"outlierReason":null}],"outliers":[{"title":string,"reason":string}],"strengths":string[],"weaknesses":string[],"recommendations":string[]}`
      );
      const parsed = parseJSONBlock(raw);
      if (!parsed) throw new Error("KI-Antwort konnte nicht verarbeitet werden.");
      setResult({ domain:d, feedUrl:feed.feedUrl, hasFeed, hasWebContent, webPageCount:webPages.length, feedItems:feed.items, webPages, articles:feed.items, ...parsed });
    } catch(e) { setError(e.message || "Analyse fehlgeschlagen."); }
    finally { setLoading(false); setPhase(""); }
  }

  async function triggerSeo() {
    if (!result?.webPages?.length) { setSeoError("Keine gescrapten Seiten — bitte erst analysieren."); return; }
    setSeoLoading(true); setSeoError("");
    try { const audit = await aiAuditSeoCA(result.domain, result.webPages); setSeoResult(audit); }
    catch(e) { setSeoError(e.message || "SEO-Audit fehlgeschlagen."); }
    finally { setSeoLoading(false); }
  }

  const r = result;

  return (
    <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>
      <div style={{ padding:"24px 24px", maxWidth:960, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>

        {/* Search bar */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input value={domain} onChange={e => { setDomain(e.target.value); setError(""); }}
            onKeyDown={e => e.key==="Enter" && !loading && run()}
            placeholder="z.B. spiegel.de"
            style={{ flex:1, padding:"9px 13px", borderRadius:8, border:`1px solid ${C.border}`,
              fontSize:13, fontFamily:FONT, outline:"none", background:C.bg }}/>
          <Btn onClick={run} disabled={loading}>{loading ? (phase || "Analysiere…") : "Analysieren"}</Btn>
        </div>

        {error && (
          <div style={{ padding:"12px 16px", borderRadius:T.rMd, background:"#fee2e2", border:"1px solid #fca5a5", color:"#991b1b", fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Inner tab bar */}
        {r && (
          <div style={{ display:"flex", marginBottom:20, borderBottom:`2px solid ${C.border}` }}>
            {[{id:"content",label:"Content-Analyse"},{id:"seo",label:"SEO-Audit"}].map(({id,label}) => (
              <button key={id} onClick={() => { setActiveTab(id); if(id==="seo"&&!seoResult&&!seoLoading) triggerSeo(); }}
                style={{ padding:"10px 22px", background:"none", border:"none", cursor:"pointer",
                  fontSize:13, fontWeight:activeTab===id?700:500,
                  color:activeTab===id?C.accent:C.textMid, fontFamily:FONT,
                  borderBottom:`2px solid ${activeTab===id?C.accent:"transparent"}`, marginBottom:-2 }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ─ Content tab ─ */}
        {r && activeTab==="content" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Scope banner */}
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderRadius:T.rMd, fontSize:12, flexWrap:"wrap",
              background:r.hasFeed?"#f0fdf4":"#fffbeb", border:`1px solid ${r.hasFeed?"#bbf7d0":"#fde68a"}`, color:r.hasFeed?"#166534":"#92400e" }}>
              {r.hasFeed ? <CheckCircle size={13} strokeWidth={IW}/> : <Info size={13} strokeWidth={IW}/>}
              <span style={{ fontWeight:600 }}>{r.hasFeed?"RSS-Feed":r.hasWebContent?"Web-Scraping":"Kein Feed"}</span>
              <span style={{ opacity:.5 }}>·</span>
              <span>{r.hasFeed?(r.feedItems?.length||r.articleCount||0)+" Artikel gescannt":(r.webPageCount||0)+" Seiten gescannt"}</span>
            </div>

            {/* Row 1 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>Tonalität & Stil</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>{r.tones?.map(t => <ToneBadgeCA key={t} tone={t}/>)}</div>
                <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:6 }}>Zielgruppe</div>
                <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{r.targetAudience||"–"}</div>
                {r.styleCharacteristics?.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:6, marginTop:12 }}>Stil-Merkmale</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {r.styleCharacteristics.map(s => (
                        <span key={s} style={{ fontSize:10, padding:"2px 8px", borderRadius:4, background:C.bg, border:`1px solid ${C.border}`, color:C.textMid }}>{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              <Card style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Konsistenz-Score</div>
                {(() => {
                  const score = r.consistencyScore ?? 0;
                  const color = score>=75?C.success:score>=50?C.warning:"#ef4444";
                  const label = score>=75?"Konsistent":score>=50?"Gemischt":"Inkonsistent";
                  return (
                    <div style={{ width:80, height:80, borderRadius:"50%", border:`5px solid ${color}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:color+"12", marginBottom:8 }}>
                      <div style={{ fontSize:24, fontWeight:900, color, fontFamily:FONT_DISPLAY, lineHeight:1 }}>{score}</div>
                      <div style={{ fontSize:8, color:C.textSoft, textTransform:"uppercase", letterSpacing:".05em" }}>/ 100</div>
                    </div>
                  );
                })()}
                {r.consistencyNote && <p style={{ fontSize:11, color:C.textSoft, lineHeight:1.6, marginTop:8, maxWidth:200 }}>{r.consistencyNote}</p>}
              </Card>

              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>Lesbarkeit</div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:99, marginBottom:8,
                  background:r.readability==="einfach"?"#f0fdf4":r.readability==="komplex"?"#fef2f2":"#fffbeb",
                  border:`1px solid ${r.readability==="einfach"?"#bbf7d0":r.readability==="komplex"?"#fecaca":"#fde68a"}`,
                  color:r.readability==="einfach"?"#166534":r.readability==="komplex"?"#dc2626":"#92400e",
                  fontSize:13, fontWeight:700 }}>
                  {r.readability==="einfach"?"✓":r.readability==="komplex"?"⚠":"◎"} {r.readability}
                </div>
                {r.readabilityNote && <p style={{ fontSize:11, color:C.textSoft, lineHeight:1.6 }}>{r.readabilityNote}</p>}
                {r.contentTypes?.length > 0 && (
                  <>
                    <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8, marginTop:14 }}>Content-Typen</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {r.contentTypes.map(t => (
                        <span key={t} style={{ fontSize:11, padding:"2px 9px", borderRadius:4, background:C.accentLight, color:C.accent, fontWeight:600 }}>{t}</span>
                      ))}
                    </div>
                  </>
                )}
                {r.pubFrequency && (
                  <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.textSoft }}>
                    <Calendar size={12} strokeWidth={IW}/>{r.pubFrequency}
                  </div>
                )}
              </Card>
            </div>

            {/* Row 2: Sentiment + Topics */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Sentiment-Verteilung</div>
                {r.sentiment && Object.entries(r.sentiment).map(([key,val]) => {
                  const Icon = SENT_ICON_CA[key]||Meh;
                  const col  = SENT_COLOR_CA[key]||C.textSoft;
                  return (
                    <div key={key} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                      <Icon size={16} color={col} strokeWidth={IW} style={{ flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:12, color:C.textMid, textTransform:"capitalize" }}>{key}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:col }}>{val}%</span>
                        </div>
                        <div style={{ height:7, borderRadius:4, background:C.border }}>
                          <div style={{ height:7, borderRadius:4, background:col, width:`${val}%` }}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Themen-Cluster</div>
                {r.topics?.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {r.topics.slice(0,8).map(({label,count,color}) => {
                      const max = Math.max(...r.topics.map(t=>t.count||0),1);
                      return (
                        <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:color||C.accent, flexShrink:0 }}/>
                          <span style={{ fontSize:12, color:C.textMid, width:200, flexShrink:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
                          <div style={{ flex:1, height:6, borderRadius:3, background:C.border }}>
                            <div style={{ height:6, borderRadius:3, background:color||C.accent, width:`${Math.round((count/max)*100)}%`, transition:"width .4s" }}/>
                          </div>
                          <span style={{ fontSize:11, color:C.textSoft, width:24, textAlign:"right", flexShrink:0 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color:C.textSoft, fontSize:12 }}>Keine Themen-Daten verfügbar.</p>}
              </Card>
            </div>

            {/* Articles list */}
            {r.articles?.length > 0 && (
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Artikel-Analyse ({r.articles.length})</div>
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  {r.articles.slice(0,20).map((a,i) => {
                    const sentCol = SENT_COLOR_CA[a.sentiment]||C.textSoft;
                    const SIcon   = SENT_ICON_CA[a.sentiment]||Meh;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 4px", borderBottom:`1px solid ${C.border}`, cursor:"default" }}>
                        <span style={{ fontSize:11, color:C.textMute, minWidth:20, textAlign:"right" }}>{i+1}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, color:C.text, fontWeight:a.isOutlier?700:400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {a.isOutlier && <AlertTriangle size={11} color="#f59e0b" strokeWidth={IW} style={{ marginRight:5 }}/>}
                            {a.title}
                          </div>
                          {a.isOutlier && a.outlierReason && <div style={{ fontSize:11, color:"#92400e", marginTop:2 }}>{a.outlierReason}</div>}
                        </div>
                        <ToneBadgeCA tone={a.tone}/>
                        <SIcon size={14} color={sentCol} strokeWidth={IW} style={{ flexShrink:0 }}/>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Outliers */}
            {r.outliers?.length > 0 && (
              <Card style={{ padding:20, borderLeft:`3px solid #f59e0b` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                  <AlertTriangle size={16} color="#d97706" strokeWidth={IW}/>
                  <div style={{ fontSize:10, fontWeight:700, color:"#92400e", textTransform:"uppercase", letterSpacing:".07em" }}>Ausreißer — {r.outliers.length} Artikel weichen vom Norm ab</div>
                </div>
                {r.outliers.map((o,i) => (
                  <div key={i} style={{ padding:"12px 14px", borderRadius:T.rMd, background:"#fffbeb", border:"1px solid #fde68a", marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{o.title}</div>
                    <div style={{ fontSize:12, color:"#92400e" }}>{o.reason}</div>
                  </div>
                ))}
              </Card>
            )}

            {/* Strengths / Weaknesses / Recommendations */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.success, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                  <CheckCircle size={13} strokeWidth={IW}/> Content-Stärken
                </div>
                {r.strengths?.map((s,i) => (
                  <div key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s}</div>
                ))}
              </Card>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#dc2626", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                  <AlertCircle size={13} strokeWidth={IW}/> Schwächen
                </div>
                {r.weaknesses?.map((s,i) => (
                  <div key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s}</div>
                ))}
              </Card>
              <Card style={{ padding:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#d97706", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                  <Zap size={13} strokeWidth={IW}/> Empfehlungen
                </div>
                {r.recommendations?.map((s,i) => (
                  <div key={i} style={{ display:"flex", gap:8, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:11, fontWeight:800, color:"#d97706", flexShrink:0 }}>{i+1}.</span>
                    <span style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ─ SEO tab ─ */}
        {r && activeTab==="seo" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {seoLoading && (
              <Card style={{ padding:40, textAlign:"center" }}>
                <RefreshCw size={28} color={C.accent} strokeWidth={IW} style={{ margin:"0 auto 12px", animation:"spin 1s linear infinite", display:"block" }}/>
                <div style={{ fontSize:14, color:C.textSoft }}>SEO-Audit läuft…</div>
              </Card>
            )}
            {seoError && (
              <div style={{ display:"flex", gap:8, padding:"12px 16px", borderRadius:T.rMd, background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", fontSize:13 }}>
                <AlertCircle size={16} strokeWidth={IW} style={{ flexShrink:0 }}/>{seoError}
              </div>
            )}
            {seoResult && (() => {
              const sr = seoResult;
              const errs  = sr.checks?.filter(c=>c.status==="error")||[];
              const warns = sr.checks?.filter(c=>c.status==="warning")||[];
              const oks   = sr.checks?.filter(c=>c.status==="ok")||[];
              const color = sr.score>=80?"#16a34a":sr.score>=60?"#d97706":"#dc2626";
              return (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:16 }}>
                    <Card style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                        <div style={{ width:88, height:88, borderRadius:"50%", border:`6px solid ${color}`, background:color+"12", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                          <div style={{ fontSize:28, fontWeight:900, color, fontFamily:FONT_DISPLAY, lineHeight:1 }}>{sr.score||0}</div>
                          <div style={{ fontSize:9, color:C.textSoft, textTransform:"uppercase", letterSpacing:".05em" }}>/ 100</div>
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, color }}>{sr.score>=80?"Gut":sr.score>=60?"Verbesserbar":"Kritisch"}</div>
                      </div>
                    </Card>
                    <Card style={{ padding:20 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>SEO-Score — {r.domain} · {r.webPages?.length||0} Seiten</div>
                      <div style={{ fontSize:13, color:C.textSoft, lineHeight:1.7, marginBottom:12 }}>{sr.summary}</div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {errs.length>0  && <span style={{ fontSize:12, fontWeight:700, color:"#dc2626", background:"#fee2e2", padding:"3px 12px", borderRadius:99 }}>{errs.length} Fehler</span>}
                        {warns.length>0 && <span style={{ fontSize:12, fontWeight:700, color:"#d97706", background:"#fef3c7", padding:"3px 12px", borderRadius:99 }}>{warns.length} Warnungen</span>}
                        {oks.length>0   && <span style={{ fontSize:12, fontWeight:700, color:"#16a34a", background:"#dcfce7", padding:"3px 12px", borderRadius:99 }}>{oks.length} OK</span>}
                      </div>
                    </Card>
                  </div>
                  {(sr.topIssues?.length>0||sr.strengths?.length>0) && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {sr.topIssues?.length>0 && (
                        <Card style={{ padding:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:".07em", marginBottom:10 }}>Wichtigste Probleme</div>
                          {sr.topIssues.map((issue,i) => (
                            <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:7 }}>
                              <AlertTriangle size={12} color="#dc2626" strokeWidth={IW} style={{ flexShrink:0, marginTop:2 }}/>
                              <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>{issue}</div>
                            </div>
                          ))}
                        </Card>
                      )}
                      {sr.strengths?.length>0 && (
                        <Card style={{ padding:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:"#16a34a", textTransform:"uppercase", letterSpacing:".07em", marginBottom:10 }}>Stärken</div>
                          {sr.strengths.map((s,i) => (
                            <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:7 }}>
                              <CheckCircle size={12} color="#16a34a" strokeWidth={IW} style={{ flexShrink:0, marginTop:2 }}/>
                              <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>{s}</div>
                            </div>
                          ))}
                        </Card>
                      )}
                    </div>
                  )}
                  <Card style={{ padding:20 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Alle Prüfungen ({sr.checks?.length||0})</div>
                    {sr.checks?.map((check,i) => <SeoCheckCardCA key={i} check={check} idx={i}/>)}
                  </Card>
                  {/* SERP preview */}
                  {r.webPages?.length>0 && (
                    <Card style={{ padding:20 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em" }}>SERP-Vorschau</div>
                        <div style={{ display:"flex", gap:4, background:C.bg, borderRadius:T.rSm, padding:3, border:`1px solid ${C.border}` }}>
                          {[{id:false,label:"Desktop"},{id:true,label:"Mobil"}].map(({id,label}) => (
                            <button key={String(id)} onClick={() => setSerpMobile(id)} style={{
                              display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:4, border:"none", cursor:"pointer",
                              background:serpMobile===id?C.surface:"transparent",
                              color:serpMobile===id?C.text:C.textSoft,
                              fontFamily:FONT, fontSize:11, fontWeight:serpMobile===id?700:400,
                            }}>{id ? <Smartphone size={11} strokeWidth={IW}/> : <Monitor size={11} strokeWidth={IW}/>}{label}</button>
                          ))}
                        </div>
                      </div>
                      {r.webPages.slice(0,6).map((p,i) => {
                        const titleMax = serpMobile?55:60, descMax = serpMobile?120:160;
                        const titleOver = (p.title||"").length>titleMax, descOver = (p.desc||"").length>descMax;
                        return (
                          <div key={i} style={{ borderBottom:`1px solid ${C.border}`, padding:"14px 0" }}>
                            <div style={{ fontSize:12, color:"#006621", marginBottom:2 }}>{p.url}</div>
                            <div style={{ fontSize:serpMobile?16:18, color:"#1a0dab", lineHeight:1.3, marginBottom:4, display:"flex", gap:6, flexWrap:"wrap", alignItems:"baseline" }}>
                              <span style={{ color:titleOver?"#dc2626":"#1a0dab" }}>{(p.title||"(kein Titel)").slice(0,titleMax+15)}</span>
                              <span style={{ fontSize:10, fontWeight:700, color:titleOver?"#dc2626":"#16a34a", background:titleOver?"#fee2e2":"#dcfce7", padding:"1px 6px", borderRadius:4 }}>{(p.title||"").length}/{titleMax}</span>
                            </div>
                            <div style={{ fontSize:13, color:"#545454", lineHeight:1.5, maxWidth:serpMobile?340:520 }}>
                              {p.desc ? (
                                <>
                                  <span style={{ color:descOver?"#dc2626":"inherit" }}>{p.desc.slice(0,descMax+20)}</span>
                                  <span style={{ fontSize:10, fontWeight:700, marginLeft:6, color:descOver?"#dc2626":"#16a34a", background:descOver?"#fee2e2":"#dcfce7", padding:"1px 6px", borderRadius:4 }}>{p.desc.length}/{descMax}</span>
                                </>
                              ) : (
                                <span style={{ color:"#dc2626", fontStyle:"italic" }}>⚠ Keine Meta-Description</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  )}
                </>
              );
            })()}
            {!seoLoading && !seoError && !seoResult && (
              <Card style={{ padding:40, textAlign:"center" }}>
                <Shield size={36} color={C.textSoft} strokeWidth={IW} style={{ margin:"0 auto 12px", display:"block" }}/>
                <div style={{ fontSize:14, color:C.textMid }}>SEO-Audit wird geladen…</div>
              </Card>
            )}
          </div>
        )}

        {/* Empty state */}
        {!r && !loading && !error && (
          <Card style={{ padding:52, textAlign:"center" }}>
            <BookOpen size={44} color={C.textSoft} strokeWidth={IW} style={{ margin:"0 auto 16px", display:"block" }}/>
            <div style={{ fontSize:16, fontWeight:700, color:C.textMid, marginBottom:8 }}>Content-Audit starten</div>
            <p style={{ fontSize:13, color:C.textSoft, maxWidth:420, margin:"0 auto", lineHeight:1.7 }}>
              Gib eine Domain ein und erhalte eine KI-Analyse der Tonalität, des Sentiments, Themen-Cluster und Konsistenz — inklusive SEO-Audit.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
