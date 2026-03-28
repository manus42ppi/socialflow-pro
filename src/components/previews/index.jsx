import { C } from "../../constants/colors.js";
import { fpos } from "../../utils/store.js";
import ChIco from "../ui/ChIco.jsx";

// ── CHANNEL PREVIEWS ───────────────────────────────────────────────────────
export function IGPrev({post,media}){
  return <div style={{fontFamily:"'Helvetica Neue',sans-serif",background:"#fff",border:"1px solid #dbdbdb",borderRadius:8,overflow:"hidden",fontSize:13}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:C.text,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:11}}>{post.title?.[0]||"U"}</div>
      <div><div style={{fontWeight:700}}>dein_account</div><div style={{fontSize:11,color:"#8e8e8e"}}>Gesponsert</div></div>
      <span style={{marginLeft:"auto",fontSize:18}}>···</span>
    </div>
    {media?.url?<img src={media.url} alt="" style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",objectPosition:fpos(media),display:"block"}}/>:<div style={{aspectRatio:"1/1",background:C.borderLight,display:"flex",alignItems:"center",justifyContent:"center"}}><ChIco id="instagram" size={32} color={C.textMute}/></div>}
    <div style={{padding:"10px 12px"}}>
      <div style={{display:"flex",gap:12,fontSize:18,marginBottom:6}}>🤍 💬 ↗ <span style={{marginLeft:"auto"}}>🔖</span></div>
      <div><span style={{fontWeight:700}}>dein_account</span> {post.content||"Text hier…"}</div>
    </div>
  </div>;
}
export function TWPrev({post,media}){
  return <div style={{fontFamily:"-apple-system,sans-serif",background:"#fff",border:"1px solid #e1e8ed",borderRadius:12,padding:14,fontSize:13}}>
    <div style={{display:"flex",gap:10}}>
      <div style={{width:38,height:38,borderRadius:"50%",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:13,flexShrink:0}}>{post.title?.[0]||"U"}</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700}}>Dein Name <span style={{color:"#536471",fontWeight:400}}>@handle · 2h</span></div>
        <div style={{lineHeight:1.5,marginTop:4}}>{post.content||"Tweet…"}</div>
        {media?.type==="image"&&<img src={media.url} alt="" style={{width:"100%",borderRadius:10,marginTop:8,aspectRatio:"16/9",objectFit:"cover",objectPosition:fpos(media)}}/>}
        <div style={{display:"flex",gap:16,marginTop:10,color:"#536471",fontSize:11}}>💬 24 &nbsp;🔁 12 &nbsp;🤍 89</div>
      </div>
    </div>
  </div>;
}
export function LIPrev({post,media}){
  return <div style={{fontFamily:"-apple-system,sans-serif",background:"#fff",border:"1px solid #e0e0e0",borderRadius:8,overflow:"hidden",fontSize:13}}>
    <div style={{padding:"12px 14px",display:"flex",gap:10}}>
      <div style={{width:40,height:40,borderRadius:"50%",background:C.text,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13}}>{post.title?.[0]||"U"}</div>
      <div><div style={{fontWeight:700}}>Dein Name</div><div style={{fontSize:11,color:"#666"}}>Position · 1. Grad</div></div>
    </div>
    <div style={{padding:"0 14px 10px",lineHeight:1.6}}>{post.content||"Post…"}</div>
    {media?.url&&<img src={media.url} alt="" style={{width:"100%",aspectRatio:"1.91/1",objectFit:"cover",objectPosition:fpos(media),display:"block"}}/>}
    <div style={{display:"flex",borderTop:"1px solid #e0e0e0"}}>
      {["👍","💬","↗"].map(a=><button key={a} style={{flex:1,background:"none",border:"none",color:"#666",fontSize:12,fontWeight:700,padding:"7px 0",cursor:"pointer"}}>{a}</button>)}
    </div>
  </div>;
}
export function FBPrev({post,media}){
  return <div style={{fontFamily:"Helvetica,sans-serif",background:"#fff",border:"1px solid #dddfe2",borderRadius:8,overflow:"hidden",fontSize:13}}>
    <div style={{padding:"10px 12px",display:"flex",gap:8}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:C.text,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12}}>{post.title?.[0]||"U"}</div>
      <div><div style={{fontWeight:700}}>Deine Seite</div><div style={{fontSize:11,color:"#65676b"}}>Gerade · 🌐</div></div>
    </div>
    <div style={{padding:"0 12px 10px",lineHeight:1.5}}>{post.content||"Post…"}</div>
    {media?.url&&<img src={media.url} alt="" style={{width:"100%",aspectRatio:"1.91/1",objectFit:"cover",objectPosition:fpos(media),display:"block"}}/>}
    <div style={{display:"flex",borderTop:"1px solid #dddfe2"}}>
      {["👍","💬","↗"].map(a=><button key={a} style={{flex:1,background:"none",border:"none",color:"#65676b",fontSize:12,fontWeight:700,padding:"7px 0",cursor:"pointer"}}>{a}</button>)}
    </div>
  </div>;
}
export function TKPrev({post,media}){
  return <div style={{background:"#000",borderRadius:10,maxWidth:200,color:"#fff",overflow:"hidden",margin:"0 auto"}}>
    <div style={{aspectRatio:"9/16",background:"linear-gradient(180deg,#111,#333)",position:"relative"}}>
      {media?.url&&<img src={media.url} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:fpos(media)}}/>}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:8,background:"linear-gradient(transparent,rgba(0,0,0,.8))"}}>
        <div style={{fontWeight:700,fontSize:11}}>@dein_account</div>
        <div style={{fontSize:10,lineHeight:1.4,opacity:.9}}>{post.content?.slice(0,50)||"Video…"}</div>
      </div>
    </div>
  </div>;
}
export function WAPrev({post,media}){
  return <div style={{background:"#F0F0EC",borderRadius:10,overflow:"hidden",fontSize:13}}>
    <div style={{background:C.text,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12}}>{post.title?.[0]||"B"}</div>
      <div><div style={{fontWeight:700,color:"#fff",fontSize:13}}>Dein Business</div><div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>Aktiv</div></div>
    </div>
    <div style={{padding:"12px 10px",minHeight:80}}>
      <div style={{background:"#fff",borderRadius:"0 10px 10px 10px",padding:"8px 12px",display:"inline-block",maxWidth:"85%",boxShadow:"0 1px 2px rgba(0,0,0,.1)"}}>
        {media?.url&&<img src={media.url} alt="" style={{width:"100%",borderRadius:6,marginBottom:6,maxHeight:100,objectFit:"cover",objectPosition:fpos(media),display:"block"}}/>}
        <div style={{fontSize:12,color:"#111",lineHeight:1.5}}>{post.content||"Nachricht…"}</div>
        <div style={{fontSize:10,color:"#999",textAlign:"right",marginTop:3}}>10:32 ✓✓</div>
      </div>
    </div>
  </div>;
}
export const PREV={instagram:IGPrev,twitter:TWPrev,linkedin:LIPrev,facebook:FBPrev,whatsapp:WAPrev};
