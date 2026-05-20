import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Upload, Settings, Image, Check, Trash2, Edit2, AlertTriangle, CheckSquare, X, BookmarkPlus, Bookmark, ChevronDown, Loader } from "lucide-react";
import { C, FONT, IW } from "../constants/colors.js";
import { AI } from "../utils/store.js";
import { uid, fileToDataURL, getMediaType, fpos } from "../utils/store.js";
import { Btn, SBadge } from "../components/ui/index.jsx";
import MediaDetail from "../components/MediaDetail.jsx";
import { STOCK_SRCS, skGet, skSet, stockSearch, SrcBadge, FP, Skeletons, StockKeyPanel } from "../components/StockSearch.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function MediaPage(){
  const { items, posts: allPosts, uploadItem: onUpload, updateItem: onUpdate, deleteItems: onDelete, currentWorkspaceId } = useApp();
  const posts = allPosts ?? [];
  const [q,setQ]=useState(""); const [f,setF]=useState("all");
  const [flt,setFlt]=useState({type:"",orient:"",sort:"relevant"});
  const [drag,setDrag]=useState(false); const [det,setDet]=useState(null);
  const [extRes,setExtRes]=useState({});
  const [ldg,setLdg]=useState({});
  const [showKeys,setShowKeys]=useState(false);
  const [keys,setKeys]=useState({unsplash:skGet("unsplash"),pexels:skGet("pexels"),pixabay:skGet("pixabay")});
  const [batchMode,setBatchMode]=useState(false);
  const [sel,setSel]=useState(new Set());
  const [delConfirm,setDelConfirm]=useState(null); // {ids,futurePosts}
  const [showFilterRow,setShowFilterRow]=useState(true);
  const [savedPresets,setSavedPresets]=useState(()=>{try{return JSON.parse(localStorage.getItem("media_filter_presets")||"[]");}catch{return[];}});
  const [presetName,setPresetName]=useState("");
  const [showPresetInput,setShowPresetInput]=useState(false);
  const ref=useRef(); const timer=useRef();

  // Reset local filter/search/selection when workspace changes
  useEffect(() => {
    setQ("");
    setF("all");
    setDet(null);
    setSel(new Set());
    setBatchMode(false);
  }, [currentWorkspaceId]);

  const savePreset=()=>{
    const name=presetName.trim()||`Filter ${savedPresets.length+1}`;
    const next=[...savedPresets,{id:Date.now(),name,flt:{...flt},f}];
    setSavedPresets(next);
    localStorage.setItem("media_filter_presets",JSON.stringify(next));
    setPresetName("");setShowPresetInput(false);
  };
  const deletePreset=id=>{
    const next=savedPresets.filter(p=>p.id!==id);
    setSavedPresets(next);
    localStorage.setItem("media_filter_presets",JSON.stringify(next));
  };
  const applyPreset=p=>{setFlt(p.flt);setF(p.f);};

  const upload=useCallback(async files=>{
    for(const file of Array.from(files)){
      const url=await fileToDataURL(file);
      const id=uid();
      const mtype=getMediaType(file);
      let width=0,height=0;
      if(mtype==="image"){
        try{
          await new Promise(res=>{
            const img=new Image();
            img.onload=()=>{width=img.naturalWidth;height=img.naturalHeight;res();};
            img.onerror=()=>res();
            img.src=url;
          });
        }catch{}
      }
      const item={id,name:file.name,url,type:mtype,size:file.size,date:new Date().toLocaleDateString("de"),tags:"",description:"",altText:"",category:"",focusPoint:{x:50,y:50},mood:"",analyzing:mtype==="image",width,height,workspaceId:currentWorkspaceId||"ws-ppi-media"};
      onUpload(item);
      if(mtype==="image"){
        const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),30000));
        Promise.race([AI.analyzeImg(url),timeout])
          .then(r=>{onUpdate({...item,analyzing:false,tags:Array.isArray(r.tags)?r.tags.join(", "):"",description:r.description||"",altText:r.suggestedAlt||"",mood:r.mood||"",focusPoint:r.focalPoint?{x:r.focalPoint.x,y:r.focalPoint.y}:{x:50,y:50},aiAnalysis:r});})
          .catch(()=>onUpdate({...item,analyzing:false,aiError:true}));
      } else { onUpdate({...item,analyzing:false}); }
    }
  },[onUpload,onUpdate]);

  const saveKey=(id,v)=>{skSet(id,v);setKeys(p=>({...p,[id]:v}));};

  // Add external image to library — with duplicate guard
  const addToLib=async ext=>{
    // Guard: check by URL (primary) or by stock-source id (secondary, handles URL param variants)
    const isDup = items.some(m =>
      m.url === ext.url ||
      (ext.id && (m.stockId === ext.id || m.id === ext.id))
    );
    if (isDup) return; // already in library → silent no-op
    if(ext.source==="unsplash"&&ext.dlLoc){const k=skGet("unsplash");if(k)fetch(ext.dlLoc,{headers:{Authorization:`Client-ID ${k}`}}).catch(()=>{});}
    const item={...ext,id:uid(),stockId:ext.id||null,analyzing:ext.type==="image",workspaceId:currentWorkspaceId||"ws-ppi-media"};
    onUpload(item);
    if(item.type==="image"){
      const timeout2=new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),30000));
      Promise.race([AI.analyzeImg(item.url),timeout2])
        .then(r=>{onUpdate({...item,analyzing:false,tags:Array.isArray(r.tags)?r.tags.join(", "):(item.tags||""),description:r.description||item.description||"",altText:r.suggestedAlt||item.altText||"",mood:r.mood||"",focusPoint:r.focalPoint?{x:r.focalPoint.x,y:r.focalPoint.y}:{x:50,y:50},aiAnalysis:r});})
        .catch(()=>onUpdate({...item,analyzing:false,aiError:true}));
    } else {
      onUpdate({...item,analyzing:false});
    }
  };

  // Unified search – all configured sources in parallel
  useEffect(()=>{
    clearTimeout(timer.current);
    if(!q.trim()){setExtRes({});setLdg({});return;}
    const active=STOCK_SRCS.filter(s=>keys[s.id]);
    if(!active.length)return;
    timer.current=setTimeout(()=>{
      const ls={};active.forEach(s=>ls[s.id]=true);setLdg(ls);setExtRes({});
      active.forEach(async s=>{
        const res=await stockSearch(s.id,q,{orientation:flt.orient,type:flt.type,sort:flt.sort});
        setExtRes(p=>({...p,[s.id]:res||[]}));
        setLdg(p=>({...p,[s.id]:false}));
      });
    },500);
    return()=>clearTimeout(timer.current);
  },[q,flt,keys]);

  const usedIn=id=>posts.filter(p=>p.mediaId===id);

  // Delete helpers
  const getFuturePosts=ids=>{
    const now=new Date();
    return posts.filter(p=>ids.includes(p.mediaId)&&p.scheduledDate&&new Date(p.scheduledDate)>now);
  };
  const requestDelete=ids=>{
    const fp=getFuturePosts(ids);
    if(fp.length>0){setDelConfirm({ids,futurePosts:fp});}
    else{onDelete&&onDelete(ids);setBatchMode(false);setSel(new Set());}
  };
  const confirmDelete=()=>{
    if(!delConfirm)return;
    onDelete&&onDelete(delConfirm.ids);
    setDelConfirm(null);setBatchMode(false);setSel(new Set());
  };
  const toggleSel=id=>setSel(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const selAll=()=>setSel(new Set(list.map(i=>i.id)));
  const selNone=()=>setSel(new Set());

  const hasKeys=STOCK_SRCS.some(s=>keys[s.id]);
  const activeSrcs=STOCK_SRCS.filter(s=>keys[s.id]);
  const anyLdg=Object.values(ldg).some(Boolean);
  const searching=q.trim().length>0;

  // Local library filtered list
  const mediaMatchPage=(m,q)=>{if(!q.trim())return true;const s=q.toLowerCase();return[m.name,m.tags,m.description,m.altText,m.mood,m.category,m.author].some(f=>(f||"").toLowerCase().includes(s));};
  const list=items.filter(m=>mediaMatchPage(m,q)&&(f==="all"||m.type===f));

  // ── Unsplash-style tile for library items ──
  const LibTile=({item})=>{
    const used=usedIn(item.id);
    const [hov,setHov]=useState(false);
    const isSel=sel.has(item.id);
    const handleClick=e=>{
      if(batchMode){toggleSel(item.id);}
      else{setDet(item);}
    };
    return(
      <div style={{borderRadius:8,overflow:"hidden",cursor:"pointer",position:"relative",breakInside:"avoid",marginBottom:8,background:C.borderLight,outline:isSel?`2.5px solid ${C.accent}`:"none"}}
        onClick={handleClick}
        onMouseEnter={()=>setHov(true)}
        onMouseLeave={()=>setHov(false)}>
        {item.type==="video"
          ?<video src={item.url} style={{width:"100%",height:"auto",display:"block"}} muted/>
          :<img src={item.url} alt={item.name} style={{width:"100%",height:"auto",display:"block"}} loading="lazy"/>}
        {/* Analyzing overlay */}
        {item.analyzing&&<div style={{position:"absolute",inset:0,zIndex:1,background:"rgba(0,0,0,.55)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,borderRadius:10}}>
          <div style={{width:22,height:22,border:`3px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          <div style={{color:"#fff",fontSize:10,fontWeight:700,letterSpacing:.3}}>KI analysiert…</div>
        </div>}
        {/* KI-Fehler-Badge */}
        {item.aiError&&!item.analyzing&&<div style={{position:"absolute",top:8,left:8,background:"rgba(196,81,30,.88)",color:"#fff",fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:10,backdropFilter:"blur(4px)",pointerEvents:"none"}}>KI ✕</div>}
        {/* Batch mode: checkbox top-left (always visible) */}
        {batchMode&&<div style={{position:"absolute",top:8,left:8,width:20,height:20,borderRadius:6,background:isSel?C.accent:"rgba(255,255,255,.85)",border:`2px solid ${isSel?C.accent:"rgba(0,0,0,.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",transition:"all .12s"}}>
          {isSel&&<Check size={12} color="#fff" strokeWidth={3}/>}
        </div>}
        {/* Hover overlay – Unsplash-style (only in normal mode) */}
        {!batchMode&&<div style={{position:"absolute",inset:0,borderRadius:10,background:hov?"linear-gradient(180deg,rgba(0,0,0,.38) 0%,transparent 40%,transparent 55%,rgba(0,0,0,.52) 100%)":"none",transition:"all .18s",pointerEvents:hov?"auto":"none"}}>
          {/* Top row */}
          {hov&&<div style={{position:"absolute",top:10,left:10,right:10,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            {used.length>0
              ?<div title={used.map(p=>p.title).join(" · ")} style={{background:"rgba(0,0,0,.6)",color:"#fff",fontSize:9,fontWeight:800,padding:"3px 8px",borderRadius:20,backdropFilter:"blur(4px)",display:"flex",alignItems:"center",gap:3}}>
                <Check size={8} strokeWidth={3}/>{used.length} Post{used.length!==1?"s":""}
              </div>
              :<div/>}
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              {/* Delete button */}
              <div onClick={e=>{e.stopPropagation();requestDelete([item.id]);}} title="Löschen"
                style={{width:28,height:28,borderRadius:8,background:"rgba(220,40,40,.85)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)",cursor:"pointer"}}>
                <Trash2 size={12} color="#fff" strokeWidth={2.5}/>
              </div>
              <div onClick={e=>{e.stopPropagation();setDet(item);}} style={{background:"rgba(255,255,255,.92)",borderRadius:8,padding:"5px 8px",display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:C.text,backdropFilter:"blur(6px)",cursor:"pointer"}}>
                <Edit2 size={11} strokeWidth={2}/>Details
              </div>
            </div>
          </div>}
          {/* Bottom row */}
          {hov&&<div style={{position:"absolute",bottom:10,left:10,right:10}}>
            <div style={{color:"#fff",fontSize:11,fontWeight:600,textShadow:"0 1px 3px rgba(0,0,0,.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
            {item.tags&&<div style={{color:"rgba(255,255,255,.7)",fontSize:9.5,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.tags}</div>}
          </div>}
        </div>}
        {/* Usage badge – hidden on hover (hover overlay shows full label top-left) */}
        {!batchMode&&used.length>0&&!item.analyzing&&!hov&&<div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.68)",color:"#fff",fontSize:9,fontWeight:800,padding:"3px 7px",borderRadius:20,backdropFilter:"blur(4px)",display:"flex",alignItems:"center",gap:3,pointerEvents:"none"}}>
          <Check size={8} strokeWidth={3}/>{used.length}
        </div>}
        {/* Bottom-left metadata row: source + type + resolution */}
        {!batchMode&&!item.analyzing&&!hov&&(
          <div style={{position:"absolute",bottom:8,left:8,display:"flex",gap:4,alignItems:"center",pointerEvents:"none",flexWrap:"nowrap"}}>
            {item.source&&<SrcBadge source={item.source}/>}
            <div style={{background:"rgba(0,0,0,.58)",color:"#fff",fontSize:8.5,fontWeight:800,padding:"2px 6px",borderRadius:10,backdropFilter:"blur(4px)",letterSpacing:".04em"}}>
              {(item.name?.split(".").pop()||item.type||"").toUpperCase().slice(0,4)||item.type?.toUpperCase()}
            </div>
            {item.width>0&&item.height>0&&<div style={{background:"rgba(0,0,0,.45)",color:"rgba(255,255,255,.8)",fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:10,backdropFilter:"blur(4px)"}}>
              {item.width}×{item.height}
            </div>}
          </div>
        )}
      </div>
    );
  };

  // ── Unsplash-style tile for external stock results ──
  const ExtTile=({item})=>{
    const s=STOCK_SRCS.find(x=>x.id===item.source);
    const already=items.some(m=>m.url===item.url||(item.id&&(m.stockId===item.id||m.id===item.id)));
    const [hov,setHov]=useState(false);
    const [adding,setAdding]=useState(false);
    // Use provided aspect ratio if available (Unsplash/Pexels provide width+height)
    const ar=item.width&&item.height?`${item.width}/${item.height}`:undefined;
    return(
      <div style={{borderRadius:8,overflow:"hidden",cursor:"pointer",position:"relative",breakInside:"avoid",marginBottom:10,background:C.borderLight,outline:already?`2px solid ${C.accent}`:"none"}}
        onMouseEnter={()=>setHov(true)}
        onMouseLeave={()=>setHov(false)}>
        {item.type==="video"
          ?<img src={item.previewUrl||""} alt="" style={{width:"100%",aspectRatio:ar||"4/3",objectFit:"cover",display:"block"}}/>
          :<img src={item.url} alt={item.name} style={{width:"100%",height:"auto",aspectRatio:ar,display:"block"}} loading="lazy"/>}
        {/* Video play icon */}
        {item.type==="video"&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.85)",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{width:0,height:0,borderTop:"6px solid transparent",borderBottom:"6px solid transparent",borderLeft:`11px solid ${C.text}`,marginLeft:3}}/>
        </div>}
        {/* Hover overlay */}
        <div style={{position:"absolute",inset:0,borderRadius:8,background:hov?"linear-gradient(180deg,rgba(0,0,0,.35) 0%,transparent 40%,transparent 55%,rgba(0,0,0,.55) 100%)":"none",transition:"all .18s",pointerEvents:hov?"auto":"none"}}>
          {/* Top row */}
          {hov&&<div style={{position:"absolute",top:8,right:8}}>
            {already
              ?<div style={{background:"rgba(255,255,255,.92)",borderRadius:8,padding:"5px 8px",display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:C.success}}>
                <Check size={11} strokeWidth={2.5}/>In Bibliothek
              </div>
              :<div onClick={e=>{e.stopPropagation();if(adding)return;setAdding(true);addToLib(item).finally(()=>setAdding(false));}} style={{background:"rgba(255,255,255,.92)",borderRadius:8,padding:"5px 8px",display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:adding?C.textMute:C.text,cursor:adding?"default":"pointer",backdropFilter:"blur(6px)",opacity:adding?.7:1}}>
                {adding?<Loader size={11} strokeWidth={2} style={{animation:"spin 1s linear infinite"}}/>:<Upload size={11} strokeWidth={2}/>}{adding?"…":"Hinzufügen"}
              </div>}
          </div>}
          {/* Bottom row: author + source */}
          {hov&&<div style={{position:"absolute",bottom:8,left:8,right:8,display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:6}}>
            {item.author&&<div style={{color:"rgba(255,255,255,.85)",fontSize:10,fontWeight:600,textShadow:"0 1px 3px rgba(0,0,0,.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📷 {item.author}</div>}
            {s&&<div style={{flexShrink:0,background:"rgba(0,0,0,.55)",borderRadius:20,padding:"2px 6px",display:"flex",alignItems:"center",gap:3}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:s.dot}}/><span style={{color:"#fff",fontSize:8,fontWeight:700}}>{s.label}</span>
            </div>}
          </div>}
        </div>
        {/* Source badge when not hovered */}
        {!hov&&s&&<div style={{position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,.5)",borderRadius:20,padding:"2px 5px",display:"flex",alignItems:"center",gap:3}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:s.dot}}/><span style={{color:"#fff",fontSize:8,fontWeight:700}}>{s.label}</span>
        </div>}
        {/* Already-in-library badge */}
        {already&&!hov&&<div style={{position:"absolute",top:6,left:6,background:C.success,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Check size={10} color="#fff" strokeWidth={3}/>
        </div>}
      </div>
    );
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column",gap:0}}>

      {/* ── Toolbar ── */}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
        {/* Search input */}
        <div style={{position:"relative",flex:1,minWidth:220}}>
          <Search size={13} color={C.textMute} strokeWidth={IW} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Suche in Bibliothek, Unsplash, Pexels & Pixabay…"
            style={{width:"100%",padding:"8px 34px 8px 30px",borderRadius:8,border:`1.5px solid ${searching?C.accent:C.border}`,fontSize:12,outline:"none",fontFamily:FONT,boxSizing:"border-box",transition:"border-color .15s",background:C.surface,color:C.text}}/>
          {/* Clear button or loading spinner */}
          {anyLdg
            ?<div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,border:`2px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            :q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",alignItems:"center",color:C.textMute,borderRadius:4}} title="Löschen"
              onMouseEnter={e=>e.currentTarget.style.color=C.text} onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>
              <X size={13} strokeWidth={2.5}/>
            </button>}
        </div>
        {/* Type filter tabs */}
        <div style={{display:"flex",gap:3,background:C.borderLight,borderRadius:7,padding:3,flexShrink:0}}>
          {[["all","Alle"],["image","Bilder"],["video","Videos"],["logo","Logos"]].map(([t,l])=>(
            <button key={t} onClick={()=>setF(t)} style={{padding:"5px 11px",borderRadius:5,border:"none",background:f===t?C.surface:"transparent",color:f===t?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>{l}</button>
          ))}
        </div>
        {/* Filter toggle */}
        <button onClick={()=>setShowFilterRow(v=>!v)} style={{background:showFilterRow?C.accent+"12":"none",border:`1px solid ${showFilterRow?C.accent+"44":C.border}`,borderRadius:7,color:showFilterRow?C.accent:C.textSoft,cursor:"pointer",padding:"6px 11px",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:5,fontFamily:FONT,flexShrink:0}}>
          <Settings size={12} strokeWidth={2}/>Filter
          <ChevronDown size={11} strokeWidth={2.5} style={{transform:showFilterRow?"rotate(180deg)":"none",transition:"transform .15s"}}/>
        </button>
        {/* API-Keys button */}
        <button onClick={()=>setShowKeys(s=>!s)} style={{background:showKeys?C.borderLight:"none",border:`1px solid ${C.border}`,borderRadius:7,color:showKeys?C.text:C.textSoft,cursor:"pointer",padding:"6px 11px",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:5,fontFamily:FONT,flexShrink:0}}>
          <Settings size={12} strokeWidth={2}/>API-Keys
          {hasKeys&&<span style={{width:6,height:6,borderRadius:"50%",background:C.success,display:"inline-block"}}/>}
        </button>
        {!batchMode
          ?<><Btn onClick={()=>ref.current?.click()}><Upload size={13} strokeWidth={2}/>Hochladen</Btn>
             {list.length>0&&<Btn variant="secondary" onClick={()=>{setBatchMode(true);setSel(new Set());}}><CheckSquare size={13} strokeWidth={2}/>Auswählen</Btn>}</>
          :<div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:C.textMid}}>{sel.size} ausgewählt</span>
            <button onClick={sel.size===list.length?selNone:selAll} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.textSoft,fontSize:11,fontWeight:600,padding:"4px 9px",cursor:"pointer",fontFamily:FONT}}>
              {sel.size===list.length?"Keine":"Alle"}
            </button>
            <button disabled={sel.size===0} onClick={()=>requestDelete([...sel])}
              style={{background:sel.size>0?"#e53e3e":"#e53e3e44",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,padding:"5px 12px",cursor:sel.size>0?"pointer":"default",display:"flex",alignItems:"center",gap:5,fontFamily:FONT}}>
              <Trash2 size={12} strokeWidth={2.5}/>{sel.size>0?`${sel.size} löschen`:"Löschen"}
            </button>
            <button onClick={()=>{setBatchMode(false);setSel(new Set());}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.textSoft,fontSize:11,fontWeight:600,padding:"4px 9px",cursor:"pointer",fontFamily:FONT}}>Abbrechen</button>
          </div>}
        <input ref={ref} type="file" multiple accept="image/*,video/*" style={{display:"none"}} onChange={e=>upload(e.target.files)}/>
      </div>

      {/* ── API key panel ── */}
      {showKeys&&<div style={{marginBottom:12}}><StockKeyPanel keys={keys} onSave={saveKey}/></div>}

      {/* ── Filter row (collapsible, always available) ── */}
      {showFilterRow&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:12,flexShrink:0}}>
          {/* Saved presets row */}
          {savedPresets.length>0&&(
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.borderLight}`}}>
              <span style={{fontSize:10,fontWeight:800,color:C.textMute,letterSpacing:".04em",flexShrink:0}}>GESPEICHERT</span>
              {savedPresets.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:0,borderRadius:20,overflow:"hidden",border:`1px solid ${C.border}`}}>
                  <button onClick={()=>applyPreset(p)} style={{padding:"3px 10px",background:C.bg,border:"none",fontSize:11,fontWeight:600,color:C.textMid,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:4}}>
                    <Bookmark size={9} strokeWidth={2.5}/>{p.name}
                  </button>
                  <button onClick={()=>deletePreset(p.id)} style={{padding:"3px 7px",background:C.bg,border:"none",borderLeft:`1px solid ${C.border}`,cursor:"pointer",color:C.textMute,display:"flex",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.color="#e53e3e"} onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>
                    <X size={9} strokeWidth={3}/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Filter controls */}
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:600,color:C.textSoft,flexShrink:0}}>Typ</span>
            <FP val={flt.type} onChange={v=>setFlt(f=>({...f,type:v}))} opts={[{v:"",l:"Alle"},{v:"photo",l:"Foto"},{v:"video",l:"Video"},{v:"illustration",l:"Illustration"},{v:"vector",l:"Vektor"}]}/>
            <div style={{width:1,height:16,background:C.border,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:C.textSoft,flexShrink:0}}>Format</span>
            <FP val={flt.orient} onChange={v=>setFlt(f=>({...f,orient:v}))} opts={[{v:"",l:"Alle"},{v:"landscape",l:"Quer"},{v:"portrait",l:"Hoch"},{v:"square",l:"Quadrat"}]}/>
            <div style={{width:1,height:16,background:C.border,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:C.textSoft,flexShrink:0}}>Sortierung</span>
            <FP val={flt.sort} onChange={v=>setFlt(f=>({...f,sort:v}))} opts={[{v:"relevant",l:"Relevant"},{v:"popular",l:"Beliebt"},{v:"latest",l:"Neueste"}]}/>
            <div style={{flex:1}}/>
            {/* Save preset */}
            {showPresetInput?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input value={presetName} onChange={e=>setPresetName(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")savePreset();if(e.key==="Escape"){setShowPresetInput(false);setPresetName("");}}}
                  placeholder="Filter-Name…" autoFocus
                  style={{padding:"4px 10px",borderRadius:6,border:`1.5px solid ${C.accent}`,fontSize:12,outline:"none",fontFamily:FONT,color:C.text,width:130}}/>
                <button onClick={savePreset} style={{background:C.accent,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,padding:"5px 11px",cursor:"pointer",fontFamily:FONT}}>Speichern</button>
                <button onClick={()=>{setShowPresetInput(false);setPresetName("");}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.textSoft,fontSize:11,padding:"5px 9px",cursor:"pointer",fontFamily:FONT}}><X size={11} strokeWidth={2.5}/></button>
              </div>
            ):(
              <button onClick={()=>setShowPresetInput(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:6,border:`1px solid ${C.border}`,background:"none",color:C.textSoft,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"all .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent+"66";e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSoft;}}>
                <BookmarkPlus size={12} strokeWidth={2}/>Als Filter speichern
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Drop zone + content ── */}
      <div style={{flex:1}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files);}}>
        {drag&&<div style={{border:`2px dashed ${C.accent}`,borderRadius:10,padding:32,textAlign:"center",color:C.accent,marginBottom:12,background:C.accentLight}}><Upload size={24} style={{margin:"0 auto 6px",display:"block"}}/><div style={{fontWeight:700}}>Loslassen zum Hochladen</div></div>}

        <div style={{display:"flex",flexDirection:"column",gap:24}}>

          {/* ── Bibliothek section ── */}
          <div>
            {searching&&<div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
              <Image size={13} strokeWidth={2} color={C.textSoft}/>Bibliothek
              <span style={{background:C.borderLight,color:C.textMute,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{list.length}</span>
            </div>}
            {items.length===0&&!searching?(
              <div style={{textAlign:"center",padding:"80px 20px"}}>
                <Image size={52} color={C.textMute} strokeWidth={1} style={{margin:"0 auto 14px",display:"block"}}/>
                <div style={{fontSize:15,fontWeight:700,color:C.textMid}}>Noch keine Medien</div>
                <div style={{fontSize:13,color:C.textMute,marginTop:4,marginBottom:16}}>Dateien hochladen oder hierher ziehen</div>
                <Btn onClick={()=>ref.current?.click()}><Upload size={14} strokeWidth={2}/>Hochladen</Btn>
              </div>
            ):(
              list.length===0&&searching
                ?<div style={{padding:"20px 0",color:C.textMute,fontSize:12}}>Keine lokalen Treffer für „{q}"</div>
                :<div style={{columns:"5 140px",columnGap:8}}>
                  {list.map(item=><LibTile key={item.id} item={item}/>)}
                </div>
            )}
          </div>

          {/* ── No-keys hint (only when searching and no keys configured) ── */}
          {searching&&!hasKeys&&(
            <div style={{textAlign:"center",padding:"28px 20px",border:`1.5px dashed ${C.border}`,borderRadius:10,color:C.textMute}}>
              <div style={{fontWeight:500,fontSize:12,color:C.textMid,marginBottom:6}}>Bilddatenbanken verbinden</div>
              <div style={{fontSize:12,marginBottom:12}}>Verbinde Unsplash, Pexels oder Pixabay um Millionen lizenzfreier Bilder zu finden.</div>
              <Btn size="sm" variant="secondary" onClick={()=>setShowKeys(true)}><Settings size={12} strokeWidth={2}/>API-Keys einrichten</Btn>
            </div>
          )}

          {/* ── External source sections ── */}
          {searching&&activeSrcs.map(s=>{
            const res=extRes[s.id]; const isLdg=ldg[s.id];
            return(
              <div key={s.id}>
                <div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
                  {s.label}
                  {isLdg
                    ?<div style={{width:11,height:11,border:`2px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                    :res!=null&&<span style={{background:C.borderLight,color:C.textMute,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{res.length}</span>}
                </div>
                {isLdg?<Skeletons/>
                  :res?.length===0?<div style={{padding:"14px 12px",color:C.textMute,fontSize:12,textAlign:"center",background:C.bg,borderRadius:8}}>Keine Treffer für „{q}"</div>
                  :<div style={{columns:"5 140px",columnGap:8}}>
                    {(res||[]).map(item=><ExtTile key={item.id} item={item}/>)}
                  </div>}
              </div>
            );
          })}

        </div>
      </div>
      {det&&<MediaDetail item={det} onSave={u=>{onUpdate(u);setDet(null);}} onClose={()=>setDet(null)}/>}

      {/* ── Delete confirm modal ── */}
      {delConfirm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}} onClick={()=>setDelConfirm(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:14,padding:28,maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#fff0f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Trash2 size={18} color="#e53e3e" strokeWidth={2}/>
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:C.text}}>{delConfirm.ids.length===1?"Bild löschen":`${delConfirm.ids.length} Bilder löschen`}</div>
              <div style={{fontSize:12,color:C.textSoft}}>Diese Aktion kann nicht rückgängig gemacht werden.</div>
            </div>
          </div>
          <div style={{background:"#fff8f0",border:"1.5px solid #f6ad55",borderRadius:10,padding:"12px 14px",marginBottom:18}}>
            <div style={{fontWeight:700,fontSize:12,color:"#c05621",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
              <AlertTriangle size={13} strokeWidth={2.5}/>Verwendung in zukünftigen Posts
            </div>
            {delConfirm.futurePosts.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,paddingTop:5,borderTop:`1px solid #fbd38d`,marginTop:5}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||"Kein Titel"}</div>
                  <div style={{fontSize:11,color:C.textSoft}}>{p.scheduledDate}</div>
                </div>
                <SBadge status={p.status}/>
              </div>
            ))}
            <div style={{fontSize:11,color:"#c05621",marginTop:8}}>
              {delConfirm.futurePosts.length===1?"Dieser Post":"Diese Posts"} {delConfirm.futurePosts.length===1?"verliert":"verlieren"} das zugeordnete Bild.
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setDelConfirm(null)} style={{background:"none",border:`1.5px solid ${C.border}`,borderRadius:8,color:C.textSoft,fontWeight:600,fontSize:13,padding:"8px 18px",cursor:"pointer",fontFamily:FONT}}>Abbrechen</button>
            <button onClick={confirmDelete} style={{background:"#e53e3e",border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:13,padding:"8px 18px",cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:6}}>
              <Trash2 size={13} strokeWidth={2.5}/>Trotzdem löschen
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}
