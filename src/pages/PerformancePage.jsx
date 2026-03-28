import { useState, useMemo } from "react";
import { Eye, TrendingUp, Star, Activity } from "lucide-react";
import { C, FONT, FONT_DISPLAY } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { Card, SCrd } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";
import { useApp } from "../context/AppContext.jsx";

const MOCK={
  instagram:{reach:12400,imp:34200,eng:"5.4%",fol:2340,clk:890},
  twitter:  {reach:8900, imp:21000,eng:"3.2%",fol:1120,clk:340},
  linkedin: {reach:6700, imp:15800,eng:"4.8%",fol:890, clk:520},
  facebook: {reach:5200, imp:11200,eng:"2.1%",fol:3400,clk:210},
  whatsapp: {reach:3200, imp:3200, eng:"12.4%",fol:890, clk:890},
};
function PerformancePage(){
  const { posts: allPosts } = useApp();
  const posts = allPosts.filter(p => !p.deleted);
  const [per,setPer]=useState("30d");
  const top=useMemo(()=>[...posts].slice(0,5).map(p=>({...p,reach:Math.floor(Math.random()*5000+500),eng:(Math.random()*8+1).toFixed(1)+"%"})),[posts]);
  const {order,dragId,setDragId,overId,setOverId,drop}=useSections("performance","default",['stats','channels','posts']);

  const perRight=<div style={{display:"flex",gap:3,background:"#F3F4F6",borderRadius:8,padding:3}}>
    {[["7d","7T"],["30d","30T"],["90d","90T"]].map(([v,l])=><button key={v} onClick={()=>setPer(v)} style={{padding:"4px 9px",borderRadius:6,border:"none",background:per===v?"#fff":"transparent",color:per===v?C.text:C.textSoft,fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:FONT}}>{l}</button>)}
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
            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0"}}><span style={{color:C.textSoft}}>{l}</span><span style={{fontWeight:700}}>{v}</span></div>
          ))}
        </Card>;
      })}
    </div>
  );

  const topPostsContent=(
    top.length===0?(
      <div style={{padding:"20px 0",textAlign:"center",fontSize:12,color:C.textMute}}>Keine Posts vorhanden.</div>
    ):(
      <div>
        {top.map((p,i)=><div key={p.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:i<top.length-1?`1px solid ${C.borderLight}`:"none"}}>
          <div style={{width:26,height:26,borderRadius:7,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:i===0?C.accent:C.textMute}}>{i+1}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div><div style={{display:"flex",gap:3,marginTop:2}}>{p.channels?.map(c=><ChIco key={c} id={c} size={11}/>)}</div></div>
          <div style={{display:"flex",gap:14,fontSize:12}}>
            <div style={{textAlign:"center"}}><div style={{fontWeight:700}}>{(p.reach/1000).toFixed(1)}K</div><div style={{color:C.textMute,fontSize:10}}>Reach</div></div>
            <div style={{textAlign:"center"}}><div style={{fontWeight:700}}>{p.eng}</div><div style={{color:C.textMute,fontSize:10}}>Eng.</div></div>
          </div>
        </div>)}
      </div>
    )
  );

  const widgetMap={
    stats:{title:'Übersicht',right:perRight,content:statsContent},
    channels:{title:'Kanäle',right:<span style={{fontSize:11,color:'#9CA3AF'}}>{CHANNELS.length} Kanäle</span>,content:channelsContent},
    posts:{title:'Top Posts',right:<span style={{fontSize:11,color:'#9CA3AF'}}>{top.length} Posts</span>,content:topPostsContent},
  };

  return(
    <div style={{flex:1,overflow:"auto",padding:"14px 18px",background:"#F9FAFB"}}>
      <div style={{marginBottom:12}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:600,color:"#111827",letterSpacing:"-.3px"}}>Performance</div>
        <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>Social Media Resultate</div>
      </div>
      {order.map(id=>{
        const w=widgetMap[id];if(!w)return null;
        return <SecCard key={id} id={id} title={w.title} right={w.right} dragId={dragId} overId={overId} setDragId={setDragId} setOverId={setOverId} drop={drop}>{w.content}</SecCard>;
      })}
    </div>
  );
}

export default PerformancePage;
