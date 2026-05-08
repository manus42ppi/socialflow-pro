import { useState } from "react";
import { BarChart2, Zap, Edit2, Hash, Layers, Sparkles, Check, X } from "lucide-react";
import { C, T, FONT, IW } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { AI } from "../utils/store.js";
import { Sp, Btn } from "./ui/index.jsx";

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

function ScoreBar({label,score,hint}){
  const pct=Math.min(100,Math.max(0,(score/25)*100));
  const barColor=score>=20?"#22C55E":score>=13?"#F59E0B":"#EF4444";
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontSize:11,fontWeight:700,color:C.textMid}}>{label}</span>
        <span style={{fontSize:11,fontWeight:800,color:barColor}}>{score}/25</span>
      </div>
      <div style={{height:5,borderRadius:3,background:C.borderLight,overflow:"hidden",marginBottom:3}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:barColor,transition:"width .6s ease"}}/>
      </div>
      {hint&&<div style={{fontSize:10.5,color:C.textMute,lineHeight:1.4}}>{hint}</div>}
    </div>
  );
}

export default function AIPanel({content,chId,onApply,onApplyHT}){
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

  const charPct=Math.min(100,(content.length/maxC)*100);
  const charColor=charPct>90?"#EF4444":charPct>70?"#F59E0B":"#22C55E";

  return(
    <div style={{background:`linear-gradient(160deg,${T.brand25},${T.brand50} 60%,${T.brand100})`,borderRadius:T.rLg,border:`1px solid ${T.brand200}`,overflow:"hidden",animation:"fadeIn .3s ease"}}>

      {/* ── Header ── */}
      <div style={{padding:"10px 14px",background:`linear-gradient(135deg,${T.brand100},${T.brand50})`,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.brand200}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,borderRadius:7,background:`linear-gradient(135deg,${T.brand600},${T.brand500})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 8px ${C.accentGlow}`}}>
            <Sparkles size={12} color="#fff" strokeWidth={2}/>
          </div>
          <span style={{fontFamily:FONT,fontWeight:700,fontSize:13,color:T.brand700}}>KI-Assistent</span>
          <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,color:"#fff",letterSpacing:".04em"}}>PRO</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:10.5,fontWeight:700,color:charColor,background:charColor+"12",padding:"2px 8px",borderRadius:10,border:`1px solid ${charColor}30`}}>
            {content.length}/{maxC}
          </div>
          <button onClick={getEmojis} disabled={ld||!content.trim()} style={{background:T.brand50,border:`1px solid ${T.brand200}`,borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer",color:T.brand700,fontWeight:600,fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}>
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
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.borderLight}`}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:`conic-gradient(${scoreData.total>=70?"#22C55E":scoreData.total>=45?"#F59E0B":"#EF4444"} ${scoreData.total*3.6}deg, #F0F0F0 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:13,fontWeight:900,color:scoreData.total>=70?"#22C55E":scoreData.total>=45?"#F59E0B":"#EF4444"}}>{scoreData.total}</span>
                </div>
              </div>
              <div>
                <div style={{fontWeight:500,fontSize:12,color:C.text}}>Content Score</div>
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
