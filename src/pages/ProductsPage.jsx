import { useState, useMemo } from "react";
import { Package, Plus, Tag, Edit2, Trash2 } from "lucide-react";
import { C, T, FONT, IW, CSS } from "../constants/colors.js";
import { Btn } from "../components/ui/index.jsx";
import { useApp } from "../context/AppContext.jsx";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUSES = [
  { id: "draft",        label: "Entwurf",     color: "#F59E0B" },
  { id: "active",       label: "Aktiv",       color: "#10B981" },
  { id: "discontinued", label: "Eingestellt", color: "#EF4444" },
];

const STATUS_TABS = [
  { id: "all",          label: "Alle" },
  ...STATUSES,
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(price, currency) {
  if (price == null || price === "") return null;
  const num = parseFloat(price);
  if (isNaN(num)) return null;
  return num.toLocaleString("de-DE", { style: "currency", currency: currency || "EUR" });
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUSES.find(x => x.id === status) || STATUSES[0];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, color: s.color,
      background: s.color + "14", padding: "3px 9px", borderRadius: 6,
      fontFamily: FONT, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const price = fmtPrice(product.price, product.currency);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(product)}
      style={{
        background: C.surface,
        border: `1.5px solid ${hover ? C.accent + "44" : C.border}`,
        borderRadius: T.rLg,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
        boxShadow: hover ? T.shadowLg : T.shadowXs,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
      }}
    >
      {/* ── Action buttons (hover only) ── */}
      <div style={{
        position: "absolute", top: 12, right: 12,
        display: "flex", gap: 4,
        opacity: hover ? 1 : 0, transition: "opacity .12s",
      }}>
        <button
          onClick={e => { e.stopPropagation(); onEdit(product); }}
          style={{
            display: "flex", alignItems: "center", padding: "5px 8px",
            borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.surface, color: C.textSoft, cursor: "pointer",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + "44"; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textSoft; e.currentTarget.style.borderColor = C.border; }}
        >
          <Edit2 size={12} strokeWidth={IW} />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            if (window.confirm(`"${product.name || "Produkt"}" wirklich löschen?`)) onDelete(product.id);
          }}
          style={{
            display: "flex", alignItems: "center", padding: "5px 8px",
            borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.surface, color: C.textMute, cursor: "pointer",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#e53e3e"; e.currentTarget.style.borderColor = "#e53e3e44"; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textMute; e.currentTarget.style.borderColor = C.border; }}
        >
          <Trash2 size={12} strokeWidth={IW} />
        </button>
      </div>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingRight: 60 }}>
        <div style={{
          width: 36, height: 36, borderRadius: T.rMd,
          background: C.accentLight, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Package size={18} strokeWidth={IW} color={C.accent} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: FONT, fontWeight: 700, fontSize: 14,
            color: C.text, lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {product.name || "Ohne Name"}
          </div>
          {product.sku && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.textMute, marginTop: 2 }}>
              SKU: {product.sku}
            </div>
          )}
        </div>
      </div>

      {/* ── Badges row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <StatusBadge status={product.status} />
        {product.category && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600,
            color: C.textSoft, background: T.gray100,
            padding: "3px 8px", borderRadius: 6, fontFamily: FONT,
          }}>
            <Tag size={9} strokeWidth={IW} />
            {product.category}
          </span>
        )}
        {price && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 11.5, fontWeight: 700, color: C.accent,
            marginLeft: "auto", fontFamily: FONT,
          }}>
            {price}
          </span>
        )}
      </div>

      {/* ── Short description ── */}
      {product.shortDesc && (
        <div style={{
          fontFamily: FONT, fontSize: 12.5, color: C.textSoft,
          lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {product.shortDesc}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { products, newProduct, setEdProduct, delProduct } = useApp();
  const [filt, setFilt] = useState("all");

  const filtered = useMemo(() => {
    const list = products || [];
    if (filt === "all") return list;
    return list.filter(p => p.status === filt);
  }, [products, filt]);

  const counts = useMemo(() => {
    const list = products || [];
    const c = { all: list.length };
    STATUSES.forEach(s => { c[s.id] = list.filter(p => p.status === s.id).length; });
    return c;
  }, [products]);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
      <style>{CSS}</style>

      {/* ── Top bar ── */}
      <div style={{ padding: "20px 28px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: FONT, fontWeight: 700, fontSize: 20, color: C.text }}>
          Produkte
        </h1>
        <div style={{ flex: 1 }} />
        <Btn onClick={newProduct}>
          <Plus size={14} strokeWidth={IW} /> Neues Produkt
        </Btn>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ padding: "14px 28px 16px", display: "flex", gap: 2, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 2, background: C.borderLight, borderRadius: 8, padding: 3 }}>
          {STATUS_TABS.map(s => {
            const on = filt === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setFilt(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 6,
                  border: "none", fontFamily: FONT, fontSize: 12,
                  fontWeight: 600, cursor: "pointer",
                  background: on ? C.surface : "transparent",
                  color: on ? (s.color || C.text) : C.textSoft,
                  boxShadow: on ? "0 1px 3px rgba(0,0,0,.07)" : "none",
                  transition: "all .1s",
                }}
              >
                {s.color && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                )}
                {s.label}
                <span style={{ fontSize: 10, fontWeight: 700, opacity: .65 }}>
                  {counts[s.id] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Product grid ── */}
      <div style={{ padding: "0 28px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Package size={40} strokeWidth={1.2} color={C.border} style={{ margin: "0 auto 14px", display: "block" }} />
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.textSoft }}>
              {filt !== "all" ? "Keine Produkte in dieser Kategorie" : "Noch keine Produkte"}
            </p>
            <p style={{ margin: "8px 0 20px", fontSize: 13, color: C.textMute, fontFamily: FONT }}>
              {filt !== "all"
                ? "Filter anpassen oder alle Produkte anzeigen"
                : "Lege dein erstes Produkt an und verwalte alle Inhalte zentral."}
            </p>
            {filt === "all" && (
              <Btn onClick={newProduct}>
                <Plus size={14} strokeWidth={IW} /> Erstes Produkt anlegen
              </Btn>
            )}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}>
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={setEdProduct}
                onDelete={delProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
