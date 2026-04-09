import { useState, useCallback } from "react";
import { Send, Plus, ArrowUpDown, Clock, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { C, T, FONT, IW } from "../constants/colors.js";
import { CHANNELS, ROLES } from "../constants/demo.js";
import { Btn, SBadge } from "../components/ui/index.jsx";
import ChIco from "../components/ui/ChIco.jsx";
import PostCard from "../components/PostCard.jsx";
import Board from "../components/widgets/Board.jsx";
import { useApp } from "../context/AppContext.jsx";
import { storeGet, igSync } from "../utils/store.js";

// ── Seeded hash (same logic as PostDetailDrawer so numbers match) ──────────
function hashId(id) {
  let h = 5381;
  for (let i = 0; i < String(id).length; i++) {
    h = ((h << 5) + h) ^ String(id).charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}
function seeded(id, min, max) { return min + (hashId(id) % (max - min + 1)); }

// ── Timeline view for published posts ─────────────────────────────────────
function TimelineView({ posts, campaigns, onOpen }) {
  // Sort newest first
  const sorted = [...posts].sort((a, b) => {
    const da = a.scheduledDate || "0000-00-00";
    const db = b.scheduledDate || "0000-00-00";
    return da > db ? -1 : da < db ? 1 : 0;
  });

  // Group by month
  const groups = [];
  const seen = {};
  sorted.forEach(p => {
    const key = p.scheduledDate
      ? new Date(p.scheduledDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })
      : "Kein Datum";
    if (!seen[key]) { seen[key] = true; groups.push({ key, items: [] }); }
    groups.find(g => g.key === key).items.push(p);
  });

  if (groups.length === 0) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <Send size={44} color={C.textMute} strokeWidth={1} style={{ margin: "0 auto 14px", display: "block" }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: C.textMid }}>Noch keine veröffentlichten Posts</div>
      <div style={{ fontSize: 13, color: C.textMute, marginTop: 6 }}>Veröffentlichte Posts erscheinen hier</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {groups.map(({ key, items }) => (
        <div key={key}>
          {/* Month heading */}
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textMute, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span>{key}</span>
            <div style={{ flex: 1, height: 1, background: C.borderLight }} />
            <span style={{ fontWeight: 500 }}>{items.length} Post{items.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Timeline items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 20, borderLeft: `2px solid ${C.borderLight}` }}>
            {items.map(p => {
              const camp = campaigns?.find(c => c.id === p.campaignId);
              const reach = seeded(p.id + "reach", 1200, 18000);
              const likes = seeded(p.id + "likes", 120, 3200);
              const shares = seeded(p.id + "shr", 30, 850);
              const dateLabel = p.scheduledDate
                ? new Date(p.scheduledDate).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })
                : "–";

              return (
                <div
                  key={p.id}
                  onClick={() => onOpen(p)}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  {/* Timeline dot */}
                  <div style={{ position: "absolute", left: -26, top: 18, width: 10, height: 10, borderRadius: "50%", background: C.accent, border: `2px solid ${C.surface}`, boxShadow: `0 0 0 2px ${C.accent}30` }} />

                  {/* Card */}
                  <div
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", transition: "box-shadow .15s, border-color .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,.08)`; e.currentTarget.style.borderColor = C.accent + "55"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Left: date + content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <Clock size={11} color={C.textMute} strokeWidth={2} />
                          <span style={{ fontSize: 11, color: C.textMute }}>{dateLabel}{p.scheduledTime ? " · " + p.scheduledTime + " Uhr" : ""}</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {p.channels?.map(c => <ChIco key={c} id={c} size={11} />)}
                          </div>
                        </div>
                        {p.title && (
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.title}
                          </div>
                        )}
                        {p.content && (
                          <div style={{ fontSize: 12, color: C.textSoft, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {p.content}
                          </div>
                        )}
                        {camp && (
                          <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: camp.color + "18", fontSize: 10.5, fontWeight: 700, color: camp.color }}>
                            {camp.emoji} {camp.name}
                          </div>
                        )}
                      </div>

                      {/* Right: mini stats */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, alignItems: "flex-end" }}>
                        <SBadge status={p.status} />
                        <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.textMute, marginTop: 4 }}>
                          <span title="Reichweite">👁 {reach >= 1000 ? (reach / 1000).toFixed(1) + "K" : reach}</span>
                          <span title="Likes">♡ {likes}</span>
                          <span title="Shares">↗ {shares}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Publisher Page ─────────────────────────────────────────────────────────
export default function PublisherPage() {
  const { posts, items, campaigns, setEdPost: onEdit, setSchPost: onSched, del: onDel, approve: onApprove, chSt: onStatus, chCamp: onCampaign, newPost: onNew, user, filt, setFilt, chFilt, setChFilt, setDetailPost } = useApp();
  const role = user?.role;

  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("date_asc");
  const [syncState, setSyncState] = useState(null); // null | "loading" | "ok" | "error"
  const [syncMsg, setSyncMsg] = useState("");
  const can = p => ROLES[role]?.can.includes(p);

  // ── Instagram Sync ─────────────────────────────────────────────────────────
  const { setPosts } = useApp();
  const handleIgSync = useCallback(async () => {
    setSyncState("loading");
    setSyncMsg("");
    try {
      // Load credentials from KV
      const creds = await storeGet("channels:" + user?.id);
      const ig = creds?.instagram;
      if (!ig?.accessToken || !ig?.accountId) {
        throw new Error("Keine Instagram-Zugangsdaten. Bitte in Einstellungen → Meine Kanäle → Instagram konfigurieren.");
      }
      const { posts: igPosts, count } = await igSync(ig.accessToken, ig.accountId);
      // Merge: add/update Instagram posts, keep existing non-Instagram posts
      setPosts(prev => {
        const existing = prev.filter(p => !p.instagramId); // non-Instagram posts
        const existingIgIds = new Set(prev.filter(p => p.instagramId).map(p => p.instagramId));
        const newPosts = igPosts.filter(p => !existingIgIds.has(p.instagramId));
        const updatedPosts = prev.map(p => {
          const fresh = igPosts.find(ig => ig.instagramId === p.instagramId);
          return fresh ? { ...p, ...fresh } : p; // update metrics of existing
        });
        const merged = [...updatedPosts.filter(p => !p.instagramId), ...updatedPosts.filter(p => p.instagramId), ...newPosts];
        return merged;
      });
      setSyncState("ok");
      setSyncMsg(`${count} Posts geladen`);
      setTimeout(() => setSyncState(null), 4000);
    } catch (e) {
      setSyncState("error");
      setSyncMsg(e.message);
    }
  }, [user?.id, setPosts]);

  const livePosts = posts.filter(p => !p.deleted);
  const usedChs = [...new Set(livePosts.flatMap(p => p.channels || []))];

  const filtered = livePosts.filter(p => {
    const stOk = filt === "all" || p.status === filt;
    const chOk = chFilt === "all" || p.channels?.includes(chFilt);
    return stOk && chOk;
  });

  const ST_ORDER = { scheduled: 0, pending: 1, draft: 2, published: 3 };
  const shown = [...filtered].sort((a, b) => {
    if (sort === "date_asc") { const da = a.scheduledDate || "9999-99-99", db = b.scheduledDate || "9999-99-99"; return da < db ? -1 : da > db ? 1 : 0; }
    if (sort === "date_desc") { const da = a.scheduledDate || "0000-00-00", db = b.scheduledDate || "0000-00-00"; return da > db ? -1 : da < db ? 1 : 0; }
    if (sort === "status") return (ST_ORDER[a.status] ?? 9) - (ST_ORDER[b.status] ?? 9);
    if (sort === "title") return (a.title || "").localeCompare(b.title || "", "de");
    return 0;
  });

  const cnt = v => livePosts.filter(p => p.status === v).length;
  const isPublishedView = filt === "published";

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ── Toolbar ── */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap", rowGap: 8 }}>

        {/* View toggle — hidden in published timeline view */}
        {!isPublishedView && (
          <div style={{ display: "flex", gap: 2, background: C.borderLight, borderRadius: 8, padding: 3 }}>
            {[["grid", "⊞ Grid"], ["board", "⊟ Board"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: view === v ? C.surface : "transparent", color: view === v ? C.text : C.textSoft, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: FONT, boxShadow: view === v ? "0 1px 3px rgba(0,0,0,.07)" : "none" }}>{l}</button>
            ))}
          </div>
        )}

        {(view === "grid" || isPublishedView) && <>
          {!isPublishedView && <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />}

          {/* Status filter */}
          <div style={{ display: "flex", gap: 2, background: C.borderLight, borderRadius: 8, padding: 3 }}>
            {[
              ["all",       "Alle",          null,    livePosts.length],
              ["draft",     "Entwürfe",      "#F59E0B", cnt("draft")],
              ["pending",   "Freigabe",      "#175CD3", cnt("pending")],
              ["scheduled", "Geplant",       "#027A48", cnt("scheduled")],
              ["published", "Veröffentlicht", C.accent, cnt("published")],
            ].map(([v, l, color, c]) => {
              const on = filt === v;
              return (
                <button key={v} onClick={() => setFilt(v)} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 6, border: "none",
                  background: on ? (color ? color : C.surface) : "transparent",
                  color: on ? (color ? "#fff" : C.text) : C.textSoft,
                  fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: FONT, transition: "all .1s",
                }}>
                  {l}{" "}<span style={{ opacity: on ? .75 : .6, fontWeight: 500 }}>{c}</span>
                </button>
              );
            })}
          </div>

          {!isPublishedView && <>
            <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

            {/* Channel filter pills */}
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              {["all", ...usedChs].map(cid => {
                const ch = CHANNELS.find(x => x.id === cid);
                const active = chFilt === cid;
                return (
                  <button key={cid} onClick={() => setChFilt(cid)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 11px", borderRadius: 20, border: "none", background: active ? C.text : C.borderLight, color: active ? C.surface : C.textSoft, fontWeight: 600, fontSize: 11.5, cursor: "pointer", fontFamily: FONT, transition: "all .12s", lineHeight: 1 }}>
                    {cid === "all" ? <>Alle Kanäle</> : <><ChIco id={cid} size={11} color={active ? "#fff" : C.textMute} />{ch?.label}</>}
                  </button>
                );
              })}
            </div>

            <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

            {/* Sort */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <ArrowUpDown size={13} strokeWidth={2} color={C.textMute} />
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 12, color: C.textSoft, fontWeight: 600, cursor: "pointer", fontFamily: FONT, outline: "none" }}>
                <option value="date_asc">Datum ↑</option>
                <option value="date_desc">Datum ↓</option>
                <option value="status">Status</option>
                <option value="title">Titel A–Z</option>
              </select>
            </div>
          </>}
        </>}

        <div style={{ flex: 1 }} />
        {can("write") && <Btn onClick={onNew}><Plus size={14} strokeWidth={2.5} />Neuer Post</Btn>}
      </div>

      {/* ── Content ── */}
      {isPublishedView ? (
        // Timeline view for published posts
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>

            {/* Header + Sync button */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: C.text }}>Veröffentlicht</div>
                <div style={{ fontSize: 12, color: C.textMute }}>{shown.length} Posts · Klick für Details & Performance</div>
              </div>
              <div style={{ flex: 1 }} />
              {/* Sync status message */}
              {syncState === "ok" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.success, fontWeight: 700 }}>
                  <CheckCircle size={13} strokeWidth={2.5} />{syncMsg}
                </div>
              )}
              {syncState === "error" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#E53E3E", fontWeight: 600, maxWidth: 280, textAlign: "right" }}>
                  <AlertCircle size={13} strokeWidth={2} style={{ flexShrink: 0 }} />{syncMsg}
                </div>
              )}
              {/* Instagram sync button */}
              <button
                onClick={handleIgSync}
                disabled={syncState === "loading"}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 9,
                  border: `1.5px solid #E1306C44`, background: syncState === "loading" ? C.borderLight : "#FFF0F6",
                  color: "#E1306C", fontWeight: 700, fontSize: 12.5, cursor: syncState === "loading" ? "wait" : "pointer",
                  fontFamily: FONT, transition: "all .15s",
                }}
                onMouseEnter={e => { if (syncState !== "loading") e.currentTarget.style.background = "#FFD6E7"; }}
                onMouseLeave={e => { if (syncState !== "loading") e.currentTarget.style.background = "#FFF0F6"; }}
              >
                <RefreshCw size={13} strokeWidth={2.5} style={{ animation: syncState === "loading" ? "spin .8s linear infinite" : "none" }} />
                {syncState === "loading" ? "Lade von Instagram…" : "Von Instagram laden"}
              </button>
            </div>

            <TimelineView posts={shown} campaigns={campaigns} onOpen={setDetailPost} />
          </div>
        </div>
      ) : view === "grid" ? (
        <div style={{ flex: 1, overflow: "auto", padding: 22 }}>
          {shown.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <Send size={44} color={C.textMute} strokeWidth={1} style={{ margin: "0 auto 14px", display: "block" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: C.textMid }}>Keine Posts</div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 6 }}>
                {chFilt !== "all" || filt !== "all" ? "Filter anpassen oder " : ""}
              </div>
              {can("write") && <Btn style={{ marginTop: 14 }} onClick={onNew}><Plus size={14} strokeWidth={2} />Erstellen</Btn>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(295px,1fr))", gap: 18, alignItems: "start" }}>
              {shown.map(p => <PostCard key={p.id} post={p} items={items} campaigns={campaigns} onEdit={onEdit} onSched={onSched} onDel={onDel} onApprove={onApprove} role={role} />)}
            </div>
          )}
        </div>
      ) : (
        <Board posts={posts} items={items} campaigns={campaigns} onStatus={onStatus} onCampaign={onCampaign} onEdit={onEdit} onNew={onNew} canW={can("write")} />
      )}
    </div>
  );
}
