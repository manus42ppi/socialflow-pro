import { useState, useMemo, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { useSections, SecCard } from "../hooks/useSections.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

function CampIcon({ name, size = 16, color = "currentColor", strokeWidth = 1.8 }) {
  const Icon = LucideIcons[name] || LucideIcons.Flag;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

const STATUS = {
  scheduled: { c:"#16A34A", l:"Geplant",        bg:"#F0FDF4" },
  draft:     { c:"#D97706", l:"Entwurf",         bg:"#FFFBEB" },
  pending:   { c:"#2563EB", l:"Review",          bg:"#EFF8FF" },
  published: { c:"#7C3AED", l:"Veröffentlicht",  bg:"#F5F3FF" },
};

// Campaign lifecycle status colours
const CAMP_STATUS = {
  draft:     { c:"#B54708", bg:"#FFFAEB", l:"Entwurf"       },
  planned:   { c:"#175CD3", bg:"#EFF8FF", l:"Geplant"       },
  active:    { c:"#027A48", bg:"#ECFDF3", l:"Aktiv"         },
  paused:    { c:"#667085", bg:"#F2F4F7", l:"Pausiert"      },
  completed: { c:"#6941C6", bg:"#F9F5FF", l:"Abgeschlossen" },
  archived:  { c:"#667085", bg:"#F2F4F7", l:"Archiviert"    },
};

function fmt(dateStr, opts = { day:"numeric", month:"short" }) {
  return dateStr ? new Date(dateStr + "T12:00").toLocaleDateString("de-DE", opts) : "–";
}

// ── Post click-popover ────────────────────────────────────────────────────────
// Opens on dot-click, stays until closed. Positioned relative to the dot.

function PostPopover({ post, campaigns, anchorRect, onEdit, onClose }) {
  if (!anchorRect || !post) return null;

  const camp = campaigns.find(c => c.id === post.campaignId);
  const sc   = STATUS[post.status] || { c:"#9CA3AF", l:"–", bg:"#F9FAFB" };

  // Position: prefer above the dot, clamp to viewport
  const CARD_W = 248, CARD_H = 170;
  const showAbove = anchorRect.top > CARD_H + 12;
  const rawTop    = showAbove ? anchorRect.top - CARD_H - 10 : anchorRect.bottom + 10;
  const rawLeft   = anchorRect.left + anchorRect.width / 2 - CARD_W / 2;
  const top  = Math.max(8, rawTop);
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - CARD_W - 8));

  // Arrow offset relative to card
  const arrowLeft = Math.max(10, Math.min(anchorRect.left + anchorRect.width / 2 - left - 6, CARD_W - 22));

  return (
    <>
      {/* Backdrop – closes popover when clicking outside */}
      <div onClick={onClose}
        style={{ position:"fixed", inset:0, zIndex:998 }}/>

      <div style={{
        position:"fixed", top, left, zIndex:999,
        width: CARD_W,
        background:"#fff",
        borderRadius:12,
        border:`1px solid ${C.border}`,
        boxShadow:"0 12px 36px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08)",
        padding:"14px 16px 12px",
        fontFamily:FONT,
      }}>
        {/* Arrow */}
        <div style={{
          position:"absolute",
          [showAbove ? "bottom" : "top"]: -7,
          left: arrowLeft,
          width:12, height:12,
          background:"#fff",
          border:`1px solid ${C.border}`,
          borderTop:   showAbove ? "none"  : undefined,
          borderLeft:  showAbove ? "none"  : undefined,
          borderBottom:showAbove ? undefined : "none",
          borderRight: showAbove ? undefined : "none",
          transform: showAbove ? "rotate(45deg)" : "rotate(225deg)",
        }}/>

        {/* Close */}
        <button onClick={onClose}
          style={{ position:"absolute", top:8, right:8, background:"none", border:"none",
            cursor:"pointer", color:C.textMute, padding:3, borderRadius:5, lineHeight:1 }}>
          <LucideIcons.X size={13} strokeWidth={2}/>
        </button>

        {/* Tag: campaign or standalone */}
        <div style={{ marginBottom:8 }}>
          {camp ? (
            <div style={{ display:"inline-flex", alignItems:"center", gap:4,
              background:camp.color+"16", borderRadius:5, padding:"3px 8px" }}>
              <CampIcon name={camp.icon||"Flag"} size={10} color={camp.color} strokeWidth={2.2}/>
              <span style={{ fontSize:10, fontWeight:700, color:camp.color }}>{camp.name}</span>
            </div>
          ) : (
            <span style={{ fontSize:10, fontWeight:600, color:C.textMute,
              background:C.borderLight, borderRadius:5, padding:"3px 8px" }}>
              Einzelner Post
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{ fontWeight:700, fontSize:13.5, color:C.text, marginBottom:8,
          lineHeight:1.3, paddingRight:16 }}>
          {post.title || "Kein Titel"}
        </div>

        {/* Meta row */}
        <div style={{ display:"flex", gap:10, marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.textSoft }}>
            <LucideIcons.Calendar size={10} strokeWidth={2}/>
            {fmt(post.scheduledDate, { weekday:"short", day:"numeric", month:"short" })}
          </div>
          {post.scheduledTime && (
            <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.textSoft }}>
              <LucideIcons.Clock size={10} strokeWidth={2}/>
              {post.scheduledTime}
            </div>
          )}
        </div>

        {/* Channels + status */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", gap:4 }}>
            {post.channels?.slice(0,5).map(ch => <ChIco key={ch} id={ch} size={14}/>)}
          </div>
          <span style={{ fontSize:10, fontWeight:700, color:sc.c,
            background:sc.bg, borderRadius:5, padding:"2px 8px" }}>
            {sc.l}
          </span>
        </div>

        {/* Edit button */}
        <button onClick={() => { onEdit(post); onClose(); }}
          style={{ width:"100%", padding:"7px", borderRadius:8,
            border:`1px solid ${C.border}`, background:C.bg, color:C.text,
            fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT,
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            transition:"all .12s" }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.accent;
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = C.accent;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = C.bg;
            e.currentTarget.style.color = C.text;
            e.currentTarget.style.borderColor = C.border;
          }}>
          <LucideIcons.Edit2 size={12} strokeWidth={2}/>
          Post bearbeiten
        </button>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ROW_H = 44;
const LABEL_W = 160;

export default function PlannerPage() {
  const { posts: allPosts, campaigns, setEdPost: onEdit } = useApp();
  const posts = allPosts.filter(p => !p.deleted);
  const { order, dragId, setDragId, overId, setOverId, drop } =
    useSections("planner", "planner", ["timeline","campaigns","upcoming"]);

  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const schedPosts = posts.filter(p => p.scheduledDate);

  // ── Timeline window ────────────────────────────────────────────────────────
  const [timeStart, setTimeStart] = useState(
    () => new Date(today.getFullYear(), today.getMonth() - 1, 1)
  );
  const MONTHS = 6;
  const timeEnd  = new Date(timeStart.getFullYear(), timeStart.getMonth() + MONTHS, 0);
  const totalDays = Math.round((timeEnd - timeStart) / 86400000) + 1;

  const dateToX = useCallback(dateStr => {
    if (!dateStr) return null;
    return (Math.round((new Date(dateStr + "T12:00") - timeStart) / 86400000) / totalDays) * 100;
  }, [timeStart, totalDays]);

  const monthHeaders = useMemo(() =>
    Array.from({ length: MONTHS }, (_, i) => {
      const m = new Date(timeStart.getFullYear(), timeStart.getMonth() + i, 1);
      return {
        label: m.toLocaleDateString("de-DE", { month:"short", year:"2-digit" }),
        x: (i / MONTHS) * 100, w: 100 / MONTHS,
      };
    }), [timeStart]);

  const todayX = useMemo(() => dateToX(todayStr), [dateToX, todayStr]);

  // ── Click-popover state ────────────────────────────────────────────────────
  const [popover, setPopover] = useState(null); // { post, rect }

  const openPopover = useCallback((p, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(prev => prev?.post?.id === p.id ? null : { post: p, rect });
  }, []);

  // ── Gantt row data ─────────────────────────────────────────────────────────
  const visFrom = `${timeStart.getFullYear()}-${String(timeStart.getMonth()+1).padStart(2,"0")}-01`;
  const visTo   = `${timeEnd.getFullYear()}-${String(timeEnd.getMonth()+1).padStart(2,"0")}-${String(timeEnd.getDate()).padStart(2,"0")}`;
  const inView  = p => p.scheduledDate >= visFrom && p.scheduledDate <= visTo;

  const campRows = useMemo(() =>
    campaigns.map(c => {
      const all  = schedPosts.filter(p => p.campaignId === c.id);
      const vis  = all.filter(inView);
      // Prefer explicit campaign dates; fall back to post dates
      const postDates = all.map(p => p.scheduledDate).sort();
      const barStart  = c.startDate || postDates[0]                    || null;
      const barEnd    = c.endDate   || postDates[postDates.length - 1] || null;
      // Only skip campaigns with no date info at all
      if (!barStart && !barEnd) return null;
      return { ...c, allPosts:all, visiblePosts:vis, x1:dateToX(barStart), x2:dateToX(barEnd) };
    }).filter(Boolean),
  [campaigns, schedPosts, dateToX]);

  const standaloneRows = useMemo(() =>
    CHANNELS.map(ch => {
      const all = schedPosts.filter(p => p.channels?.includes(ch.id) && !p.campaignId);
      if (!all.length) return null;
      const vis   = all.filter(inView);
      const dates = all.map(p => p.scheduledDate).sort();
      return { ...ch, allPosts:all, visiblePosts:vis, x1:dateToX(dates[0]), x2:dateToX(dates[dates.length-1]) };
    }).filter(Boolean),
  [schedPosts, dateToX]);

  const hasRows = campRows.length + standaloneRows.length > 0;

  // ── Inline Gantt row renderer ──────────────────────────────────────────────
  function renderRow(row, isCampaign, isLast) {
    const x1 = Math.max(0, Math.min(100, row.x1 ?? 0));
    const x2 = Math.max(0, Math.min(100, (row.x2 ?? 0) + 0.5));
    const barW = Math.max(0.3, x2 - x1);

    return (
      <div key={row.id} style={{
        display:"flex", alignItems:"stretch",
        height: ROW_H,
        borderBottom: isLast ? "none" : `1px solid ${C.borderLight}`,
        borderLeft: isCampaign ? `3px solid ${row.color}50` : `3px solid transparent`,
        background: isCampaign ? row.color + "06" : "transparent",
        transition:"background .15s",
      }}
        onMouseEnter={e => { if (isCampaign) e.currentTarget.style.background = row.color + "0e"; }}
        onMouseLeave={e => { if (isCampaign) e.currentTarget.style.background = row.color + "06"; }}>

        {/* Label column */}
        <div style={{
          width: LABEL_W, flexShrink:0,
          display:"flex", alignItems:"center", gap:8,
          paddingLeft:10, paddingRight:10,
        }}>
          <div style={{
            width:26, height:26, borderRadius:7, flexShrink:0,
            background: row.color + "18",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {isCampaign
              ? <CampIcon name={row.icon||"Flag"} size={13} color={row.color} strokeWidth={2}/>
              : <ChIco id={row.id} size={12} color={row.color}/>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11.5, fontWeight: isCampaign ? 700 : 600,
              color: isCampaign ? C.text : C.textMid,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {row.name || row.label}
            </div>
            <div style={{ fontSize:9.5, color:C.textMute, marginTop:1 }}>
              {row.allPosts.length} Post{row.allPosts.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Timeline track */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          {/* Month dividers */}
          {monthHeaders.map((mh, i) => (
            <div key={i} style={{
              position:"absolute", left:`${mh.x}%`, top:0, bottom:0,
              borderLeft:`1px dashed ${C.borderLight}`, pointerEvents:"none",
            }}/>
          ))}

          {/* Today line */}
          {todayX !== null && todayX >= 0 && todayX <= 100 && (
            <div style={{
              position:"absolute", left:`${todayX}%`, top:0, bottom:0,
              width:1.5, background: C.accent + "50", zIndex:3, pointerEvents:"none",
            }}/>
          )}

          {/* Span bar */}
          {row.x1 !== null && row.x2 !== null && (
            <div style={{
              position:"absolute", left:`${x1}%`, width:`${barW}%`,
              height: isCampaign ? 8 : 5,
              top:"50%", transform:"translateY(-50%)",
              borderRadius:4,
              background: `${row.color}${isCampaign ? "28" : "20"}`,
              border:`1.5px solid ${row.color}${isCampaign ? "65" : "45"}`,
            }}/>
          )}

          {/* Post dots */}
          {row.visiblePosts.map((p, pi) => {
            const x = dateToX(p.scheduledDate);
            if (x === null || x < -1 || x > 101) return null;
            const sc     = STATUS[p.status] || { c:"#9CA3AF" };
            const clampX = Math.max(0.5, Math.min(99.5, x));
            const isOpen = popover?.post?.id === p.id;
            return (
              <div key={pi}
                onClick={e => openPopover(p, e)}
                style={{
                  position:"absolute",
                  left:`${clampX}%`, top:"50%",
                  transform:`translateX(-50%) translateY(-50%) ${isOpen ? "scale(1.5)" : "scale(1)"}`,
                  width: isCampaign ? 13 : 10,
                  height: isCampaign ? 13 : 10,
                  borderRadius:"50%",
                  background: sc.c,
                  border:`2px solid ${isOpen ? sc.c : "#fff"}`,
                  outline: isOpen ? `2px solid ${sc.c}50` : "none",
                  cursor:"pointer", zIndex:4,
                  boxShadow:`0 1px 4px rgba(0,0,0,.2)`,
                  transition:"transform .12s, box-shadow .12s",
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.transform = "translateX(-50%) translateY(-50%) scale(1.5)"; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.transform = "translateX(-50%) translateY(-50%) scale(1)"; }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Timeline section header ────────────────────────────────────────────────
  function renderSectionHeader(label, nItems) {
    return (
      <div style={{ display:"flex", height:24, alignItems:"center",
        background:"#F8F9FB", borderBottom:`1px solid ${C.borderLight}` }}>
        <div style={{ width: LABEL_W + 3, flexShrink:0, paddingLeft:12, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:9, fontWeight:700, color:C.textMute, letterSpacing:".12em", textTransform:"uppercase" }}>
            {label}
          </span>
          <span style={{ fontSize:9, color:C.textMute, background:C.borderLight, borderRadius:8, padding:"0 5px", lineHeight:"14px" }}>
            {nItems}
          </span>
        </div>
        <div style={{ flex:1, height:"100%", position:"relative" }}>
          {monthHeaders.map((mh,i) => (
            <div key={i} style={{ position:"absolute", left:`${mh.x}%`, top:0, bottom:0,
              borderLeft:`1px dashed ${C.borderLight}`, pointerEvents:"none" }}/>
          ))}
        </div>
      </div>
    );
  }

  // ── Gantt widget ───────────────────────────────────────────────────────────
  const ganttContent = (
    <div style={{ overflowX:"auto", fontFamily:FONT }}>
      {/* Month header */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ width: LABEL_W + 3, flexShrink:0, display:"flex", alignItems:"center", paddingLeft:12 }}>
          <span style={{ fontSize:9.5, fontWeight:600, color:C.textMute, letterSpacing:".08em", textTransform:"uppercase" }}>
            Zeile
          </span>
        </div>
        <div style={{ flex:1, position:"relative", height:28 }}>
          {monthHeaders.map((mh, i) => (
            <div key={i} style={{ position:"absolute", left:`${mh.x}%`, width:`${mh.w}%`,
              top:0, height:"100%", borderLeft:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", paddingLeft:6 }}>
              <span style={{ fontSize:10, fontWeight:700, color:C.textSoft,
                textTransform:"uppercase", letterSpacing:".06em", whiteSpace:"nowrap" }}>
                {mh.label}
              </span>
            </div>
          ))}
          {/* Today marker */}
          {todayX !== null && todayX >= 0 && todayX <= 100 && (
            <div style={{ position:"absolute", left:`${todayX}%`, top:-1,
              bottom: -(ROW_H * (campRows.length + standaloneRows.length) + 50),
              width:1.5, background:C.accent, zIndex:5, pointerEvents:"none" }}>
              <div style={{ position:"absolute", top:3, left:-18, fontSize:9, fontWeight:800,
                color:"#fff", background:C.accent, borderRadius:4, padding:"1px 5px",
                whiteSpace:"nowrap" }}>
                Heute
              </div>
            </div>
          )}
        </div>
      </div>

      {!hasRows ? (
        <div style={{ padding:"40px 0", textAlign:"center", color:C.textMute, fontSize:13 }}>
          <LucideIcons.CalendarRange size={32} strokeWidth={1}
            style={{ margin:"0 auto 10px", display:"block", opacity:.3 }}/>
          Keine geplanten Posts. Plane Posts im Publisher.
        </div>
      ) : (<>

        {/* ── Campaign rows ── */}
        {campRows.length > 0 && (<>
          {renderSectionHeader("Kampagnen", campRows.length)}
          {campRows.map((row, i) => renderRow(row, true, i === campRows.length - 1 && standaloneRows.length === 0))}
        </>)}

        {/* ── Standalone rows ── */}
        {standaloneRows.length > 0 && (<>
          {renderSectionHeader("Einzelne Posts", standaloneRows.length)}
          {standaloneRows.map((row, i) => renderRow(row, false, i === standaloneRows.length - 1))}
        </>)}

      </>)}

      {/* Legend */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"center",
        marginTop:10, paddingTop:8, borderTop:`1px solid ${C.borderLight}` }}>
        {Object.entries(STATUS).map(([, v]) => (
          <div key={v.l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:v.c }}/>
            <span style={{ color:C.textMute, fontWeight:500 }}>{v.l}</span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10 }}>
          <div style={{ width:14, height:2, background:C.accent, borderRadius:1 }}/>
          <span style={{ color:C.textMute, fontWeight:500 }}>Heute</span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:12, fontSize:10, color:C.textMute }}>
          <span>● Kampagnen-Post</span>
          <span>• Einzelner Post</span>
        </div>
      </div>
    </div>
  );

  // ── Campaign progress widget ───────────────────────────────────────────────
  const campProgress = useMemo(() =>
    campaigns.map(c => {
      const cp  = posts.filter(p => p.campaignId === c.id);
      const pub = cp.filter(p => p.status === "published").length;
      // Use campaign's own dates; fall back to post dates
      const postDates = cp.filter(p => p.scheduledDate).map(p => p.scheduledDate).sort();
      const start    = c.startDate || postDates[0]                       || null;
      const end      = c.endDate   || postDates[postDates.length - 1]    || null;
      const endD     = end ? new Date(end + "T12:00") : null;
      const daysLeft = endD ? Math.ceil((endD - today) / 86400000) : null;
      // Use campaign channels if no posts assigned yet
      const channels = cp.length
        ? [...new Set(cp.flatMap(p => p.channels || []))]
        : (c.channels || []);
      return {
        ...c,
        total: cp.length, pub,
        pct: cp.length ? Math.round((pub / cp.length) * 100) : 0,
        start, end, daysLeft, channels,
      };
    }),
  [campaigns, posts]);

  const campaignsContent = campProgress.length === 0 ? (
    <div style={{ padding:"24px 0", textAlign:"center", color:C.textMute }}>
      <LucideIcons.Flag size={28} strokeWidth={1} style={{ margin:"0 auto 8px", display:"block", opacity:.3 }}/>
      <div style={{ fontSize:12 }}>Keine Kampagnen vorhanden</div>
    </div>
  ) : (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
      {campProgress.map(c => {
        const cs = CAMP_STATUS[c.status] || CAMP_STATUS.draft;
        return (
          <div key={c.id} style={{
            borderRadius:10, padding:"14px 16px", background:"#fff",
            border:`1px solid ${C.border}`,
            borderLeft:`3px solid ${c.color}`,
            transition:"box-shadow .15s",
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${c.color}22`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ""}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:9, flexShrink:0,
                background:c.color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <CampIcon name={c.icon||"Flag"} size={17} color={c.color} strokeWidth={1.8}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.text,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                {/* Status + goal badges */}
                <div style={{ display:"flex", gap:4, marginTop:3, flexWrap:"wrap" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:cs.c,
                    background:cs.bg, borderRadius:4, padding:"1px 6px" }}>
                    {cs.l}
                  </span>
                  {c.goal && (
                    <span style={{ fontSize:9, fontWeight:600, color:C.textMute,
                      background:C.borderLight, borderRadius:4, padding:"1px 6px",
                      textTransform:"capitalize" }}>
                      {c.goal}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-.5px",
                color: c.pct === 100 ? "#16A34A" : c.color, flexShrink:0 }}>
                {c.total > 0 ? `${c.pct}%` : "–"}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:5, borderRadius:5, background:C.borderLight, overflow:"hidden", marginBottom:8 }}>
              <div style={{ height:"100%", borderRadius:5,
                background: c.pct === 100 ? "#16A34A" : c.color,
                width:`${c.pct}%`, transition:"width .5s" }}/>
            </div>

            {/* Stats row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:10.5, color:C.textSoft }}>
                {c.total > 0
                  ? `${c.pub} veröffent. · ${c.total - c.pub} offen`
                  : "Noch keine Posts"}
              </span>
              {c.daysLeft !== null && (
                <span style={{ fontSize:10, fontWeight:700,
                  color: c.daysLeft < 0 ? "#DC2626" : c.daysLeft < 7 ? "#D97706" : C.textMute }}>
                  {c.daysLeft < 0
                    ? `${Math.abs(c.daysLeft)}T abgelaufen`
                    : c.daysLeft === 0 ? "Endet heute"
                    : `${c.daysLeft}T verbleibend`}
                </span>
              )}
            </div>

            {/* Channels + date range */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:4 }}>
                {c.channels.slice(0,5).map(ch => <ChIco key={ch} id={ch} size={13}/>)}
              </div>
              {c.start && (
                <div style={{ fontSize:10, color:C.textMute }}>
                  {fmt(c.start)}{c.end && c.end !== c.start ? ` – ${fmt(c.end)}` : ""}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Upcoming posts widget ─────────────────────────────────────────────────
  const upcoming = useMemo(() =>
    schedPosts
      .filter(p => p.scheduledDate >= todayStr)
      .sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate) || (a.scheduledTime||"").localeCompare(b.scheduledTime||""))
      .slice(0, 12),
  [schedPosts, todayStr]);

  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0,10);

  const upcomingContent = upcoming.length === 0 ? (
    <div style={{ padding:"24px 0", textAlign:"center", color:C.textMute }}>
      <LucideIcons.Send size={28} strokeWidth={1} style={{ margin:"0 auto 8px", display:"block", opacity:.3 }}/>
      <div style={{ fontSize:12 }}>Keine geplanten Posts</div>
    </div>
  ) : (
    <div>
      {/* Table header */}
      <div style={{ display:"grid", gridTemplateColumns:"96px 1fr 110px",
        padding:"4px 8px 6px", borderBottom:`1px solid ${C.border}`, marginBottom:2 }}>
        {["Datum", "Post / Kampagne", "Status"].map(h => (
          <div key={h} style={{ fontSize:9.5, fontWeight:700, color:C.textMute,
            letterSpacing:".06em", textTransform:"uppercase" }}>{h}</div>
        ))}
      </div>

      {upcoming.map((p, i) => {
        const sc   = STATUS[p.status] || { c:"#9CA3AF", l:"–", bg:"#F9FAFB" };
        const camp = campaigns.find(c => c.id === p.campaignId);
        const isToday    = p.scheduledDate === todayStr;
        const isTomorrow = p.scheduledDate === tomorrowStr;
        const dateLabel  = isToday ? "Heute" : isTomorrow ? "Morgen"
          : fmt(p.scheduledDate, { weekday:"short", day:"numeric", month:"short" });

        return (
          <div key={p.id} onClick={() => onEdit(p)}
            style={{ display:"grid", gridTemplateColumns:"96px 1fr 110px",
              padding:"9px 8px", alignItems:"center",
              borderBottom: i < upcoming.length-1 ? `1px solid ${C.borderLight}` : "none",
              borderRadius:6, cursor:"pointer", transition:"background .1s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.bg}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

            {/* Date */}
            <div>
              <div style={{ fontSize:11.5, fontWeight:700,
                color: isToday ? C.accent : C.textMid }}>{dateLabel}</div>
              <div style={{ fontSize:10, color:C.textMute }}>{p.scheduledTime||"–"}</div>
            </div>

            {/* Title + tag */}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:3,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {p.title || "Kein Titel"}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                {camp ? (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:3,
                    background:camp.color+"16", borderRadius:4, padding:"2px 6px" }}>
                    <CampIcon name={camp.icon||"Flag"} size={9} color={camp.color} strokeWidth={2.2}/>
                    <span style={{ fontSize:9.5, fontWeight:700, color:camp.color }}>{camp.name}</span>
                  </div>
                ) : (
                  <span style={{ fontSize:9.5, color:C.textMute,
                    background:C.borderLight, borderRadius:4, padding:"2px 6px" }}>
                    Einzeln
                  </span>
                )}
                <div style={{ display:"flex", gap:3 }}>
                  {p.channels?.slice(0,4).map(ch => <ChIco key={ch} id={ch} size={10}/>)}
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ padding:"3px 8px", borderRadius:5, background:sc.bg,
              display:"inline-flex", width:"fit-content" }}>
              <span style={{ fontSize:10, fontWeight:700, color:sc.c }}>{sc.l}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Navigation controls ────────────────────────────────────────────────────
  const timelineRight = (
    <div style={{ display:"flex", gap:6, alignItems:"center", fontFamily:FONT }}>
      <button onClick={() => setTimeStart(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
        style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6,
          width:26, height:26, cursor:"pointer", display:"flex", alignItems:"center",
          justifyContent:"center", color:C.textMid }}>
        <LucideIcons.ChevronLeft size={13}/>
      </button>
      <span style={{ fontSize:11, color:C.textSoft, minWidth:110, textAlign:"center" }}>
        {timeStart.toLocaleDateString("de-DE",{month:"short",year:"2-digit"})} – {timeEnd.toLocaleDateString("de-DE",{month:"short",year:"2-digit"})}
      </span>
      <button onClick={() => setTimeStart(new Date(today.getFullYear(), today.getMonth()-1, 1))}
        style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6,
          height:26, padding:"0 8px", cursor:"pointer", fontSize:10,
          fontWeight:700, color:C.accent, fontFamily:FONT }}>
        Heute
      </button>
      <button onClick={() => setTimeStart(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
        style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6,
          width:26, height:26, cursor:"pointer", display:"flex", alignItems:"center",
          justifyContent:"center", color:C.textMid }}>
        <LucideIcons.ChevronRight size={13}/>
      </button>
    </div>
  );

  const widgetMap = {
    timeline:  { title:"Timeline",              right:timelineRight, content:ganttContent },
    campaigns: { title:"Kampagnen-Fortschritt", right:<span style={{fontSize:11,color:C.textMute}}>{campaigns.length} Kampagnen</span>, content:campaignsContent },
    upcoming:  { title:"Nächste Posts",         right:<span style={{fontSize:11,color:C.textMute}}>{upcoming.length} geplant</span>, content:upcomingContent },
  };

  return (
    <div style={{ flex:1, overflow:"auto", padding:"14px 18px", background:"#F9FAFB", fontFamily:FONT }}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:600,
          color:"#111827", letterSpacing:"-.3px" }}>Planner</div>
        <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>
          Geplante Posts & Kampagnen im Zeitverlauf
        </div>
      </div>

      {order.map(id => {
        const w = widgetMap[id]; if (!w) return null;
        return (
          <SecCard key={id} id={id} title={w.title} right={w.right}
            dragId={dragId} overId={overId} setDragId={setDragId}
            setOverId={setOverId} drop={drop}>
            {w.content}
          </SecCard>
        );
      })}

      {/* Click-popover for post dots */}
      {popover && (
        <PostPopover
          post={popover.post}
          campaigns={campaigns}
          anchorRect={popover.rect}
          onEdit={onEdit}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
