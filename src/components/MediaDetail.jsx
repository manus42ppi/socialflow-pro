import { useState, useRef } from "react";
import { BarChart2, Check, X, FileText, Tag, MapPin, Sparkles, ExternalLink, Download } from "lucide-react";
import { C, T, FONT, IW, TYPO } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { AI } from "../utils/store.js";
import { Sp, Btn, Card, FL, TIn } from "./ui/index.jsx";
import ChIco from "./ui/ChIco.jsx";

export default function MediaDetail({item,onSave,onUpdate,onClose}){
  const [form,setForm]=useState({...item});
  const [fp,setFp]=useState(item.focusPoint||{x:50,y:50});
  const [fmode,setFmode]=useState(false);
  const [aiLd,setAiLd]=useState(false);
  const [aiData,setAiData]=useState(item.aiAnalysis||null);
  const [aiFailed,setAiFailed]=useState(false);
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
    setAiFailed(false);
    try{
      const r=await AI.analyzeImg(form.url);
      setAiData(r);
      const newFp=r.focalPoint?{x:r.focalPoint.x,y:r.focalPoint.y}:fp;
      const updated={
        ...form,
        tags: r.tags?.join(", ")||form.tags,
        description: r.description||form.description,
        altText: r.suggestedAlt||form.altText,
        mood: r.mood||form.mood,
        aiAnalysis: r,
        focusPoint: newFp,
      };
      setForm(updated);
      if(r.focalPoint) setFp(newFp);
      // Auto-persist so analysis survives modal close / page reload
      if(onUpdate) onUpdate(updated);
    }catch(e){console.error(e); setAiFailed(true);}
    setAiLd(false);
  };

  const scoreColor=s=>s>=80?"#22C55E":s>=55?"#F59E0B":"#EF4444";
  // Normalisiert altes Format (string) und neues Format ({rating, reason})
  const normFitEntry=raw=>{
    if(!raw) return {rating:"schlecht",reason:""};
    if(typeof raw==="string"){const v=raw.toLowerCase();return {rating:v==="gut"||v==="sehr gut"||v==="good"?"gut":v==="ok"||v==="mittel"?"ok":"schlecht",reason:""};}
    const v=(raw.rating||"").toLowerCase();
    return {rating:v==="gut"||v==="sehr gut"?"gut":v==="ok"||v==="mittel"?"ok":"schlecht",reason:raw.reason||""};
  };
  const fitColors={gut:{fg:"#16A34A",bg:"#F0FDF4",border:"#BBF7D0"},ok:{fg:"#D97706",bg:"#FFFBEB",border:"#FDE68A"},schlecht:{fg:"#DC2626",bg:"#FEF2F2",border:"#FECACA"}};
  const fitLabel={gut:"Sehr gut geeignet",ok:"Mit Anpassungen geeignet",schlecht:"Nicht geeignet"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{width:"100%",maxWidth:840,maxHeight:"93vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.22)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderBottom:`1px solid ${C.borderLight}`,flexShrink:0}}>
          <div style={{...TYPO.title}}>Medien-Details</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
        </div>

        <div style={{flex:1,overflow:"hidden",display:"flex"}}>

          {/* ── Left: image + focal point + AI trigger ── */}
          <div style={{width:300,flexShrink:0,background:C.bg,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.borderLight}`}}>
            {/* ── PDF preview (document type) ── */}
            {form.type==="document"&&(
              <div style={{width:"100%",height:340,background:"#F8F9FA",position:"relative",flexShrink:0,borderBottom:`1px solid ${C.borderLight}`}}>
                {form.url&&!form.url.startsWith("data:")
                  ?<iframe
                      src={form.url}
                      title={form.name}
                      style={{width:"100%",height:"100%",border:"none",display:"block"}}
                    />
                  :<div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"16px"}}>
                      <div style={{width:64,height:64,borderRadius:14,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <FileText size={32} strokeWidth={1.2} color="#6366F1"/>
                      </div>
                      <div style={{fontSize:11.5,color:T.gray500,textAlign:"center",fontFamily:FONT,lineHeight:1.5,maxWidth:220}}>
                        {form.name}<br/>
                        <span style={{color:T.gray400,fontSize:10.5}}>Lokale Datei – Vorschau nicht verfügbar</span>
                      </div>
                    </div>
                }
              </div>
            )}

            {/* ── Image / Video preview ── */}
            {form.type!=="document"&&(
              <div style={{position:"relative",flexShrink:0}}>
                {form.type==="video"
                  ?<video src={form.url} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}} controls muted/>
                  :<img ref={imgRef} src={form.url} alt=""
                    style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block",userSelect:"none"}}/>
                }
                {/* Transparent overlay to capture focus-point clicks — sits above img and color palette */}
                {fmode&&<div onMouseDown={imgMD}
                  style={{position:"absolute",inset:0,zIndex:10,cursor:"crosshair"}}/>}
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
            )}

            {/* Controls */}
            <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8,flex:1,overflow:"auto"}}>
              {/* Document: open in browser / download */}
              {form.type==="document"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {form.url&&!form.url.startsWith("data:")&&(
                    <a href={form.url} target="_blank" rel="noreferrer"
                      style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderRadius:8,
                        border:`1px solid ${C.border}`,background:C.surface,color:C.textMid,
                        fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,
                        justifyContent:"center",textDecoration:"none",transition:"border-color .12s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                      <ExternalLink size={13} strokeWidth={2}/>Im Browser öffnen
                    </a>
                  )}
                  {form.url&&!form.url.startsWith("data:")&&(
                    <a href={form.url} download={form.name}
                      style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderRadius:8,
                        border:`1px solid ${C.border}`,background:C.surface,color:C.textMid,
                        fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,
                        justifyContent:"center",textDecoration:"none",transition:"border-color .12s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                      <Download size={13} strokeWidth={2}/>Herunterladen
                    </a>
                  )}
                  {form.url?.startsWith("data:")&&(
                    <div style={{fontSize:11,color:"#92400E",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:7,padding:"8px 10px",lineHeight:1.5}}>
                      ⚠️ Lokal hochgeladen — Vorschau nur für dich verfügbar.
                    </div>
                  )}
                </div>
              )}

              {/* Focal point toggle — images only */}
              {form.type!=="document"&&(
                <button onMouseDown={e=>{e.stopPropagation();setFmode(v=>!v);}} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderRadius:8,border:`1px solid ${fmode?C.accent:C.border}`,background:fmode?C.accentLight:C.surface,color:fmode?C.accent:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,justifyContent:"center"}}>
                  <MapPin size={13} strokeWidth={2}/>{fmode?`Klicke aufs Bild · ${fp.x}% / ${fp.y}%`:"Fokuspunkt setzen"}
                </button>
              )}

              {/* AI Analyse Button — images only */}
              {form.type!=="video"&&form.type!=="document"&&(
                <Btn variant="ai" size="sm" onClick={runAI} disabled={aiLd} style={{justifyContent:"center"}}>
                  {aiLd?<><Sp/>Analysiere Bild…</>:<><Sparkles size={13} strokeWidth={2}/>KI-Vollanalyse</>}
                </Btn>
              )}
              {aiFailed&&!aiLd&&(
                <div style={{fontSize:10.5,color:"#C4511E",background:"#FFF0E6",borderRadius:7,
                  border:"1px solid #FDDCB5",padding:"5px 9px",lineHeight:1.4}}>
                  ⚠️ KI nicht verfügbar (nur auf der Live-Site)
                </div>
              )}

              {/* AI subjects detected */}
              {aiData?.subjects?.length>0&&(
                <div style={{padding:"8px 10px",background:"#fff",borderRadius:8,border:`1px solid ${C.border}`}}>
                  <div style={{...TYPO.nano,marginBottom:5}}>Erkannte Elemente</div>
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
              {(form.type==="document"
                ?[["meta","📝 Metadaten"]]
                :[["meta","📝 Metadaten"],["score","📊 Bild-Score"],["platforms","📱 Plattform-Fit"]]
              ).map(([id,label])=>(
                <button key={id} onClick={()=>setActiveTab(id)} style={{padding:"10px 16px",border:"none",borderBottom:`2px solid ${activeTab===id?C.accent:"transparent"}`,background:"transparent",color:activeTab===id?C.accent:C.textMid,fontWeight:activeTab===id?700:500,...TYPO.caption,cursor:"pointer",fontFamily:FONT,transition:"all .12s"}}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{flex:1,overflow:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>

              {/* ── META TAB ── */}
              {activeTab==="meta"&&<>
                <TIn label="Dateiname" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
                {/* File info row: type, extension, resolution, size */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"8px 10px",
                  background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:10.5,fontWeight:700,color:C.textMid,background:C.borderLight,
                    padding:"2px 8px",borderRadius:10,textTransform:"uppercase"}}>{form.type}</span>
                  {form.name&&<span style={{fontSize:10.5,color:C.textSoft}}>
                    {form.name.split(".").pop().toUpperCase()}
                  </span>}
                  {form.width>0&&form.height>0&&<span style={{fontSize:10.5,color:C.textSoft,fontWeight:600}}>
                    {form.width} × {form.height} px
                  </span>}
                  {form.size>0&&<span style={{fontSize:10.5,color:C.textSoft}}>
                    {form.size>=1048576?`${(form.size/1048576).toFixed(1)} MB`:`${Math.round(form.size/1024)} KB`}
                  </span>}
                </div>
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
                        <div style={{...TYPO.nano,color:C.purple,marginBottom:7}}>💡 Verbesserungen</div>
                        {aiData.improvements.map((tip,i)=>(
                          <div key={i} style={{...TYPO.caption,color:C.textMid,display:"flex",gap:6,marginBottom:5,lineHeight:1.5}}>
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
                  ?<div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{fontSize:12,color:C.textSoft,marginBottom:2}}>KI-Bewertung: Eignung des Bildes je Plattform mit Begründung.</div>
                    {Object.entries(aiData.platformFit).map(([plat,raw])=>{
                      const ch=CHANNELS.find(c=>c.id===plat||c.id===plat.replace("twitter","x"));
                      if(!ch)return null;
                      const {rating,reason}=normFitEntry(raw);
                      const col=fitColors[rating];
                      const icon=rating==="gut"?"✅":rating==="ok"?"🟡":"⚠️";
                      return(
                        <div key={plat} style={{borderRadius:10,border:`1px solid ${col.border}`,background:col.bg,overflow:"hidden"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
                            <ChIco id={ch.id} size={20}/>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:700,fontSize:13,color:C.text}}>{ch.label}</div>
                              <div style={{fontSize:11,color:col.fg,fontWeight:600}}>{fitLabel[rating]}</div>
                            </div>
                            <span style={{fontSize:12,fontWeight:700,color:col.fg,background:"rgba(255,255,255,.7)",padding:"3px 10px",borderRadius:20,border:`1px solid ${col.border}`,whiteSpace:"nowrap"}}>{icon} {rating}</span>
                          </div>
                          {reason&&<div style={{padding:"0 14px 10px 44px",fontSize:11.5,color:C.textMid,lineHeight:1.55}}>{reason}</div>}
                        </div>
                      );
                    })}
                    <div style={{padding:"10px 12px",background:C.bg,borderRadius:9,border:`1px solid ${C.border}`,fontSize:11.5,color:C.textSoft,lineHeight:1.6,marginTop:2}}>
                      💡 <strong>Optimale Formate:</strong> 1:1 oder 4:5 (Instagram Feed), 9:16 (Reels/TikTok), 1.91:1 (LinkedIn/Facebook/Twitter).
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
