import { useState } from "react";
import {
  Inbox, Clock, CheckCircle, XCircle, Search, Eye, FileText,
  Image as ImageIcon, Upload, X, Timer, AlertCircle, Check,
  Tag, ExternalLink, ChevronRight, Users,
} from "lucide-react";
import { C, T, FONT, IW } from "../constants/colors.js";
import { useApp } from "../context/AppContext.jsx";

// ── Demo data ────────────────────────────────────────────────────────────────

const DEMO_SUBMISSIONS = [
  {
    id: "ugc-1",
    submittedAt: "2026-04-08T09:15:00Z",
    name: "Handball-Club Muenchen e.V.",
    email: "presse@hcm.de",
    title: "HCM gewinnt Bezirksmeisterschaft – historischer Triumph nach 15 Jahren",
    articleLength: "medium",
    text: "Der Handball-Club Muenchen hat am vergangenen Samstag die Bezirksmeisterschaft gewonnen. Nach einem packenden Finale gegen den TSV Pasing mit 28:25 Toren feierten die Spieler und rund 400 Fans in der Halle. Es ist der erste Meistertitel seit 15 Jahren fuer den Traditionsverein aus Schwabing. Trainer Marco Reuter zeigte sich ueberwaeltigt: Diese Mannschaft hat die ganze Saison unglaublichen Zusammenhalt gezeigt. Naechste Saison spielen wir in der Landesliga.",
    imageCount: 3,
    category: "Sport",
    rightsConfirmed: true,
    status: "pending",
    storyId: null,
    notes: "",
  },
  {
    id: "ugc-2",
    submittedAt: "2026-04-07T14:30:00Z",
    name: "Grundschule Am Ostpark",
    email: "schulleitung@ostpark-gs.de",
    title: "Schulgarten-Projekt: 200 Quadratmeter Natur mitten in der Stadt",
    articleLength: "medium",
    text: "Die Grundschule Am Ostpark hat ihren neuen Schulgarten eingeweiht. Auf 200 Quadratmetern koennen Schueler der Klassen 1-4 Gemuese und Kraeuter anbauen. Das Projekt wurde durch Elternspenden und einen Stadtbezirks-Foerdertopf finanziert. Schulleiterin Andrea Bauer betonte: Kinder, die wissen wo ihr Essen herkommt, entwickeln ein besseres Verhaeltnis zur Natur. Im Sommer soll die erste Ernte gefeiert werden.",
    imageCount: 5,
    category: "Bildung",
    rightsConfirmed: true,
    status: "approved",
    storyId: "story-imported-2",
    notes: "Gute Qualitaet, Bilder hochaufloesend",
  },
  {
    id: "ugc-3",
    submittedAt: "2026-04-07T11:00:00Z",
    name: "Kirchengemeinde St. Lukas",
    email: "buero@stlukas-muenchen.de",
    title: "Konzert fuer den guten Zweck: 2.400 Euro fuer Kinderhospiz",
    articleLength: "short",
    text: "Das Benefizkonzert der Kirchengemeinde St. Lukas hat 2.400 Euro fuer das Kinderhospiz Muenchen eingebracht. Ueber 180 Besucher kamen in die Kirche und erlebten ein Programm aus klassischer Musik und Gospelgesang. Pfarrer Thomas Hellmann dankte den Musizierenden und dem Publikum herzlich. Das Geld soll fuer die Anschaffung von Spielgeraeten fuer die kleinen Patienten verwendet werden.",
    imageCount: 2,
    category: "Kultur",
    rightsConfirmed: true,
    status: "approved",
    storyId: "story-imported-3",
    notes: "",
  },
  {
    id: "ugc-4",
    submittedAt: "2026-04-06T16:45:00Z",
    name: "Buergerinitiative Gruenanlage Laim",
    email: "info@gruenanlage-laim.de",
    title: "Petition fuer mehr Gruenflaechen: Schon 1.200 Unterschriften",
    articleLength: "long",
    text: "Die Buergerinitiative Gruenanlage Laim hat in drei Wochen ueber 1.200 Unterschriften gesammelt. Ziel ist der Erhalt einer Brachflaeche an der Landsberger Strasse als Gruenanlage statt als Parkplatz. Initiatorin Sabine Graf erlaeutert: Laim hat die geringste Gruenflaeche pro Einwohner aller Stadtbezirke. Das muss sich aendern. Ein Gespraech mit dem Bezirksausschuss ist fuer kommende Woche geplant.",
    imageCount: 1,
    category: "Lokales",
    rightsConfirmed: true,
    status: "pending",
    storyId: null,
    notes: "",
  },
  {
    id: "ugc-5",
    submittedAt: "2026-04-05T10:20:00Z",
    name: "Tennisclub Blau-Weiss Bogenhausen",
    email: "info@tc-bw-bogenhausen.de",
    title: "Junioren-Turnier: 64 Talente kaempfen um den Stadtpokal",
    articleLength: "short",
    text: "64 Nachwuchsspieler aus 18 Muenchner Tennisvereinen traten beim diesjaehrigen Stadtpokal-Juniorenturnier im TC Blau-Weiss Bogenhausen an. Am Ende gewann Luca Berger vom TC Gruenwald in der Altersklasse U16. Die Veranstaltung war ausverkauft und sorgte fuer eine fantastische Stimmung.",
    imageCount: 4,
    category: "Sport",
    rightsConfirmed: true,
    status: "rejected",
    storyId: null,
    notes: "Zu wenig regionale Relevanz fuer unsere Zielgruppe",
  },
  {
    id: "ugc-6",
    submittedAt: "2026-04-04T08:30:00Z",
    name: "Volkshochschule Muenchen Nord",
    email: "presse@vhs-muenchen.de",
    title: "Neues KI-Kurs-Angebot: Von Prompt Engineering bis Bildgenerierung",
    articleLength: "medium",
    text: "Die VHS Muenchen Nord baut ihr Angebot im Bereich kuenstliche Intelligenz stark aus. Ab Herbst 2026 gibt es 12 neue Kurse zu Themen wie ChatGPT fuer den Alltag, KI-gestuetzte Bildgenerierung und Prompt Engineering fuer Einsteiger. Kursleiter Prof. Dr. Andreas Vogl: KI ist fuer jeden relevant – nicht nur fuer Techniker. Unsere Kurse richten sich explizit an Menschen ohne IT-Hintergrund.",
    imageCount: 0,
    category: "Bildung",
    rightsConfirmed: false,
    status: "pending",
    storyId: null,
    notes: "Rechtebestaetigung fehlt – bitte nachfragen",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_CONFIG = {
  pending:  { label: "Ausstehend", color: T.warning500,   bg: T.warningBg,  text: T.warningText },
  approved: { label: "Genehmigt",  color: T.success500,   bg: T.successBg,  text: T.successText },
  rejected: { label: "Abgelehnt",  color: T.error600,     bg: T.errorBg,    text: T.error600    },
};

const LENGTH_LABELS = {
  short:  "Kurz (~100 W.)",
  medium: "Mittel (~300 W.)",
  long:   "Lang (~600+ W.)",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, color: cfg.text,
      background: cfg.bg, padding: "3px 9px", borderRadius: 6,
      fontFamily: FONT, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function CatBadge({ cat }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: C.accent,
      background: C.accentLight, padding: "2px 8px", borderRadius: 5,
      fontFamily: FONT,
    }}>
      {cat}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: T.rLg, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: T.shadowXs, flex: 1, minWidth: 140,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: T.rMd,
        background: color + "14", display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} strokeWidth={IW} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.1, fontFamily: FONT }}>{value}</div>
        <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2, fontFamily: FONT }}>{label}</div>
      </div>
    </div>
  );
}

// ── Portal Preview Modal ─────────────────────────────────────────────────────

function PortalPreviewModal({ onClose }) {
  const [formCategory, setFormCategory] = useState("Sport");
  const [formLength, setFormLength] = useState("medium");

  const inputStyle = {
    width: "100%", padding: "9px 12px", fontFamily: FONT, fontSize: 13,
    color: C.text, background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: T.rMd, outline: "none", boxSizing: "border-box",
  };

  const lengthOptions = [
    { id: "short",  label: "Kurz",   sub: "~100 Wörter" },
    { id: "medium", label: "Mittel", sub: "~300 Wörter" },
    { id: "long",   label: "Lang",   sub: "~600+ Wörter" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: C.surface, borderRadius: T.rLg, width: "100%", maxWidth: 680,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: T.shadowLg, overflow: "hidden",
      }}>
        {/* Modal header */}
        <div style={{
          padding: "18px 24px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: T.rMd,
              background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileText size={16} strokeWidth={IW} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: FONT }}>UGC Einreichungsformular</div>
              <div style={{ fontSize: 11, color: C.textSoft, fontFamily: FONT }}>Vorschau – öffentliches Eingabeformular</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.textSoft, padding: 4, borderRadius: T.rSm, display: "flex",
          }}>
            <X size={18} strokeWidth={IW} />
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* Two-column row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ flex: "1 1 220px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5, fontFamily: FONT }}>
                Name / Organisation *
              </label>
              <input placeholder="z.B. TSV Schwabing 1900 e.V." style={inputStyle} readOnly />
            </div>
            <div style={{ flex: "1 1 220px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5, fontFamily: FONT }}>
                E-Mail-Adresse *
              </label>
              <input type="email" placeholder="presse@verein.de" style={inputStyle} readOnly />
            </div>
          </div>

          {/* Full-width title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5, fontFamily: FONT }}>
              Artikel-Titel *
            </label>
            <input placeholder="Titel Ihres Beitrags" style={inputStyle} readOnly />
          </div>

          {/* Article length cards */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 8, fontFamily: FONT }}>
              Artikellänge
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              {lengthOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFormLength(opt.id)}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: T.rMd, cursor: "pointer",
                    border: `1.5px solid ${formLength === opt.id ? C.accent : C.border}`,
                    background: formLength === opt.id ? C.accentLight : C.surface,
                    textAlign: "center", transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: formLength === opt.id ? C.accent : C.text, fontFamily: FONT }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2, fontFamily: FONT }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category dropdown */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5, fontFamily: FONT }}>
              Kategorie
            </label>
            <select
              value={formCategory}
              onChange={e => setFormCategory(e.target.value)}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            >
              {["Sport", "Bildung", "Kultur", "Lokales", "Wirtschaft", "Sonstiges"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Text area */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5, fontFamily: FONT }}>
              Artikeltext *
            </label>
            <textarea
              placeholder="Schreiben Sie hier Ihren Beitrag..."
              readOnly
              style={{
                ...inputStyle, height: 130, resize: "vertical",
                verticalAlign: "top", display: "block",
              }}
            />
          </div>

          {/* Image upload (visual only) */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5, fontFamily: FONT }}>
              Bilder hochladen
            </label>
            <div style={{
              border: `1.5px dashed ${C.border}`, borderRadius: T.rMd,
              padding: "22px 16px", textAlign: "center", background: T.gray50,
            }}>
              <Upload size={22} strokeWidth={IW} color={C.textSoft} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: C.textMid, fontFamily: FONT }}>Bilder hier ablegen oder <span style={{ color: C.accent, cursor: "pointer" }}>Datei auswählen</span></div>
              <div style={{ fontSize: 11, color: C.textMute, marginTop: 4, fontFamily: FONT }}>JPG, PNG bis 10 MB pro Bild</div>
            </div>
          </div>

          {/* Rights confirmation */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 14px", borderRadius: T.rMd,
            background: T.brand50, border: `1px solid ${T.brand200}`,
            marginBottom: 20,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, background: C.accent,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
            }}>
              <Check size={11} strokeWidth={2.5} color="#fff" />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: C.textMid, lineHeight: 1.55, fontFamily: FONT }}>
              Ich bestätige, dass ich die Rechte an den hochgeladenen Bildern besitze und SocialFlow die Veröffentlichungsrechte einräume.
            </p>
          </div>

          {/* Submit button */}
          <button style={{
            width: "100%", padding: "12px", borderRadius: T.rMd, border: "none",
            background: C.accent, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: FONT,
          }}>
            Einreichen
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: C.textMute, marginTop: 12, fontFamily: FONT }}>
            Einreichungen werden von der Redaktion geprüft.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Submission list card ─────────────────────────────────────────────────────

function SubmissionCard({ sub, selected, onClick }) {
  const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
  const isSelected = selected?.id === sub.id;

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? T.brand25 : C.surface,
        border: `1px solid ${isSelected ? T.brand200 : C.border}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: T.rMd, padding: "12px 14px", cursor: "pointer",
        marginBottom: 6, transition: "all 0.12s",
        boxShadow: isSelected ? `0 0 0 2px ${T.brand100}` : T.shadowXs,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT }}>{sub.name}</span>
            {!sub.rightsConfirmed && (
              <AlertCircle size={13} strokeWidth={IW} color={T.warning500} />
            )}
          </div>
          <div style={{ fontSize: 11, color: C.textSoft, fontFamily: FONT }}>{sub.email}</div>
        </div>
        <StatusPill status={sub.status} />
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13, color: C.textMid, fontFamily: FONT, lineHeight: 1.4,
        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        marginBottom: 8,
      }}>
        {sub.title}
      </div>

      {/* Bottom meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <CatBadge cat={sub.category} />
        <span style={{ fontSize: 11, color: C.textMute, fontFamily: FONT }}>{fmtDate(sub.submittedAt)}</span>
        {sub.imageCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: C.textSoft, fontFamily: FONT }}>
            <ImageIcon size={11} strokeWidth={IW} />
            {sub.imageCount}
          </span>
        )}
        <span style={{
          fontSize: 10, color: C.textMute, background: T.gray100,
          padding: "2px 6px", borderRadius: 4, fontFamily: FONT,
        }}>
          {LENGTH_LABELS[sub.articleLength] || sub.articleLength}
        </span>
      </div>
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ sub, onUpdate, onConvertToStory }) {
  const [notesVal, setNotesVal] = useState(sub.notes || "");
  const [approvingMode, setApprovingMode] = useState(false); // show "import as story?" prompt

  // Sync notes when sub changes
  const currentSubId = sub.id;

  // Save notes on blur
  const saveNotes = () => {
    if (notesVal !== sub.notes) {
      onUpdate(sub.id, { notes: notesVal });
    }
  };

  const handleApprove = () => {
    setApprovingMode(true);
  };

  const handleApproveWithStory = () => {
    onUpdate(sub.id, { status: "approved" });
    setApprovingMode(false);
    onConvertToStory(sub);
  };

  const handleApproveOnly = () => {
    onUpdate(sub.id, { status: "approved" });
    setApprovingMode(false);
  };

  const handleReject = () => {
    onUpdate(sub.id, { status: "rejected" });
    setApprovingMode(false);
  };

  const handleReopen = () => {
    onUpdate(sub.id, { status: "pending" });
    setApprovingMode(false);
  };

  const handleConvert = () => {
    onConvertToStory(sub);
  };

  // Reset approvingMode when sub changes
  const [prevSubId, setPrevSubId] = useState(sub.id);
  if (sub.id !== prevSubId) {
    setPrevSubId(sub.id);
    setNotesVal(sub.notes || "");
    setApprovingMode(false);
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: C.textSoft, fontFamily: FONT, marginBottom: 4, display: "block" };
  const sectionStyle = { marginBottom: 18 };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Detail header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: FONT }}>{sub.name}</div>
            <div style={{ fontSize: 12, color: C.textSoft, fontFamily: FONT, marginTop: 1 }}>{sub.email}</div>
          </div>
          <StatusPill status={sub.status} />
        </div>
        <div style={{ fontSize: 11, color: C.textMute, fontFamily: FONT }}>
          Eingereicht: {fmtDateTime(sub.submittedAt)}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Title */}
        <div style={{ ...sectionStyle }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.35, fontFamily: FONT, marginBottom: 10 }}>
            {sub.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <CatBadge cat={sub.category} />
            <span style={{
              fontSize: 11, color: C.textMid, background: T.gray100,
              padding: "2px 8px", borderRadius: 5, fontFamily: FONT,
            }}>
              {LENGTH_LABELS[sub.articleLength] || sub.articleLength}
            </span>
            {sub.imageCount > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textSoft, fontFamily: FONT }}>
                <ImageIcon size={13} strokeWidth={IW} />
                {sub.imageCount} Bild{sub.imageCount !== 1 ? "er" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Rights indicator */}
        <div style={{
          ...sectionStyle,
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", borderRadius: T.rMd,
          background: sub.rightsConfirmed ? T.successBg : T.warningBg,
          border: `1px solid ${sub.rightsConfirmed ? T.success500 + "40" : T.warning500 + "40"}`,
        }}>
          {sub.rightsConfirmed
            ? <Check size={15} strokeWidth={IW + 0.3} color={T.success500} />
            : <AlertCircle size={15} strokeWidth={IW} color={T.warning500} />
          }
          <span style={{
            fontSize: 12, fontWeight: 600, fontFamily: FONT,
            color: sub.rightsConfirmed ? T.successText : T.warningText,
          }}>
            {sub.rightsConfirmed ? "Bildrechte bestätigt" : "Bildrechte NICHT bestätigt – bitte nachfragen"}
          </span>
        </div>

        {/* Article text */}
        <div style={{ ...sectionStyle }}>
          <span style={labelStyle}>Artikeltext</span>
          <div style={{
            background: T.gray50, border: `1px solid ${C.border}`, borderRadius: T.rMd,
            padding: "14px 16px", fontSize: 13, color: C.textMid, lineHeight: 1.65,
            fontFamily: FONT, whiteSpace: "pre-wrap",
          }}>
            {sub.text}
          </div>
        </div>

        {/* Linked story */}
        {sub.storyId && (
          <div style={{ ...sectionStyle }}>
            <span style={labelStyle}>Verknüpfte Story</span>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px", borderRadius: T.rMd,
              background: C.accentLight, border: `1px solid ${T.brand200}`,
              fontSize: 12, color: C.accent, fontFamily: FONT, fontWeight: 600,
            }}>
              <ExternalLink size={13} strokeWidth={IW} />
              {sub.storyId}
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ ...sectionStyle }}>
          <span style={labelStyle}>Redaktionsnotiz</span>
          <textarea
            value={notesVal}
            onChange={e => setNotesVal(e.target.value)}
            onBlur={saveNotes}
            placeholder="Interne Notiz hinzufügen..."
            style={{
              width: "100%", padding: "10px 12px", fontFamily: FONT, fontSize: 13,
              color: C.text, background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: T.rMd, outline: "none", resize: "vertical",
              minHeight: 72, boxSizing: "border-box", lineHeight: 1.5,
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ ...sectionStyle }}>
          <span style={labelStyle}>Aktionen</span>

          {sub.status === "pending" && !approvingMode && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleApprove}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: T.rMd, border: "none",
                  background: T.success500, color: "#fff", fontSize: 13,
                  fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                }}
              >
                <Check size={14} strokeWidth={IW + 0.3} />
                Genehmigen
              </button>
              <button
                onClick={handleReject}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: T.rMd,
                  border: `1px solid ${T.error600}`,
                  background: T.errorBg, color: T.error600, fontSize: 13,
                  fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                }}
              >
                <XCircle size={14} strokeWidth={IW} />
                Ablehnen
              </button>
            </div>
          )}

          {sub.status === "pending" && approvingMode && (
            <div style={{
              background: T.brand50, border: `1px solid ${T.brand200}`,
              borderRadius: T.rMd, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT, marginBottom: 10 }}>
                Automatisch als Story importieren?
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleApproveWithStory}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: T.rMd, border: "none",
                    background: C.accent, color: "#fff", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  <Check size={13} strokeWidth={IW + 0.3} />
                  Ja, als Story importieren
                </button>
                <button
                  onClick={handleApproveOnly}
                  style={{
                    padding: "8px 16px", borderRadius: T.rMd,
                    border: `1px solid ${C.border}`,
                    background: C.surface, color: C.textMid, fontSize: 12,
                    fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  Nein, nur genehmigen
                </button>
                <button
                  onClick={() => setApprovingMode(false)}
                  style={{
                    padding: "8px 12px", borderRadius: T.rMd,
                    border: "none", background: "none", color: C.textSoft,
                    fontSize: 12, cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {sub.status === "approved" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleConvert}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: T.rMd, border: "none",
                  background: C.accent, color: "#fff", fontSize: 13,
                  fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                }}
              >
                <FileText size={14} strokeWidth={IW} />
                In Story umwandeln
              </button>
            </div>
          )}

          {sub.status === "rejected" && (
            <button
              onClick={handleReopen}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: T.rMd,
                border: `1px solid ${C.border}`,
                background: C.surface, color: C.textMid, fontSize: 13,
                fontWeight: 600, cursor: "pointer", fontFamily: FONT,
              }}
            >
              <ChevronRight size={14} strokeWidth={IW} />
              Erneut prüfen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: C.textMute, gap: 12, padding: 40,
    }}>
      <Inbox size={40} strokeWidth={IW - 0.2} color={T.gray300} />
      <div style={{ fontSize: 14, color: C.textSoft, fontFamily: FONT, textAlign: "center" }}>
        Einreichung auswählen, um Details anzuzeigen
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function UGCPortalPage() {
  const { setEdStory, goNav } = useApp();
  const [submissions, setSubmissions] = useState(DEMO_SUBMISSIONS);
  const [selected, setSelected] = useState(DEMO_SUBMISSIONS[0]);
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [showPortalPreview, setShowPortalPreview] = useState(false);

  const filtered = submissions.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all:      submissions.length,
    pending:  submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  const approvedThisMonth = submissions.filter(s => {
    if (s.status !== "approved") return false;
    const d = new Date(s.submittedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const updateSub = (id, changes) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    setSelected(prev => prev?.id === id ? { ...prev, ...changes } : prev);
  };

  const handleConvertToStory = (sub) => {
    setEdStory({
      id: null,
      title: sub.title,
      subtitle: `Eingereicht von ${sub.name}`,
      coverMediaId: null,
      category: sub.category,
      blocks: [
        {
          id: "ugc-block-1",
          type: "paragraph",
          content: [{ type: "text", text: sub.text, styles: {} }],
        },
      ],
      materials: [],
      derivatives: [],
      targetChannels: [],
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: sub.category.toLowerCase(),
      lockedBy: null,
      comments: [],
      history: [],
    });
    goNav("stories");
  };

  // Filter tab config
  const filterTabs = [
    { id: "all",      label: "Alle",       count: counts.all },
    { id: "pending",  label: "Ausstehend", count: counts.pending },
    { id: "approved", label: "Genehmigt",  count: counts.approved },
    { id: "rejected", label: "Abgelehnt",  count: counts.rejected },
  ];

  const tabColor = { pending: T.warning500, approved: T.success500, rejected: T.error600, all: C.accent };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg, fontFamily: FONT }}>

      {/* ── Stats row ── */}
      <div style={{ padding: "18px 24px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <StatCard icon={Inbox}       label="Einreichungen gesamt" value={counts.all}         color={C.accent}    />
          <StatCard icon={Clock}       label="Ausstehend"           value={counts.pending}     color={T.warning500} />
          <StatCard icon={CheckCircle} label="Genehmigt (Monat)"   value={approvedThisMonth}  color={T.success500} />
          <StatCard icon={Timer}       label="Ø Reaktionszeit"      value="1.2 Tage"           color={C.info}       />
        </div>
      </div>

      {/* ── Main two-panel layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "0 24px 24px", gap: 16 }}>

        {/* ── Left panel: list ── */}
        <div style={{
          width: 360, flexShrink: 0, display: "flex", flexDirection: "column",
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: T.rLg, overflow: "hidden", boxShadow: T.shadowXs,
        }}>
          {/* Panel header */}
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Inbox size={16} strokeWidth={IW} color={C.accent} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>UGC Einreichungen</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: C.accent,
                  background: C.accentLight, padding: "1px 7px", borderRadius: 99,
                  fontFamily: FONT,
                }}>
                  {counts.all}
                </span>
              </div>
              <button
                onClick={() => setShowPortalPreview(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: T.rSm,
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.textMid, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
                }}
              >
                <Eye size={12} strokeWidth={IW} />
                Formular ansehen
              </button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {filterTabs.map(tab => {
                const active = filter === tab.id;
                const col = tabColor[tab.id] || C.accent;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    style={{
                      flex: 1, padding: "5px 4px", borderRadius: T.rSm, border: "none",
                      background: active ? col + "15" : "transparent",
                      color: active ? col : C.textSoft,
                      fontSize: 11, fontWeight: active ? 700 : 500,
                      cursor: "pointer", fontFamily: FONT,
                      borderBottom: active ? `2px solid ${col}` : "2px solid transparent",
                      transition: "all 0.12s",
                    }}
                  >
                    {tab.label}
                    {tab.count > 0 && tab.id !== "all" && (
                      <span style={{
                        marginLeft: 4, fontSize: 10, fontWeight: 700,
                        color: active ? col : C.textMute,
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={13} strokeWidth={IW} color={C.textMute} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Suchen..."
                style={{
                  width: "100%", padding: "7px 10px 7px 30px",
                  fontFamily: FONT, fontSize: 12, color: C.text,
                  background: T.gray50, border: `1px solid ${C.border}`,
                  borderRadius: T.rMd, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Submission list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMute, fontSize: 13, fontFamily: FONT }}>
                Keine Einreichungen gefunden
              </div>
            ) : (
              filtered.map(sub => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  selected={selected}
                  onClick={() => setSelected(sub)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: detail ── */}
        <div style={{
          flex: 1, background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: T.rLg, overflow: "hidden", boxShadow: T.shadowXs,
          display: "flex", flexDirection: "column",
        }}>
          {selected
            ? (
              <DetailPanel
                key={selected.id}
                sub={selected}
                onUpdate={updateSub}
                onConvertToStory={handleConvertToStory}
              />
            )
            : <EmptyDetail />
          }
        </div>
      </div>

      {/* ── Portal preview modal ── */}
      {showPortalPreview && (
        <PortalPreviewModal onClose={() => setShowPortalPreview(false)} />
      )}
    </div>
  );
}
