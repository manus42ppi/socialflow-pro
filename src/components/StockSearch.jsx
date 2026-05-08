import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Upload, Settings, Image, X, Check } from "lucide-react";
import { C, FONT, IW } from "../constants/colors.js";
import { AI } from "../utils/store.js";
import { uid, fileToDataURL, getMediaType, fpos } from "../utils/store.js";
import { Btn, Card } from "./ui/index.jsx";

export const STOCK_SRCS=[
  {id:"unsplash",label:"Unsplash",dot:"#111111",keyUrl:"https://unsplash.com/developers"},
  {id:"pexels",  label:"Pexels",  dot:"#05A081",keyUrl:"https://www.pexels.com/api/"},
  {id:"pixabay", label:"Pixabay", dot:"#2EC261",keyUrl:"https://pixabay.com/api/docs/"},
];
export const skGet=id=>localStorage.getItem(`sf_sk_${id}`)||"";
export const skSet=(id,v)=>localStorage.setItem(`sf_sk_${id}`,v);
export async function stockSearch(src,q,{orientation="",type="",sort="relevant"}={}){
  if(!q.trim())return[];
  const k=skGet(src);
  if(!k)return null;
  try{
    const p=new URLSearchParams();
    if(src==="unsplash"){
      if(type==="video")return[];
      p.set("query",q);p.set("per_page","20");
      if(orientation==="landscape")p.set("orientation","landscape");
      else if(orientation==="portrait")p.set("orientation","portrait");
      else if(orientation==="square")p.set("orientation","squarish");
      if(sort==="latest")p.set("order_by","latest");
      const r=await fetch(`https://api.unsplash.com/search/photos?${p}`,{headers:{Authorization:`Client-ID ${k}`}});
      if(!r.ok)return[];
      const d=await r.json();
      return(d.results||[]).map(x=>({id:`un_${x.id}`,name:x.alt_description||x.id,url:x.urls.small,previewUrl:x.urls.thumb,type:"image",source:"unsplash",author:x.user.name,dlLoc:x.links.download_location,focusPoint:{x:50,y:50},date:new Date().toLocaleDateString("de"),tags:(x.tags||[]).map(t=>t.title).join(", "),description:x.description||x.alt_description||"",width:x.width,height:x.height}));
    }
    if(src==="pexels"){
      p.set("query",q);p.set("per_page","20");
      if(orientation==="landscape")p.set("orientation","landscape");
      else if(orientation==="portrait")p.set("orientation","portrait");
      else if(orientation==="square")p.set("orientation","square");
      if(type==="video"){
        const r=await fetch(`https://api.pexels.com/videos/search?${p}`,{headers:{Authorization:k}});
        if(!r.ok)return[];
        const d=await r.json();
        return(d.videos||[]).map(x=>{const vf=x.video_files?.find(f=>f.quality==="hd")||x.video_files?.[0];return{id:`px_v_${x.id}`,name:`Video ${x.id}`,url:vf?.link||"",previewUrl:x.image,type:"video",source:"pexels",author:x.user?.name||"",focusPoint:{x:50,y:50},date:new Date().toLocaleDateString("de"),tags:"",description:""};});
      }
      const r=await fetch(`https://api.pexels.com/v1/search?${p}`,{headers:{Authorization:k}});
      if(!r.ok)return[];
      const d=await r.json();
      return(d.photos||[]).map(x=>({id:`px_${x.id}`,name:x.alt||`Pexels ${x.id}`,url:x.src.medium,previewUrl:x.src.tiny,type:"image",source:"pexels",author:x.photographer,focusPoint:{x:50,y:50},date:new Date().toLocaleDateString("de"),tags:"",description:x.alt||"",width:x.width,height:x.height}));
    }
    if(src==="pixabay"){
      p.set("key",k);p.set("q",q);p.set("per_page","20");p.set("safesearch","true");
      if(orientation==="landscape")p.set("orientation","horizontal");
      else if(orientation==="portrait")p.set("orientation","vertical");
      if(sort==="latest")p.set("order","latest");
      else if(sort==="popular")p.set("order","popular");
      if(type==="video"){
        const r=await fetch(`https://pixabay.com/api/videos/?${p}`);
        if(!r.ok)return[];
        const d=await r.json();
        return(d.hits||[]).map(x=>({id:`pb_v_${x.id}`,name:x.tags||`Video ${x.id}`,url:x.videos?.medium?.url||x.videos?.small?.url||"",previewUrl:`https://i.vimeocdn.com/video/${x.picture_id}_295x166.jpg`,type:"video",source:"pixabay",author:x.user,focusPoint:{x:50,y:50},date:new Date().toLocaleDateString("de"),tags:x.tags||""}));
      }
      if(type==="illustration")p.set("image_type","illustration");
      else if(type==="vector")p.set("image_type","vector");
      else p.set("image_type","photo");
      const r=await fetch(`https://pixabay.com/api/?${p}`);
      if(!r.ok)return[];
      const d=await r.json();
      return(d.hits||[]).map(x=>({id:`pb_${x.id}`,name:x.tags||`Pixabay ${x.id}`,url:x.webformatURL,previewUrl:x.previewURL,type:"image",source:"pixabay",author:x.user,focusPoint:{x:50,y:50},date:new Date().toLocaleDateString("de"),tags:x.tags||"",description:x.tags||"",width:x.webformatWidth,height:x.webformatHeight}));
    }
  }catch{return[];}
  return[];
}

export function SrcBadge({source}){
  const s=STOCK_SRCS.find(x=>x.id===source);
  if(!s)return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:C.borderLight,color:C.textSoft,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:20,letterSpacing:".02em"}}>
    <div style={{width:5,height:5,borderRadius:"50%",background:s.dot,flexShrink:0}}/>{s.label}
  </span>;
}

export function FP({opts,val,onChange}){
  return <div style={{display:"flex",gap:2,background:C.borderLight,borderRadius:7,padding:3}}>
    {opts.map(o=><button key={o.v} onClick={()=>onChange(o.v===val?"":o.v)} style={{padding:"4px 11px",borderRadius:5,border:"none",background:val===o.v?C.surface:"transparent",color:val===o.v?C.text:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT,transition:"all .1s",whiteSpace:"nowrap",boxShadow:val===o.v?"0 1px 3px rgba(0,0,0,.07)":"none"}}>{o.l}</button>)}
  </div>;
}

const SKEL_HEIGHTS=[180,240,160,300,200,260,180,220,300,170];
export function Skeletons(){
  return <div style={{columns:"4 160px",columnGap:10}}>
    {SKEL_HEIGHTS.map((h,i)=><div key={i} style={{height:h,borderRadius:8,marginBottom:10,breakInside:"avoid",background:`linear-gradient(90deg,${C.borderLight} 0%,${C.border} 50%,${C.borderLight} 100%)`,backgroundSize:"200%",animation:"shimmer 1.4s infinite"}}/>)}
  </div>;
}

export function StockKeyPanel({keys,onSave}){
  return <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,background:C.bg,display:"flex",gap:12,flexShrink:0}}>
    {STOCK_SRCS.map(s=>(
      <div key={s.id} style={{flex:1}}>
        <div style={{fontSize:10.5,fontWeight:700,color:C.textMid,marginBottom:5,display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:keys[s.id]?C.success:C.border}}/>
          {s.label}
          <a href={s.keyUrl} target="_blank" rel="noreferrer" style={{fontSize:9,color:C.accent,textDecoration:"none",marginLeft:"auto"}}>Key holen →</a>
        </div>
        <input value={keys[s.id]} onChange={e=>onSave(s.id,e.target.value)} placeholder={`${s.label} API Key…`} type="password" style={{width:"100%",padding:"6px 9px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:11,outline:"none",fontFamily:FONT,boxSizing:"border-box",background:C.surface}}/>
      </div>
    ))}
  </div>;
}

export default function MediaPicker({items,posts=[],onSelect,onUpload,onUpdate,onClose}){
  const [q,setQ]=useState("");
  const [flt,setFlt]=useState({type:"",orient:"",sort:"relevant"});
  const [extRes,setExtRes]=useState({});
  const [ldg,setLdg]=useState({});
  const [showKeys,setShowKeys]=useState(false);
  const [keys,setKeys]=useState({unsplash:skGet("unsplash"),pexels:skGet("pexels"),pixabay:skGet("pixabay")});
  const ref=useRef(); const timer=useRef();

  const upload=useCallback(async files=>{
    for(const file of Array.from(files)){
      const url=await fileToDataURL(file);
      const id=uid();
      const item={id,name:file.name,url,type:getMediaType(file),size:file.size,date:new Date().toLocaleDateString("de"),tags:"",description:"",altText:"",category:"",focusPoint:{x:50,y:50},mood:"",analyzing:true};
      onUpload(item); onSelect(item);
      if(item.type==="image"){AI.analyzeImg(url).then(r=>{onUpdate({...item,analyzing:false,tags:Array.isArray(r.tags)?r.tags.join(", "):"",description:r.description||"",altText:r.suggestedAlt||"",mood:r.mood||"",focusPoint:r.focalPoint?{x:r.focalPoint.x,y:r.focalPoint.y}:{x:50,y:50},aiAnalysis:r});}).catch(()=>onUpdate({...item,analyzing:false}));}
      else{onUpdate({...item,analyzing:false});}
      return;
    }
  },[onUpload,onSelect,onUpdate]);

  const saveKey=(id,v)=>{skSet(id,v);setKeys(p=>({...p,[id]:v}));};
  const selectExt=async ext=>{
    if(ext.source==="unsplash"&&ext.dlLoc){const k=skGet("unsplash");if(k)fetch(ext.dlLoc,{headers:{Authorization:`Client-ID ${k}`}}).catch(()=>{});}
    const item={...ext,id:uid(),analyzing:ext.type==="image"};
    onUpload(item);onSelect(item);
    if(item.type==="image"){
      AI.analyzeImg(item.url).then(r=>{onUpdate({...item,analyzing:false,tags:Array.isArray(r.tags)?r.tags.join(", "):(item.tags||""),description:r.description||item.description||"",altText:r.suggestedAlt||item.altText||"",mood:r.mood||"",focusPoint:r.focalPoint?{x:r.focalPoint.x,y:r.focalPoint.y}:{x:50,y:50},aiAnalysis:r});}).catch(()=>onUpdate({...item,analyzing:false}));
    }
  };

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

  const mediaMatch=(m,q)=>{if(!q.trim())return true;const s=q.toLowerCase();return[m.name,m.tags,m.description,m.altText,m.mood,m.category,m.author].some(f=>(f||"").toLowerCase().includes(s));};
  const libList=items.filter(m=>mediaMatch(m,q));
  const usedIn=id=>posts.filter(p=>p.mediaId===id);
  const hasKeys=STOCK_SRCS.some(s=>keys[s.id]);
  const activeSrcs=STOCK_SRCS.filter(s=>keys[s.id]);
  const anyLdg=Object.values(ldg).some(Boolean);

  const Tile=({item,onClick})=>{
    const used=usedIn(item.id);
    const s=STOCK_SRCS.find(x=>x.id===item.source);
    return <div onClick={onClick} style={{borderRadius:8,overflow:"hidden",cursor:"pointer",border:"2px solid transparent",transition:"all .14s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
      onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
      <div style={{position:"relative",aspectRatio:"1/1",background:C.borderLight}}>
        {item.type==="video"
          ?<><img src={item.previewUrl||""} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,.85)",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:0,height:0,borderTop:"5px solid transparent",borderBottom:"5px solid transparent",borderLeft:`9px solid ${C.text}`,marginLeft:2}}/></div></div></>
          :<img src={item.url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:fpos(item),display:"block"}} loading="lazy"/>}
        {used.length>0&&<div title={used.map(p=>p.title).join(" · ")} style={{position:"absolute",top:4,left:4,background:"rgba(0,0,0,.65)",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:20,display:"flex",alignItems:"center",gap:2}}><Check size={7} strokeWidth={3}/>{used.length}×</div>}
        {s&&<div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.55)",borderRadius:20,padding:"2px 5px",display:"flex",alignItems:"center",gap:3}}><div style={{width:5,height:5,borderRadius:"50%",background:s.dot}}/><span style={{color:"#fff",fontSize:8,fontWeight:700}}>{s.label}</span></div>}
      </div>
      <div style={{padding:"4px 6px",background:C.surface}}>
        {item.author
          ?<div style={{fontSize:9.5,color:C.textMute,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📷 {item.author}</div>
          :<div style={{fontSize:9.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:used.length?C.textMid:C.textMute}}>{used.length?`📌 ${used.map(p=>p.title).join(", ")}`:item.name}</div>}
      </div>
    </div>;
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{width:"100%",maxWidth:900,maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.25)"}}>
        <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{flex:1,fontWeight:800,fontSize:15,color:C.text}}>Medium auswählen</div>
          <button onClick={()=>setShowKeys(s=>!s)} style={{background:showKeys?C.borderLight:"none",border:`1px solid ${C.border}`,borderRadius:7,color:showKeys?C.text:C.textSoft,cursor:"pointer",padding:"5px 10px",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:5,fontFamily:FONT}}>
            <Settings size={11} strokeWidth={2}/>API-Keys
            {hasKeys&&<span style={{width:6,height:6,borderRadius:"50%",background:C.success,display:"inline-block"}}/>}
          </button>
          <Btn size="sm" onClick={()=>ref.current?.click()}><Upload size={13} strokeWidth={2}/>Hochladen</Btn>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
          <input ref={ref} type="file" multiple accept="image/*,video/*" style={{display:"none"}} onChange={e=>upload(e.target.files)}/>
        </div>
        {showKeys&&<StockKeyPanel keys={keys} onSave={saveKey}/>}
        <div style={{padding:"10px 16px 8px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{position:"relative",marginBottom:8}}>
            <Search size={14} color={C.textMute} strokeWidth={IW} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)"}}/>
            {anyLdg&&<div style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",width:14,height:14,border:`2px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>}
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Suche gleichzeitig in Bibliothek, Unsplash, Pexels & Pixabay…" style={{width:"100%",padding:"9px 36px 9px 34px",borderRadius:8,border:`1.5px solid ${q?C.accent:C.border}`,fontSize:13,outline:"none",fontFamily:FONT,boxSizing:"border-box",transition:"border-color .15s"}}/>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",overflowX:"auto",paddingBottom:1}}>
            <span style={{fontSize:10,fontWeight:800,color:C.textMute,letterSpacing:".04em",flexShrink:0}}>TYP</span>
            <FP val={flt.type} onChange={v=>setFlt(f=>({...f,type:v}))} opts={[{v:"",l:"Alle"},{v:"photo",l:"📷 Foto"},{v:"video",l:"🎬 Video"},{v:"illustration",l:"🎨 Illustration"},{v:"vector",l:"📐 Vektor"}]}/>
            <div style={{width:1,height:14,background:C.border,flexShrink:0,marginInline:2}}/>
            <span style={{fontSize:10,fontWeight:800,color:C.textMute,letterSpacing:".04em",flexShrink:0}}>FORMAT</span>
            <FP val={flt.orient} onChange={v=>setFlt(f=>({...f,orient:v}))} opts={[{v:"",l:"Alle"},{v:"landscape",l:"⬜ Quer"},{v:"portrait",l:"▭ Hoch"},{v:"square",l:"◻ Quadrat"}]}/>
            <div style={{width:1,height:14,background:C.border,flexShrink:0,marginInline:2}}/>
            <span style={{fontSize:10,fontWeight:800,color:C.textMute,letterSpacing:".04em",flexShrink:0}}>SORTIERUNG</span>
            <FP val={flt.sort} onChange={v=>setFlt(f=>({...f,sort:v}))} opts={[{v:"relevant",l:"Relevant"},{v:"popular",l:"🔥 Beliebt"},{v:"latest",l:"🕐 Neu"}]}/>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:20}}>
          {(libList.length>0||!q.trim())&&(
            <div>
              <div style={{fontSize:11.5,fontWeight:700,color:C.textMid,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
                <Image size={13} strokeWidth={2} color={C.textSoft}/>Bibliothek
                <span style={{background:C.borderLight,color:C.textMute,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{libList.length}</span>
              </div>
              {libList.length===0
                ?<div style={{textAlign:"center",padding:"28px 20px",color:C.textMute,background:C.bg,borderRadius:8}}>
                  <div style={{fontWeight:600,marginBottom:8,color:C.textMid}}>{items.length===0?"Noch keine Medien hochgeladen":"Keine Treffer"}</div>
                  <Btn size="sm" onClick={()=>ref.current?.click()}><Upload size={13} strokeWidth={2}/>Hochladen</Btn>
                </div>
                :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(108px,1fr))",gap:8}}>
                  {libList.map(item=><Tile key={item.id} item={item} onClick={()=>onSelect(item)}/>)}
                </div>}
            </div>
          )}
          {q.trim()&&!hasKeys&&(
            <div style={{textAlign:"center",padding:"28px 20px",border:`1.5px dashed ${C.border}`,borderRadius:10,color:C.textMute}}>
              <div style={{fontWeight:500,fontSize:12,color:C.textMid,marginBottom:6}}>Bilddatenbanken verbinden</div>
              <div style={{fontSize:12,marginBottom:12}}>Verbinde Unsplash, Pexels oder Pixabay um millionen lizenzfreie Bilder zu suchen.</div>
              <Btn size="sm" variant="secondary" onClick={()=>setShowKeys(true)}><Settings size={12} strokeWidth={2}/>API-Keys einrichten</Btn>
            </div>
          )}
          {q.trim()&&activeSrcs.map(s=>{
            const res=extRes[s.id]; const isLdg=ldg[s.id];
            return(
              <div key={s.id}>
                <div style={{fontSize:11.5,fontWeight:700,color:C.textMid,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
                  {s.label}
                  {isLdg
                    ?<div style={{width:11,height:11,border:`2px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                    :res!=null&&<span style={{background:C.borderLight,color:C.textMute,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{res.length}</span>}
                </div>
                {isLdg?<Skeletons/>
                  :res?.length===0?<div style={{padding:"14px 12px",color:C.textMute,fontSize:12,textAlign:"center",background:C.bg,borderRadius:8}}>Keine Treffer für „{q}"</div>
                  :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(108px,1fr))",gap:8}}>
                    {(res||[]).map(item=><Tile key={item.id} item={item} onClick={()=>selectExt(item)}/>)}
                  </div>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
