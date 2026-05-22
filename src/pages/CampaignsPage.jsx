import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import {
  Plus, X, Check, Trash2, Edit2, Flag, Calendar, Target, Users,
  DollarSign, BarChart2, TrendingUp, Eye, Heart, MousePointer,
  UserPlus, ShoppingCart, Globe, Send, ChevronRight, BadgeCheck,
  Zap, Play, Pause, Archive, RotateCcw, Clock,
} from "lucide-react";
import { C, T, FONT, IW } from "../constants/colors.js";
import { CHANNELS, CAMP_COLORS, CAMP_ICONS } from "../constants/demo.js";
import { uid } from "../utils/store.js";
import { SBadge } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────
function CampIcon({ name, size=18, color="currentColor", strokeWidth=IW }) {
  const Icon = LucideIcons[name] || LucideIcons.Flag;
  return <Icon size={size} color={color} strokeWidth={strokeWidth}/>;
}

const GOALS = [
  { id:"awareness",  label:"Bekanntheit",     I:Eye,           color:"#8B5CF6" },
  { id:"engagement", label:"Engagement",       I:Heart,         color:"#E1306C" },
  { id:"traffic",    label:"Website-Traffic",  I:MousePointer,  color:"#0EA5E9" },
  { id:"leads",      label:"Lead-Generierung", I:UserPlus,      color:"#F59E0B" },
  { id:"sales",      label:"Verkauf",          I:ShoppingCart,  color:"#16A34A" },
  { id:"community",  label:"Community",        I:Users,         color:"#6366F1" },
  { id:"event",      label:"Event",            I:Calendar,      color:"#EF4444" },
];

const STATUSES = {
  draft:     { label:"Entwurf",       color:T.gray600,    bg:T.gray100  },
  planned:   { label:"Geplant",       color:T.brand600,   bg:T.brand50  },
  active:    { label:"Aktiv",         color:T.success500, bg:T.successBg},
  paused:    { label:"Pausiert",      color:T.warning500, bg:T.warningBg},
  completed: { label:"Abgeschlossen", color:T.brand500,   bg:T.brand100 },
  archived:  { label:"Archiviert",    color:T.gray400,    bg:T.gray50   },
};

const STATUS_TRANSITIONS = {
  draft:     [{ to:"planned",   label:"Planen",       I:Calendar }],
  planned:   [{ to:"active",    label:"Starten",      I:Play     }, { to:"draft", label:"Zurück",  I:RotateCcw }],
  active:    [{ to:"paused",    label:"Pausieren",    I:Pause    }, { to:"completed", label:"Abschließen", I:BadgeCheck }],
  paused:    [{ to:"active",    label:"Fortsetzen",   I:Play     }, { to:"completed", label:"Abschließen", I:BadgeCheck }],
  completed: [{ to:"archived",  label:"Archivieren",  I:Archive  }],
  archived:  [],
};

const AGE_RANGES = ["Alle","13-17","18-24","25-34","35-44","45-54","55+"];
const GENDERS    = [{ v:"all",label:"Alle" },{ v:"male",label:"Männlich" },{ v:"female",label:"Weiblich" }];

function emptyForm() {
  return {
    name:"", icon:"Target", color:CAMP_COLORS[0],
    goal:"awareness", status:"draft", description:"", keyMessage:"", cta:"",
    startDate:"", endDate:"",
    channels:[],
    audience:{ ageRange:"Alle", gender:"all", locations:"", interests:"" },
    budget:{ total:"", spent:"0", currency:"EUR" },
    kpis:{ impressions:"", reach:"", engagementRate:"", clicks:"" },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "–";
  const [y,m,dy] = d.split("-");
  return `${dy}.${m}.${y}`;
}
function dateProg(start, end) {
  if (!start || !end) return null;
  const s = new Date(start), e = new Date(end), now = new Date();
  const total = (e-s)/86400000;
  const elapsed = (now-s)/86400000;
  const pct = Math.min(100, Math.max(0, (elapsed/total)*100));
  const daysLeft = Math.ceil((e-now)/86400000);
  return { pct, daysLeft, total:Math.round(total) };
}
function fmtBudget(n, currency="EUR") {
  return new Intl.NumberFormat("de-DE",{style:"currency",currency,maximumFractionDigits:0}).format(n||0);
}
function fmtNum(n) {
  if (!n) return "0";
  if (n>=1000000) return (n/1000000).toFixed(1)+"M";
  if (n>=1000)    return (n/1000).toFixed(0)+"K";
  return String(n);
}

// Mock actuals deterministically from campaign ID + published post count
function mockActuals(camp, pubCount) {
  const s = (camp.id||"x").split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const mult = 0.25 + (s%55)/100;
  const scale = Math.min(1, pubCount/4);
  const kpis = camp.kpis||{};
  return {
    impressions:  Math.round((kpis.impressions||0)  * mult * scale),
    reach:        Math.round((kpis.reach||0)         * mult * scale),
    engRate:      (((kpis.engagementRate||3) * (0.9+(s%20)/100))).toFixed(1),
    clicks:       Math.round((kpis.clicks||0)        * mult * scale),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
// CX Fusion: dot + text, no background chip
function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.draft;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      fontSize:11, fontWeight:500, color:s.color, whiteSpace:"nowrap" }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:s.color, flexShrink:0, display:"inline-block" }}/>
      {s.label}
    </span>
  );
}

function GoalBadge({ goal }) {
  const g = GOALS.find(x => x.id === goal) || GOALS[0];
  return (
    <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20,
      color:g.color, background:g.color+"14",
      display:"inline-flex", alignItems:"center", gap:3 }}>
      <g.I size={9} strokeWidth={2.5}/>{g.label}
    </span>
  );
}

function ProgressBar({ pct, color, h=5 }) {
  return (
    <div style={{ height:h, borderRadius:h, background:C.borderLight, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(100,pct||0)}%`, background:color, borderRadius:h, transition:"width .4s" }}/>
    </div>
  );
}

// ── Campaign Card (left list) ─────────────────────────────────────────────────
function CampCard({ camp, selected, postCount, onClick }) {
  const [hov, setHov] = useState(false);
  const prog = dateProg(camp.startDate, camp.endDate);
  const st   = STATUSES[camp.status||"draft"];
  const goal = GOALS.find(g => g.id === camp.goal);

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius:12, padding:"12px 14px", cursor:"pointer",
        border:`1.5px solid ${selected ? camp.color : hov ? camp.color+"60" : C.border}`,
        background: selected ? camp.color+"0E" : "#fff",
        transition:"all .15s", borderLeft:`4px solid ${camp.color}`,
      }}>

      {/* Row 1: icon + name + status */}
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:camp.color+"18",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <CampIcon name={camp.icon||"Flag"} size={16} color={camp.color} strokeWidth={1.8}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13.5, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{camp.name}</div>
        </div>
        <StatusBadge status={camp.status||"draft"}/>
      </div>

      {/* Row 2: goal + post count */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        {goal && <GoalBadge goal={camp.goal}/>}
        <span style={{ fontSize:10.5, color:C.textMute, marginLeft:"auto" }}>
          {postCount} Post{postCount!==1?"s":""}
        </span>
      </div>

      {/* Date range + progress */}
      {prog && (
        <div style={{ marginBottom:7 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:10, color:C.textMute }}>{fmtDate(camp.startDate)} – {fmtDate(camp.endDate)}</span>
            <span style={{ fontSize:10, fontWeight:600, color: prog.daysLeft < 14 ? "#EF4444" : C.textMute }}>
              {prog.daysLeft > 0 ? `${prog.daysLeft} Tage` : prog.daysLeft < 0 ? "Abgelaufen" : "Heute"}
            </span>
          </div>
          <ProgressBar pct={prog.pct} color={camp.color}/>
        </div>
      )}

      {/* Channels + budget */}
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ display:"flex", gap:3 }}>
          {(camp.channels||[]).slice(0,4).map(ch => <ChIco key={ch} id={ch} size={11} color={C.textMute}/>)}
        </div>
        {camp.budget?.total > 0 && (
          <span style={{ marginLeft:"auto", fontSize:10, color:C.textMute }}>
            {fmtBudget(camp.budget.spent)} / {fmtBudget(camp.budget.total)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Campaign Form Modal ───────────────────────────────────────────────────────
function CampForm({ form, setForm, onSave, onClose, isEdit }) {
  const F = (key, val) => setForm(f => ({ ...f, [key]:val }));
  const FA = (section, key, val) => setForm(f => ({ ...f, [section]:{ ...f[section], [key]:val } }));
  const label = { fontSize:11, fontWeight:600, color:"#6B7280", marginBottom:5, display:"block" };
  const inp   = { width:"100%", padding:"8px 11px", borderRadius:8, border:`1px solid ${C.border}`,
    fontFamily:FONT, fontSize:13, color:C.text, background:"#fff", boxSizing:"border-box", outline:"none" };
  const sec   = { marginBottom:20 };
  const secTitle = { fontSize:11.5, fontWeight:700, color:C.textMid, marginBottom:12,
    paddingBottom:7, borderBottom:`1px solid ${C.borderLight}`, display:"block" };

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(2px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560,
          maxHeight:"92vh", display:"flex", flexDirection:"column",
          boxShadow:"0 24px 64px rgba(0,0,0,.18)" }}>

        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:`1px solid ${C.borderLight}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontFamily:FONT, fontSize:16, fontWeight:700, color:C.text }}>
            {isEdit ? "Kampagne bearbeiten" : "Neue Kampagne"}
          </span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:"50%",
            border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", color:C.textMid, fontSize:15, fontWeight:700 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY:"auto", padding:"18px 20px", flex:1 }}>

          {/* ── Grundlagen ── */}
          <span style={secTitle}>Grundlagen</span>
          <div style={sec}>
            {/* Icon row */}
            <label style={label}>Icon</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:14 }}>
              {CAMP_ICONS.map(n => {
                const on = form.icon===n;
                return (
                  <button key={n} onClick={() => F("icon",n)} style={{
                    width:34, height:34, borderRadius:7, cursor:"pointer",
                    border:`1.5px solid ${on?form.color:C.border}`,
                    background:on?form.color+"18":C.surface,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <CampIcon name={n} size={15} color={on?form.color:C.textMute} strokeWidth={on?2:1.5}/>
                  </button>
                );
              })}
            </div>

            {/* Color row */}
            <label style={label}>Farbe</label>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:14 }}>
              {CAMP_COLORS.map(clr => (
                <button key={clr} onClick={() => F("color",clr)} style={{
                  width:24, height:24, borderRadius:"50%", background:clr, border:"none", cursor:"pointer",
                  outline:form.color===clr?`3px solid ${clr}`:"none", outlineOffset:2,
                }}/>
              ))}
            </div>

            <label style={label}>Name *</label>
            <input value={form.name} onChange={e=>F("name",e.target.value)}
              placeholder="z.B. Sommer-Sale, Produktlaunch, Ostern…" style={{...inp, marginBottom:10}}/>

            <label style={label}>Kurzbeschreibung</label>
            <textarea value={form.description} onChange={e=>F("description",e.target.value)}
              rows={2} placeholder="Was ist das Ziel dieser Kampagne?"
              style={{...inp, resize:"vertical", marginBottom:10}}/>
          </div>

          {/* ── Strategie ── */}
          <span style={secTitle}>Strategie & Ziel</span>
          <div style={sec}>
            <label style={label}>Kampagnenziel</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {GOALS.map(g => {
                const on = form.goal===g.id;
                return (
                  <button key={g.id} onClick={() => F("goal",g.id)} style={{
                    padding:"6px 12px", borderRadius:20, cursor:"pointer", fontFamily:FONT,
                    fontSize:11.5, fontWeight:on?700:500,
                    border:`1.5px solid ${on?g.color:C.border}`,
                    background:on?g.color+"14":"transparent",
                    color:on?g.color:C.textMid,
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                    <g.I size={11} strokeWidth={2}/>{g.label}
                  </button>
                );
              })}
            </div>

            <label style={label}>Status</label>
            <select value={form.status} onChange={e=>F("status",e.target.value)}
              style={{...inp, marginBottom:10}}>
              {Object.entries(STATUSES).map(([k,v]) =>
                <option key={k} value={k}>{v.label}</option>
              )}
            </select>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div>
                <label style={label}>Key Message</label>
                <input value={form.keyMessage||""} onChange={e=>F("keyMessage",e.target.value)}
                  placeholder="Kernbotschaft…" style={inp}/>
              </div>
              <div>
                <label style={label}>Call to Action</label>
                <input value={form.cta||""} onChange={e=>F("cta",e.target.value)}
                  placeholder="z.B. Jetzt shoppen" style={inp}/>
              </div>
            </div>
          </div>

          {/* ── Zeitraum & Kanäle ── */}
          <span style={secTitle}>Zeitraum & Kanäle</span>
          <div style={sec}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <label style={label}>Startdatum</label>
                <input type="date" value={form.startDate} onChange={e=>F("startDate",e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={label}>Enddatum</label>
                <input type="date" value={form.endDate} onChange={e=>F("endDate",e.target.value)} style={inp}/>
              </div>
            </div>
            <label style={label}>Zielkanäle</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {CHANNELS.map(ch => {
                const on = (form.channels||[]).includes(ch.id);
                return (
                  <button key={ch.id} onClick={() => F("channels", on ? form.channels.filter(x=>x!==ch.id) : [...(form.channels||[]),ch.id])}
                    style={{
                      padding:"5px 12px", borderRadius:20, cursor:"pointer", fontFamily:FONT,
                      fontSize:11.5, fontWeight:on?700:500,
                      border:`1.5px solid ${on?ch.color:C.border}`,
                      background:on?ch.color+"14":"transparent",
                      color:on?ch.color:C.textMid,
                      display:"flex", alignItems:"center", gap:6,
                    }}>
                    <ChIco id={ch.id} size={11}/>{ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Zielgruppe ── */}
          <span style={secTitle}>Zielgruppe</span>
          <div style={sec}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div>
                <label style={label}>Altersgruppe</label>
                <select value={form.audience?.ageRange||"Alle"} onChange={e=>FA("audience","ageRange",e.target.value)} style={inp}>
                  {AGE_RANGES.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Geschlecht</label>
                <select value={form.audience?.gender||"all"} onChange={e=>FA("audience","gender",e.target.value)} style={inp}>
                  {GENDERS.map(g=><option key={g.v} value={g.v}>{g.label}</option>)}
                </select>
              </div>
            </div>
            <label style={label}>Regionen (kommagetrennt)</label>
            <input value={form.audience?.locations||""} onChange={e=>FA("audience","locations",e.target.value)}
              placeholder="z.B. Deutschland, Österreich, Schweiz" style={{...inp,marginBottom:10}}/>
            <label style={label}>Interessen (kommagetrennt)</label>
            <input value={form.audience?.interests||""} onChange={e=>FA("audience","interests",e.target.value)}
              placeholder="z.B. Mode, Tech, Lifestyle" style={inp}/>
          </div>

          {/* ── Budget ── */}
          <span style={secTitle}>Budget</span>
          <div style={sec}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 80px", gap:10 }}>
              <div>
                <label style={label}>Gesamtbudget</label>
                <input type="number" min={0} value={form.budget?.total||""} onChange={e=>FA("budget","total",e.target.value)}
                  placeholder="0" style={inp}/>
              </div>
              <div>
                <label style={label}>Bereits ausgegeben</label>
                <input type="number" min={0} value={form.budget?.spent||""} onChange={e=>FA("budget","spent",e.target.value)}
                  placeholder="0" style={inp}/>
              </div>
              <div>
                <label style={label}>Währung</label>
                <select value={form.budget?.currency||"EUR"} onChange={e=>FA("budget","currency",e.target.value)} style={inp}>
                  <option>EUR</option><option>USD</option><option>CHF</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── KPI Ziele ── */}
          <span style={secTitle}>KPI-Ziele</span>
          <div style={sec}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { key:"impressions",   label:"Impressionen",   placeholder:"z.B. 500000"  },
                { key:"reach",         label:"Reichweite",     placeholder:"z.B. 150000"  },
                { key:"engagementRate",label:"Engagement Rate (%)","placeholder":"z.B. 3.5" },
                { key:"clicks",        label:"Klicks",         placeholder:"z.B. 8000"    },
              ].map(({ key, label:lbl, placeholder }) => (
                <div key={key}>
                  <label style={label}>{lbl}</label>
                  <input type="number" min={0} step={key==="engagementRate"?0.1:1}
                    value={form.kpis?.[key]||""} onChange={e=>FA("kpis",key,e.target.value)}
                    placeholder={placeholder} style={inp}/>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.borderLight}`,
          display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, padding:"9px 0", borderRadius:8,
            border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer",
            fontFamily:FONT, fontSize:13, fontWeight:600, color:C.textMid }}>
            Abbrechen
          </button>
          <button onClick={onSave} style={{ flex:2, padding:"9px 0", borderRadius:8,
            border:"none", background:C.text, cursor:"pointer",
            fontFamily:FONT, fontSize:13, fontWeight:700, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
            <Check size={14} strokeWidth={2.5}/>
            {isEdit ? "Änderungen speichern" : "Kampagne erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Campaign Detail Panel ────────────────────────────────────────────────────
function CampDetail({ camp, posts, onEdit, onDelete, onStatusChange, onEditPost }) {
  const [tab, setTab] = useState("overview");
  const cPosts  = posts.filter(p => p.campaignId === camp.id);
  const pubCnt  = cPosts.filter(p => p.status==="published").length;
  const prog    = dateProg(camp.startDate, camp.endDate);
  const actuals = mockActuals(camp, pubCnt);
  const goal    = GOALS.find(g => g.id === camp.goal);
  const st      = STATUSES[camp.status||"draft"];
  const transitions = STATUS_TRANSITIONS[camp.status||"draft"] || [];

  const tabs = [
    { id:"overview", label:"Übersicht" },
    { id:"posts",    label:`Posts (${cPosts.length})` },
    { id:"kpis",     label:"KPIs" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"20px 24px 0", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:14 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:camp.color+"18",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <CampIcon name={camp.icon||"Flag"} size={24} color={camp.color} strokeWidth={1.7}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:FONT, fontWeight:800, fontSize:20, color:C.text, letterSpacing:"-.3px", marginBottom:5 }}>
              {camp.name}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <StatusBadge status={camp.status||"draft"}/>
              {camp.goal && <GoalBadge goal={camp.goal}/>}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <button onClick={onEdit} style={{ padding:"6px 12px", borderRadius:8,
              border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer",
              fontFamily:FONT, fontSize:11.5, fontWeight:600, color:C.textMid,
              display:"flex", alignItems:"center", gap:5 }}>
              <Edit2 size={11} strokeWidth={2}/>Bearbeiten
            </button>
            <button onClick={onDelete} style={{ padding:"6px 10px", borderRadius:8,
              border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", color:C.textMute }}>
              <Trash2 size={13} strokeWidth={IW}/>
            </button>
          </div>
        </div>

        {/* Status transitions */}
        {transitions.length > 0 && (
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {transitions.map(t => (
              <button key={t.to} onClick={() => onStatusChange(t.to)}
                style={{ padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer",
                  fontFamily:FONT, fontSize:12, fontWeight:700,
                  background: STATUSES[t.to].color+"18",
                  color: STATUSES[t.to].color,
                  display:"flex", alignItems:"center", gap:6 }}>
                <t.I size={12} strokeWidth={2.5}/>{t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.borderLight}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"8px 16px", border:"none", background:"none", cursor:"pointer",
              fontFamily:FONT, fontSize:12.5, fontWeight:tab===t.id?700:500,
              color:tab===t.id?camp.color:C.textMute,
              borderBottom:tab===t.id?`2px solid ${camp.color}`:"2px solid transparent",
              transition:"all .12s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Timeline */}
            {prog && (
              <div style={{ padding:"14px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <Calendar size={13} color={C.textMid} strokeWidth={IW}/>
                  <span style={{ fontSize:12, fontWeight:700, color:C.textMid }}>Laufzeit</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12.5, fontWeight:600, color:C.text }}>{fmtDate(camp.startDate)} – {fmtDate(camp.endDate)}</span>
                  <span style={{ fontSize:11.5, color:prog.daysLeft<14?"#EF4444":C.textMute, fontWeight:600 }}>
                    {prog.daysLeft>0?`${prog.daysLeft} Tage übrig`:prog.daysLeft<0?"Abgelaufen":"Heute letzter Tag"}
                  </span>
                </div>
                <ProgressBar pct={prog.pct} color={camp.color} h={6}/>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                  <span style={{ fontSize:10, color:C.textMute }}>0%</span>
                  <span style={{ fontSize:10, color:C.textMute, fontWeight:600 }}>{Math.round(prog.pct)}% abgelaufen · {prog.total} Tage gesamt</span>
                </div>
              </div>
            )}

            {/* Strategy */}
            {(camp.keyMessage || camp.cta) && (
              <div style={{ padding:"14px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <Zap size={13} color={C.textMid} strokeWidth={IW}/>
                  <span style={{ fontSize:12, fontWeight:700, color:C.textMid }}>Strategie</span>
                </div>
                {camp.keyMessage && (
                  <div style={{ marginBottom:8 }}>
                    <span style={{ fontSize:10.5, color:C.textMute }}>Key Message</span>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginTop:2 }}>{camp.keyMessage}</div>
                  </div>
                )}
                {camp.cta && (
                  <div>
                    <span style={{ fontSize:10.5, color:C.textMute }}>Call to Action</span>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginTop:2 }}>{camp.cta}</div>
                  </div>
                )}
                {camp.description && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.borderLight}`,
                    fontSize:12.5, color:C.textSoft, lineHeight:1.5 }}>{camp.description}</div>
                )}
              </div>
            )}

            {/* Channels */}
            {camp.channels?.length > 0 && (
              <div style={{ padding:"14px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <Globe size={13} color={C.textMid} strokeWidth={IW}/>
                  <span style={{ fontSize:12, fontWeight:700, color:C.textMid }}>Kanäle</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {camp.channels.map(ch => {
                    const info = CHANNELS.find(c=>c.id===ch);
                    if (!info) return null;
                    return (
                      <span key={ch} style={{ padding:"4px 12px", borderRadius:20, fontSize:11.5, fontWeight:600,
                        color:info.color, background:info.color+"14", border:`1px solid ${info.color}30`,
                        display:"flex", alignItems:"center", gap:5 }}>
                        <ChIco id={ch} size={11}/>{info.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audience */}
            {camp.audience && (
              <div style={{ padding:"14px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <Users size={13} color={C.textMid} strokeWidth={IW}/>
                  <span style={{ fontSize:12, fontWeight:700, color:C.textMid }}>Zielgruppe</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {camp.audience.ageRange && camp.audience.ageRange!=="Alle" && (
                    <div style={{ fontSize:12, color:C.textSoft }}>🎂 {camp.audience.ageRange} Jahre</div>
                  )}
                  {camp.audience.gender && camp.audience.gender!=="all" && (
                    <div style={{ fontSize:12, color:C.textSoft }}>
                      {GENDERS.find(g=>g.v===camp.audience.gender)?.label}
                    </div>
                  )}
                  {camp.audience.locations && (
                    <div style={{ fontSize:12, color:C.textSoft }}>📍 {camp.audience.locations}</div>
                  )}
                </div>
                {camp.audience.interests && (
                  <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:5 }}>
                    {camp.audience.interests.split(",").map(i=>i.trim()).filter(Boolean).map(i => (
                      <span key={i} style={{ fontSize:10.5, padding:"2px 8px", borderRadius:5,
                        background:C.borderLight, color:C.textSoft }}>{i}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Budget */}
            {camp.budget?.total > 0 && (
              <div style={{ padding:"14px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <DollarSign size={13} color={C.textMid} strokeWidth={IW}/>
                    <span style={{ fontSize:12, fontWeight:700, color:C.textMid }}>Budget</span>
                  </div>
                  <span style={{ fontSize:11, color:C.textMute }}>
                    {Math.round(((camp.budget.spent||0)/camp.budget.total)*100)}% ausgegeben
                  </span>
                </div>
                <ProgressBar pct={((camp.budget.spent||0)/camp.budget.total)*100} color={camp.color} h={7}/>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:7 }}>
                  <span style={{ fontSize:12.5, fontWeight:700, color:C.text }}>{fmtBudget(camp.budget.spent, camp.budget.currency)}</span>
                  <span style={{ fontSize:12, color:C.textMute }}>von {fmtBudget(camp.budget.total, camp.budget.currency)}</span>
                </div>
                {camp.budget.spent > camp.budget.total && (
                  <div style={{ marginTop:8, fontSize:11, color:"#EF4444", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                    ⚠️ Budget überschritten um {fmtBudget(camp.budget.spent - camp.budget.total, camp.budget.currency)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Posts ── */}
        {tab === "posts" && (
          cPosts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px", color:C.textMute }}>
              <Send size={36} strokeWidth={1} style={{ margin:"0 auto 12px", display:"block" }}/>
              <div style={{ fontWeight:700, fontSize:14, color:C.textMid, marginBottom:4 }}>Noch keine Posts</div>
              <div style={{ fontSize:12 }}>Weise Posts dieser Kampagne zu, um sie hier zu sehen.</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
              {cPosts.map(p => (
                <div key={p.id} onClick={() => onEditPost(p)}
                  style={{ background:"#fff", borderRadius:10, border:`1px solid ${C.border}`,
                    padding:"11px 14px", cursor:"pointer", transition:"all .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.08)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:4, color:C.text }}>{p.title||"Kein Titel"}</div>
                  <div style={{ fontSize:11.5, color:C.textSoft, marginBottom:8,
                    overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                    {p.content}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", gap:3 }}>
                      {p.channels?.map(ch => <ChIco key={ch} id={ch} size={12}/>)}
                    </div>
                    <SBadge status={p.status}/>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── KPIs ── */}
        {tab === "kpis" && (() => {
          const kpis = camp.kpis || {};
          const items = [
            { label:"Impressionen", target:kpis.impressions, actual:actuals.impressions, icon:Eye,          color:"#8B5CF6" },
            { label:"Reichweite",   target:kpis.reach,        actual:actuals.reach,       icon:Users,        color:"#0EA5E9" },
            { label:"Engagement %", target:kpis.engagementRate,actual:actuals.engRate,    icon:Heart,        color:"#E1306C", isPercent:true },
            { label:"Klicks",       target:kpis.clicks,       actual:actuals.clicks,      icon:MousePointer, color:"#16A34A" },
          ];
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ fontSize:11.5, color:C.textMute, padding:"8px 12px", background:C.borderLight,
                borderRadius:8, display:"flex", alignItems:"center", gap:6 }}>
                <TrendingUp size={11} strokeWidth={2}/>
                Ist-Werte basieren auf veröffentlichten Posts × Kanal-Multiplikatoren (Demo)
              </div>
              {items.map(({ label, target, actual, icon:I, color, isPercent }) => {
                if (!target) return null;
                const pct = isPercent ? Math.min(150, (parseFloat(actual)/parseFloat(target))*100) : Math.min(100,(actual/target)*100);
                const onTrack = pct >= 80;
                return (
                  <div key={label} style={{ padding:"14px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:"#fff" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <I size={14} color={color} strokeWidth={2}/>
                        <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{label}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:6,
                        color:onTrack?"#16A34A":"#D97706", background:onTrack?"#F0FDF4":"#FFFBEB" }}>
                        {Math.round(pct)}% erreicht
                      </span>
                    </div>
                    <ProgressBar pct={pct} color={pct>=100?"#16A34A":color} h={7}/>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:7 }}>
                      <span style={{ fontSize:12.5, fontWeight:700, color:C.text }}>
                        {isPercent ? `${actual}%` : fmtNum(Number(actual))}
                      </span>
                      <span style={{ fontSize:12, color:C.textMute }}>
                        Ziel: {isPercent ? `${target}%` : fmtNum(Number(target))}
                      </span>
                    </div>
                  </div>
                );
              })}
              {items.every(x => !x.target) && (
                <div style={{ textAlign:"center", padding:"40px 0", color:C.textMute }}>
                  <BarChart2 size={32} strokeWidth={1} style={{ margin:"0 auto 10px", display:"block", opacity:.3 }}/>
                  <div style={{ fontSize:13, fontWeight:600, color:C.textSoft }}>Keine KPI-Ziele definiert</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Bearbeite die Kampagne und trage KPI-Ziele ein.</div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const { campaigns, setCampaigns, posts: allPosts, setEdPost: onEditPost } = useApp();
  const posts = allPosts.filter(p => !p.deleted);

  const [formOpen,  setFormOpen]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [selectedId,setSelectedId]= useState(null);
  const [filterStatus, setFilter] = useState("all");
  const [form, setForm] = useState(emptyForm());

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setFormOpen(true); };
  const openEdit   = (c) => {
    setForm({
      name:c.name||"", icon:c.icon||"Target", color:c.color||CAMP_COLORS[0],
      goal:c.goal||"awareness", status:c.status||"draft",
      description:c.description||"", keyMessage:c.keyMessage||"", cta:c.cta||"",
      startDate:c.startDate||"", endDate:c.endDate||"",
      channels:c.channels||[],
      audience:{ ageRange:c.audience?.ageRange||"Alle", gender:c.audience?.gender||"all",
        locations:c.audience?.locations||"", interests:c.audience?.interests||"" },
      budget:{ total:c.budget?.total||"", spent:c.budget?.spent||"0", currency:c.budget?.currency||"EUR" },
      kpis:{ impressions:c.kpis?.impressions||"", reach:c.kpis?.reach||"",
        engagementRate:c.kpis?.engagementRate||"", clicks:c.kpis?.clicks||"" },
    });
    setEditId(c.id);
    setFormOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const data = {
      ...form,
      budget:{ ...form.budget, total:Number(form.budget.total)||0, spent:Number(form.budget.spent)||0 },
      kpis:{ impressions:Number(form.kpis.impressions)||0, reach:Number(form.kpis.reach)||0,
        engagementRate:Number(form.kpis.engagementRate)||0, clicks:Number(form.kpis.clicks)||0 },
      createdAt: editId ? (campaigns.find(c=>c.id===editId)?.createdAt||new Date().toISOString().slice(0,10)) : new Date().toISOString().slice(0,10),
    };
    if (editId) {
      setCampaigns(p => p.map(c => c.id===editId ? { ...c, ...data } : c));
    } else {
      const newC = { id:uid(), ...data };
      setCampaigns(p => [...p, newC]);
      setSelectedId(newC.id);
    }
    setFormOpen(false);
  };

  const del = (id) => {
    if (!window.confirm("Kampagne löschen?")) return;
    setCampaigns(p => p.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const changeStatus = (campId, newStatus) => {
    setCampaigns(p => p.map(c => c.id===campId ? { ...c, status:newStatus } : c));
  };

  const filtered = useMemo(() =>
    filterStatus === "all" ? campaigns : campaigns.filter(c => (c.status||"draft") === filterStatus),
    [campaigns, filterStatus]
  );

  const selected = campaigns.find(c => c.id === selectedId);

  // Summary stats
  const stats = useMemo(() => {
    const counts = { active:0, planned:0, completed:0, total:campaigns.length };
    campaigns.forEach(c => {
      if (c.status==="active")    counts.active++;
      if (c.status==="planned")   counts.planned++;
      if (c.status==="completed") counts.completed++;
    });
    return counts;
  }, [campaigns]);

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:C.bg, fontFamily:FONT }}>

      {/* Page header */}
      <div style={{ padding:"16px 22px 12px", borderBottom:`1px solid ${C.borderLight}`,
        background:"#fff", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:20, fontWeight:700, color:C.text, letterSpacing:"-.3px" }}>Kampagnen</div>
          <div style={{ fontSize:11.5, color:C.textMute, marginTop:2, display:"flex", gap:12 }}>
            <span style={{ color:T.success500, fontWeight:600 }}>{stats.active} aktiv</span>
            <span style={{ color:T.brand600, fontWeight:600 }}>{stats.planned} geplant</span>
            <span style={{ color:C.textMute }}>{stats.completed} abgeschlossen</span>
            <span>· {stats.total} gesamt</span>
          </div>
        </div>
        <button onClick={openCreate}
          onMouseEnter={e=>{e.currentTarget.style.background=T.brand100;e.currentTarget.style.borderColor=T.brand300;}}
          onMouseLeave={e=>{e.currentTarget.style.background=T.brand25;e.currentTarget.style.borderColor=T.brand200;}}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
            borderRadius:T.rMd, border:`1px solid ${T.brand200}`, background:T.brand25, cursor:"pointer",
            fontFamily:FONT, fontSize:13, fontWeight:600, color:C.accent, transition:"all .15s" }}>
          <Plus size={14} strokeWidth={2.5}/>Neue Kampagne
        </button>
      </div>

      {/* Body: left list + right detail */}
      <div style={{ flex:1, overflow:"hidden", display:"flex" }}>

        {/* LEFT: Campaign list */}
        <div style={{ width:340, flexShrink:0, display:"flex", flexDirection:"column",
          borderRight:`1px solid ${C.borderLight}`, overflow:"hidden" }}>

          {/* Status filter pills */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.borderLight}`, display:"flex", gap:4, flexWrap:"nowrap", overflowX:"auto" }}>
            {[["all","Alle"],["active","Aktiv"],["planned","Geplant"],["draft","Entwurf"],["completed","Abgeschlossen"]].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{ padding:"4px 10px", borderRadius:16, cursor:"pointer", fontFamily:FONT,
                  fontSize:10.5, fontWeight:filterStatus===v?700:500,
                  border:`1px solid ${filterStatus===v?C.accent:C.border}`,
                  background:filterStatus===v?C.accent+"14":"transparent",
                  color:filterStatus===v?C.accent:C.textMid }}>
                {l}
              </button>
            ))}
          </div>

          {/* Campaign cards */}
          <div style={{ flex:1, overflowY:"auto", padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 16px", color:C.textMute }}>
                <Flag size={36} strokeWidth={1} style={{ margin:"0 auto 10px", display:"block", opacity:.3 }}/>
                <div style={{ fontSize:13, fontWeight:600, color:C.textSoft, marginBottom:4 }}>Keine Kampagnen</div>
                <div style={{ fontSize:11.5 }}>Erstelle eine neue Kampagne oben rechts.</div>
              </div>
            )}
            {filtered.map(c => (
              <CampCard key={c.id}
                camp={c}
                selected={selectedId===c.id}
                postCount={posts.filter(p=>p.campaignId===c.id).length}
                onClick={() => setSelectedId(selectedId===c.id ? null : c.id)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Campaign detail */}
        <div style={{ flex:1, overflow:"hidden" }}>
          {selected ? (
            <CampDetail
              camp={selected}
              posts={posts}
              onEdit={() => openEdit(selected)}
              onDelete={() => del(selected.id)}
              onStatusChange={s => changeStatus(selected.id, s)}
              onEditPost={onEditPost}
            />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              height:"100%", color:C.textMute, gap:12 }}>
              <Flag size={52} strokeWidth={1} style={{ opacity:.2 }}/>
              <div style={{ fontSize:15, fontWeight:700, color:C.textMid }}>Kampagne auswählen</div>
              <div style={{ fontSize:13, color:C.textMute }}>Klicke auf eine Kampagne in der Liste links.</div>
              <button onClick={openCreate} style={{ marginTop:8, padding:"8px 20px", borderRadius:8,
                border:`1.5px dashed ${C.border}`, background:"transparent", cursor:"pointer",
                fontFamily:FONT, fontSize:13, fontWeight:600, color:C.textSoft,
                display:"flex", alignItems:"center", gap:6 }}>
                <Plus size={13} strokeWidth={2}/>Erste Kampagne erstellen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      {formOpen && (
        <CampForm form={form} setForm={setForm} onSave={save} onClose={() => setFormOpen(false)} isEdit={!!editId}/>
      )}
    </div>
  );
}
