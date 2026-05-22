import { useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Wand2, Check, Image as ImageIcon } from "lucide-react";
import {
  useBlockNoteEditor,
  FormattingToolbar,
  BlockTypeSelect,
  BasicTextStyleButton,
  CreateLinkButton,
  blockTypeSelectItems,
} from "@blocknote/react";
import { C, FONT, IW } from "../../constants/colors.js";
import { aiCall } from "../../utils/store.js";

const USEFUL_BLOCK_TYPES = ["paragraph","heading","bulletListItem","numberedListItem","checkListItem","quote"];

const AI_ACTIONS = [
  { id: "improve",   label: "✦ Verbessern" },
  { id: "shorten",   label: "↓ Kürzen"     },
  { id: "expand",    label: "↑ Erweitern"  },
  { id: "spell",     label: "✓ Korrektur"  },
  { id: "formal",    label: "≡ Formell"    },
  { id: "translate", label: "⇄ Englisch"   },
];

const PROMPTS: Record<string, (t: string) => string> = {
  improve:   t => `Verbessere diesen Text stilistisch (Klarheit, Fluss, Prägnanz). Gib NUR den verbesserten Text zurück:\n\n${t}`,
  shorten:   t => `Kürze diesen Text auf das Wesentliche. Gib NUR den gekürzten Text zurück:\n\n${t}`,
  expand:    t => `Erweitere diesen Text mit mehr Details und Beispielen. Gib NUR den erweiterten Text zurück:\n\n${t}`,
  spell:     t => `Korrigiere alle Rechtschreib- und Grammatikfehler. Gib NUR den korrigierten Text zurück:\n\n${t}`,
  formal:    t => `Schreibe diesen Text formeller und professioneller um. Gib NUR den Text zurück:\n\n${t}`,
  translate: t => `Übersetze diesen deutschen Text ins Englische. Gib NUR die englische Übersetzung zurück:\n\n${t}`,
};

export default function UnifiedFormattingToolbar() {
  const [mode, setMode] = useState("format"); // "format" | "ai" | "loading" | "result"
  const [aiResult, setAiResult] = useState("");
  const [resultPos, setResultPos] = useState<{ x: number; y: number } | null>(null);
  const selRef = useRef<Range | null>(null);
  const editor = useBlockNoteEditor();

  const handleAI = async (id: string) => {
    const text = window.getSelection()?.toString().trim();
    if (!text || text.length < 5) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      selRef.current = range.cloneRange();
      const rect = range.getBoundingClientRect();
      setResultPos({
        x: Math.max(200, Math.min(window.innerWidth - 420, rect.left + rect.width / 2 - 200)),
        y: rect.bottom + 12,
      });
    }
    setMode("loading");
    try {
      const r = await aiCall([{ role: "user", content: PROMPTS[id](text) }], 900);
      setAiResult(r.trim());
      setMode("result");
    } catch {
      setAiResult("⚠ KI nicht verfügbar (nur auf der Live-Site)");
      setMode("result");
    }
  };

  const apply = () => {
    if (!aiResult || !selRef.current) return;
    try {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(selRef.current);
        document.execCommand("insertText", false, aiResult);
      }
    } catch {}
    setMode("format"); setAiResult(""); setResultPos(null);
  };

  const dismiss = () => { setMode("format"); setAiResult(""); setResultPos(null); };

  const filteredBlockItems = useMemo(() => {
    if (!editor?.dictionary) return undefined;
    return blockTypeSelectItems(editor.dictionary).filter((item: any) => {
      if (!USEFUL_BLOCK_TYPES.includes(item.type)) return false;
      if (item.type === "heading") {
        return item.props?.level <= 3 && !item.props?.isToggleable;
      }
      return true;
    });
  }, [editor?.dictionary]);

  const insertImage = () => {
    try {
      const cursorBlock = editor.getTextCursorPosition().block;
      editor.insertBlocks(
        [{ type: "image", props: { url: "", caption: "", showPreview: true, previewWidth: 512 } }],
        cursorBlock,
        "after"
      );
      editor.focus();
    } catch {}
  };

  const btnBase: React.CSSProperties = {
    padding: "3px 9px", borderRadius: 5, border: "none",
    fontSize: 11.5, fontWeight: 600, cursor: "pointer",
    fontFamily: FONT, transition: "background .1s",
    display: "flex", alignItems: "center", gap: 3,
  };

  return (
    <>
      <FormattingToolbar>
        {(mode === "format") && <>
          <BlockTypeSelect key="blockTypeSelect" items={filteredBlockItems} />
          <BasicTextStyleButton basicTextStyle="bold"      key="bold" />
          <BasicTextStyleButton basicTextStyle="italic"    key="italic" />
          <BasicTextStyleButton basicTextStyle="underline" key="underline" />
          <BasicTextStyleButton basicTextStyle="strike"    key="strike" />
          <CreateLinkButton  key="link" />
          <div key="sep-img" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          <button key="insert-image"
            onMouseDown={e => e.preventDefault()}
            onClick={insertImage}
            style={{ ...btnBase, background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.9)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.12)"}
            title="Bild einfügen">
            <ImageIcon size={12} strokeWidth={IW} /> Bild
          </button>
          <div key="sep" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          <button key="ai-open"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setMode("ai")}
            style={{ ...btnBase, background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.9)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.12)"}>
            <Wand2 size={11} strokeWidth={IW} /> KI
          </button>
        </>}

        {mode === "ai" && <>
          <button key="back"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setMode("format")}
            style={{ ...btnBase, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.16)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}>
            ← Zurück
          </button>
          <div key="sep2" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          {AI_ACTIONS.map(({ id, label }) => (
            <button key={id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleAI(id)}
              style={{ ...btnBase, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.88)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}>
              {label}
            </button>
          ))}
        </>}

        {mode === "loading" && (
          <div key="loading" style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 10px", color: "rgba(255,255,255,.8)", fontSize: 12, fontFamily: FONT }}>
            <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
            KI schreibt…
          </div>
        )}

        {mode === "result" && <>
          <div key="ri" style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", color: "rgba(255,255,255,.7)", fontSize: 11.5, fontFamily: FONT }}>
            <Check size={12} strokeWidth={2.5} color="#a5f3c0" /> KI-Ergebnis bereit ↓
          </div>
          <div key="sep3" style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)", margin: "4px 2px" }} />
          <button key="apply-tb"
            onMouseDown={e => e.preventDefault()}
            onClick={apply}
            style={{ ...btnBase, background: "rgba(99,102,241,.7)", color: "#fff" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.9)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,.7)"}>
            <Check size={11} strokeWidth={2.5} /> Übernehmen
          </button>
          <button key="retry-tb"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setMode("ai")}
            style={{ ...btnBase, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.75)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}>
            ↺
          </button>
          <button key="discard-tb"
            onMouseDown={e => e.preventDefault()}
            onClick={dismiss}
            style={{ ...btnBase, background: "transparent", color: "rgba(255,255,255,.4)", padding: "3px 6px" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ✕
          </button>
        </>}
      </FormattingToolbar>

      {mode === "result" && resultPos && createPortal(
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: "fixed",
            left: resultPos.x,
            top: resultPos.y,
            zIndex: 9500,
            width: 400,
            background: "#1a1a2e",
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,.4)",
            fontFamily: FONT,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: -6, left: 40, width: 12, height: 6, overflow: "hidden" }}>
            <div style={{ width: 12, height: 12, background: "#1a1a2e", transform: "rotate(45deg)", transformOrigin: "bottom right", marginTop: 3 }} />
          </div>
          <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 6 }}>
            <Wand2 size={12} strokeWidth={IW} color="#a5b4fc" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc" }}>KI-Vorschlag</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginLeft: "auto" }}>Markierten Text ersetzen</span>
          </div>
          <div style={{
            padding: "12px 14px",
            maxHeight: 260,
            overflowY: "auto",
            fontSize: 13.5,
            lineHeight: 1.7,
            color: "rgba(255,255,255,.88)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {aiResult}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.1)", display: "flex", gap: 6 }}>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={apply}
              style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: "#6366F1", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              onMouseEnter={e => e.currentTarget.style.background = "#4F46E5"}
              onMouseLeave={e => e.currentTarget.style.background = "#6366F1"}>
              <Check size={13} strokeWidth={2.5} /> Übernehmen
            </button>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => setMode("ai")}
              style={{ padding: "8px 14px", borderRadius: 7, border: "none", background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.75)", fontSize: 12, cursor: "pointer", fontFamily: FONT }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}>
              ↺ Neu
            </button>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={dismiss}
              style={{ padding: "8px 12px", borderRadius: 7, border: "none", background: "transparent", color: "rgba(255,255,255,.35)", fontSize: 14, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
