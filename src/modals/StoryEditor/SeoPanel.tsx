import { BarChart2, Tag, Hash, RefreshCw, Loader } from "lucide-react";
import { T, FONT, IW } from "../../constants/colors.js";
import AccSection from "../../components/ui/AccSection.js";

interface ReadabilityResult {
  fre: number;
  level: string;
  color: string;
  asl: number;
  acw: number;
  longSentences: number;
}

interface SeoCheck {
  ok: boolean;
  label: string;
  weight: number;
}

interface SeoResult {
  checks: SeoCheck[];
  score: number;
}

interface SeoPanelProps {
  form: {
    tags: string;
    hashtags: string;
    seoKeyword: string;
    metaTitle: string;
    metaDesc: string;
    title?: string;
    subtitle?: string;
  };
  seoResult: SeoResult | null;
  seoScore: number;
  seoColor: string;
  readability: ReadabilityResult | null;
  hasContent: boolean;
  tagsLoading: boolean;
  hashtagLoading: boolean;
  onFormChange: (updates: Record<string, string>) => void;
  onGenerateTags: () => void;
  onGenerateHashtags: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SeoPanel({
  form, seoResult, seoScore, seoColor, readability,
  hasContent, tagsLoading, hashtagLoading,
  onFormChange, onGenerateTags, onGenerateHashtags,
  isOpen, onToggle,
}: SeoPanelProps) {
  return (
    <AccSection
      label="SEO"
      badge={seoScore < 50 ? "!" : seoScore}
      badgeWarn={seoScore < 50}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Score card */}
        <div style={{ background: T.gray50, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.gray100}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.gray700, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5 }}>
              <BarChart2 size={13} strokeWidth={IW} color={seoColor} /> SEO-Score
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: seoColor, fontFamily: FONT }}>{seoScore}</span>
          </div>
          <div style={{ height: 5, background: T.gray100, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${seoScore}%`, background: seoColor, borderRadius: 10, transition: "width .4s" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
            {(seoResult?.checks || []).map((chk, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ flexShrink: 0, marginTop: 1, fontSize: 10, color: chk.ok ? "#10B981" : "#EF4444", fontWeight: 800 }}>{chk.ok ? "✓" : "✗"}</span>
                <span style={{ fontSize: 10.5, color: T.gray600, fontFamily: FONT, lineHeight: 1.4 }}>{chk.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Focus keyword */}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>Focus-Keyword</div>
          <input value={form.seoKeyword} onChange={e => onFormChange({ seoKeyword: e.target.value })}
            placeholder="z.B. social media strategie"
            style={{ width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.gray200}`, background: T.white, color: T.gray700, fontSize: 12, fontFamily: FONT, outline: "none" }}
          />
          <div style={{ fontSize: 10, color: T.gray400, marginTop: 3, fontFamily: FONT }}>Keyword, für das du ranken möchtest.</div>
        </div>

        {/* Readability */}
        {readability && (
          <div style={{ background: T.gray50, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.gray100}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.gray700, fontFamily: FONT }}>Lesbarkeit</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: readability.color, fontFamily: FONT }}>{readability.level}</span>
            </div>
            <div style={{ height: 5, background: T.gray100, borderRadius: 10, overflow: "hidden", marginBottom: 9 }}>
              <div style={{ height: "100%", width: `${readability.fre}%`, background: readability.color, borderRadius: 10, transition: "width .4s" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                [`Flesch-Score: ${readability.fre}/100`, readability.fre >= 40],
                [`Ø Satzlänge: ${readability.asl} Wörter${readability.asl > 20 ? " ⚠ zu lang" : ""}`, readability.asl <= 20],
                [`Ø Wortlänge: ${readability.acw} Zeichen`, readability.acw <= 7],
                [`Lange Sätze (>25 W.): ${readability.longSentences}`, readability.longSentences === 0],
              ].map(([lbl, ok], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, color: ok ? "#10B981" : "#F59E0B", fontWeight: 800, flexShrink: 0 }}>{ok ? "✓" : "!"}</span>
                  <span style={{ fontSize: 10.5, color: T.gray600, fontFamily: FONT }}>{lbl as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", display: "flex", alignItems: "center", gap: 4 }}>
              <Tag size={10} strokeWidth={2} /> Tags
            </div>
            <button onClick={onGenerateTags} disabled={tagsLoading || !hasContent}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, border: `1px solid ${T.brand200}`, background: "transparent", color: T.brand600, fontSize: 10.5, fontWeight: 600, cursor: hasContent ? "pointer" : "default", opacity: hasContent ? 1 : 0.4, fontFamily: FONT }}>
              {tagsLoading ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={10} strokeWidth={2} />} KI-Tags
            </button>
          </div>
          <input value={form.tags} onChange={e => onFormChange({ tags: e.target.value })}
            placeholder="tag1, tag2, tag3…"
            style={{ width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.gray200}`, background: T.white, color: T.gray700, fontSize: 12, fontFamily: FONT, outline: "none" }}
          />
          {form.tags && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {form.tags.split(",").map(t => t.trim()).filter(Boolean).map((t, i) => (
                <span key={i} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: T.brand50, color: T.brand600, fontFamily: FONT, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Hashtags */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", display: "flex", alignItems: "center", gap: 4 }}>
              <Hash size={10} strokeWidth={2} /> Hashtags
            </div>
            <button onClick={onGenerateHashtags} disabled={hashtagLoading || !hasContent}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, border: `1px solid ${T.brand200}`, background: "transparent", color: T.brand600, fontSize: 10.5, fontWeight: 600, cursor: hasContent ? "pointer" : "default", opacity: hasContent ? 1 : 0.4, fontFamily: FONT }}>
              {hashtagLoading ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={10} strokeWidth={2} />} Vorschläge
            </button>
          </div>
          <textarea value={form.hashtags} onChange={e => onFormChange({ hashtags: e.target.value })}
            placeholder="#social #marketing …" rows={3}
            style={{ width: "100%", boxSizing: "border-box", resize: "none", padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.gray200}`, background: T.white, color: T.gray700, fontSize: 12, fontFamily: FONT, outline: "none" }}
          />
          {form.hashtags && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {form.hashtags.split(/[\s,]+/).map(h => h.trim()).filter(h => h.startsWith("#")).map((h, i) => (
                <span key={i} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: "#6366F114", color: "#6366F1", fontFamily: FONT, fontWeight: 600 }}>{h}</span>
              ))}
            </div>
          )}
        </div>

        {/* Meta (Web) */}
        <div style={{ background: T.gray50, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.gray100}` }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Meta (Web)</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: T.gray600, fontFamily: FONT, marginBottom: 4 }}>SEO-Titel</div>
            <input value={form.metaTitle} onChange={e => onFormChange({ metaTitle: e.target.value })}
              placeholder={form.title || "Seitentitel für Google…"} maxLength={70}
              style={{ width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 6, border: `1px solid ${(form.metaTitle || form.title || "").length > 60 ? "#EF4444" : T.gray200}`, background: T.white, color: T.gray700, fontSize: 11.5, fontFamily: FONT, outline: "none" }}
            />
            <div style={{ fontSize: 9.5, color: (form.metaTitle || form.title || "").length > 60 ? "#EF4444" : T.gray400, textAlign: "right", marginTop: 2, fontFamily: FONT }}>{(form.metaTitle || form.title || "").length}/70</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: T.gray600, fontFamily: FONT, marginBottom: 4 }}>Meta-Beschreibung</div>
            <textarea value={form.metaDesc} onChange={e => onFormChange({ metaDesc: e.target.value })}
              placeholder="Kurzbeschreibung für Suchergebnisse (50–160 Zeichen)…" rows={3} maxLength={160}
              style={{ width: "100%", boxSizing: "border-box", resize: "none", padding: "6px 9px", borderRadius: 6, border: `1px solid ${form.metaDesc && (form.metaDesc.length < 50 || form.metaDesc.length > 160) ? "#EF4444" : T.gray200}`, background: T.white, color: T.gray700, fontSize: 11.5, fontFamily: FONT, outline: "none" }}
            />
            <div style={{ fontSize: 9.5, color: form.metaDesc && (form.metaDesc.length < 50 || form.metaDesc.length > 160) ? "#EF4444" : T.gray400, textAlign: "right", marginTop: 2, fontFamily: FONT }}>{(form.metaDesc || "").length}/160</div>
          </div>
          {(form.metaTitle || form.title) && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: T.white, borderRadius: 8, border: `1px solid ${T.gray100}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.gray400, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Google-Vorschau</div>
              <div style={{ fontSize: 14, color: "#1a0dab", fontFamily: "Arial,sans-serif", lineHeight: 1.3, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.metaTitle || form.title}</div>
              <div style={{ fontSize: 11, color: "#006621", fontFamily: "Arial,sans-serif", marginBottom: 2 }}>socialflow-pro.pages.dev</div>
              <div style={{ fontSize: 11.5, color: "#545454", fontFamily: "Arial,sans-serif", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {form.metaDesc || form.subtitle || "Keine Meta-Beschreibung gesetzt."}
              </div>
            </div>
          )}
        </div>
      </div>
    </AccSection>
  );
}
