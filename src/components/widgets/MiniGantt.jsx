import { CalendarRange } from "lucide-react";
import { C, T, FONT } from "../../constants/colors.js";
import { CHANNELS } from "../../constants/demo.js";

export default function MiniGantt({posts,campaigns,onNav}){
  const SK={scheduled:T.success500,draft:T.warning500,pending:T.brand500,published:T.brand600};
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)",flexShrink:0};

  const today=new Date();
  const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const MONTHS=4;
  const tStart=new Date(today.getFullYear(),today.getMonth()-1,1);
  const tEnd=new Date(tStart.getFullYear(),tStart.getMonth()+MONTHS,0);
  const totalDays=Math.round((tEnd-tStart)/(864e5))+1;

  const dateToX=ds=>{
    if(!ds)return null;
    const diff=Math.round((new Date(ds+"T12:00")-tStart)/864e5);
    return Math.max(0,Math.min(100,(diff/totalDays)*100));
  };

  const monthHeaders=Array.from({length:MONTHS},(_,i)=>{
    const m=new Date(tStart.getFullYear(),tStart.getMonth()+i,1);
    return{label:m.toLocaleDateString("de-DE",{month:"short",year:"2-digit"}),x:(i/MONTHS)*100,w:100/MONTHS};
  });

  const todayX=dateToX(todayStr);
  const livePosts=posts.filter(p=>!p.deleted&&p.scheduledDate);

  // Build rows: campaigns first, then channels
  const rows=[];
  campaigns.forEach(camp=>{
    const cp=livePosts.filter(p=>p.campaignId===camp.id);
    if(!cp.length)return;
    const dates=cp.map(p=>p.scheduledDate).sort();
    rows.push({type:"campaign",id:camp.id,label:camp.name,emoji:camp.emoji,color:camp.color,
      x1:dateToX(dates[0]),x2:dateToX(dates[dates.length-1]),posts:cp});
  });
  CHANNELS.forEach(ch=>{
    const cp=livePosts.filter(p=>p.channels?.includes(ch.id));
    if(!cp.length)return;
    const dates=cp.map(p=>p.scheduledDate).sort();
    rows.push({type:"channel",id:ch.id,label:ch.label,color:ch.color,
      x1:dateToX(dates[0]),x2:dateToX(dates[dates.length-1]),posts:cp});
  });

  return(
    <div style={{...card,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <CalendarRange size={13} color={C.accent} strokeWidth={2}/>
          <span style={{fontSize:12.5,fontWeight:700,color:C.textMid,fontFamily:FONT}}>Timeline</span>
          <span style={{fontSize:10.5,color:C.textMute,fontFamily:FONT}}>
            {tStart.toLocaleDateString("de-DE",{month:"long",year:"numeric"})} – {tEnd.toLocaleDateString("de-DE",{month:"long",year:"numeric"})}
          </span>
        </div>
        <button onClick={()=>onNav("planner")} style={{fontSize:11,color:C.accent,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:FONT}}>Planner →</button>
      </div>

      <div style={{padding:"0 16px 12px"}}>
        {/* Month labels */}
        <div style={{position:"relative",height:24,marginLeft:110,marginTop:8}}>
          {monthHeaders.map((mh,i)=>(
            <div key={i} style={{position:"absolute",left:`${mh.x}%`,width:`${mh.w}%`,top:0,height:"100%",
              borderLeft:`1px solid ${C.borderLight}`,paddingLeft:5,display:"flex",alignItems:"center"}}>
              <span style={{fontSize:9.5,fontWeight:700,color:C.textMute,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap",fontFamily:FONT}}>{mh.label}</span>
            </div>
          ))}
        </div>

        {/* Gantt rows */}
        {rows.length===0?(
          <div style={{padding:"20px 0",textAlign:"center",color:C.textMute,fontSize:12,fontFamily:FONT}}>
            Keine geplanten Posts – plane Posts im Publisher.
          </div>
        ):rows.map((row,ri)=>(
          <div key={row.id} style={{display:"flex",alignItems:"center",height:32,borderBottom:ri<rows.length-1?`1px solid ${C.borderLight}`:"none"}}>
            {/* Label */}
            <div style={{width:110,flexShrink:0,display:"flex",alignItems:"center",gap:6,paddingRight:10}}>
              {row.type==="campaign"
                ?<span style={{fontSize:12}}>{row.emoji}</span>
                :<div style={{width:7,height:7,borderRadius:"50%",background:row.color,flexShrink:0}}/>}
              <span style={{fontSize:11,fontWeight:400,color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FONT,flex:1}}>{row.label}</span>
              <span style={{fontSize:9.5,color:C.textMute,fontFamily:FONT,flexShrink:0}}>{row.posts.length}</span>
            </div>
            {/* Bar area */}
            <div style={{flex:1,position:"relative",height:18}}>
              {/* Grid lines */}
              {monthHeaders.map((mh,i)=>(
                <div key={i} style={{position:"absolute",left:`${mh.x}%`,top:0,bottom:0,
                  borderLeft:`1px dashed ${C.borderLight}`,pointerEvents:"none"}}/>
              ))}
              {/* Today line */}
              {todayX>=0&&todayX<=100&&(
                <div style={{position:"absolute",left:`${todayX}%`,top:-6,bottom:-6,
                  width:1.5,background:C.accent,zIndex:3,pointerEvents:"none"}}/>
              )}
              {/* Span bar */}
              {row.x1!==null&&row.x2!==null&&row.x2>=row.x1&&(
                <div style={{position:"absolute",left:`${Math.max(0,row.x1)}%`,
                  width:`${Math.max(0.8,Math.min(100,row.x2)-Math.max(0,row.x1))}%`,
                  height:8,top:5,borderRadius:4,
                  background:`${row.color}28`,border:`1.5px solid ${row.color}55`}}/>
              )}
              {/* Post dots */}
              {row.posts.map((p,pi)=>{
                const x=dateToX(p.scheduledDate);
                if(x===null||x<0||x>100)return null;
                return(
                  <div key={pi} title={`${p.title||"Post"} · ${p.scheduledDate}`}
                    style={{position:"absolute",left:`${x}%`,top:3,width:12,height:12,
                      borderRadius:"50%",background:SK[p.status]||C.textMute,
                      border:"2px solid #fff",cursor:"pointer",zIndex:2,
                      transform:"translateX(-50%)",boxShadow:"0 1px 3px rgba(0,0,0,.18)",transition:"transform .1s"}}
                    onClick={()=>onNav("planner")}
                    onMouseEnter={e=>e.currentTarget.style.transform="translateX(-50%) scale(1.4)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="translateX(-50%) scale(1)"}/>
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div style={{display:"flex",gap:12,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.borderLight}`,flexWrap:"wrap"}}>
          {[[T.success500,"Geplant"],[T.warning500,"Entwurf"],[T.brand500,"Review"],[T.brand600,"Live"]].map(([col,lbl])=>(
            <div key={lbl} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>
              <span style={{fontSize:9.5,color:C.textMute,fontFamily:FONT,fontWeight:500}}>{lbl}</span>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:1.5,height:10,background:C.accent}}/>
            <span style={{fontSize:9.5,color:C.textMute,fontFamily:FONT,fontWeight:500}}>Heute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
