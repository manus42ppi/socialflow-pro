import { useState, useMemo } from "react";
import { Eye, TrendingUp, Star, Activity } from "lucide-react";
import { C, T, FONT, TYPO } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { Card, SCrd } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Seeded hash (same as PostDetailDrawer so numbers always match) ──────────
function hashId(id) {
  let h = 5381;
  for (let i = 0; i < String(id).length; i++) {
    h = ((h << 5) + h) ^ String(id).charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}
function seeded(id, min, max) { return min + (hashId(id) % (max - min + 1)); }

const MOCK={
  instagram:{reach:12400,imp:34200,eng:"5.4%",fol:2340,clk:890},
  twitter:  {reach:8900, imp:21000,eng:"3.2%",fol:1120,clk:340},
  linkedin: {reach:6700, imp:15800,eng:"4.8%",fol:890, clk:520},
  facebook: {reach:5200, imp:11200,eng:"2.1%",fol:3400,clk:210},
  whatsapp: {reach:3200, imp:3200, eng:"12.4%",fol:890, clk:890},
};
function PerformancePage(){
  const { posts: allPosts, setDetailPost } = useApp();
  const posts = allPosts.filter(p => !p.deleted);
  const [per,setPer]=useState("30d");
  // Top posts: only published, sorted by seeded reach (consistent, not random)
  const publishedPosts = posts.filter(p => p.status === "published");
  const top=useMemo(()=>
    [...publishedPosts]
      .map(p=>({
        ...p,
        reach: seeded(p.id+"reach", 1200, 18000),
        eng: ((seeded(p.id+"likes",120,3200)/seeded(p.id+"reach",1200,18000))*100).toFixed(1)+"%",
      }))
      .sort((a,b)=>b.reach-a.reach)
      .slice(0,5),
  [posts]);
  const {order,dragId,setDragId,overId,setOverId,drop}=useSections("performance","default",['stats','channels','posts']);

  const perRight=<div style={{display:"flex",gap:3,background:T.gray100,borderRadius:T.rMd,padding:3}}>
    {[["7d","7T"],["30d","30T"],["90d","90T"]].map(([v,l])=><button key={v} onClick={()=>setPer(v)} style={{padding:"4px 9px",borderRadius:6,border:"none",background:per===v?"#fff":"transparent",color:per===v?C.text:C.textSoft,fontWeight:600,...TYPO.caption,cursor:"pointer",fontFamily:FONT}}>{l}</button>)}
  </div>;

  const statsContent=(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
      <SCrd icon={Eye}          label="Reichweite"   value="44.3K" delta={18} color={C.accent}/>
      <SCrd icon={TrendingUp}   label="Impressionen" value="114K"  delta={12} color={C.info}/>
      <SCrd icon={Star}         label="Ø Engagement" value="5.7%"  delta={2}  color={C.warning}/>
      <SCrd icon={Activity}     label="Klicks"       value="3.07K" delta={24} color={C.success}/>
    </div>
  );

  const channelsContent=(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
      {CHANNELS.map(ch=>{const d=MOCK[ch.id];if(!d)return null;
        return <Card key={ch.id} style={{padding:"15px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:32,height:32,borderRadius:8,background:ch.color+"15",display:"flex",alignItems:"center",justifyContent:"center"}}><ChIco id={ch.id} size={15}/></div>
            <div style={{fontWeight:800,fontSize:14}}>{ch.label}</div>
          </div>
          {[["Reichweite",d.reach.toLocaleString("de")],["Impressionen",d.imp.toLocaleString("de")],["Engagement",d.eng],["Follower",d.fol.toLocaleString("de")],["Klicks",d.clk]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",...TYPO.caption,padding:"3px 0"}}><span style={{color:C.textSoft}}>{l}</span><span style={{fontWeight:700,color:C.text}}>{v}</span></div>
          ))}
        </Card>;
      })}
    </div>
  );

  const topPostsContent=(
    top.length===0?(
      <div style={{padding:"20px 0",textAlign:"center",fontSize:12,color:C.textMute}}>Keine veröffentlichten Posts vorhanden.</div>
    ):(
      <div>
        {top.map((p,i)=>(
          <div key={p.id}
            onClick={()=>setDetailPost(p)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"10px 6px",borderBottom:i<top.length-1?`1px solid ${C.borderLight}`:"none",cursor:"pointer",borderRadius:8,transition:"background .12s"}}
            onMouseEnter={e=>e.currentTarget.style.background=C.bg}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <div style={{width:26,height:26,borderRadius:7,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:i===0?C.accent:C.textMute,flexShrink:0}}>{i+1}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||p.content?.slice(0,40)||"–"}</div>
              <div style={{display:"flex",gap:3,marginTop:2}}>{p.channels?.map(c=><ChIco key={c} id={c} size={11}/>)}</div>
            </div>
            <div style={{display:"flex",gap:14,...TYPO.caption,flexShrink:0}}>
              <div style={{textAlign:"center"}}><div style={{fontWeight:700}}>{(p.reach/1000).toFixed(1)}K</div><div style={{...TYPO.nano,color:C.textMute}}>Reach</div></div>
              <div style={{textAlign:"center"}}><div style={{fontWeight:700}}>{p.eng}</div><div style={{...TYPO.nano,color:C.textMute}}>Eng.</div></div>
            </div>
          </div>
        ))}
      </div>
    )
  );

  const widgetMap={
    stats:{title:'Übersicht',right:perRight,content:statsContent},
    channels:{title:'Kanäle',right:<span style={{...TYPO.caption,color:C.textMute}}>{CHANNELS.length} Kanäle</span>,content:channelsContent},
    posts:{title:'Top Posts',right:<span style={{...TYPO.caption,color:C.textMute}}>{top.length} Posts</span>,content:topPostsContent},
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:"14px 18px",background:C.bg}}>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:FONT,fontSize:22,fontWeight:600,color:C.text,letterSpacing:"-.3px"}}>Performance</div>
        <div style={{fontSize:12,color:C.textMute,marginTop:2}}>Social Media Resultate</div>
      </div>
      {/* Demo-Daten Hinweis */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:8,background:"#FFFBEB",border:"1px solid #FDE68A",marginBottom:14,fontSize:11.5,color:"#92400E",fontFamily:FONT}}>
        <span style={{fontSize:14}}>ℹ️</span>
        <span>Demo-Daten für Präsentationszwecke — keine echten Messwerte</span>
      </div>
      {order.map(id=>{
        const w=widgetMap[id];if(!w)return null;
        return <SecCard key={id} id={id} title={w.title} right={w.right} dragId={dragId} overId={overId} setDragId={setDragId} setOverId={setOverId} drop={drop}>{w.content}</SecCard>;
      })}
    </div>
  );
}

export default PerformancePage;
