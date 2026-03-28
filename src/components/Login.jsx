import { useState } from "react";
import { Mail, Lock, AlertCircle, Shield, Layers } from "lucide-react";
import { C, CSS, IW } from "../constants/colors.js";
import { FONT, FONT_DISPLAY } from "../constants/colors.js";
import { DEMO_USERS, ROLES } from "../constants/demo.js";
import { Sp, Badge } from "./ui/index.jsx";

export default function Login({onLogin}){
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [ld,setLd]=useState(false); const [sl,setSl]=useState("");
  const go=()=>{setLd(true);setErr("");setTimeout(()=>{const u=DEMO_USERS.find(u=>u.email===email&&u.password===pw);u?onLogin(u):(setErr("E-Mail oder Passwort falsch."),setLd(false));},700);};
  const soc=p=>{setSl(p);setTimeout(()=>onLogin({...DEMO_USERS[0],name:p==="google"?"Google User":"Apple User"}),1200);};
  return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 50%,#1a0e2e 0%,#0A0C10 50%,#0d1420 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:16}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(circle at 80% 20%,${C.accent}08 0%,transparent 50%),radial-gradient(circle at 20% 80%,${C.purple}0A 0%,transparent 50%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:420,animation:"fadeUp .45s ease",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:11,marginBottom:8}}>
            <div style={{width:50,height:50,borderRadius:15,background:`linear-gradient(135deg,${C.accent},#8b0000)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 8px 32px ${C.accentGlow}`}}><Layers size={24} color="#fff" strokeWidth={1.5}/></div>
            <span style={{fontFamily:FONT_DISPLAY,fontSize:26,fontWeight:800,color:"#fff",letterSpacing:"-.03em"}}>SocialFlow</span>
          </div>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:13.5,margin:0,letterSpacing:".01em"}}>Dein Social Media Command Center</p>
        </div>
        <div style={{background:"rgba(255,255,255,.04)",backdropFilter:"blur(20px)",borderRadius:18,border:"1px solid rgba(255,255,255,.1)",padding:"28px 26px",boxShadow:"0 24px 64px rgba(0,0,0,.4)"}}>
          <h2 style={{margin:"0 0 22px",fontFamily:FONT_DISPLAY,fontSize:20,fontWeight:700,color:"#fff",letterSpacing:"-.02em"}}>Willkommen zurück</h2>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:18}}>
            <button onClick={()=>soc("google")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"10px 16px",borderRadius:10,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.9)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT,transition:"all .18s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
              {sl==="google"?<Sp color="#fff"/>:<><svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Mit Google anmelden</>}
            </button>
            <button onClick={()=>soc("apple")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"10px 16px",borderRadius:10,border:"none",background:"#fff",color:"#000",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT,transition:"all .18s"}} onMouseEnter={e=>e.currentTarget.style.background="#f0f0f0"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              {sl==="apple"?<Sp color="#000"/>:<><svg width="15" height="18" viewBox="0 0 814 1000"><path fill="#000" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.6-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 135.4-317.7 268.8-317.7 99.8 0 176.1 52.7 236.4 52.7 57.8 0 147.8-56.1 261.6-56.1l45.3.5zM600.3 80.1c28.5-35.9 48.5-86.2 48.5-136.5 0-7-.6-14.1-1.9-20.9-46.1 1.9-100.3 30.7-133.8 73.5-26.7 31.4-51.3 81.7-51.3 132.6 0 7.6 1.3 15.2 1.9 17.7 3.2.6 8.3 1.3 13.4 1.3 41.3 0 93.5-27.9 123.2-67.7z"/></svg>Mit Apple anmelden</>}
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/><span style={{fontSize:11.5,color:"rgba(255,255,255,.35)",fontWeight:600,letterSpacing:".03em"}}>ODER PER E-MAIL</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".06em"}}>E-MAIL</label>
              <div style={{position:"relative"}}>
                <Mail size={13} color="rgba(255,255,255,.3)" strokeWidth={IW} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
                <input type="email" placeholder="admin@demo.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={{width:"100%",padding:"9px 12px 9px 34px",borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.07)",color:"#fff",fontSize:13,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".06em"}}>PASSWORT</label>
              <div style={{position:"relative"}}>
                <Lock size={13} color="rgba(255,255,255,.3)" strokeWidth={IW} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
                <input type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={{width:"100%",padding:"9px 12px 9px 34px",borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.07)",color:"#fff",fontSize:13,outline:"none",fontFamily:FONT,boxSizing:"border-box"}}/>
              </div>
            </div>
            {err&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(214,59,59,.15)",border:`1px solid ${C.accent}40`,borderRadius:9,padding:"8px 12px",fontSize:13,color:"#fca5a5"}}><AlertCircle size={14} strokeWidth={2}/>{err}</div>}
            <button onClick={go} disabled={ld} style={{padding:"11px 16px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.accent},#4444b8)`,color:"#fff",fontWeight:700,fontSize:14,cursor:ld?"not-allowed":"pointer",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:`0 4px 20px ${C.accentGlow}`,transition:"all .18s"}}>
              {ld?<><Sp/>Anmelden…</>:"Anmelden"}
            </button>
          </div>
          <div style={{marginTop:16,padding:"12px 14px",background:"rgba(255,255,255,.04)",borderRadius:10,border:"1px solid rgba(255,255,255,.08)"}}>
            <div style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,.35)",marginBottom:7,display:"flex",alignItems:"center",gap:5,letterSpacing:".04em"}}><Shield size={10} strokeWidth={2}/>DEMO-ZUGÄNGE (klicken)</div>
            {DEMO_USERS.map(u=><div key={u.id} onClick={()=>{setEmail(u.email);setPw(u.password);}} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",cursor:"pointer"}}>
              <span style={{color:"#7dd3fc",fontFamily:"monospace"}}>{u.email}</span>
              <Badge color={ROLES[u.role].color}>{ROLES[u.role].label}</Badge>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
