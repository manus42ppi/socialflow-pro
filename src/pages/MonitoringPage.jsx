import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext.jsx";
import { C, T, FONT, TYPO } from "../constants/colors.js";
import { storeGet, storeSet, uid } from "../utils/store.js";
import { igMonitor } from "../utils/store.js";
import {
  Search, Plus, RefreshCw, Instagram, Users, Heart, MessageCircle,
  ExternalLink, PenLine, Trash2, AlertCircle, Eye, ChevronRight,
  TrendingUp, Info,
} from "lucide-react";

const IW = 1.7;

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtK(n) {
  if (n == null) return "–";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d !== 1 ? "en" : ""}`;
}

// ── Post thumbnail card ────────────────────────────────────────────────────
function PostThumb({ post, onUseAsInspiration }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        aspectRatio: "1",
        borderRadius: 10,
        overflow: "hidden",
        background: C.surface,
        border: `1px solid ${C.border}`,
        cursor: "pointer",
        transition: "transform .15s",
        transform: hover ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Thumbnail */}
      {post.mediaUrl ? (
        <img
          src={post.mediaUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
          onError={e => { e.target.style.display = "none"; }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: C.textMute, fontSize: 13,
        }}>
          <Instagram size={24} strokeWidth={IW} />
        </div>
      )}

      {/* Hover overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,.72)",
        opacity: hover ? 1 : 0,
        transition: "opacity .15s",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 10,
      }}>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 12, fontFamily: FONT }}>
            <Heart size={12} strokeWidth={IW} fill="currentColor" />
            {fmtK(post.likes)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 12, fontFamily: FONT }}>
            <MessageCircle size={12} strokeWidth={IW} />
            {fmtK(post.comments)}
          </span>
        </div>

        {/* Caption preview */}
        {post.caption && (
          <p style={{
            margin: 0, color: "rgba(255,255,255,.9)",
            fontSize: 11, fontFamily: FONT,
            display: "-webkit-box", WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {post.caption}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onUseAsInspiration(post)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 4, padding: "6px 0",
              background: C.accent, color: "#fff",
              border: "none", borderRadius: 6, cursor: "pointer",
              fontSize: 11, fontWeight: 600, fontFamily: FONT,
            }}
            title="Als Entwurf verwenden"
          >
            <PenLine size={11} strokeWidth={IW} />
            Entwurf
          </button>
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 30, background: "rgba(255,255,255,.15)",
                border: "1px solid rgba(255,255,255,.2)", borderRadius: 6,
                color: "#fff", textDecoration: "none",
              }}
              title="Auf Instagram ansehen"
            >
              <ExternalLink size={11} strokeWidth={IW} />
            </a>
          )}
        </div>
      </div>

      {/* Date badge */}
      <div style={{
        position: "absolute", top: 6, right: 6,
        background: "rgba(0,0,0,.6)", borderRadius: 4,
        padding: "2px 6px",
        color: "#fff", fontSize: 10, fontFamily: FONT,
        opacity: hover ? 0 : 1, transition: "opacity .15s",
      }}>
        {fmtDate(post.timestamp)}
      </div>
    </div>
  );
}

// ── Account card ────────────────────────────────────────────────────────────
function AccountCard({ account, onRefresh, onRemove, onUseAsInspiration }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Profile header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "16px 20px",
        borderBottom: expanded ? `1px solid ${C.borderLight}` : "none",
      }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: `linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)`,
          padding: 2, flexShrink: 0,
        }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: C.bg }}>
            {account.profile?.profilePicture ? (
              <img src={account.profile.profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                color: C.textMute, fontFamily: FONT, fontWeight: 700, fontSize: 18,
              }}>
                {account.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: FONT, fontWeight: 700,
              fontSize: 15, color: C.text,
            }}>
              {account.profile?.name || account.username}
            </span>
            <a
              href={`https://instagram.com/${account.username}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                color: C.textMute, fontSize: 12, textDecoration: "none",
                display: "flex", alignItems: "center", gap: 3, fontFamily: FONT,
              }}
            >
              @{account.username}
              <ExternalLink size={10} strokeWidth={IW} />
            </a>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
            {account.profile?.followersCount != null && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, ...TYPO.caption, color: C.textMid }}>
                <Users size={12} strokeWidth={IW} />
                {fmtK(account.profile.followersCount)} Follower
              </span>
            )}
            {account.profile?.mediaCount != null && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, ...TYPO.caption, color: C.textMid }}>
                <Instagram size={12} strokeWidth={IW} />
                {account.profile.mediaCount} Posts
              </span>
            )}
            {account.lastFetched && (
              <span style={{ ...TYPO.caption, color: C.textMute }}>
                Aktualisiert {timeAgo(account.lastFetched)}
              </span>
            )}
          </div>

          {/* Bio */}
          {account.profile?.biography && (
            <p style={{
              margin: "4px 0 0", color: C.textSoft,
              fontSize: 12, fontFamily: FONT,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {account.profile.biography}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(p => !p)}
            style={{
              padding: "6px 10px", borderRadius: 7,
              border: `1px solid ${C.border}`,
              background: "transparent", cursor: "pointer",
              color: C.textMid, display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, fontFamily: FONT,
            }}
            title={expanded ? "Einklappen" : "Ausklappen"}
          >
            <ChevronRight size={14} strokeWidth={IW} style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)", transition: ".15s" }} />
          </button>
          <button
            onClick={() => onRefresh(account.id)}
            disabled={account.loading}
            style={{
              padding: "6px 10px", borderRadius: 7,
              border: `1px solid ${C.border}`,
              background: "transparent", cursor: account.loading ? "default" : "pointer",
              color: C.textMid, display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, fontFamily: FONT,
            }}
            title="Aktualisieren"
          >
            <RefreshCw size={13} strokeWidth={IW} style={{ animation: account.loading ? "spin .8s linear infinite" : "none" }} />
          </button>
          <button
            onClick={() => onRemove(account.id)}
            style={{
              padding: "6px 10px", borderRadius: 7,
              border: `1px solid ${C.border}`,
              background: "transparent", cursor: "pointer",
              color: "#e53e3e", display: "flex", alignItems: "center",
            }}
            title="Entfernen"
          >
            <Trash2 size={13} strokeWidth={IW} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {account.error && (
        <div style={{
          margin: "12px 20px", padding: "10px 14px",
          background: "rgba(229,62,62,.08)",
          border: "1px solid rgba(229,62,62,.2)",
          borderRadius: 8, display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <AlertCircle size={14} strokeWidth={IW} style={{ color: "#e53e3e", flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: "#e53e3e", fontSize: 12, fontFamily: FONT }}>{account.error}</span>
        </div>
      )}

      {/* Posts grid */}
      {expanded && !account.error && (
        <div style={{ padding: "16px 20px" }}>
          {account.posts?.length ? (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 8,
              }}>
                {account.posts.map(post => (
                  <PostThumb
                    key={post.id}
                    post={post}
                    onUseAsInspiration={onUseAsInspiration}
                  />
                ))}
              </div>
              <p style={{ margin: "10px 0 0", color: C.textMute, fontSize: 11, fontFamily: FONT, textAlign: "center" }}>
                {account.posts.length} neueste Posts · Hover für Details · Klick auf "Entwurf" zum Übernehmen
              </p>
            </>
          ) : (
            <div style={{
              textAlign: "center", padding: "30px 0",
              color: C.textMute, fontSize: 13, fontFamily: FONT,
            }}>
              Keine Posts gefunden.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const { user, setEdPost } = useApp();

  const [accounts, setAccounts]   = useState([]);
  const [addInput, setAddInput]   = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState("");
  const [loaded, setLoaded]       = useState(false);

  // ── Load from KV ──────────────────────────────────────────────────────────
  useEffect(() => {
    storeGet("monitoring:accounts").then(data => {
      if (data?.length) setAccounts(data);
      setLoaded(true);
    });
  }, []);

  // ── Persist to KV ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const toSave = accounts.map(a => ({ ...a, loading: false, error: null }));
    storeSet("monitoring:accounts", toSave);
  }, [accounts, loaded]);

  // ── Get user IG credentials from KV ──────────────────────────────────────
  const getIgCreds = useCallback(async () => {
    const creds = await storeGet(`channels:${user?.id}`);
    const at  = creds?.instagram?.accessToken;
    const uid2 = creds?.instagram?.accountId;
    if (!at || !uid2) {
      throw new Error("Keine Instagram-Zugangsdaten hinterlegt. Bitte zuerst unter Einstellungen → Meine Accounts konfigurieren.");
    }
    return { accessToken: at, igUserId: uid2 };
  }, [user?.id]);

  // ── Add account ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const username = addInput.trim().replace(/^@/, "").toLowerCase();
    if (!username) return;
    if (accounts.find(a => a.username === username)) {
      setAddError("Dieser Account wird bereits beobachtet.");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const { accessToken, igUserId } = await getIgCreds();
      const result = await igMonitor(accessToken, igUserId, username);
      setAccounts(prev => [{
        id: uid(),
        username,
        profile: result.profile,
        posts: result.posts,
        lastFetched: new Date().toISOString(),
        loading: false,
        error: null,
      }, ...prev]);
      setAddInput("");
    } catch (e) {
      setAddError(e.message);
    }
    setAdding(false);
  };

  // ── Refresh account ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async (accountId) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, loading: true, error: null } : a));
    try {
      const { accessToken, igUserId } = await getIgCreds();
      const result = await igMonitor(accessToken, igUserId, acc.username);
      setAccounts(prev => prev.map(a => a.id === accountId ? {
        ...a, profile: result.profile, posts: result.posts,
        lastFetched: new Date().toISOString(), loading: false, error: null,
      } : a));
    } catch (e) {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, loading: false, error: e.message } : a));
    }
  }, [accounts, getIgCreds]);

  // ── Remove account ─────────────────────────────────────────────────────────
  const handleRemove = useCallback((accountId) => {
    setAccounts(prev => prev.filter(a => a.id !== accountId));
  }, []);

  // ── Use post as draft inspiration ──────────────────────────────────────────
  const handleUseAsInspiration = useCallback((post) => {
    setEdPost({
      id: null,
      title: post.caption?.split("\n")[0]?.slice(0, 70) || "Instagram Inspiration",
      content: post.caption || "",
      channels: ["instagram"],
      scheduledDate: "", scheduledTime: "",
      status: "draft",
      mediaId: null, campaignId: null,
    });
  }, [setEdPost]);

  // ── Key handler for add input ──────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAdd();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "28px 32px",
      background: C.bg, fontFamily: FONT,
    }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            margin: 0, fontFamily: FONT,
            fontSize: 22, fontWeight: 700, color: C.text,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Eye size={22} strokeWidth={IW} color={C.accent} />
            Instagram Monitoring
          </h1>
          <p style={{ margin: "4px 0 0", color: C.textMid, fontSize: 13 }}>
            Beobachte öffentliche Business- & Creator-Accounts und hol dir Inspiration
          </p>
        </div>

        {/* Stats badge */}
        {accounts.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 20,
            background: C.accentLight, color: C.accent,
            fontSize: 13, fontWeight: 600,
          }}>
            <TrendingUp size={14} strokeWidth={IW} />
            {accounts.length} Account{accounts.length !== 1 ? "s" : ""} beobachtet
          </div>
        )}
      </div>

      {/* Add account input */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "18px 20px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "0 14px",
          }}>
            <Search size={15} strokeWidth={IW} color={C.textMute} style={{ flexShrink: 0 }} />
            <input
              value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Instagram-Username eingeben, z.B. @nike oder natgeo …"
              style={{
                flex: 1, border: "none", background: "transparent",
                outline: "none", color: C.text, fontFamily: FONT,
                fontSize: 14, padding: "11px 0",
              }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !addInput.trim()}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "11px 20px", borderRadius: 8,
              background: adding || !addInput.trim() ? C.border : C.accent,
              color: adding || !addInput.trim() ? C.textMute : "#fff",
              border: "none", cursor: adding || !addInput.trim() ? "default" : "pointer",
              fontSize: 14, fontWeight: 600, fontFamily: FONT,
              transition: "background .15s",
              whiteSpace: "nowrap",
            }}
          >
            {adding
              ? <RefreshCw size={15} strokeWidth={IW} style={{ animation: "spin .8s linear infinite" }} />
              : <Plus size={15} strokeWidth={IW} />
            }
            {adding ? "Wird geladen…" : "Account hinzufügen"}
          </button>
        </div>

        {/* Error */}
        {addError && (
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center", gap: 7,
            color: "#e53e3e", fontSize: 13,
          }}>
            <AlertCircle size={14} strokeWidth={IW} />
            {addError}
          </div>
        )}

        {/* Info note */}
        <div style={{
          marginTop: 12, display: "flex", alignItems: "flex-start", gap: 7,
          ...TYPO.caption, color: C.textMute,
        }}>
          <Info size={12} strokeWidth={IW} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Nur öffentliche <strong>Business- oder Creator-Accounts</strong> können abgerufen werden.
            Du benötigst deine Instagram-Zugangsdaten unter <strong>Einstellungen → Meine Accounts</strong>.
          </span>
        </div>
      </div>

      {/* Empty state */}
      {accounts.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          color: C.textMute,
        }}>
          <Eye size={48} strokeWidth={1.2} style={{ margin: "0 auto 16px", display: "block", color: C.border }} />
          <p style={{ margin: 0, fontFamily: FONT, fontSize: 16, fontWeight: 600, color: C.textSoft }}>
            Noch keine Accounts beobachtet
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13 }}>
            Gib oben einen Instagram-Username ein um loszulegen
          </p>
        </div>
      )}

      {/* Account cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            onRefresh={handleRefresh}
            onRemove={handleRemove}
            onUseAsInspiration={handleUseAsInspiration}
          />
        ))}
      </div>
    </div>
  );
}
