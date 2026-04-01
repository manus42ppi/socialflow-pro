import { useEffect } from "react";
import { X, Activity, Clock, BarChart2, Eye, Heart, MessageCircle, Share2, MousePointer, TrendingUp } from "lucide-react";
import { C, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { CHANNELS } from "../constants/demo.js";
import { SBadge } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Seeded deterministic mock metrics (consistent per post.id) ─────────────
function hashId(id) {
  let h = 5381;
  for (let i = 0; i < String(id).length; i++) {
    h = ((h << 5) + h) ^ String(id).charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}
function seeded(id, min, max) {
  return min + (hashId(id) % (max - min + 1));
}
export { seeded, hashId }; // shared with PublisherPage + PerformancePage

// ── Optimal posting-time windows per channel ───────────────────────────────
const OPTIMAL = {
  instagram: [10, 14],
  twitter:   [12, 15],
  linkedin:  [8,  11],
  facebook:  [13, 16],
  whatsapp:  [18, 21],
};

const SLIDE_CSS = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);   opacity: 1; }
  }
`;

// ── Format number short (12400 → "12.4K") ─────────────────────────────────
function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function PostDetailDrawer() {
  const { detailPost: post, setDetailPost, campaigns } = useApp();

  // Escape key closes drawer
  useEffect(() => {
    const h = e => { if (e.key === "Escape") setDetailPost(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setDetailPost]);

  if (!post) return null;

  // ── Metrics: real (from Instagram API) or seeded mock ─────────────────────
  const m = post.metrics; // set when post was synced from Instagram
  const hasReal = m && (m.reach != null || m.likes != null);
  const reach       = hasReal && m.reach       != null ? m.reach       : seeded(post.id + "reach",  1200, 18000);
  const impressions = hasReal && m.impressions != null ? m.impressions : seeded(post.id + "imp",    2000, 45000);
  const likes       = hasReal && m.likes       != null ? m.likes       : seeded(post.id + "likes",   120,  3200);
  const comments    = hasReal && m.comments    != null ? m.comments    : seeded(post.id + "cmts",     10,   420);
  const shares      = hasReal && m.saved       != null ? m.saved       : seeded(post.id + "shr",      30,   850);
  const clicks      = seeded(post.id + "clk", 40, 1200); // Instagram API doesn't expose link clicks directly
  const engPct      = reach > 0 ? ((likes / reach) * 100).toFixed(1) : "0.0";

  // ── Campaign ──────────────────────────────────────────────────────────────
  const camp = campaigns?.find(c => c.id === post.campaignId);

  // ── Best time insight ─────────────────────────────────────────────────────
  const firstCh = post.channels?.[0];
  const [optStart, optEnd] = OPTIMAL[firstCh] || [10, 14];
  const postHour = post.scheduledTime
    ? parseInt(post.scheduledTime.split(":")[0], 10)
    : null;
  let timeInsight = null;
  if (postHour !== null) {
    if (postHour >= optStart && postHour <= optEnd)
      timeInsight = { label: "Optimale Zeit getroffen ✓", color: C.success, bg: "#ECFDF3" };
    else if (postHour >= optStart - 2 && postHour <= optEnd + 2)
      timeInsight = { label: "Fast optimale Zeit", color: C.warning, bg: "#FFFAEB" };
    else
      timeInsight = { label: "Außerhalb der Spitzenzeit", color: C.textMute, bg: C.borderLight };
  }

  // ── Published date string ─────────────────────────────────────────────────
  const dateStr = post.scheduledDate
    ? new Date(post.scheduledDate).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })
    : "–";

  const metrics = [
    { icon: Eye,           label: "Reichweite",   value: fmt(reach),       color: C.accent  },
    { icon: BarChart2,     label: "Impressionen", value: fmt(impressions), color: C.info    },
    { icon: Heart,         label: "Likes",        value: fmt(likes),       color: "#E53E3E" },
    { icon: MessageCircle, label: "Kommentare",   value: fmt(comments),    color: C.textMid },
    { icon: Share2,        label: "Shares",       value: fmt(shares),      color: C.success },
    { icon: MousePointer,  label: "Klicks",       value: fmt(clicks),      color: C.warning },
  ];

  return (
    <>
      <style>{SLIDE_CSS}</style>

      {/* Backdrop */}
      <div
        onClick={e => { if (e.target === e.currentTarget) setDetailPost(null); }}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.25)",
        }}
      >
        {/* Drawer panel */}
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
          background: C.surface, borderLeft: `1px solid ${C.border}`,
          overflowY: "auto", display: "flex", flexDirection: "column",
          animation: "slideInRight .22s ease-out",
          boxShadow: "-8px 0 32px rgba(0,0,0,.12)",
        }}>

          {/* ── Header ── */}
          <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.3, marginBottom: 8 }}>
                  {post.title || "Post"}
                </div>
                {/* Meta row: status + channels + date */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <SBadge status={post.status} />
                  <div style={{ display: "flex", gap: 4 }}>
                    {post.channels?.map(c => <ChIco key={c} id={c} size={14} />)}
                  </div>
                  <span style={{ fontSize: 11, color: C.textMute }}>{dateStr}</span>
                  {post.scheduledTime && (
                    <span style={{ fontSize: 11, color: C.textMute }}>{post.scheduledTime} Uhr</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDetailPost(null)}
                style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.borderLight, color: C.textMute, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .13s" }}
                onMouseEnter={e => { e.currentTarget.style.background = C.border; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.borderLight; e.currentTarget.style.color = C.textMute; }}
              >
                <X size={15} strokeWidth={IW} />
              </button>
            </div>

            {/* Campaign badge */}
            {camp && (
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: camp.color + "18", fontSize: 11, fontWeight: 700, color: camp.color }}>
                {camp.emoji} {camp.name}
              </div>
            )}
          </div>

          {/* ── Content ── */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Inhalt</div>
            <div style={{
              fontSize: 13, color: C.text, lineHeight: 1.65,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              maxHeight: 180, overflowY: "auto",
              padding: "10px 12px", borderRadius: 8,
              background: C.bg, border: `1px solid ${C.border}`,
            }}>
              {post.content || <span style={{ color: C.textMute, fontStyle: "italic" }}>Kein Inhalt</span>}
            </div>
          </div>

          {/* ── Performance ── */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Activity size={14} color={C.accent} strokeWidth={IW} />
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".08em" }}>Performance</div>
              {hasReal
                ? <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: "#ECFDF3", padding: "2px 7px", borderRadius: 5 }}>📊 Live-Daten</span>
                : <span style={{ fontSize: 10, color: C.textMute, background: C.borderLight, padding: "2px 7px", borderRadius: 5 }}>~ Geschätzt</span>
              }
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.success, fontWeight: 700 }}>
                <TrendingUp size={11} strokeWidth={2.5} />
                {engPct}% Engagement
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {metrics.map(({ icon: Ic, label, value, color }) => (
                <div key={label} style={{ padding: "12px 10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <Ic size={15} color={color} strokeWidth={IW} style={{ marginBottom: 4 }} />
                  <div style={{ fontWeight: 800, fontSize: 17, color: C.text, fontFamily: FONT_DISPLAY }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.textMute, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Zeitanalyse ── */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Clock size={14} color={C.textMid} strokeWidth={IW} />
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: ".08em" }}>Zeitanalyse</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: C.textSoft }}>Geteilt um</span>
                <span style={{ fontWeight: 700, color: C.text }}>{post.scheduledTime ? post.scheduledTime + " Uhr" : "–"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: C.textSoft }}>Optimales Fenster</span>
                <span style={{ fontWeight: 700, color: C.text }}>{optStart}:00 – {optEnd}:00 Uhr</span>
              </div>
              {timeInsight && (
                <div style={{ marginTop: 4, padding: "8px 12px", borderRadius: 8, background: timeInsight.bg, fontSize: 12, fontWeight: 700, color: timeInsight.color }}>
                  {timeInsight.label}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingTop: 6, borderTop: `1px solid ${C.borderLight}` }}>
                <span style={{ color: C.textSoft }}>Kanäle</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {post.channels?.map(c => {
                    const ch = CHANNELS.find(x => x.id === c);
                    return <span key={c} style={{ fontSize: 11, fontWeight: 600, color: C.textMid }}>{ch?.label}</span>;
                  }).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={"sep"+i} style={{ color: C.textMute }}>,</span>, el], [])}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
