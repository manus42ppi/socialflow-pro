import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, BookOpen, Sparkles, Search, Calendar, Image, FileText, Send, ChevronDown, X, Check, Upload, Edit2 } from "lucide-react";
import { C, CSS, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { uid, fpos } from "../utils/store.js";
import { AI } from "../utils/store.js";
import { Sp, Btn, Card, FL, TIn } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { PREV } from "../components/previews/index.jsx";
import AIPanel from "../components/AIPanel.jsx";
import MediaPicker, { STOCK_SRCS, skGet, stockSearch } from "../components/StockSearch.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function Editor(){
  const { edPost: post, items, posts: allPosts, campaigns, save: onSave, setEdPost, uploadItem: onUpload, updateItem: onUpdate, user } = useApp();
  const posts = allPosts ?? [];
  const onClose = () => setEdPost(null);
  // Migrate: merge legacy hashtags field into content
  const initContent = post.hashtags
    ? (post.content+(post.content?"\n\n":"")+post.hashtags).trim()
    : (post.content||"");
  const [form,setForm]=useState({...post, content:initContent, channelTexts:post.channelTexts||{}});
  const [pch,setPch]=useState(post.channels?.[0]||"instagram");
  const [rightPane,setRightPane]=useState("preview");
  const [picker,setPicker]=useState(false);
  const [convOpen,setConvOpen]=useState({}); // which channel konverter sections are open
  const [autoSaved,setAutoSaved]=useState(null); // timestamp of last auto-save
  const autoSaveRef=useRef();
  // Research panel state
  const [rQ,setRQ]=useState("");
  const [rRes,setRRes]=useState([]);
  const [rLdg,setRLdg]=useState(false);
  const rTimer=useRef();
  const rKeys=useMemo(()=>({unsplash:skGet("unsplash"),pexels:skGet("pexels"),pixabay:skGet("pixabay")}),[]);
  const rHasKeys=STOCK_SRCS.some(s=>rKeys[s.id]);
  useEffect(()=>{
    clearTimeout(rTimer.current);
    if(!rQ.trim()){setRRes([]);return;}
    const active=STOCK_SRCS.filter(s=>rKeys[s.id]);
    if(!active.length)return;
    rTimer.current=setTimeout(async()=>{
      setRLdg(true);
      const results=await Promise.all(active.map(s=>stockSearch(s.id,rQ).then(r=>r||[]).catch(()=>[])));
      setRRes(results.flat().slice(0,24));
      setRLdg(false);
    },500);
    return()=>clearTimeout(rTimer.current);
  },[rQ,rKeys]);
  const media=items.find(m=>m.id===form.mediaId);
  const PC=PREV[pch]||PREV.instagram;
  const maxC=form.channels?.length>0?Math.min(...form.channels.map(id=>CHANNELS.find(c=>c.id===id)?.maxChars||9999)):9999;
  const togCh=id=>setForm(f=>({...f,channels:f.channels?.includes(id)?f.channels.filter(c=>c!==id):[...(f.channels||[]),id]}));
  const isAdm=user.role==="admin";
  const charLen=form.content?.length||0;
  const charPct=maxC<9999?charLen/maxC*100:0;
  const charColor=charPct>90?C.accent:charPct>70?"#F59E0B":C.textMute;

  // Content stats
  const wordCount=(form.content||"").trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount=(form.content||"").split(/[.!?]+/).filter(s=>s.trim()).length;
  const lineCount=(form.content||"").split("\n").filter(Boolean).length||0;

  // Auto-save: saves draft every 30 seconds if there's content
  // Use a ref to always capture the latest form without re-scheduling the timer
  const formRef=useRef(form);
  formRef.current=form;
  useEffect(()=>{
    clearTimeout(autoSaveRef.current);
    if(!form.content&&!form.title)return;
    autoSaveRef.current=setTimeout(()=>{
      const f=formRef.current;
      onSave({...f,status:f.status==="published"?f.status:"draft"});
      setAutoSaved(new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}));
    },30000);
    return()=>clearTimeout(autoSaveRef.current);
  },[form.content,form.title]);

  // Category presets
  const CATS=["","Politik","Wirtschaft","Tech","Sport","Lifestyle","Kultur","Gesundheit","Reise","Bildung","Andere"];
  const catColors={"Politik":"#3B82F6","Wirtschaft":"#10B981","Tech":"#8B5CF6","Sport":"#F59E0B","Lifestyle":"#EC4899","Kultur":"#6366F1","Gesundheit":"#EF4444","Reise":"#14B8A6","Bildung":"#F97316","Andere":"#6B7280"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:1060,maxHeight:"94vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)",border:`1px solid ${C.border}`}}>

        {/* Modal top bar */}
        <div style={{flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:`1px solid ${C.borderLight}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
              <h2 style={{margin:0,fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:C.text,letterSpacing:"-.01em",flexShrink:0}}>{form.id?"Post bearbeiten":"Neuer Post"}</h2>
              {/* Category badge */}
              {form.category&&<span style={{fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,background:(catColors[form.category]||"#6B7280")+"18",color:catColors[form.category]||"#6B7280",flexShrink:0,textTransform:"uppercase",letterSpacing:".04em"}}>{form.category}</span>}
              {/* Auto-save indicator */}
              {autoSaved&&<span style={{fontSize:10,color:C.textMute,fontWeight:500}}>· AUTO-SAVE: {autoSaved}</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {/* Content stats */}
              {charLen>0&&<div style={{display:"flex",gap:6,alignItems:"center",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 9px",fontSize:10,color:C.textMute,flexShrink:0}}>
                <span>{wordCount} Wörter</span>
                <span style={{color:C.borderLight}}>·</span>
                <span>{charLen} Z.</span>
                <span style={{color:C.borderLight}}>·</span>
                <span>{sentenceCount} Sätze</span>
              </div>}
              <div style={{display:"flex",gap:3,background:C.bg,borderRadius:9,padding:3,border:`1px solid ${C.border}`}}>
                {[["preview","Vorschau",Eye],["research","Recherche",BookOpen],["ai","KI-Assistent",Sparkles]].map(([id,label,Ic])=>(
                  <button key={id} onClick={()=>setRightPane(id)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:7,border:"none",background:rightPane===id?(id==="ai"?`linear-gradient(135deg,${C.ai1},${C.ai2})`:C.surface):"transparent",color:rightPane===id?(id==="ai"?"#fff":C.text):C.textSoft,fontWeight:700,fontSize:11.5,cursor:"pointer",fontFamily:FONT,boxShadow:rightPane===id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .15s"}}>
                    <Ic size={11} strokeWidth={2}/>{label}
                    {id==="ai"&&<span style={{fontSize:9,fontWeight:700,padding:"0 5px",borderRadius:8,background:rightPane==="ai"?"rgba(255,255,255,.25)":C.purpleGlow,color:rightPane==="ai"?"#fff":C.purple}}>PRO</span>}
                  </button>
                ))}
              </div>
              <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:4}}><X size={19} strokeWidth={2}/></button>
            </div>
          </div>
          {/* Category selector row */}
          <div style={{padding:"6px 20px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",gap:4,alignItems:"center",overflowX:"auto",flexShrink:0,background:C.bg}}>
            <span style={{fontSize:10,fontWeight:700,color:C.textMute,letterSpacing:".04em",flexShrink:0,marginRight:2}}>KATEGORIE</span>
            {CATS.filter(c=>c).map(cat=>(
              <button key={cat} onClick={()=>setForm(f=>({...f,category:f.category===cat?"":cat}))}
                style={{padding:"3px 10px",borderRadius:20,border:`1.5px solid ${form.category===cat?(catColors[cat]||"#6B7280"):C.border}`,background:form.category===cat?(catColors[cat]||"#6B7280")+"14":"transparent",color:form.category===cat?(catColors[cat]||"#6B7280"):C.textSoft,fontSize:10.5,fontWeight:700,cursor:"pointer",fontFamily:FONT,flexShrink:0,transition:"all .12s"}}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{flex:1,overflow:"hidden",display:"flex"}}>

          {/* LEFT: Form */}
          <div style={{flex:1,overflow:"auto",padding:"16px 20px",borderRight:`1px solid ${C.borderLight}`,display:"flex",flexDirection:"column",gap:11}}>

            <div><FL>Kanäle</FL>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {CHANNELS.map(c=>(
                  <button key={c.id} onClick={()=>togCh(c.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,border:`1.5px solid ${form.channels?.includes(c.id)?c.color:C.border}`,background:form.channels?.includes(c.id)?c.color+"12":"#fff",color:form.channels?.includes(c.id)?c.color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,transition:"all .12s"}}>
                    <ChIco id={c.id} size={13}/>{c.label}
                  </button>
                ))}
              </div>
            </div>

            {campaigns?.length>0&&<div><FL>Kampagne (optional)</FL>
              <select value={form.campaignId||""} onChange={e=>setForm(f=>({...f,campaignId:e.target.value||null}))} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT,color:C.text}}>
                <option value="">— Keine Kampagne —</option>
                {campaigns.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>}

            <TIn label="Titel (intern)" icon={FileText} placeholder="Kurzer Arbeitstitel…" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/>

            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <FL style={{margin:0}}>Text</FL>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,fontWeight:600,color:charColor}}>{charLen}{maxC<9999?`/${maxC}`:""}</span>
                  {maxC<9999&&<div style={{width:36,height:4,borderRadius:2,background:C.borderLight,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,charPct)}%`,background:charColor,borderRadius:2,transition:"width .2s"}}/></div>}
                </div>
              </div>
              <textarea value={form.content||""} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Was möchtest du teilen?" style={{width:"100%",minHeight:110,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:FONT,resize:"vertical",boxSizing:"border-box",color:C.text,lineHeight:1.6}}/>
              {charLen>5&&charLen<40&&rightPane!=="ai"&&(
                <div onClick={()=>setRightPane("ai")} style={{marginTop:4,fontSize:11,color:C.purple,cursor:"pointer",display:"flex",alignItems:"center",gap:4,opacity:.75}}>
                  <Sparkles size={11} strokeWidth={2}/>KI-Assistent: Text optimieren, Hooks oder Varianten generieren →
                </div>
              )}
            </div>

            <div><FL>Mediendatei</FL>
              {media?(
                <div style={{display:"flex",gap:10,alignItems:"center",background:C.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.border}`}}>
                  <img src={media.url} alt="" style={{width:44,height:44,objectFit:"cover",objectPosition:fpos(media),borderRadius:6,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{media.name}</div>
                    <div style={{fontSize:11,color:C.textMute}}>{media.type}</div>
                  </div>
                  <Btn size="sm" variant="secondary" onClick={()=>setPicker(true)}><Edit2 size={11} strokeWidth={2}/>Ändern</Btn>
                  <button onClick={()=>setForm({...form,mediaId:null})} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={16} strokeWidth={2}/></button>
                </div>
              ):(
                <button onClick={()=>setPicker(true)} style={{width:"100%",padding:12,borderRadius:8,border:`1.5px dashed ${C.border}`,background:C.bg,color:C.textSoft,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT,transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSoft;}}>
                  <Image size={16} strokeWidth={IW}/>Aus Medienbibliothek wählen oder hochladen
                </button>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <TIn label="Datum" type="date" value={form.scheduledDate||""} onChange={e=>setForm({...form,scheduledDate:e.target.value})}/>
              <TIn label="Uhrzeit" type="time" value={form.scheduledTime||"12:00"} onChange={e=>setForm({...form,scheduledTime:e.target.value})}/>
            </div>

            {/* ── Social Konverter: per-channel text adaptation ── */}
            {(form.channels||[]).length>0&&(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{flex:1,height:1,background:C.borderLight}}/>
                  <span style={{fontSize:10,fontWeight:800,color:C.textMute,letterSpacing:".06em",flexShrink:0}}>KANAL-ANPASSUNG</span>
                  <div style={{flex:1,height:1,background:C.borderLight}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(form.channels||[]).map(chId=>{
                    const ch=CHANNELS.find(c=>c.id===chId);
                    if(!ch)return null;
                    const maxCh=ch.maxChars||9999;
                    const chText=form.channelTexts?.[chId]||"";
                    const isOpen=convOpen[chId]??false;
                    const chLen=chText.length;
                    const hasCustom=!!chText;
                    return(
                      <div key={chId} style={{border:`1.5px solid ${isOpen?ch.color+"50":C.border}`,borderRadius:10,overflow:"hidden",transition:"border-color .15s"}}>
                        {/* Header */}
                        <div onClick={()=>setConvOpen(p=>({...p,[chId]:!p[chId]}))}
                          style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",background:isOpen?ch.color+"08":C.surface,transition:"background .15s"}}>
                          <ChIco id={chId} size={14} color={isOpen?ch.color:C.textSoft}/>
                          <span style={{flex:1,fontSize:12,fontWeight:700,color:isOpen?ch.color:C.textMid}}>{ch.label}</span>
                          {hasCustom&&<span style={{fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:5,background:ch.color+"15",color:ch.color}}>Angepasst</span>}
                          {!hasCustom&&<span style={{fontSize:9.5,color:C.textMute}}>Haupttext</span>}
                          <ChevronDown size={13} color={C.textMute} strokeWidth={2} style={{transform:isOpen?"rotate(180deg)":"none",transition:"transform .15s"}}/>
                        </div>
                        {/* Body */}
                        {isOpen&&(
                          <div style={{padding:"10px 12px",borderTop:`1px solid ${C.borderLight}`,background:C.bg}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                              <span style={{fontSize:10,color:C.textMute}}>Spezifischer Text für {ch.label} (optional)</span>
                              <div style={{display:"flex",gap:5}}>
                                {!hasCustom&&<button onClick={()=>setForm(f=>({...f,channelTexts:{...f.channelTexts,[chId]:f.content||""}}))}
                                  style={{fontSize:10,fontWeight:600,color:C.accent,background:"none",border:"none",cursor:"pointer",fontFamily:FONT,padding:0}}>← Haupttext übernehmen</button>}
                                {hasCustom&&<button onClick={()=>setForm(f=>{const t={...f.channelTexts};delete t[chId];return{...f,channelTexts:t};})}
                                  style={{fontSize:10,fontWeight:600,color:C.textSoft,background:"none",border:"none",cursor:"pointer",fontFamily:FONT,padding:0}}>✕ Zurücksetzen</button>}
                                {hasCustom&&maxCh<9999&&<span style={{fontSize:10,fontWeight:600,color:chLen>maxCh?C.red:chLen>maxCh*.8?"#F59E0B":C.textMute}}>{chLen}/{maxCh}</span>}
                              </div>
                            </div>
                            <textarea
                              value={chText}
                              onChange={e=>setForm(f=>({...f,channelTexts:{...f.channelTexts,[chId]:e.target.value}}))}
                              placeholder={`Leer lassen → Haupttext wird verwendet\n(max. ${maxCh<9999?maxCh+"  Zeichen":"unbegrenzt"})`}
                              style={{width:"100%",minHeight:80,padding:"8px 10px",borderRadius:8,border:`1px solid ${chLen>maxCh?C.red:C.border}`,fontSize:12,outline:"none",fontFamily:FONT,resize:"vertical",boxSizing:"border-box",color:C.text,lineHeight:1.55,background:C.surface}}/>
                            {maxCh<9999&&chLen>0&&(
                              <div style={{height:3,borderRadius:99,marginTop:5,background:C.borderLight,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${Math.min(100,chLen/maxCh*100)}%`,background:chLen>maxCh?C.red:chLen>maxCh*.8?"#F59E0B":ch.color,borderRadius:99,transition:"width .2s"}}/>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Preview or AI */}
          <div style={{width:320,flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden",background:rightPane==="ai"?`linear-gradient(170deg,${C.purpleBg} 0%,#fff 60%)`:C.bg,minWidth:0}}>
            <div style={{flex:1,overflow:"auto",padding:"14px 13px"}}>

              {/* PREVIEW */}
              {rightPane==="preview"&&<>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                  {CHANNELS.map(c=>(
                    <button key={c.id} onClick={()=>setPch(c.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:6,border:`1.5px solid ${pch===c.id?c.color:C.border}`,background:pch===c.id?c.color:"#fff",color:pch===c.id?"#fff":C.textSoft,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                      <ChIco id={c.id} size={11}/>{c.label}
                    </button>
                  ))}
                </div>
                <Card style={{padding:10}}><PC post={form} media={media}/></Card>
                <div onClick={()=>setRightPane("ai")} style={{marginTop:10,padding:"10px 12px",borderRadius:10,border:`1px dashed ${C.purple}45`,background:C.purpleGlow+"35",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.purpleGlow+"70"}
                  onMouseLeave={e=>e.currentTarget.style.background=C.purpleGlow+"35"}>
                  <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 8px ${C.purpleGlow}`}}>
                    <Sparkles size={14} color="#fff" strokeWidth={2}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.purple,marginBottom:1}}>KI-Assistent öffnen →</div>
                    <div style={{fontSize:10.5,color:C.textSoft,lineHeight:1.4}}>Score · Hooks · Varianten · Hashtags</div>
                  </div>
                </div>
              </>}

              {/* AI PANEL */}
              {rightPane==="ai"&&(
                form.channels?.length>0
                  ?<AIPanel content={form.content||""} chId={form.channels[0]} onApply={t=>setForm(f=>({...f,content:t}))} onApplyHT={t=>setForm(f=>({...f,content:(f.content+(f.content?"\n\n":"")+t).trim()}))}/>
                  :<div style={{textAlign:"center",padding:"48px 20px",color:C.textMute}}>
                    <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${C.ai1}20,${C.ai2}10)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
                      <Sparkles size={22} strokeWidth={1.5} color={C.purple} style={{opacity:.5}}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:C.textSoft,marginBottom:6}}>Kanal auswählen</div>
                    <div style={{fontSize:12,lineHeight:1.5}}>Wähle mindestens einen Kanal links aus, um den KI-Assistenten zu nutzen.</div>
                  </div>
              )}

              {/* RESEARCH PANEL */}
              {rightPane==="research"&&(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {/* Search field */}
                  <div style={{position:"relative"}}>
                    <Search size={12} color={C.textMute} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}/>
                    {rLdg&&<div style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",width:11,height:11,border:`2px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>}
                    <input value={rQ} onChange={e=>setRQ(e.target.value)} placeholder="Bilder suchen…"
                      style={{width:"100%",padding:"7px 32px 7px 28px",borderRadius:8,border:`1.5px solid ${rQ?C.accent:C.border}`,fontSize:12,outline:"none",fontFamily:FONT,boxSizing:"border-box",transition:"border-color .15s"}}/>
                  </div>
                  {/* State: no keys */}
                  {!rHasKeys&&<div style={{textAlign:"center",padding:"28px 12px",border:`1.5px dashed ${C.border}`,borderRadius:10,color:C.textMute}}>
                    <BookOpen size={28} strokeWidth={1} style={{margin:"0 auto 8px",display:"block",opacity:.4}}/>
                    <div style={{fontWeight:700,fontSize:12,color:C.textMid,marginBottom:4}}>Keine API-Keys konfiguriert</div>
                    <div style={{fontSize:11,lineHeight:1.5}}>Konfiguriere Unsplash, Pexels oder Pixabay in der Medienbibliothek um Bilder zu suchen.</div>
                  </div>}
                  {/* State: no query */}
                  {rHasKeys&&!rQ&&<div style={{textAlign:"center",padding:"28px 12px",color:C.textMute}}>
                    <Search size={28} strokeWidth={1} style={{margin:"0 auto 8px",display:"block",opacity:.35}}/>
                    <div style={{fontSize:12,color:C.textSoft}}>Suche nach Bildern für deinen Post</div>
                  </div>}
                  {/* Results grid */}
                  {rHasKeys&&rQ&&!rLdg&&rRes.length===0&&<div style={{textAlign:"center",padding:"20px 0",fontSize:12,color:C.textMute}}>Keine Treffer für „{rQ}"</div>}
                  {rRes.length>0&&(
                    <div style={{columns:"2 120px",columnGap:6}}>
                      {rRes.map(item=>{
                        const already=items.some(m=>m.url===item.url);
                        return(
                          <div key={item.id} style={{position:"relative",borderRadius:7,overflow:"hidden",marginBottom:6,breakInside:"avoid",cursor:"pointer",background:C.borderLight}}
                            onClick={()=>{
                              if(!already){
                                const newItem={...item,id:uid(),analyzing:false};
                                onUpload(newItem);
                                setForm(f=>({...f,mediaId:newItem.id}));
                              } else {
                                const existing=items.find(m=>m.url===item.url);
                                if(existing)setForm(f=>({...f,mediaId:existing.id}));
                              }
                            }}>
                            <img src={item.url} alt={item.name||""} style={{width:"100%",height:"auto",display:"block"}} loading="lazy"/>
                            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",transition:"background .15s"}}
                              onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,.45)";}}
                              onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0)";}}>
                              <div style={{position:"absolute",bottom:5,left:5,right:5,display:"flex",justifyContent:"space-between",alignItems:"center",opacity:0,transition:"opacity .15s"}}
                                onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.parentElement.style.background="rgba(0,0,0,.45)";}}
                                onMouseLeave={e=>{e.currentTarget.style.opacity=0;e.currentTarget.parentElement.style.background="rgba(0,0,0,0)";}}>
                                <span style={{fontSize:9,color:"rgba(255,255,255,.75)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}}>{item.author||""}</span>
                                {already
                                  ?<span style={{fontSize:9,fontWeight:700,color:C.success,background:"rgba(0,0,0,.6)",borderRadius:4,padding:"2px 5px",display:"flex",alignItems:"center",gap:2}}><Check size={8} strokeWidth={3}/>Verwendet</span>
                                  :<span style={{fontSize:9,fontWeight:700,color:"#fff",background:C.accent,borderRadius:4,padding:"2px 6px"}}>Verwenden</span>}
                              </div>
                            </div>
                            {already&&<div style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:C.success,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <Check size={9} color="#fff" strokeWidth={3}/>
                            </div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{padding:"12px 13px",borderTop:`1px solid ${C.borderLight}`,background:C.surface,display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="secondary" onClick={onClose} style={{flex:1,justifyContent:"center",fontSize:12}}>Abbrechen</Btn>
                <Btn variant="secondary" onClick={()=>onSave({...form,id:form.id||uid(),status:"draft"})} style={{flex:1,justifyContent:"center",fontSize:12}}><FileText size={12} strokeWidth={IW}/>Entwurf</Btn>
              </div>
              {isAdm
                ?<Btn onClick={()=>onSave({...form,id:form.id||uid(),status:form.scheduledDate?"scheduled":"draft"})} style={{width:"100%",justifyContent:"center"}}><Calendar size={13} strokeWidth={IW}/>{form.scheduledDate?"Planen":"Speichern"}</Btn>
                :<Btn onClick={()=>onSave({...form,id:form.id||uid(),status:"pending"})} style={{width:"100%",justifyContent:"center"}}><Send size={13} strokeWidth={IW}/>Zur Freigabe senden</Btn>
              }
            </div>
          </div>
        </div>
      </div>
      {picker&&<MediaPicker items={items} posts={posts} onSelect={item=>{setForm(f=>({...f,mediaId:item.id}));setPicker(false);}} onUpload={onUpload} onUpdate={onUpdate} onClose={()=>setPicker(false)}/>}
    </div>
  );
}
