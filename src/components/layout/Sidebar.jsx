import { Settings, LogOut, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { C, T, FONT, IW } from "../../constants/colors.js";
import { CHANNELS } from "../../constants/demo.js";
import { NAV_GROUPS, NAV_UTILITY } from "../../constants/nav.js";
import { ROLES } from "../../constants/demo.js";
import { Avatar } from "../ui/index.jsx";
import ChIco from "../ui/ChIco.jsx";
import { useApp } from "../../context/AppContext.jsx";
import { useState } from "react";

// ── Sidebar (CX Fusion: Icon Rail + Text Panel) ───────────────────────────────
// Expanded: 68px Rail + 220px Panel = 288px
// Collapsed: 68px Rail only

export default function Sidebar() {
  const {
    nav: active, goNav: onNav, user, handleLogout: onLogout,
    posts: allPosts, goChNav: onChNav, chFilt: activeCh,
  } = useApp();

  const posts    = allPosts ?? [];
  const pend     = posts.filter(p => p.status === "pending").length;
  const livePosts = posts.filter(p => !p.deleted);
  const chCounts  = CHANNELS
    .map(ch => ({ ...ch, n: livePosts.filter(p => p.channels?.includes(ch.id)).length }))
    .filter(c => c.n > 0);
  const draftsCount = livePosts.filter(p => p.status === "draft").length;
  const trashCount  = posts.filter(p => p.deleted).length;

  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("sb_open") !== "0"; } catch { return true; }
  });
  const toggle = () => {
    const n = !open;
    setOpen(n);
    try { localStorage.setItem("sb_open", n ? "1" : "0"); } catch {}
  };

  // ── Rail button (always visible icon) ──────────────────────────────────────
  const RailBtn = ({ id, I, badge, title }) => {
    const on = active === id;
    return (
      <button
        onClick={() => onNav(id)}
        title={title}
        style={{
          width: 40, height: 40, borderRadius: T.rSm,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", cursor: "pointer", position: "relative",
          flexShrink: 0, transition: "background .12s, color .12s",
          background: on ? C.accent : "transparent",
          color: on ? "#fff" : T.gray400,
        }}
        onMouseEnter={e => { if (!on) { e.currentTarget.style.background = T.gray100; e.currentTarget.style.color = T.gray600; } }}
        onMouseLeave={e => { if (!on) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.gray400; } }}
      >
        <I size={18} strokeWidth={IW} />
        {badge > 0 && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            minWidth: 15, height: 15, borderRadius: 8,
            background: on ? T.white : C.accent, color: on ? C.accent : "#fff",
            fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1,
          }}>
            {badge}
          </div>
        )}
      </button>
    );
  };

  // ── Panel nav item (text + icon) ────────────────────────────────────────────
  const PanelItem = ({ id, label, I, badge }) => {
    const on = active === id;
    return (
      <button
        onClick={() => onNav(id)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", padding: "8px 12px", borderRadius: T.rSm,
          border: "none", cursor: "pointer", textAlign: "left",
          fontSize: 14, fontWeight: on ? 600 : 500,
          fontFamily: FONT, transition: "background .1s, color .1s",
          background: on ? T.brand200 : "transparent",
          color: on ? T.gray800 : T.gray700,
        }}
        onMouseEnter={e => { if (!on) { e.currentTarget.style.background = T.brand25; } }}
        onMouseLeave={e => { if (!on) { e.currentTarget.style.background = "transparent"; } }}
      >
        <I
          size={16} strokeWidth={IW}
          style={{ color: on ? C.accent : T.gray400, flexShrink: 0 }}
        />
        <span style={{
          flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {label}
        </span>
        {badge > 0 && (
          <div style={{
            minWidth: 20, height: 20, borderRadius: 10,
            background: on ? T.brand100 : T.gray100,
            color: on ? C.accent : T.gray600,
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 6px",
          }}>
            {badge}
          </div>
        )}
      </button>
    );
  };

  return (
    <div style={{
      display: "flex", height: "100%", flexShrink: 0,
      transition: "width .22s cubic-bezier(.4,0,.2,1)",
    }}>

      {/* ── Icon Rail (always 68px) ─────────────────────────────────────────── */}
      <div style={{
        width: 68, background: C.sidebar,
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: "16px 0", flexShrink: 0,
        borderRight: `1px solid ${T.brand100}`,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "0 14px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: T.rMd,
            background: C.accent, display: "flex",
            alignItems: "center", justifyContent: "center",
            marginBottom: 12, flexShrink: 0,
            boxShadow: `0 2px 8px ${C.accentGlow}`,
          }}>
            <Layers size={17} color="#fff" strokeWidth={1.7} />
          </div>

          {/* Nav icons */}
          {NAV_GROUPS.flatMap(g => g.items).map(({ id, label, I }) => (
            <RailBtn key={id} id={id} I={I} title={label}
              badge={id === "publisher" ? pend : id === "drafts" ? draftsCount : 0}
            />
          ))}
          <div style={{ height: 8 }} />
          {NAV_UTILITY.map(({ id, label, I }) => (
            <RailBtn key={id} id={id} I={I} title={label}
              badge={id === "trash" ? trashCount : 0}
            />
          ))}
          <RailBtn id="admin" I={Settings} title={user?.role === "admin" ? "Admin" : "Einstellungen"} badge={0} />
        </div>

        {/* Bottom: toggle + avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "0 14px" }}>
          <button
            onClick={toggle}
            title={open ? "Panel einklappen" : "Panel aufklappen"}
            style={{
              width: 32, height: 32, borderRadius: T.rSm,
              border: `1px solid ${T.gray300}`, background: T.white,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: T.gray500, transition: "all .12s",
              boxShadow: T.shadowXs,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.gray100; e.currentTarget.style.color = T.gray700; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.white; e.currentTarget.style.color = T.gray500; }}
          >
            {open
              ? <ChevronLeft size={15} strokeWidth={2} />
              : <ChevronRight size={15} strokeWidth={2} />}
          </button>
          <Avatar
            initials={user?.avatar}
            imageUrl={user?.imageUrl}
            size={30}
            color={ROLES[user?.role]?.color || C.accent}
          />
        </div>
      </div>

      {/* ── Text Panel (220px, collapsible) ────────────────────────────────── */}
      <div style={{
        width: open ? 220 : 0,
        background: C.panel,
        borderRight: open ? `1px solid ${C.panelBorder}` : "none",
        display: "flex", flexDirection: "column",
        overflow: "hidden", flexShrink: 0,
        transition: "width .22s cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{
          width: 220, display: "flex", flexDirection: "column",
          height: "100%", overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            height: 60, display: "flex", alignItems: "center",
            padding: "0 20px", flexShrink: 0,
            borderBottom: `1px solid ${T.gray100}`,
          }}>
            <span style={{
              fontSize: 16, fontWeight: 700, color: T.gray900,
              letterSpacing: "-.01em", whiteSpace: "nowrap",
            }}>
              SocialFlow
            </span>
            <span style={{
              marginLeft: 6, fontSize: 9, fontWeight: 800,
              color: C.accent, background: T.brand100,
              padding: "2px 6px", borderRadius: 4, letterSpacing: ".05em",
              whiteSpace: "nowrap",
            }}>
              PRO
            </span>
          </div>

          {/* Nav groups */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 12px 8px" }}>
            {NAV_GROUPS.map((grp, gi) => (
              <div key={grp.label} style={{ marginBottom: 16 }}>
                {/* Group label */}
                <div style={{
                  fontSize: 11, fontWeight: 700, color: T.gray400,
                  textTransform: "uppercase", letterSpacing: ".07em",
                  padding: "0 12px 4px", whiteSpace: "nowrap",
                }}>
                  {grp.label}
                </div>

                {grp.items.map(({ id, label, I }) => (
                  <div key={id}>
                    <PanelItem
                      id={id} label={label} I={I}
                      badge={id === "publisher" ? pend : id === "drafts" ? draftsCount : 0}
                    />

                    {/* Channel quick-links under Publisher */}
                    {id === "publisher" && chCounts.length > 0 && (
                      <div style={{ marginLeft: 16, marginBottom: 2, marginTop: 1 }}>
                        {chCounts.map(ch => {
                          const isCh = active === "publisher" && activeCh === ch.id;
                          return (
                            <button
                              key={ch.id}
                              onClick={() => onChNav(ch.id)}
                              style={{
                                width: "100%", height: 30, borderRadius: T.rSm,
                                border: "none", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "0 10px", fontFamily: FONT,
                                fontSize: 12, fontWeight: isCh ? 600 : 400,
                                transition: "all .1s",
                                background: isCh ? T.brand100 : "transparent",
                                color: isCh ? C.accent : T.gray500,
                              }}
                              onMouseEnter={e => { if (!isCh) { e.currentTarget.style.background = T.brand25; e.currentTarget.style.color = T.gray700; } }}
                              onMouseLeave={e => { if (!isCh) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.gray500; } }}
                            >
                              <div style={{ width: 1, height: 12, background: T.gray200, flexShrink: 0 }} />
                              <ChIco id={ch.id} size={11} color={isCh ? C.accent : T.gray400} />
                              <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {ch.label}
                              </span>
                              <span style={{
                                fontSize: 10, fontWeight: 600, color: T.gray500,
                                background: T.gray100, borderRadius: 6,
                                padding: "0 5px", lineHeight: "18px",
                              }}>
                                {ch.n}
                              </span>
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

          {/* ── Bottom: utility + user ── */}
          <div style={{
            padding: "8px 12px", borderTop: `1px solid ${T.gray100}`,
            flexShrink: 0, display: "flex", flexDirection: "column", gap: 1,
          }}>
            {NAV_UTILITY.map(({ id, label, I }) => (
              <PanelItem key={id} id={id} label={label} I={I}
                badge={id === "trash" ? trashCount : 0}
              />
            ))}
            <PanelItem
              id="admin"
              label={user?.role === "admin" ? "Admin" : "Einstellungen"}
              I={Settings}
              badge={0}
            />

            {/* User row */}
            <div style={{
              marginTop: 6, padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 8,
              borderRadius: T.rMd, background: T.gray50,
              border: `1px solid ${T.gray100}`,
            }}>
              <Avatar
                initials={user?.avatar}
                imageUrl={user?.imageUrl}
                size={28}
                color={ROLES[user?.role]?.color || C.accent}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: T.gray800,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.name}
                </div>
                <div style={{
                  fontSize: 10, color: T.gray400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.email}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Abmelden"
                style={{
                  width: 26, height: 26, borderRadius: T.rSm,
                  border: "none", background: "transparent",
                  color: T.gray400, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "color .12s, background .12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.error600; e.currentTarget.style.background = T.errorBg; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.gray400; e.currentTarget.style.background = "transparent"; }}
              >
                <LogOut size={13} strokeWidth={IW} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
