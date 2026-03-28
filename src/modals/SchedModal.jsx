import { useState } from "react";
import { Calendar, Check, X } from "lucide-react";
import { C, FONT, IW } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { Btn, Card, FL, TIn } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";

export default function SchedModal({post,onSave,onClose}){
  const [date,setDate]=useState(post.scheduledDate||"");
  const [time,setTime]=useState(post.scheduledTime||"12:00");
  const [chs,setChs]=useState(post.channels?.length?post.channels:["instagram"]);
  const tog=id=>setChs(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
        <div style={{padding:"18px 22px 0",display:"flex",justifyContent:"space-between"}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:800,color:C.text,display:"flex",alignItems:"center",gap:8}}><Calendar size={16} color={C.accent} strokeWidth={IW}/>Post planen</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textMute,cursor:"pointer"}}><X size={20} strokeWidth={2}/></button>
        </div>
        <div style={{padding:"14px 22px 22px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
            <div style={{fontWeight:700,fontSize:13}}>{post.title||"Kein Titel"}</div>
            <div style={{color:C.textSoft,fontSize:12,marginTop:2}}>{post.content?.slice(0,80)}{(post.content?.length||0)>80?"…":""}</div>
          </div>
          <TIn label="Datum *" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <TIn label="Uhrzeit" type="time" value={time} onChange={e=>setTime(e.target.value)}/>
          <div><FL>Kanäle</FL>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {CHANNELS.map(c=>(
                <button key={c.id} onClick={()=>tog(c.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,border:`1.5px solid ${chs.includes(c.id)?c.color:C.border}`,background:chs.includes(c.id)?c.color+"12":"#fff",color:chs.includes(c.id)?c.color:C.textSoft,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FONT}}>
                  <ChIco id={c.id} size={12}/>{c.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="secondary" onClick={onClose} style={{flex:1,justifyContent:"center"}}>Abbrechen</Btn>
            <Btn onClick={()=>{if(!date){alert("Bitte Datum wählen.");return;}onSave({...post,scheduledDate:date,scheduledTime:time,channels:chs,status:"scheduled"});}} style={{flex:2,justifyContent:"center"}}><Check size={14} strokeWidth={2.5}/>Planen</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
