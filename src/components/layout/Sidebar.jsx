import { Settings, LogOut, Layers, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { C, T, FONT, IW } from "../../constants/colors.js";
import { CHANNELS } from "../../constants/demo.js";
import { NAV_GROUPS, NAV_UTILITY } from "../../constants/nav.js";
import { ROLES } from "../../constants/demo.js";
import { Avatar } from "../ui/index.jsx";
import ChIco from "../ui/ChIco.jsx";
import { useApp } from "../../context/AppContext.jsx";
import { useState, useEffect } from "react";

// ── Sidebar ───────────────────────────────────────────────────────────────────
// Eingeklappt: 64px – nur Icons
// Aufgeklappt: 240px – Icons + Labels (eine einzige Spalte)

export default function Sidebar() {
  const {
    nav: active, goNav: onNav, user, handleLogout: onLogout,
    posts: allPosts, goChNav: onChNav, chFilt: activeCh,
    userWorkspaces, currentWorkspaceId, setCurrentWorkspaceId, currentWorkspace,
  } = useApp();

  const [wsOpen, setWsOpen] = useState(false);

  // Collapsed nav groups – persisted per key in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sb_collapsed_groups") || "{}"); }
    catch { return {}; }
  });
  const toggleGroup = (label) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [label]: !prev[label] };
      try { localStorage.setItem("sb_collapsed_groups", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!wsOpen) return;
    const close = () => setWsOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [wsOpen]);

  const posts     = allPosts ?? [];
  const pend      = posts.filter(p => p.status === "pending").length;
  const livePosts = posts.filter(p => !p.deleted);
  const chCounts  = CHANNELS
    .map(ch => ({ ...ch, n: livePosts.filter(p => p.channels?.includes(ch.id)).length }))
    .filter(c => c.n > 0);
  const trashCount  = posts.filter(p => p.deleted).length;

  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("sb_open") !== "0"; } catch { return true; }
  });
  const toggle = () => {
    const n = !open;
    setOpen(n);
    try { localStorage.setItem("sb_open", n ? "1" : "0"); } catch {}
  };

  const W = open ? 240 : 64;

  // ── Nav-Button (funktioniert in beiden Modi) ──────────────────────────────
  const NavBtn = ({ id, label, I, badge }) => {
    const on = active === id;
    return (
      <button
        onClick={() => onNav(id)}
        title={open ? undefined : label}
        style={{
          position: "relative",
          width: "100%",
          height: 38,
          borderRadius: T.rSm,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: open ? 8 : 0,
          padding: open ? "0 10px 0 12px" : "0",
          justifyContent: open ? "flex-start" : "center",
          transition: "background .12s, color .12s",
          background: on ? T.brand200 : "transparent",
          color: on ? T.gray800 : T.gray500,
          fontFamily: FONT,
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!on) { e.currentTarget.style.background = T.brand25; e.currentTarget.style.color = T.gray700; } }}
        onMouseLeave={e => { if (!on) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.gray500; } }}
      >
        {/* Active indicator */}
        {on && (
          <div style={{
            position: "absolute", left: 0, top: "50%",
            transform: "translateY(-50%)",
            width: 3, height: 20,
            background: C.accent,
            borderRadius: "0 3px 3px 0",
          }} />
        )}

        <I
          size={17}
          strokeWidth={IW}
          style={{
            flexShrink: 0,
            color: on ? C.accent : T.gray400,
          }}
        />

        {open && (
          <span style={{
            fontSize: 14, fontWeight: on ? 600 : 500,
            flex: 1, textAlign: "left",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {label}
          </span>
        )}

        {/* Badge */}
        {badge > 0 && open && (
          <div style={{
            minWidth: 20, height: 20, borderRadius: 10,
            background: on ? T.brand100 : T.gray100,
            color: on ? C.accent : T.gray600,
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 6px", flexShrink: 0,
          }}>
            {badge}
          </div>
        )}
        {badge > 0 && !open && (
          <div style={{
            position: "absolute", top: 5, right: 5,
            minWidth: 15, height: 15, borderRadius: 8,
            background: C.accent, color: "#fff",
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

  return (
    <div style={{
      width: W, minWidth: W,
      background: C.surface,
      display: "flex", flexDirection: "column",
      flexShrink: 0,
      borderRight: `1px solid ${T.gray200}`,
      transition: "width .22s cubic-bezier(.4,0,.2,1), min-width .22s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden",
    }}>

      {/* ── Logo + Toggle ──────────────────────────────────────────────────── */}
      {open ? (
        <div style={{
          height: 60, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 10px 0 14px",
          flexShrink: 0, borderBottom: `1px solid ${T.gray100}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: T.rMd, flexShrink: 0,
              background: C.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 2px 8px ${C.accentGlow}`,
            }}>
              <Layers size={15} color="#fff" strokeWidth={1.7} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.gray900, whiteSpace: "nowrap" }}>
              SocialFlow
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, color: C.accent,
              background: T.brand100, padding: "2px 6px",
              borderRadius: 4, letterSpacing: ".05em", whiteSpace: "nowrap",
            }}>
              PRO
            </span>
          </div>
          <button
            onClick={toggle}
            title="Einklappen"
            style={{
              width: 28, height: 28, borderRadius: T.rSm,
              border: `1px solid ${T.gray200}`, background: "transparent",
              color: T.gray400, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.gray100; e.currentTarget.style.color = T.gray600; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.gray400; }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          onClick={toggle}
          title="Aufklappen"
          style={{
            height: 60, width: "100%", border: "none",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, borderBottom: `1px solid ${T.gray100}`,
            transition: "background .12s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.gray50}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{
            width: 30, height: 30, borderRadius: T.rMd,
            background: C.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 8px ${C.accentGlow}`,
          }}>
            <Layers size={15} color="#fff" strokeWidth={1.7} />
          </div>
        </button>
      )}

      {/* ── Workspace Switcher ─────────────────────────────────────────────── */}
      {open && userWorkspaces && userWorkspaces.length > 0 && (() => {
        const ws = currentWorkspace;
        const initials = ws ? ws.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "AL";
        const color = ws ? ws.color : C.accent;
        return (
          <div style={{ padding: "8px 8px 0", flexShrink: 0, position: "relative" }}>
            <button
              onClick={e => { e.stopPropagation(); setWsOpen(v => !v); }}
              style={{
                width: "100%", borderRadius: T.rMd, border: `1px solid ${T.gray200}`,
                background: T.white, cursor: "pointer", padding: "6px 8px",
                display: "flex", alignItems: "center", gap: 8, fontFamily: FONT,
                transition: "background .12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray50}
              onMouseLeave={e => e.currentTarget.style.background = T.white}
            >
              {/* Colored avatar */}
              <div style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                background: color, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff",
                letterSpacing: "-.01em",
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: T.gray800,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ws ? ws.name : "Alle Mandanten"}
                </div>
                <div style={{ fontSize: 10, color: T.gray400 }}>Mandant</div>
              </div>
              <ChevronDown
                size={12} strokeWidth={2} color={T.gray400}
                style={{ transform: wsOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}
              />
            </button>

            {/* Dropdown */}
            {wsOpen && (
              <div
                onMouseDown={e => e.stopPropagation()}
                style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 8, right: 8, zIndex: 50,
                  background: C.surface, borderRadius: T.rLg, border: `1px solid ${T.gray200}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,.10)", padding: 4,
                }}
              >
                {userWorkspaces.map(w => {
                  const ini = w.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
                  const on = currentWorkspaceId === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => { setCurrentWorkspaceId(w.id); setWsOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 8px", borderRadius: T.rSm, border: "none", cursor: "pointer",
                        background: on ? T.brand25 : "transparent",
                        fontFamily: FONT, transition: "background .1s",
                      }}
                      onMouseEnter={e => { if (!on) e.currentTarget.style.background = T.gray50; }}
                      onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: w.color, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff",
                      }}>
                        {ini}
                      </div>
                      <span style={{
                        flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: on ? 700 : 500,
                        color: on ? T.gray900 : T.gray700,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {w.name}
                      </span>
                      {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: w.color, flexShrink: 0 }} />}
                    </button>
                  );
                })}

                {userWorkspaces.length > 1 && (
                  <>
                    <div style={{ height: 1, background: T.gray100, margin: "3px 4px" }} />
                    <button
                      onClick={() => { setCurrentWorkspaceId(null); setWsOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 8px", borderRadius: T.rSm, border: "none", cursor: "pointer",
                        background: !currentWorkspaceId ? T.brand25 : "transparent",
                        fontFamily: FONT, transition: "background .1s",
                      }}
                      onMouseEnter={e => { if (currentWorkspaceId) e.currentTarget.style.background = T.gray50; }}
                      onMouseLeave={e => { if (currentWorkspaceId) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: T.gray300, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff",
                      }}>
                        ALL
                      </div>
                      <span style={{
                        flex: 1, textAlign: "left", fontSize: 12.5,
                        fontWeight: !currentWorkspaceId ? 700 : 500,
                        color: !currentWorkspaceId ? T.gray900 : T.gray700,
                      }}>
                        Alle Mandanten
                      </span>
                      {!currentWorkspaceId && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Nav groups ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 8px 0" }}>
        {NAV_GROUPS.map((grp, gi) => {
          const isGrpCollapsed = !!collapsedGroups[grp.label];
          return (
          <div key={grp.label} style={{ marginBottom: 4 }}>
            {/* Group label – nur wenn aufgeklappt */}
            {open && (
              <div style={{ padding: gi > 0 ? "12px 12px 4px" : "2px 12px 4px" }}>
                {gi > 0 && (
                  <div style={{ height: 1, background: T.gray100, marginBottom: 10 }} />
                )}
                <button
                  onClick={() => toggleGroup(grp.label)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", background: "none", border: "none", padding: 0,
                    cursor: "pointer", borderRadius: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.querySelector(".grp-chevron").style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.querySelector(".grp-chevron").style.opacity = isGrpCollapsed ? "1" : "0"}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: T.gray400,
                    letterSpacing: ".08em", textTransform: "uppercase",
                  }}>
                    {grp.label}
                  </span>
                  <ChevronDown
                    className="grp-chevron"
                    size={11} strokeWidth={2.5} color={T.gray400}
                    style={{
                      transition: "transform .2s, opacity .15s",
                      transform: isGrpCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      opacity: isGrpCollapsed ? 1 : 0,
                      flexShrink: 0,
                    }}
                  />
                </button>
              </div>
            )}
            {/* Divider im collapsed Modus */}
            {!open && gi > 0 && (
              <div style={{ height: 1, background: T.gray100, margin: "6px 8px 10px" }} />
            )}

            {!isGrpCollapsed && grp.items.map(({ id, label, I }) => (
              <div key={id}>
                <NavBtn
                  id={id} label={label} I={I}
                  badge={id === "publisher" ? pend : 0}
                />

                {/* Channel quick-links unter Publisher (nur aufgeklappt) */}
                {id === "publisher" && open && chCounts.length > 0 && (
                  <div style={{ marginLeft: 22, marginBottom: 2, marginTop: 1 }}>
                    {chCounts.map(ch => {
                      const isCh = active === "publisher" && activeCh === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => onChNav(ch.id)}
                          title={ch.label}
                          style={{
                            width: "100%", height: 28, borderRadius: T.rSm,
                            border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 7,
                            padding: "0 8px 0 10px", fontFamily: FONT,
                            fontSize: 12, fontWeight: isCh ? 600 : 400,
                            transition: "all .1s",
                            background: isCh ? T.brand100 : "transparent",
                            color: isCh ? C.accent : T.gray500,
                          }}
                          onMouseEnter={e => { if (!isCh) { e.currentTarget.style.background = T.brand25; e.currentTarget.style.color = T.gray700; } }}
                          onMouseLeave={e => { if (!isCh) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.gray500; } }}
                        >
                          <div style={{ width: 1, height: 14, background: T.gray200, flexShrink: 0 }} />
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
          );
        })}
      </div>

      {/* ── Bottom: Utility + Admin + User ─────────────────────────────────── */}
      <div style={{
        padding: "8px", borderTop: `1px solid ${T.gray100}`,
        flexShrink: 0, display: "flex", flexDirection: "column", gap: 2,
      }}>
        {NAV_UTILITY.map(({ id, label, I }) => (
          <NavBtn key={id} id={id} label={label} I={I}
            badge={id === "trash" ? trashCount : 0}
          />
        ))}
        <NavBtn
          id="admin"
          label={user?.role === "admin" ? "Admin" : "Einstellungen"}
          I={Settings}
          badge={0}
        />

        <div style={{ height: 4 }} />

        {/* User row */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: open ? 8 : 0,
          padding: open ? "6px 10px" : "6px 0",
          justifyContent: open ? "flex-start" : "center",
          borderRadius: T.rMd,
          transition: "all .12s",
        }}>
          <Avatar
            initials={user?.avatar}
            imageUrl={user?.imageUrl}
            size={26}
            color={ROLES[user?.role]?.color || C.accent}
          />
          {open && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: T.gray800,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.name}
                  </span>
                  {user?.role && (
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: ROLES[user.role]?.color || C.accent,
                      background: (ROLES[user.role]?.color || C.accent) + "18",
                      padding: "1px 5px", borderRadius: 4,
                      letterSpacing: ".04em", flexShrink: 0, textTransform: "uppercase",
                    }}>
                      {ROLES[user.role]?.label || user.role}
                    </span>
                  )}
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
            </>
          )}
        </div>

        {/* Logout auch im collapsed Modus */}
        {!open && (
          <button
            onClick={onLogout}
            title="Abmelden"
            style={{
              width: "100%", height: 32, borderRadius: T.rSm,
              border: "none", background: "transparent",
              color: T.gray400, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color .12s, background .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.error600; e.currentTarget.style.background = T.errorBg; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.gray400; e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut size={15} strokeWidth={IW} />
          </button>
        )}
      </div>
    </div>
  );
}
