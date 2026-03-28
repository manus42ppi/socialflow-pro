import { useState, useEffect, useRef, useMemo } from "react";
import { Users, Shield, Key, Settings, Bell, Globe, Database, Activity, ChevronRight, Plus, Trash2, Edit3, Check, X, AlertCircle, Info } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW, CSS } from "../constants/colors.js";
import { CHANNELS, ROLES, DEMO_USERS } from "../constants/demo.js";
import { storeGet, storeSet } from "../utils/store.js";
import { Sp, Badge, Avatar, Btn, Card, FL, TIn, SBadge, SCrd } from "../components/ui/index.jsx";
import { useSections, SecCard } from "../hooks/useSections.jsx";

// ── ADMIN PAGE ─────────────────────────────────────────────────────────────
function AdminPage({me,onUpdateMe}){
  const [tab,setTab]=useState("profile");
  // ── State ──
  const [profile,setProfile]=useState({firstName:"",lastName:"",email:me.email||"",phone:"",bio:""});
  const [company,setCompany]=useState({name:"",industry:"",website:"",street:"",city:"",zip:"",country:"Deutschland"});
  const [chCreds,setChCreds]=useState({instagram:{accountId:"",accessToken:""},twitter:{apiKey:"",apiSecret:"",accessToken:"",accessTokenSecret:""},linkedin:{accessToken:""},facebook:{pageId:"",accessToken:""},whatsapp:{phoneNumberId:"",bizAccountId:"",accessToken:""}});
  const [localCreds,setLocalCreds]=useState({instagram:{},twitter:{},linkedin:{},facebook:{},whatsapp:{}});
  const [apiKeys,setApiKeys]=useState({unsplash:skGet("unsplash"),pexels:skGet("pexels"),pixabay:skGet("pixabay"),anthropic:skGet("anthropic")||""});
  const [workspace,setWorkspace]=useState({name:"SocialFlow Demo",timezone:"Europe/Berlin",language:"de"});
  const [notif,setNotif]=useState({onSched:true,onAppr:true,onPub:true,onErr:true});
  const [users,setUsers]=useState(DEMO_USERS.map(u=>({...u})));
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({name:"",email:""});
  const [invE,setInvE]=useState("");const [invR,setInvR]=useState("editor");const [invOk,setInvOk]=useState(false);
  const [expandedCh,setExpandedCh]=useState(null);
  const [flash,setFlash]=useState("");

  // ── KV persistence ──
  useEffect(()=>{
    storeGet("admin:profile").then(d=>{if(d)setProfile(p=>({...p,...d}));});
    storeGet("admin:company").then(d=>{if(d)setCompany(p=>({...p,...d}));});
    storeGet("admin:channels").then(d=>{if(d){setChCreds(p=>({...p,...d}));setLocalCreds(p=>({...p,...d}));}});
    storeGet("admin:workspace").then(d=>{if(d)setWorkspace(p=>({...p,...d}));});
    storeGet("admin:notif").then(d=>{if(d)setNotif(p=>({...p,...d}));});
    storeGet("admin:apikeys").then(d=>{if(d){setApiKeys(p=>({...p,...d}));Object.entries(d).forEach(([k,v])=>{if(v)skSet(k,v);});}});
    storeGet("admin:team").then(d=>{if(d&&Array.isArray(d))setUsers(d);});
  },[]);

  const showFlash=(s)=>{setFlash(s);setTimeout(()=>setFlash(""),2200);};
  const saveProfile=()=>{storeSet("admin:profile",profile);storeSet("admin:company",company);showFlash("profile");};
  const saveWorkspace=()=>{storeSet("admin:workspace",workspace);storeSet("admin:notif",notif);showFlash("workspace");};
  const saveChCred=(id,val)=>{const n={...chCreds,[id]:val};setChCreds(n);storeSet("admin:channels",n);showFlash("ch_"+id);};
  const saveApiKey=(id,v)=>{const n={...apiKeys,[id]:v};setApiKeys(n);skSet(id,v);storeSet("admin:apikeys",n);};
  const saveTeam=(next)=>{setUsers(next);storeSet("admin:team",next);};
  const startEdit=(u)=>{setEditingId(u.id);setEditForm({name:u.name,email:u.email});};
  const commitEdit=(id)=>{
    const next=users.map(u=>{
      if(u.id!==id)return u;
      const name=editForm.name.trim()||u.name;
      const email=editForm.email.trim()||u.email;
      const avatar=name.split(" ").filter(Boolean).map(w=>w[0]).join("").toUpperCase().slice(0,2)||u.avatar;
      return{...u,name,email,avatar};
    });
    saveTeam(next);
    // If the edited user is the currently logged-in user → update root user state
    const updated=next.find(u=>u.id===id);
    if(updated&&updated.id===me.id)onUpdateMe?.(updated);
    setEditingId(null);showFlash("team_"+id);
  };
  const isConn=(id)=>{const c=chCreds[id];if(!c)return false;if(id==="instagram")return !!(c.accountId&&c.accessToken);if(id==="twitter")return !!(c.apiKey&&c.apiSecret&&c.accessToken&&c.accessTokenSecret);if(id==="linkedin")return !!c.accessToken;if(id==="facebook")return !!(c.pageId&&c.accessToken);if(id==="whatsapp")return !!(c.phoneNumberId&&c.accessToken);return false;};

  // Channel credential field definitions
  const CH_FIELDS={
    instagram:[{k:"accountId",l:"Business Account ID",h:"Instagram Business → Einstellungen → Konto"},{k:"accessToken",l:"Access Token",pw:true,h:"Meta for Developers → Deine App → Tools → Access Token"}],
    twitter:[{k:"apiKey",l:"API Key",pw:true},{k:"apiSecret",l:"API Secret",pw:true},{k:"accessToken",l:"Access Token",pw:true},{k:"accessTokenSecret",l:"Access Token Secret",pw:true}],
    linkedin:[{k:"accessToken",l:"OAuth Access Token",pw:true,h:"LinkedIn Developer Portal → OAuth 2.0 Tools"}],
    facebook:[{k:"pageId",l:"Page ID",h:"Facebook Seite → Über → Seiten-ID"},{k:"accessToken",l:"Page Access Token",pw:true,h:"Meta for Developers → Graph API Explorer"}],
    whatsapp:[{k:"phoneNumberId",l:"Phone Number ID",h:"Meta Business Suite → WhatsApp → Telefonnummer"},{k:"bizAccountId",l:"Business Account ID"},{k:"accessToken",l:"System Access Token",pw:true}],
  };
  const CH_LINKS={instagram:"https://developers.facebook.com/",twitter:"https://developer.twitter.com/",linkedin:"https://developer.linkedin.com/",facebook:"https://developers.facebook.com/",whatsapp:"https://developers.facebook.com/docs/whatsapp/"};

  // Small helpers
  const Toggle=({val,onChange})=><div onClick={()=>onChange(!val)} style={{width:36,height:20,borderRadius:10,background:val?C.accent:C.border,display:"flex",alignItems:"center",padding:"0 2px",cursor:"pointer",transition:"all .2s",justifyContent:val?"flex-end":"flex-start"}}><div style={{width:16,height:16,borderRadius:"50%",background:"#fff"}}/></div>;
  const SavedBadge=({id})=>flash===id?<span style={{fontSize:11,color:C.success,fontWeight:700,display:"flex",alignItems:"center",gap:4}}><Check size={11} strokeWidth={2.5}/>Gespeichert</span>:null;
  const SH=({label,children,action})=><div style={{marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontWeight:700,fontSize:12,color:C.textMid,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</div>{action}</div>{children}</div>;

  return(
    <div style={{flex:1,overflow:"auto",padding:22,display:"flex",flexDirection:"column",gap:16}}>
      {/* Tab bar */}
      <div style={{display:"flex",gap:3,background:C.borderLight,borderRadius:9,padding:4,alignSelf:"flex-start",flexWrap:"wrap"}}>
        {[["profile","Profil",User],["channels","Kanäle",Globe],["apikeys","API-Keys",Key],["team","Team",Users],["settings","Einstellungen",Settings]].map(([id,l,Ic])=>(
          <button key={id} onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 15px",borderRadius:7,border:"none",background:tab===id?C.surface:"transparent",color:tab===id?C.text:C.textSoft,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FONT,boxShadow:tab===id?"0 1px 3px rgba(0,0,0,.07)":"none"}}>
            <Ic size={14} strokeWidth={IW}/>{l}
          </button>
        ))}
      </div>

      {/* ── PROFIL ── */}
      {tab==="profile"&&<div style={{maxWidth:580,display:"flex",flexDirection:"column",gap:14}}>
        <Card style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <SH label="Persönliche Daten"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <TIn label="Vorname" icon={User} value={profile.firstName} onChange={e=>setProfile(p=>({...p,firstName:e.target.value}))} placeholder="Max"/>
            <TIn label="Nachname" value={profile.lastName} onChange={e=>setProfile(p=>({...p,lastName:e.target.value}))} placeholder="Mustermann"/>
          </div>
          <TIn label="E-Mail" icon={Mail} value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))} placeholder="max@firma.de"/>
          <TIn label="Telefon" icon={Phone} value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} placeholder="+49 151 …"/>
          <div><FL>Kurzbio / Rolle</FL><textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} placeholder="Social Media Manager bei …" rows={2} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT,resize:"vertical",boxSizing:"border-box",outline:"none"}}/></div>
        </Card>
        <Card style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <SH label="Unternehmen"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <TIn label="Firmenname" icon={Building2} value={company.name} onChange={e=>setCompany(p=>({...p,name:e.target.value}))} placeholder="Musterfirma GmbH"/>
            <TIn label="Branche" value={company.industry} onChange={e=>setCompany(p=>({...p,industry:e.target.value}))} placeholder="Marketing"/>
          </div>
          <TIn label="Website" icon={Globe} value={company.website} onChange={e=>setCompany(p=>({...p,website:e.target.value}))} placeholder="https://www.musterfirma.de"/>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
            <TIn label="Straße & Nr." icon={MapPin} value={company.street} onChange={e=>setCompany(p=>({...p,street:e.target.value}))} placeholder="Musterstraße 1"/>
            <TIn label="PLZ" value={company.zip} onChange={e=>setCompany(p=>({...p,zip:e.target.value}))} placeholder="10115"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <TIn label="Stadt" value={company.city} onChange={e=>setCompany(p=>({...p,city:e.target.value}))} placeholder="Berlin"/>
            <div><FL>Land</FL><select value={company.country} onChange={e=>setCompany(p=>({...p,country:e.target.value}))} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT,outline:"none"}}>
              {["Deutschland","Österreich","Schweiz","Luxemburg","Liechtenstein"].map(c=><option key={c}>{c}</option>)}
            </select></div>
          </div>
        </Card>
        <div style={{display:"flex",alignItems:"center",gap:12}}><Btn onClick={saveProfile}><Save size={14} strokeWidth={2}/>Profil speichern</Btn><SavedBadge id="profile"/></div>
      </div>}

      {/* ── KANÄLE ── */}
      {tab==="channels"&&<div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:680}}>
        {CHANNELS.map(info=>{
          const conn=isConn(info.id);
          const open=expandedCh===info.id;
          const fields=CH_FIELDS[info.id]||[];
          const lc=localCreds[info.id]||{};
          const setLC=(k,v)=>setLocalCreds(p=>({...p,[info.id]:{...p[info.id],[k]:v}}));
          return <Card key={info.id} style={{padding:0,overflow:"hidden"}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer"}} onClick={()=>setExpandedCh(open?null:info.id)}>
              <div style={{width:36,height:36,borderRadius:9,background:info.color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChIco id={info.id} size={18}/></div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{info.label}</div>
                <div style={{fontSize:11,color:conn?C.success:C.textMute,marginTop:1,display:"flex",alignItems:"center",gap:4}}>
                  {conn?<><Wifi size={10} strokeWidth={2}/>Verbunden – Zugangsdaten hinterlegt</>:<><WifiOff size={10} strokeWidth={2}/>Nicht verbunden</>}
                </div>
              </div>
              <Badge color={conn?C.success:C.textMute} bg={conn?C.successBg:C.borderLight}>{conn?<><Check size={10} strokeWidth={2.5}/>Aktiv</>:"Einrichten"}</Badge>
              {open?<ChevronUp size={16} color={C.textSoft} strokeWidth={2}/>:<ChevronDown size={16} color={C.textSoft} strokeWidth={2}/>}
            </div>
            {/* Credential form */}
            {open&&<div style={{padding:"14px 18px 16px",borderTop:`1px solid ${C.borderLight}`}}>
              <div style={{fontSize:12,color:C.textSoft,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                <Shield size={12} strokeWidth={2}/>Zugangsdaten werden verschlüsselt gespeichert.
                <a href={CH_LINKS[info.id]} target="_blank" rel="noreferrer" style={{color:C.accent,textDecoration:"none",display:"flex",alignItems:"center",gap:3,marginLeft:4}}>
                  Developer Portal <ExternalLink size={10} strokeWidth={2}/>
                </a>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {fields.map(f=>(
                  <div key={f.k}>
                    <FL>{f.l}</FL>
                    <input type={f.pw?"password":"text"} value={lc[f.k]||""} onChange={e=>setLC(f.k,e.target.value)} placeholder={f.pw?"••••••••••••":f.l} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT,outline:"none",boxSizing:"border-box"}}/>
                    {f.h&&<div style={{fontSize:10.5,color:C.textMute,marginTop:3}}>{f.h}</div>}
                  </div>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:14}}>
                <Btn onClick={()=>saveChCred(info.id,lc)}><Save size={13} strokeWidth={2}/>Speichern</Btn>
                {conn&&<Btn variant="danger" size="sm" onClick={()=>{const empty=Object.fromEntries(fields.map(f=>[f.k,""]));saveChCred(info.id,empty);setLocalCreds(p=>({...p,[info.id]:empty}));}}><X size={12} strokeWidth={2}/>Trennen</Btn>}
                <SavedBadge id={"ch_"+info.id}/>
              </div>
            </div>}
          </Card>;
        })}
      </div>}

      {/* ── API-KEYS ── */}
      {tab==="apikeys"&&<div style={{maxWidth:600,display:"flex",flexDirection:"column",gap:14}}>
        {/* Bilddatenbanken */}
        <Card style={{padding:"18px 20px"}}>
          <SH label="Bilddatenbanken – Stock-Fotos & Videos"/>
          {[
            {id:"unsplash",label:"Unsplash",dot:"#111111",url:"https://unsplash.com/developers",desc:"API Key (Client ID)"},
            {id:"pexels",  label:"Pexels",  dot:"#05A081",url:"https://www.pexels.com/api/",   desc:"API Key"},
            {id:"pixabay", label:"Pixabay", dot:"#2EC261",url:"https://pixabay.com/api/docs/",  desc:"API Key"},
          ].map(s=>{
            const hasKey=!!apiKeys[s.id];
            return <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.borderLight}`}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
              <div style={{width:72,fontWeight:500,fontSize:13,color:C.text}}>{s.label}</div>
              <div style={{position:"relative",flex:1}}>
                <input type="password" value={apiKeys[s.id]} onChange={e=>saveApiKey(s.id,e.target.value)} placeholder={`${s.desc}…`}
                  style={{width:"100%",padding:"7px 34px 7px 10px",borderRadius:7,border:`1.5px solid ${hasKey?C.success:C.border}`,fontSize:12,fontFamily:FONT,outline:"none",boxSizing:"border-box"}}/>
                {hasKey&&<Check size={12} color={C.success} strokeWidth={2.5} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"}}/>}
              </div>
              <a href={s.url} target="_blank" rel="noreferrer" style={{color:C.accent,fontSize:11,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                Key holen<ExternalLink size={10} strokeWidth={2}/>
              </a>
            </div>;
          })}
        </Card>
        {/* KI-Dienste */}
        <Card style={{padding:"18px 20px"}}>
          <SH label="KI-Dienste"/>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0"}}>
            <Sparkles size={14} color={C.accent} strokeWidth={2} style={{flexShrink:0}}/>
            <div style={{width:72,fontWeight:500,fontSize:13,color:C.text}}>Anthropic</div>
            <div style={{position:"relative",flex:1}}>
              <input type="password" value={apiKeys.anthropic} onChange={e=>saveApiKey("anthropic",e.target.value)} placeholder="sk-ant-…"
                style={{width:"100%",padding:"7px 34px 7px 10px",borderRadius:7,border:`1.5px solid ${apiKeys.anthropic?C.success:C.border}`,fontSize:12,fontFamily:FONT,outline:"none",boxSizing:"border-box"}}/>
              {apiKeys.anthropic&&<Check size={12} color={C.success} strokeWidth={2.5} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"}}/>}
            </div>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{color:C.accent,fontSize:11,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
              Key holen<ExternalLink size={10} strokeWidth={2}/>
            </a>
          </div>
          <div style={{fontSize:11,color:C.textMute,marginTop:6}}>Wird für KI-Bildanalyse, Post-Vorschläge und den KI-Assistenten verwendet.</div>
        </Card>
        <div style={{padding:"12px 16px",borderRadius:10,background:C.accentLight,border:`1px solid ${C.accent}30`,fontSize:12,color:C.textMid,display:"flex",gap:10,alignItems:"flex-start"}}>
          <Shield size={14} color={C.accent} strokeWidth={2} style={{flexShrink:0,marginTop:1}}/>
          <span>API-Keys werden sowohl lokal (Browser) als auch serverseitig gespeichert, sodass sie auf allen Geräten verfügbar sind.</span>
        </div>
      </div>}

      {/* ── TEAM ── */}
      {tab==="team"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card style={{padding:"16px 20px"}}>
          <div style={{fontWeight:500,fontSize:12,marginBottom:10}}>Mitglied einladen</div>
          <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:200}}><TIn label="E-Mail" icon={Mail} placeholder="kollege@firma.com" value={invE} onChange={e=>setInvE(e.target.value)}/></div>
            <div><FL>Rolle</FL><select value={invR} onChange={e=>setInvR(e.target.value)} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT,outline:"none"}}>
              <option value="editor">Editor</option><option value="viewer">Betrachter</option><option value="admin">Admin</option>
            </select></div>
            <Btn onClick={()=>{if(!invE)return;setInvOk(true);setTimeout(()=>setInvOk(false),2500);setInvE("");}}><Send size={13} strokeWidth={2}/>Einladen</Btn>
          </div>
          {invOk&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:6,color:C.success,fontSize:13,fontWeight:600}}><CheckCircle size={14} strokeWidth={2}/>Einladung gesendet!</div>}
        </Card>
        <Card>
          {users.map((u,i)=>{
            const isEditing=editingId===u.id;
            const isSelf=u.id===me.id;
            return(
              <div key={u.id} style={{borderBottom:i<users.length-1?`1px solid ${C.borderLight}`:"none"}}>
                {/* Main row */}
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px"}}>
                  <Avatar initials={u.avatar} size={34} color={ROLES[u.role].color}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.text}}>
                      {u.name}{isSelf&&<span style={{fontSize:11,color:C.textMute,marginLeft:6}}>(Du)</span>}
                    </div>
                    <div style={{fontSize:11.5,color:C.textSoft,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                  </div>
                  <select value={u.role} disabled={isSelf}
                    onChange={e=>{const next=users.map(x=>x.id===u.id?{...x,role:e.target.value}:x);saveTeam(next);}}
                    style={{padding:"4px 8px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:11.5,fontWeight:700,color:ROLES[u.role].color,fontFamily:FONT,background:ROLES[u.role].color+"12",outline:"none",cursor:"pointer"}}>
                    <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Betrachter</option>
                  </select>
                  {/* Edit button */}
                  <button title="Bearbeiten" onClick={()=>isEditing?setEditingId(null):startEdit(u)}
                    style={{width:28,height:28,borderRadius:7,border:`1px solid ${isEditing?C.accent:C.border}`,background:isEditing?C.accentLight:"none",color:isEditing?C.accent:C.textMute,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .13s",flexShrink:0}}>
                    <Edit2 size={13} strokeWidth={2}/>
                  </button>
                  {!isSelf&&<button onClick={()=>saveTeam(users.filter(x=>x.id!==u.id))} title="Entfernen"
                    style={{width:28,height:28,borderRadius:7,border:"none",background:"none",color:C.textMute,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
                    onMouseEnter={e=>e.currentTarget.style.color="#e53e3e"} onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>
                    <Trash2 size={13} strokeWidth={IW}/>
                  </button>}
                </div>
                {/* Inline edit form */}
                {isEditing&&(
                  <div style={{padding:"0 18px 14px 18px",display:"flex",flexDirection:"column",gap:8,borderTop:`1px solid ${C.borderLight}`,paddingTop:12,background:C.bg}}>
                    <div style={{display:"flex",gap:10}}>
                      <div style={{flex:1}}>
                        <FL>Name</FL>
                        <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}
                          onKeyDown={e=>e.key==="Enter"&&commitEdit(u.id)}
                          style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${C.accent}`,fontSize:12.5,fontFamily:FONT,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{flex:1}}>
                        <FL>E-Mail</FL>
                        <input value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))}
                          onKeyDown={e=>e.key==="Enter"&&commitEdit(u.id)}
                          style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:12.5,fontFamily:FONT,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <Btn size="sm" onClick={()=>commitEdit(u.id)}><Check size={12} strokeWidth={2.5}/>Speichern</Btn>
                      <button onClick={()=>setEditingId(null)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,color:C.textSoft,padding:"5px 11px",cursor:"pointer",fontFamily:FONT}}>Abbrechen</button>
                      {flash===`team_${u.id}`&&<span style={{fontSize:11,color:C.success,fontWeight:700,display:"flex",alignItems:"center",gap:4}}><Check size={11} strokeWidth={2.5}/>Gespeichert</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>}

      {/* ── EINSTELLUNGEN ── */}
      {tab==="settings"&&<div style={{maxWidth:520,display:"flex",flexDirection:"column",gap:14}}>
        <Card style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
          <SH label="Workspace"/>
          <TIn label="Workspace-Name" value={workspace.name} onChange={e=>setWorkspace(p=>({...p,name:e.target.value}))}/>
          <TIn label="Zeitzone" value={workspace.timezone} onChange={e=>setWorkspace(p=>({...p,timezone:e.target.value}))}/>
          <div><FL>Sprache</FL><select value={workspace.language} onChange={e=>setWorkspace(p=>({...p,language:e.target.value}))} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:FONT,outline:"none"}}>
            <option value="de">Deutsch</option><option value="en">English</option>
          </select></div>
        </Card>
        <Card style={{padding:"14px 18px"}}>
          <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>E-Mail Benachrichtigungen</div>
          {[["onSched","Post geplant"],["onAppr","Freigabe angefordert"],["onPub","Post veröffentlicht"],["onErr","Fehler beim Posten"]].map(([key,label])=>(
            <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.borderLight}`}}>
              <span style={{fontSize:13,color:C.textMid}}>{label}</span>
              <Toggle val={notif[key]} onChange={v=>setNotif(n=>({...n,[key]:v}))}/>
            </div>
          ))}
        </Card>
        <div style={{display:"flex",alignItems:"center",gap:12}}><Btn onClick={saveWorkspace}><Save size={14} strokeWidth={2}/>Speichern</Btn><SavedBadge id="workspace"/></div>
      </div>}
    </div>
  );
}
export default AdminPage;
