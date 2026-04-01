import { useState } from "react";
import { Settings, LogOut, Layers, Menu } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../../constants/colors.js";
import { CHANNELS } from "../../constants/demo.js";
import { NAV_GROUPS, NAV_UTILITY } from "../../constants/nav.js";
import { Avatar } from "../ui/index.jsx";
import ChIco from "../ui/ChIco.jsx";
import { useApp } from "../../context/AppContext.jsx";

export default function Sidebar(){
  const { nav: active, goNav: onNav, user, handleLogout: onLogout, posts: allPosts, goChNav: onChNav, chFilt: activeCh } = useApp();
  const posts = allPosts ?? [];
  const pend = posts.filter(p => p.status === "pending").length;
  const [open,setOpen]=useState(()=>{try{return localStorage.getItem("sb_open")!=="0";}catch{return true;}});
  const toggle=()=>{const n=!open;setOpen(n);try{localStorage.setItem("sb_open",n?"1":"0");}catch{}};
  const W=open?240:64;
  // Per-channel post counts (only channels with active posts)
  const livePosts=posts.filter(p=>!p.deleted);
  const chCounts=CHANNELS.map(ch=>({...ch,n:livePosts.filter(p=>p.channels?.includes(ch.id)).length})).filter(c=>c.n>0);
  const draftsCount=livePosts.filter(p=>p.status==="draft").length;
  const trashCount=posts.filter(p=>p.deleted).length;
  const BtnSB=({id,label,I,badge})=>{
    const on=active===id;
    return(
      <button onClick={()=>onNav(id)} title={open?undefined:label} style={{
        position:"relative",width:"100%",height:38,borderRadius:9,border:"none",
        background:on?"rgba(255,255,255,.1)":"transparent",
        color:on?"#fff":"#9CA3AF",cursor:"pointer",
        display:"flex",alignItems:"center",gap:10,
        padding:open?"0 10px 0 12px":"0",justifyContent:open?"flex-start":"center",
        transition:"background .13s, color .13s",fontFamily:FONT,flexShrink:0,
      }}
        onMouseEnter={e=>{if(!on){e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.color="#D1D5DB";}}}
        onMouseLeave={e=>{if(!on){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#9CA3AF";}}}>
        {on&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:20,background:C.accent,borderRadius:"0 3px 3px 0",boxShadow:`2px 0 8px ${C.accentGlow}`}}/>}
        <I size={16} strokeWidth={IW} style={{flexShrink:0}}/>
        {open&&<span style={{fontSize:13,fontWeight:on?600:300,flex:1,textAlign:"left",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>}
        {/* Badge: inline when expanded, absolute (top-right over icon) when collapsed */}
        {badge>0&&open&&<div style={{minWidth:18,height:18,borderRadius:9,background:C.accent,color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",flexShrink:0}}>{badge}</div>}
        {badge>0&&!open&&<div style={{position:"absolute",top:5,right:7,minWidth:15,height:15,borderRadius:8,background:C.accent,color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",lineHeight:1}}>{badge}</div>}
      </button>
    );
  };
  return(
    <div style={{width:W,minWidth:W,background:C.sidebar,display:"flex",flexDirection:"column",flexShrink:0,borderRight:"1px solid rgba(255,255,255,.06)",transition:"width .22s cubic-bezier(.4,0,.2,1),min-width .22s cubic-bezier(.4,0,.2,1)",overflow:"hidden"}}>

      {/* ── Logo + toggle ──
          Expanded: [Logo icon] [SocialFlow PRO text] [≡ button]
          Collapsed: entire header = one big toggle button (64×56px, easy to click) */}
      {open?(
        <div style={{height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px 0 14px",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:`linear-gradient(135deg,${C.accent},#4444b8)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 3px 10px ${C.accentGlow}`}}>
              <Layers size={15} color="#fff" strokeWidth={1.5}/>
            </div>
            <span style={{fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:14,color:"#F9FAFB",letterSpacing:"-.01em",whiteSpace:"nowrap"}}>SocialFlow</span>
            <span style={{fontSize:9,fontWeight:800,color:C.accent,background:"rgba(99,102,241,.18)",padding:"2px 6px",borderRadius:4,letterSpacing:".05em",whiteSpace:"nowrap"}}>PRO</span>
          </div>
          <button onClick={toggle} title="Einklappen" style={{width:28,height:28,borderRadius:7,border:"none",background:"transparent",color:"#6B7280",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"color .13s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#6B7280"}>
            <Menu size={15} strokeWidth={2}/>
          </button>
        </div>
      ):(
        <button onClick={toggle} title="Aufklappen" style={{height:56,width:"100%",border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,.05)",transition:"background .13s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${C.accent},#4444b8)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 3px 10px ${C.accentGlow}`}}>
            <Layers size={15} color="#fff" strokeWidth={1.5}/>
          </div>
        </button>
      )}

      {/* ── Nav groups ── */}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"10px 8px 0"}}>
        {NAV_GROUPS.map((grp,gi)=>(
          <div key={grp.label} style={{marginBottom:4}}>
            {open
              ? <div style={{padding: gi>0 ? "14px 12px 4px" : "2px 12px 4px"}}>
                  {gi>0&&<div style={{height:1,background:"rgba(255,255,255,.07)",marginBottom:10}}/>}
                  <span style={{fontSize:9.5,fontWeight:600,color:"#6B7280",letterSpacing:".12em",textTransform:"uppercase"}}>
                    {grp.label}
                  </span>
                </div>
              : gi>0&&<div style={{height:1,background:"rgba(255,255,255,.06)",margin:"6px 4px 10px"}}/>
            }
            {grp.items.map(({id,label,I})=>(
              <div key={id}>
                <BtnSB id={id} label={label} I={I} badge={id==="publisher"?pend:id==="drafts"?draftsCount:0} />
                {/* Channel quick-links under Publisher */}
                {id==="publisher"&&open&&chCounts.length>0&&(
                  <div style={{marginLeft:22,marginBottom:2,marginTop:1}}>
                    {chCounts.map(ch=>{
                      const isCh=active==="publisher"&&activeCh===ch.id;
                      return(
                        <button key={ch.id} onClick={()=>onChNav(ch.id)}
                          title={ch.label}
                          style={{width:"100%",height:28,borderRadius:7,border:"none",background:isCh?"rgba(255,255,255,.08)":"transparent",
                            color:isCh?"#D1D5DB":"#7B8797",cursor:"pointer",display:"flex",alignItems:"center",gap:7,
                            padding:"0 8px 0 10px",fontFamily:FONT,fontSize:11.5,fontWeight:isCh?600:400,transition:"all .12s"}}
                          onMouseEnter={e=>{if(!isCh){e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.color="#9CA3AF";}}}
                          onMouseLeave={e=>{if(!isCh){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#7B8797";}}}>
                          <div style={{width:1,height:14,background:"rgba(255,255,255,.1)",flexShrink:0}}/>
                          <ChIco id={ch.id} size={11} color={isCh?"#D1D5DB":"#7B8797"}/>
                          <span style={{flex:1,textAlign:"left",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ch.label}</span>
                          <span style={{fontSize:10,fontWeight:600,color:"#9CA3AF",background:"rgba(255,255,255,.08)",borderRadius:6,padding:"0 5px",lineHeight:"18px"}}>{ch.n}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Bottom: utility + admin + user ── */}
      <div style={{padding:"8px",borderTop:"1px solid rgba(255,255,255,.06)",flexShrink:0,display:"flex",flexDirection:"column",gap:2}}>
        {NAV_UTILITY.map(({id,label,I})=>(
          <BtnSB key={id} id={id} label={label} I={I}
            badge={id==="trash"?trashCount:0}/>
        ))}
        <BtnSB id="admin" label={user.role==="admin"?"Admin":"Einstellungen"} I={Settings} badge={0}/>
        <div style={{height:4}}/>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:open?"6px 10px":"6px 0",justifyContent:open?"flex-start":"center",borderRadius:9,transition:"all .13s"}}>
          <Avatar initials={user.avatar} size={26} color={C.accent}/>
          {open&&<>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:"#D1D5DB",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
              <div style={{fontSize:10,color:"#6B7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
            </div>
            <button onClick={onLogout} title="Abmelden" style={{width:26,height:26,borderRadius:6,border:"none",background:"transparent",color:"#4A5568",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"color .13s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#4A5568"}>
              <LogOut size={13} strokeWidth={IW}/>
            </button>
          </>}
        </div>
        {!open&&<button onClick={onLogout} title="Abmelden" style={{width:"100%",height:32,borderRadius:7,border:"none",background:"transparent",color:"#4A5568",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"color .13s"}}
          onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#4A5568"}>
          <LogOut size={15} strokeWidth={IW}/>
        </button>}
      </div>
    </div>
  );
}
