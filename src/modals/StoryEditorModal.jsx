import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, ChevronLeft, ChevronRight, Type, Image, Film, Smile, Sliders, Eye, Save, Clock, Send, Check, Edit2, FileText, BookOpen } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW, CSS } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { uid, fileToDataURL, getMediaType } from "../utils/store.js";
import { Sp, Badge, Btn, FL, TIn } from "../components/ui/index.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── STORY EDITOR MODAL ─────────────────────────────────────────────────────
function StoryEditorModal(){
  const { edStory: story, items, saveStory: onSave, setEdStory, uploadItem: onUpload, convertSection: onConvertSection } = useApp();
  const onClose = () => setEdStory(null);
  const CATS=["","Politik","Wirtschaft","Tech","Sport","Lifestyle","Kultur","Gesundheit","Reise","Bildung","Andere"];
  const catColors={"Politik":"#3B82F6","Wirtschaft":"#10B981","Tech":"#8B5CF6","Sport":"#F59E0B","Lifestyle":"#EC4899","Kultur":"#6366F1","Gesundheit":"#EF4444","Reise":"#14B8A6","Bildung":"#F97316","Andere":"#6B7280"};
  const [form,setForm]=useState({...story,sections:story.sections?.map(s=>({...s}))||[]});
  const [picker,setPicker]=useState(false);
  const [autoSaved,setAutoSaved]=useState(null);
  const asRef=useRef();
  const cover=items.find(m=>m.id===form.coverMediaId);

  // Stats
  const allText=(form.sections||[]).map(s=>`${s.heading} ${s.content}`).join(" ");
  const wordCount=(allText).trim().split(/\s+/).filter(Boolean).length;
  const charCount=allText.length;

  // Auto-save: ref keeps latest form so timer fires with current data without resetting on every section edit
  const storyFormRef=useRef(form);
  storyFormRef.current=form;
  useEffect(()=>{
    clearTimeout(asRef.current);
    if(!form.title)return;
    asRef.current=setTimeout(()=>{
      const f=storyFormRef.current;
      onSave({...f,id:f.id||uid()});
      setAutoSaved(new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}));
    },30000);
    return()=>clearTimeout(asRef.current);
  },[form.title]);

  const addSection=()=>setForm(f=>({...f,sections:[...f.sections,{id:uid(),heading:"",content:""}]}));
  const updSec=(id,key,val)=>setForm(f=>({...f,sections:f.sections.map(s=>s.id===id?{...s,[key]:val}:s)}));
  const delSec=id=>setForm(f=>({...f,sections:f.sections.filter(s=>s.id!==id)}));
  const moveSec=(id,dir)=>setForm(f=>{
    const arr=[...f.sections];
    const i=arr.findIndex(s=>s.id===id);
    const j=i+dir;
    if(j<0||j>=arr.length)return f;
    [arr[i],arr[j]]=[arr[j],arr[i]];
    return{...f,sections:arr};
  });

  const handleSave=(status)=>onSave({...form,id:form.id||uid(),status});

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"stretch",justifyContent:"center",padding:0}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,width:"100%",maxWidth:1100,margin:"16px auto",borderRadius:16,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.22)",border:`1px solid ${C.border}`}}>

        {/* ── Top bar ── */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 20px",borderBottom:`1px solid ${C.borderLight}`,flexShrink:0,background:C.bg}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
            <BookOpen size={14} color={C.textMute} strokeWidth={2}/>
            <span style={{fontSize:10,color:C.textMute,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>
              {form.id?"Story bearbeiten":"Story erstellen"}
            </span>
            {form.category&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:(catColors[form.category]||"#6B7280")+"18",color:catColors[form.category]||"#6B7280",textTransform:"uppercase",letterSpacing:".04em"}}>{form.category}</span>}
            {autoSaved&&<span style={{fontSize:10,color:C.textMute}}>· AUTO-SAVE {autoSaved}</span>}
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center",background:C.borderLight,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px",fontSize:10,color:C.textMute}}>
            <span style={{fontWeight:700}}>{(form.sections||[]).length}</span> Abschnitte
            <span style={{color:C.border}}>·</span>
            <span style={{fontWeight:700}}>{wordCount}</span> Wörter
            <span style={{color:C.border}}>·</span>
            <span style={{fontWeight:700}}>{charCount}</span> Zeichen
          </div>
          <div style={{display:"flex",gap:6}}>
            <Btn variant="secondary" onClick={()=>handleSave("draft")} style={{fontSize:12}}><FileText size={12} strokeWidth={2}/>Entwurf</Btn>
            <Btn onClick={()=>handleSave("published")} style={{fontSize:12}}><Check size={12} strokeWidth={2.5}/>Veröffentlichen</Btn>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:4,marginLeft:4}}><X size={19} strokeWidth={2}/></button>
        </div>

        {/* ── Category row ── */}
        <div style={{padding:"6px 20px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",gap:4,alignItems:"center",overflowX:"auto",flexShrink:0}}>
          <span style={{fontSize:10,fontWeight:700,color:C.textMute,letterSpacing:".05em",flexShrink:0,marginRight:2}}>KATEGORIE</span>
          {CATS.filter(c=>c).map(cat=>(
            <button key={cat} onClick={()=>setForm(f=>({...f,category:f.category===cat?"":cat}))}
              style={{padding:"3px 10px",borderRadius:20,border:`1.5px solid ${form.category===cat?(catColors[cat]||"#6B7280"):C.border}`,background:form.category===cat?(catColors[cat]||"#6B7280")+"14":"transparent",color:form.category===cat?(catColors[cat]||"#6B7280"):C.textSoft,fontSize:10.5,fontWeight:700,cursor:"pointer",fontFamily:FONT,flexShrink:0,transition:"all .12s"}}>
              {cat}
            </button>
          ))}
        </div>

        {/* ── Main area ── */}
        <div style={{flex:1,overflow:"hidden",display:"flex"}}>

          {/* Left: content editor */}
          <div style={{flex:1,overflow:"auto",padding:"24px 32px",display:"flex",flexDirection:"column",gap:0}}>
            {/* Title */}
            <input value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              placeholder="Story-Titel…"
              style={{width:"100%",border:"none",outline:"none",fontSize:28,fontWeight:800,fontFamily:FONT_DISPLAY,color:C.text,background:"transparent",letterSpacing:"-.02em",lineHeight:1.2,marginBottom:8,padding:0}}/>
            {/* Subtitle */}
            <input value={form.subtitle||""} onChange={e=>setForm(f=>({...f,subtitle:e.target.value}))}
              placeholder="Untertitel / Zusammenfassung…"
              style={{width:"100%",border:"none",outline:"none",fontSize:15,fontFamily:FONT,color:C.textSoft,background:"transparent",lineHeight:1.4,marginBottom:24,padding:0,fontWeight:400}}/>

            {/* Sections */}
            {(form.sections||[]).length===0&&(
              <div style={{textAlign:"center",padding:"40px 20px",border:`2px dashed ${C.border}`,borderRadius:12,color:C.textMute}}>
                <FileText size={32} strokeWidth={1} style={{margin:"0 auto 10px",display:"block",opacity:.35}}/>
                <div style={{fontSize:13,fontWeight:600,color:C.textMid,marginBottom:4}}>Noch keine Abschnitte</div>
                <div style={{fontSize:12,marginBottom:12}}>Füge Abschnitte hinzu um deine Story zu strukturieren</div>
                <Btn onClick={addSection}><Plus size={13} strokeWidth={2.5}/>Abschnitt hinzufügen</Btn>
              </div>
            )}
            {(form.sections||[]).map((sec,i)=>(
              <div key={sec.id} style={{marginBottom:20,borderLeft:`3px solid ${C.border}`,paddingLeft:16,transition:"border-color .15s"}}
                onFocus={e=>e.currentTarget.style.borderColor=C.accent}
                onBlur={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".05em",flexShrink:0}}>Abschnitt {i+1}</span>
                  <div style={{flex:1}}/>
                  {/* Move up/down */}
                  <button onClick={()=>moveSec(sec.id,-1)} disabled={i===0} style={{background:"none",border:"none",color:i===0?C.borderLight:C.textSoft,cursor:i===0?"default":"pointer",padding:"2px 4px",fontSize:12}}>↑</button>
                  <button onClick={()=>moveSec(sec.id,1)} disabled={i===(form.sections.length-1)} style={{background:"none",border:"none",color:i===(form.sections.length-1)?C.borderLight:C.textSoft,cursor:i===(form.sections.length-1)?"default":"pointer",padding:"2px 4px",fontSize:12}}>↓</button>
                  {/* Convert to post */}
                  <button onClick={()=>onConvertSection(sec,form)} title="Zu Post konvertieren"
                    style={{background:C.accentLight,border:"none",borderRadius:6,color:C.accent,fontSize:10,fontWeight:700,padding:"3px 8px",cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:3}}>
                    <Send size={9} strokeWidth={2.5}/>Post
                  </button>
                  {/* Delete */}
                  <button onClick={()=>delSec(sec.id)} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:"2px 4px"}}><X size={13} strokeWidth={2}/></button>
                </div>
                {/* Heading */}
                <input value={sec.heading||""} onChange={e=>updSec(sec.id,"heading",e.target.value)}
                  placeholder="Überschrift (optional)…"
                  style={{width:"100%",border:"none",outline:"none",fontSize:16,fontWeight:700,fontFamily:FONT,color:C.text,background:"transparent",padding:0,marginBottom:6,letterSpacing:"-.01em"}}/>
                {/* Content */}
                <textarea value={sec.content||""} onChange={e=>updSec(sec.id,"content",e.target.value)}
                  placeholder="Text…"
                  style={{width:"100%",minHeight:80,border:"none",outline:"none",fontSize:13.5,fontFamily:FONT,color:C.textMid,background:"transparent",padding:0,resize:"none",lineHeight:1.7,boxSizing:"border-box"}}
                  onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}/>
              </div>
            ))}
            {(form.sections||[]).length>0&&(
              <button onClick={addSection} style={{display:"flex",alignItems:"center",gap:7,border:`1.5px dashed ${C.border}`,borderRadius:10,padding:"10px 16px",background:"transparent",color:C.textSoft,cursor:"pointer",fontFamily:FONT,fontSize:13,fontWeight:600,marginTop:4,transition:"all .15s",width:"100%",justifyContent:"center"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSoft;}}>
                <Plus size={14} strokeWidth={2.5}/>Abschnitt hinzufügen
              </button>
            )}
          </div>

          {/* Right: cover + meta */}
          <div style={{width:260,flexShrink:0,borderLeft:`1px solid ${C.borderLight}`,padding:"20px 16px",overflow:"auto",display:"flex",flexDirection:"column",gap:14,background:C.bg}}>
            {/* Cover image */}
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>Cover-Bild</div>
              {cover?(
                <div style={{position:"relative",borderRadius:10,overflow:"hidden"}}>
                  <img src={cover.url} alt="" style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
                  <div style={{position:"absolute",top:6,right:6,display:"flex",gap:4}}>
                    <button onClick={()=>setPicker(true)} style={{background:"rgba(255,255,255,.9)",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:3}}><Edit2 size={9} strokeWidth={2}/>Ändern</button>
                    <button onClick={()=>setForm(f=>({...f,coverMediaId:null}))} style={{background:"rgba(255,255,255,.9)",border:"none",borderRadius:6,padding:"4px",cursor:"pointer"}}><X size={11} strokeWidth={2}/></button>
                  </div>
                </div>
              ):(
                <button onClick={()=>setPicker(true)} style={{width:"100%",height:110,border:`1.5px dashed ${C.border}`,borderRadius:10,background:"transparent",color:C.textSoft,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,fontFamily:FONT,transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSoft;}}>
                  <Image size={20} strokeWidth={1.5}/>
                  <span style={{fontSize:11,fontWeight:600}}>Cover auswählen</span>
                </button>
              )}
            </div>
            {/* Tags */}
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>Tags</div>
              <input value={form.tags||""} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}
                placeholder="tag1, tag2…"
                style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
            </div>
            {/* Status */}
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>Status</div>
              <div style={{display:"flex",gap:5}}>
                {[["draft","Entwurf",C.warning],["published","Veröffentlicht",C.success]].map(([v,l,c])=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,status:v}))}
                    style={{flex:1,padding:"6px 0",borderRadius:7,border:`1.5px solid ${form.status===v?c:C.border}`,background:form.status===v?c+"14":"transparent",color:form.status===v?c:C.textSoft,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Created */}
            <div style={{fontSize:11,color:C.textMute}}>Erstellt: {form.createdAt||new Date().toLocaleDateString("de-DE")}</div>
            {/* Alle Sektionen zu Posts */}
            {(form.sections||[]).length>0&&(
              <div style={{marginTop:"auto",paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>Quick-Aktionen</div>
                <button onClick={()=>(form.sections||[]).forEach(sec=>onConvertSection(sec,form))}
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.accent}`,background:C.accentLight,color:C.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <Send size={12} strokeWidth={2}/>Alle Abschnitte → Posts
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {picker&&<MediaPicker items={items} posts={[]} onSelect={item=>{setForm(f=>({...f,coverMediaId:item.id}));setPicker(false);}} onUpload={onUpload} onUpdate={()=>{}} onClose={()=>setPicker(false)}/>}
    </div>
  );
}
export default StoryEditorModal;
