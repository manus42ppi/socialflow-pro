import { CalendarRange } from "lucide-react";
import { C, T, FONT } from "../../constants/colors.js";

export default function WeekStrip({posts,campaigns,now,onNav}){
  const SK={scheduled:T.success500,draft:T.warning500,pending:T.brand500,published:T.brand600};
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)",flexShrink:0};
  const days=Array.from({length:7},(_,i)=>{
    const d=new Date(now); d.setDate(d.getDate()+i);
    const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const dayPosts=posts.filter(p=>p.scheduledDate===ds).sort((a,b)=>(a.scheduledTime||"").localeCompare(b.scheduledTime||""));
    return{d,ds,dayPosts};
  });
  const hasPosts=days.some(x=>x.dayPosts.length>0);
  return(
    <div style={{...card,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <CalendarRange size={13} color={C.accent} strokeWidth={2}/>
          <span style={{fontSize:12.5,fontWeight:700,color:C.textMid,fontFamily:FONT}}>Nächste 7 Tage</span>
        </div>
        <button onClick={()=>onNav("planner")} style={{fontSize:11,color:C.accent,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:FONT}}>Planner öffnen →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
        {days.map(({d,ds,dayPosts},i)=>{
          const isToday=i===0;
          const dow=d.toLocaleDateString("de-DE",{weekday:"short"});
          return(
            <div key={ds}
              onClick={dayPosts.length>0?()=>onNav("planner"):undefined}
              style={{borderRight:i<6?`1px solid ${C.borderLight}`:"none",padding:"10px 8px",minHeight:76,
                background:isToday?C.accentLight+"60":"transparent",
                cursor:dayPosts.length>0?"pointer":"default",transition:"background .12s"}}
              onMouseEnter={e=>{if(dayPosts.length>0)e.currentTarget.style.background=isToday?C.accentLight:C.bg;}}
              onMouseLeave={e=>{e.currentTarget.style.background=isToday?C.accentLight+"60":"transparent";}}>
              <div style={{textAlign:"center",marginBottom:6}}>
                <div style={{fontSize:9.5,fontWeight:700,color:isToday?C.accent:C.textMute,textTransform:"uppercase",letterSpacing:".05em",fontFamily:FONT}}>{dow}</div>
                <div style={{width:22,height:22,borderRadius:"50%",margin:"3px auto 0",display:"flex",alignItems:"center",justifyContent:"center",
                  background:isToday?C.accent:"transparent",
                  color:isToday?"#fff":C.textMid,fontSize:11.5,fontWeight:isToday?700:500,fontFamily:FONT}}>{d.getDate()}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {dayPosts.slice(0,3).map(p=>{
                  const camp=campaigns.find(c=>c.id===p.campaignId);
                  const col=SK[p.status]||C.textMute;
                  return(
                    <div key={p.id}
                      style={{borderRadius:4,padding:"2px 5px",background:col+"18",borderLeft:`2px solid ${col}`,overflow:"hidden"}}>
                      <div style={{fontSize:9.5,fontWeight:700,color:col,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:FONT}}>
                        {p.scheduledTime?p.scheduledTime+" ":""}{camp?camp.emoji+" ":""}{p.title||"–"}
                      </div>
                    </div>
                  );
                })}
                {dayPosts.length>3&&<div style={{fontSize:9,color:C.textMute,textAlign:"center",fontWeight:600,fontFamily:FONT}}>+{dayPosts.length-3}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {!hasPosts&&(
        <div style={{padding:"8px 16px 10px",fontSize:11,color:C.textMute,textAlign:"center",fontFamily:FONT}}>
          Keine Posts diese Woche geplant –{" "}
          <span onClick={()=>onNav("publisher")} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>Post erstellen</span>
        </div>
      )}
    </div>
  );
}
