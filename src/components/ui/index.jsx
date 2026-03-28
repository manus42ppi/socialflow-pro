import { useState } from "react";
import { ArrowUp, ArrowDown, CheckCircle, FileText, Clock, Globe } from "lucide-react";
import { C, FONT, IW } from "../../constants/colors.js";

// ── UI PRIMITIVES ──────────────────────────────────────────────────────────
export function Sp({color="#fff"}){return <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${color}30`,borderTopColor:color,animation:"spin .7s linear infinite",flexShrink:0}}/>;}
export function Badge({color,bg,children}){return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:bg||C.borderLight,color:color||C.textSoft,fontSize:10.5,fontWeight:700,padding:"2px 9px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:".01em"}}>{children}</span>;}
export function Avatar({initials,size=32,color=C.accent}){return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color}30,${color}15)`,color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*.36,flexShrink:0,border:`1.5px solid ${color}40`,boxShadow:`0 0 0 2px ${color}10`}}>{initials}</div>;}

export function Btn({children,variant="primary",size="md",onClick,disabled=false,style={}}){
  const V={
    primary:{background:C.text,color:"#fff",border:"none",boxShadow:"none"},
    secondary:{background:C.surface,color:C.textMid,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"},
    ghost:{background:"transparent",color:C.textSoft,border:"none"},
    danger:{background:C.accentLight,color:C.accent,border:`1px solid #FECACA`},
    success:{background:C.successBg,color:C.success,border:`1px solid #A7F3D0`},
    ai:{background:`linear-gradient(135deg,${C.ai1},${C.ai2})`,color:"#fff",border:"none",boxShadow:`0 2px 12px ${C.purpleGlow}`},
  };
  const P={sm:"5px 12px",md:"8px 17px"};
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",gap:6,padding:P[size]||P.md,borderRadius:8,fontWeight:600,fontSize:size==="sm"?12:13,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all .18s",fontFamily:FONT,...V[variant],...style}}>{children}</button>;
}

export function Card({children,style={},onClick}){return <div onClick={onClick} style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 6px rgba(13,21,38,.05)",...style}}>{children}</div>;}
export function FL({children}){return <label style={{fontSize:11.5,fontWeight:500,color:C.textMid,display:"block",marginBottom:5,letterSpacing:".02em",textTransform:"uppercase"}}>{children}</label>;}

export function TIn({label,icon:Icon,textarea=false,minH,...props}){
  const base={width:"100%",padding:Icon?"9px 12px 9px 34px":"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",color:C.text,background:C.surface,boxSizing:"border-box",fontFamily:FONT,...props.style};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<FL>{label}</FL>}
      <div style={{position:"relative"}}>
        {Icon&&<Icon size={14} color={C.textMute} strokeWidth={IW} style={{position:"absolute",left:11,top:textarea?11:"50%",transform:textarea?"none":"translateY(-50%)",pointerEvents:"none"}}/>}
        {textarea?<textarea {...props} style={{...base,minHeight:minH||90,resize:"vertical"}}/>:<input {...props} style={base}/>}
      </div>
    </div>
  );
}

export function SBadge({status}){
  const M={
    scheduled:{color:C.success,bg:C.successBg,label:"Geplant",I:CheckCircle},
    draft:    {color:C.warning,bg:C.warningBg,label:"Entwurf", I:FileText},
    pending:  {color:C.info,  bg:C.infoBg,   label:"Freigabe",I:Clock},
    published:{color:C.purple,bg:C.purpleBg, label:"Live",     I:Globe},
  };
  const m=M[status]||M.draft;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:m.bg,color:m.color,fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:20,letterSpacing:".01em"}}><m.I size={10} strokeWidth={2.5}/>{m.label}</span>;
}

export function SCrd({icon:Icon,label,value,delta,color,onClick}){
  return(
    <Card style={{padding:"20px 20px 16px",cursor:onClick?"pointer":"default",transition:"all .18s",userSelect:"none",overflow:"hidden",position:"relative"}} onClick={onClick}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow="0 6px 24px rgba(13,21,38,.1)";e.currentTarget.style.transform="translateY(-2px)";}}}
      onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow="0 1px 6px rgba(13,21,38,.05)";e.currentTarget.style.transform="";}}}>
      <div style={{position:"absolute",top:-10,right:-10,width:80,height:80,borderRadius:"50%",background:(color||C.accent)+"08",pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{width:38,height:38,borderRadius:11,background:(color||C.accent)+"15",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 8px ${(color||C.accent)}20`}}>
          <Icon size={17} color={color||C.accent} strokeWidth={IW}/>
        </div>
        {delta!==undefined&&<div style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,fontWeight:700,color:delta>=0?C.success:C.accent,background:delta>=0?C.successBg:C.accentLight,padding:"2px 7px",borderRadius:20}}>
          {delta>=0?<ArrowUp size={11} strokeWidth={2.5}/>:<ArrowDown size={11} strokeWidth={2.5}/>}{Math.abs(delta)}%
        </div>}
      </div>
      <div style={{marginTop:14,fontFamily:FONT,fontSize:26,fontWeight:600,color:C.text,letterSpacing:"-.03em"}}>{value}</div>
      <div style={{fontSize:10,fontWeight:400,textTransform:"uppercase",letterSpacing:".05em",color:C.textMute,marginTop:3,display:"flex",alignItems:"center"}}>
        {label}{onClick&&<span style={{marginLeft:"auto",fontSize:11,color:C.textMute,opacity:.6}}>→</span>}
      </div>
    </Card>
  );
}
