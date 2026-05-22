import { Calendar, Check, X, Clock, BookOpen } from "lucide-react";
import { C, T, IW, TYPO } from "../constants/colors.js";
import { ROLES } from "../constants/demo.js";
import { fmtDate } from "../utils/store.js";
import { Btn, Card, SBadge } from "./ui/index.jsx";
import ChIco from "./ui/ChIco.jsx";
import { PREV } from "./previews/index.jsx";

// ── PostCard (Stufe 2) ────────────────────────────────────────────────────────
// 3 Zonen: Header | Preview (erster Kanal) | Footer
// Karte klickbar = öffnet Editor. Keine Tab-Leiste mehr.
export default function PostCard({post,items,campaigns,stories,onEdit,onSched,onDel,onApprove,role}){
  const media       = items.find(m => m.id === post.mediaId);
  const camp        = campaigns?.find(c => c.id === post.campaignId);
  const chs         = post.channels?.length > 0 ? post.channels : ["instagram"];
  const PC          = PREV[chs[0]] || PREV.instagram;  // immer erster Kanal, kein Tab-Wechsel
  const can         = p => ROLES[role]?.can.includes(p);
  const parentStory = stories?.find(s => s.derivatives?.some(d => d.postId === post.id));
  const isPending   = post.status === "pending";

  return(
    <Card
      onClick={() => onEdit(post)}
      style={{
        overflow:"hidden", cursor:"pointer",
        transition:"box-shadow .18s, border-color .18s",
        display:"flex", flexDirection:"column",
        height:264, borderRadius:T.rLg, border:`1px solid ${C.border}`,
      }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(10,13,18,.10)";e.currentTarget.style.borderColor=T.gray300;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow=T.shadowXs;e.currentTarget.style.borderColor=C.border;}}
    >

      {/* ── Zone 1: Header — Titel · Metainfo · Status · Delete ── ~48px */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 12px 8px",flexShrink:0}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {post.title||"Kein Titel"}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2,height:14}}>
            {parentStory
              ? <span style={{...TYPO.caption,display:"inline-flex",alignItems:"center",gap:3,color:C.textMute}}>
                  <BookOpen size={9} strokeWidth={2}/>{parentStory.title?.slice(0,26)||(parentStory.title?"…":"")||"Story"}
                </span>
              : camp
                ? <span style={{...TYPO.caption,display:"flex",alignItems:"center",gap:3,color:C.textMute}}>
                    <span>{camp.emoji}</span>{camp.name}
                  </span>
                : null
            }
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,marginLeft:8,paddingTop:1}}>
          <SBadge status={post.status}/>
          {can("delete") && (
            <button
              onClick={e=>{e.stopPropagation();onDel(post.id);}}
              style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",padding:3,display:"flex",lineHeight:0,borderRadius:4,transition:"color .1s"}}
              onMouseEnter={e=>e.currentTarget.style.color=C.accent}
              onMouseLeave={e=>e.currentTarget.style.color=C.textMute}
            ><X size={13} strokeWidth={2}/></button>
          )}
        </div>
      </div>

      {/* ── Zone 2: Vorschau — immer erster Kanal, kein Tab-Wechsel ── flex:1 */}
      <div style={{flex:1,background:C.bg,padding:"0 8px 8px",overflow:"hidden",minHeight:0}}>
        <div style={{width:"100%",height:"100%",overflow:"hidden",borderRadius:T.rMd,border:`1px solid ${C.borderLight}`}}>
          <div style={{width:`${100/0.82}%`,transform:"scale(0.82)",transformOrigin:"top left"}}>
            <PC post={post} media={media}/>
          </div>
        </div>
      </div>

      {/* ── Zone 3: Footer — Kanal-Icons · Datum · eine Aktion ── 40px */}
      <div
        onClick={e=>e.stopPropagation()}
        style={{height:40,padding:"0 10px",background:C.surface,borderTop:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",gap:6,flexShrink:0}}
      >
        {isPending && can("approve") ? (
          /* Freigabe-Modus: kompakte OK/Ablehnen-Buttons */
          <>
            <span style={{flex:1,...TYPO.caption,color:C.textSoft,display:"flex",alignItems:"center",gap:4}}>
              <Clock size={10} strokeWidth={2} color={T.warning500}/>Freigabe
            </span>
            <Btn size="sm" variant="success" onClick={()=>onApprove(post.id,"scheduled")}><Check size={11} strokeWidth={2.5}/>OK</Btn>
            <Btn size="sm" variant="danger"  onClick={()=>onApprove(post.id,"draft")}><X size={11} strokeWidth={2.5}/>Nein</Btn>
          </>
        ) : (
          <>
            {/* Kanal-Icons (max 4, dann +n) */}
            <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
              {chs.slice(0,4).map(c=><ChIco key={c} id={c} size={12}/>)}
              {chs.length>4 && <span style={{...TYPO.caption,fontSize:10,color:C.textMute}}>+{chs.length-4}</span>}
            </div>

            {/* Datum */}
            <div style={{flex:1,overflow:"hidden"}}>
              {isPending
                ? <span style={{...TYPO.caption,color:T.warning500,display:"flex",alignItems:"center",gap:4}}>
                    <Clock size={10} strokeWidth={2}/>Zur Freigabe
                  </span>
                : post.scheduledDate
                  ? <span style={{...TYPO.caption,color:C.textSoft,whiteSpace:"nowrap"}}>
                      {fmtDate(post.scheduledDate)}{post.scheduledTime&&` · ${post.scheduledTime}`}
                    </span>
                  : <span style={{...TYPO.caption,color:C.textMute}}>Nicht geplant</span>
              }
            </div>

            {/* Eine Aktion: Planen / Ändern */}
            {can("write") && (
              <button
                onClick={e=>{e.stopPropagation();onSched(post);}}
                style={{display:"flex",alignItems:"center",gap:3,padding:"4px 8px",borderRadius:T.rSm,border:`1px solid ${C.border}`,background:"transparent",color:C.textMute,cursor:"pointer",transition:"all .12s",...TYPO.caption,flexShrink:0}}
                onMouseEnter={e=>{
                  const s=post.status==="scheduled";
                  e.currentTarget.style.background=s?T.successBg:T.brand25;
                  e.currentTarget.style.color=s?T.success500:C.accent;
                  e.currentTarget.style.borderColor=s?T.success500+"44":C.accent+"44";
                }}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.textMute;e.currentTarget.style.borderColor=C.border;}}
              >
                <Calendar size={11} strokeWidth={IW}/>
                {post.status==="scheduled"?"Ändern":"Planen"}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
