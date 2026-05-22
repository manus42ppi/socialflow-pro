import { useState, useCallback, useEffect } from "react";
import {
  Loader, Globe, RefreshCw, ExternalLink, Check,
  BarChart2, Eye, Clock, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { T, FONT } from "../../constants/colors.js";
import AccSection from "../../components/ui/AccSection.js";

interface WebStats {
  views: number;
  last7: number;
  avgDuration?: number;
  trend?: "up" | "down" | "flat";
  trendPct?: number;
  returnRate?: number;
  returnVisits?: number;
  linkClickRate?: number;
  linkClicks?: number;
  engagementScore?: number;
  sparkline?: { date: string; views: number }[];
  scrollStats?: { pct25: number; pct50: number; pct75: number; pct100: number };
  referrerBreakdown?: Record<string, { count: number; pct: number }>;
}

interface WebsitePanelProps {
  form: {
    title?: string;
    webSlug?: string;
    webPublishedAt?: string | null;
    webUpdatedAt?: string | null;
  };
  pushToWebsite: (f: any) => Promise<{ slug: string; url: string }>;
  onPublishSuccess: (slug: string, webPublishedAt: string, webUpdatedAt: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function WebsitePanel({ form, pushToWebsite, onPublishSuccess, isOpen, onToggle }: WebsitePanelProps) {
  const [webPublishing, setWebPublishing] = useState(false);
  const [webPublished, setWebPublished] = useState<{ slug?: string; url?: string; error?: string } | null>(
    form.webSlug
      ? { slug: form.webSlug, url: `https://ppi-n3xt-website.pages.dev/blog/post.html?slug=${form.webSlug}` }
      : null
  );
  const [webStats, setWebStats] = useState<WebStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchWebStats = useCallback(async (slug?: string) => {
    const s = slug || form.webSlug;
    if (!s) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`https://socialflow-pro.pages.dev/track?slug=${encodeURIComponent(s)}`);
      if (res.ok) setWebStats(await res.json());
    } catch { /* ignore */ }
    setStatsLoading(false);
  }, [form.webSlug]);

  useEffect(() => {
    if (!form.webSlug) return;
    fetchWebStats(form.webSlug);
    const interval = setInterval(() => fetchWebStats(), 60 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublishToWeb = async () => {
    setWebPublishing(true);
    try {
      const { slug, url } = await pushToWebsite(form);
      const now = new Date().toISOString();
      const webPublishedAt = form.webPublishedAt || now;
      const webUpdatedAt = now;
      setWebPublished({ slug, url });
      onPublishSuccess(slug, webPublishedAt, webUpdatedAt);
      setTimeout(() => fetchWebStats(slug), 1500);
    } catch (e: any) {
      setWebPublished({ error: e.message });
    } finally {
      setWebPublishing(false);
    }
  };

  return (
    <AccSection
      label="Website · ppi n3xt"
      badge={webPublished && !webPublished.error ? "Live" : null}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Publish / Update button */}
        <button
          onClick={handlePublishToWeb}
          disabled={webPublishing || !form.title}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "7px 0", borderRadius: T.rMd, boxSizing: "border-box",
            border: `1px solid ${webPublished && !webPublished.error ? T.brand200 : T.brand600}`,
            background: webPublishing ? T.brand50 : webPublished && !webPublished.error ? T.brand50 : T.brand600,
            color: webPublishing || (webPublished && !webPublished.error) ? T.brand600 : T.white,
            fontFamily: FONT, fontSize: 12, fontWeight: 600,
            cursor: webPublishing || !form.title ? "default" : "pointer",
            opacity: !form.title ? 0.5 : 1, transition: "all .15s", boxShadow: T.shadowXs,
          }}
          onMouseEnter={e => { if (!webPublishing && form.title) e.currentTarget.style.filter = "brightness(.93)"; }}
          onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
        >
          {webPublishing
            ? <><Loader size={12} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> Wird aktualisiert…</>
            : webPublished && !webPublished.error
              ? <><RefreshCw size={12} strokeWidth={2} /> Aktualisieren</>
              : <><Globe size={13} strokeWidth={2} /> Auf Website veröffentlichen</>
          }
        </button>

        {/* Live ansehen */}
        {webPublished && !webPublished.error && (
          <a href={webPublished.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "6px 0", borderRadius: T.rMd, border: `1px solid ${T.gray200}`,
              background: T.white, color: T.brand600, fontFamily: FONT,
              fontSize: 11.5, fontWeight: 600, textDecoration: "none",
              width: "100%", transition: "all .15s", boxSizing: "border-box", boxShadow: T.shadowXs,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.brand25; e.currentTarget.style.borderColor = T.brand200; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.white; e.currentTarget.style.borderColor = T.gray200; }}
          >
            <ExternalLink size={11} strokeWidth={2} /> Live ansehen
          </a>
        )}

        {/* Publication metadata card */}
        {(form.webSlug || (webPublished && !webPublished.error)) && (
          <div style={{ background: T.gray50, borderRadius: T.rMd, border: `1px solid ${T.gray100}`, padding: "9px 11px", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
              <Globe size={11} strokeWidth={2} color={T.gray400} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 2 }}>URL</div>
                <div style={{ fontSize: 10, color: T.gray500, fontFamily: FONT, lineHeight: 1.5 }}>
                  /blog/<span style={{ color: T.brand600, fontWeight: 600, wordBreak: "break-all" }}>{form.webSlug || webPublished?.slug}</span>
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: T.gray100 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {form.webPublishedAt && (
                <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.successBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    <Check size={8} strokeWidth={3} color={T.success500} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em" }}>Erstveröffentlichung</div>
                    <div style={{ fontSize: 10.5, color: T.gray700, fontFamily: FONT, marginTop: 1 }}>
                      {new Date(form.webPublishedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{new Date(form.webPublishedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              )}
              {form.webUpdatedAt && form.webUpdatedAt !== form.webPublishedAt && (
                <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.brand100, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    <RefreshCw size={7} strokeWidth={2.5} color={T.brand600} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em" }}>Letztes Update</div>
                    <div style={{ fontSize: 10.5, color: T.gray700, fontFamily: FONT, marginTop: 1 }}>
                      {new Date(form.webUpdatedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{new Date(form.webUpdatedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats card */}
        {(webStats || statsLoading) && (
          <div style={{ background: T.gray50, borderRadius: T.rMd, border: `1px solid ${T.gray100}`, padding: "10px 11px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", display: "flex", alignItems: "center", gap: 4 }}>
                <BarChart2 size={9} strokeWidth={2} /> Statistik
              </div>
              <button onClick={() => fetchWebStats()} disabled={statsLoading}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.gray400, padding: 2, display: "flex", borderRadius: 4, transition: "color .12s" }}
                onMouseEnter={e => (e.currentTarget.style.color = T.gray600)}
                onMouseLeave={e => (e.currentTarget.style.color = T.gray400)}
                title="Neu laden">
                <RefreshCw size={10} strokeWidth={2} style={{ animation: statsLoading ? "spin 1s linear infinite" : "none" }} />
              </button>
            </div>

            {statsLoading && !webStats ? (
              <div style={{ fontSize: 10.5, color: T.gray400, fontFamily: FONT, textAlign: "center", padding: "8px 0" }}>Lade…</div>
            ) : webStats && (<>
              {/* Engagement-Score */}
              {(() => {
                const s = webStats.engagementScore ?? 0;
                const col = s >= 70 ? T.success500 : s >= 40 ? T.brand600 : T.warning500;
                const label = s >= 70 ? "Stark" : s >= 40 ? "Gut" : s > 0 ? "Aufbau" : "–";
                return (
                  <div style={{ background: T.white, borderRadius: T.rSm, border: `1px solid ${T.gray100}`, padding: "8px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Engagement-Score</div>
                      <div style={{ height: 6, background: T.gray100, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${s}%`, height: "100%", background: col, borderRadius: 4, transition: "width .4s" }} />
                      </div>
                      <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, marginTop: 3 }}>Scroll × Verweildauer</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: FONT, lineHeight: 1 }}>{s > 0 ? s : "–"}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: col, fontFamily: FONT }}>{s > 0 ? label : "Keine Daten"}</div>
                    </div>
                  </div>
                );
              })()}

              {/* 3-col metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {[
                  { icon: <Eye size={9} strokeWidth={2} color={T.gray400} />, label: "Aufrufe",
                    value: webStats.views >= 1000 ? `${(webStats.views / 1000).toFixed(1)}k` : String(webStats.views),
                    sub: webStats.last7 > 0 ? `${webStats.last7} / Wo.` : "–" },
                  { icon: <Clock size={9} strokeWidth={2} color={T.gray400} />, label: "Ø Zeit",
                    value: webStats.avgDuration ? (webStats.avgDuration >= 60 ? `${Math.floor(webStats.avgDuration / 60)}m` : `${webStats.avgDuration}s`) : "–",
                    sub: webStats.avgDuration ? (webStats.avgDuration >= 60 ? `${Math.floor(webStats.avgDuration / 60)}m ${webStats.avgDuration % 60}s` : `${webStats.avgDuration}s`) : "keine Daten" },
                  { icon: webStats.trend === "up" ? <TrendingUp size={9} strokeWidth={2} color={T.success500} />
                        : webStats.trend === "down" ? <TrendingDown size={9} strokeWidth={2} color={T.error600} />
                        : <Minus size={9} strokeWidth={2} color={T.gray400} />,
                    label: "Trend",
                    value: webStats.trendPct != null ? `${webStats.trendPct > 0 ? "+" : ""}${webStats.trendPct}%` : "–",
                    valueColor: webStats.trend === "up" ? T.success500 : webStats.trend === "down" ? T.error600 : T.gray700,
                    sub: "vs. Vorwoche" },
                ].map(({ icon, label, value, sub, valueColor }: any) => (
                  <div key={label} style={{ background: T.white, borderRadius: T.rSm, padding: "6px 7px", border: `1px solid ${T.gray100}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>{icon}
                      <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: valueColor || T.gray900, fontFamily: FONT, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, marginTop: 2, lineHeight: 1.3 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Return rate + link clicks */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {[
                  { label: "Rückkehr", value: webStats.returnRate! > 0 ? `${webStats.returnRate}%` : "–",
                    sub: webStats.returnVisits! > 0 ? `${webStats.returnVisits} Wiederk.` : "Keine Daten",
                    color: webStats.returnRate! >= 20 ? T.success500 : T.gray700 },
                  { label: "Link-Klicks", value: webStats.linkClickRate! > 0 ? `${webStats.linkClickRate}%` : "–",
                    sub: webStats.linkClicks! > 0 ? `${webStats.linkClicks} Klicks` : "Keine Daten",
                    color: T.gray700 },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={{ background: T.white, borderRadius: T.rSm, padding: "6px 7px", border: `1px solid ${T.gray100}` }}>
                    <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: FONT, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Sparkline */}
              {webStats.sparkline?.length! > 0 && (() => {
                const maxV = Math.max(1, ...webStats.sparkline!.map(d => d.views));
                const barW = 10, gap = 3, h = 32, total = webStats.sparkline!.length;
                const svgW = total * barW + (total - 1) * gap;
                return (
                  <div>
                    <div style={{ fontSize: 8.5, color: T.gray400, fontFamily: FONT, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".07em" }}>Letzte 14 Tage</div>
                    <svg width="100%" viewBox={`0 0 ${svgW} ${h}`} preserveAspectRatio="none" style={{ display: "block", height: h }}>
                      {webStats.sparkline!.map((d, i) => {
                        const barH = Math.max(2, Math.round((d.views / maxV) * h));
                        return <rect key={d.date} x={i * (barW + gap)} y={h - barH} width={barW} height={barH} rx={2} fill={i === total - 1 ? T.brand600 : d.views > 0 ? T.brand200 : T.gray100} />;
                      })}
                    </svg>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT }}>{webStats.sparkline![0]?.date?.slice(5).replace("-", ".")}</span>
                      <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT }}>Heute</span>
                    </div>
                  </div>
                );
              })()}

              {/* Scroll depth */}
              {webStats.scrollStats?.pct25! > 0 && (
                <div>
                  <div style={{ fontSize: 8.5, color: T.gray400, fontFamily: FONT, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Scroll-Tiefe</div>
                  {[
                    { label: "25%", val: webStats.scrollStats!.pct25 },
                    { label: "50%", val: webStats.scrollStats!.pct50 },
                    { label: "75%", val: webStats.scrollStats!.pct75 },
                    { label: "100%", val: webStats.scrollStats!.pct100 },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 8, color: T.gray400, fontFamily: FONT, width: 26, flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 5, background: T.gray100, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${val}%`, height: "100%", background: val >= 75 ? T.success500 : val >= 50 ? T.brand600 : T.brand200, borderRadius: 3, transition: "width .3s" }} />
                      </div>
                      <span style={{ fontSize: 8, color: T.gray500, fontFamily: FONT, width: 26, textAlign: "right", flexShrink: 0 }}>{val}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Referrer breakdown */}
              {webStats.referrerBreakdown && webStats.views > 0 && (() => {
                const ref = webStats.referrerBreakdown!;
                const entries = [
                  { key: "direct",     label: "Direkt",     color: T.gray500 },
                  { key: "organic",    label: "Suche",      color: T.brand600 },
                  { key: "social",     label: "Social",     color: "#E1306C" },
                  { key: "newsletter", label: "Newsletter", color: T.success500 },
                  { key: "other",      label: "Andere",     color: T.gray400 },
                ].filter(e => ref[e.key]?.count > 0);
                if (!entries.length) return null;
                return (
                  <div>
                    <div style={{ fontSize: 8.5, color: T.gray400, fontFamily: FONT, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Traffic-Quelle</div>
                    <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                      {entries.map(e => ref[e.key].pct > 0 && (
                        <div key={e.key} style={{ width: `${ref[e.key].pct}%`, background: e.color, transition: "width .3s" }} title={`${e.label}: ${ref[e.key].pct}%`} />
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px" }}>
                      {entries.map(e => (
                        <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 8, color: T.gray500, fontFamily: FONT }}>{e.label} {ref[e.key].pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>)}
          </div>
        )}

        {/* Error */}
        {webPublished?.error && (
          <div style={{ fontSize: 10, color: T.error600, fontFamily: FONT, padding: "5px 9px", background: T.errorBg, borderRadius: T.rSm, border: `1px solid ${T.error600}22` }}>
            ✕ {webPublished.error}
          </div>
        )}
      </div>
    </AccSection>
  );
}
