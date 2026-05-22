import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader, Check, RotateCcw } from "lucide-react";
import { C, T, FONT, IW } from "../../constants/colors.js";
import { uid, aiCall, parseJSON } from "../../utils/store.js";
import { STORY_PERSONA, analyzeUploadedImage } from "../../utils/spark.js";
import { stockSearch, skGet } from "../../components/StockSearch.jsx";
import AccSection from "../../components/ui/AccSection.tsx";

// ── Quick-action chips ────────────────────────────────────────────────────────
const SPARK_ACTIONS = [
  { id:"shorten",    label:"Kürzen",        prompt:"Kürze diesen Text auf das Wesentliche, ohne wichtige Informationen zu verlieren." },
  { id:"expand",     label:"Verlängern",    prompt:"Erweitere diesen Text mit mehr Details, Beispielen und konkreten Zahlen." },
  { id:"rephrase",   label:"Umformulieren", prompt:"Formuliere diesen Text komplett um, behalte Inhalt und Aussage bei." },
  { id:"simplify",   label:"Vereinfachen",  prompt:"Vereinfache den Schreibstil für ein breiteres Publikum: kürzere Sätze, weniger Fachbegriffe." },
  { id:"formal",     label:"Formeller",     prompt:"Schreibe formeller und professioneller, behalt den Inhalt vollständig bei." },
  { id:"spellcheck", label:"Korrektur",     prompt:"Korrigiere alle Rechtschreib- und Grammatikfehler. Verändere keine Inhalte." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function blocksToText(blocks: any[]): string {
  if (!blocks?.length) return "";
  const extract = (content: any) => {
    if (!content) return "";
    if (Array.isArray(content)) return content.map((item: any) => item.type === "text" ? (item.text || "") : "").join("");
    return "";
  };
  const lines: string[] = [];
  for (const block of blocks) {
    const t = extract(block.content);
    if (t.trim()) lines.push(t.trim());
    if (block.children?.length) lines.push(blocksToText(block.children));
  }
  return lines.filter(Boolean).join("\n\n");
}

function textToBlocks(text: string): any[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n\n+/)
    .filter(p => p.trim())
    .flatMap(para =>
      para.split('\n').filter(l => l.trim()).map(line => {
        const l = line.trim();
        if (/^## /.test(l))   return { type:'heading',        props:{level:2,textAlignment:"left"}, content:[{type:"text",text:l.slice(3).trim(),styles:{}}], children:[] };
        if (/^### /.test(l))  return { type:'heading',        props:{level:3,textAlignment:"left"}, content:[{type:"text",text:l.slice(4).trim(),styles:{}}], children:[] };
        if (/^[*-] /.test(l)) return { type:'bulletListItem', props:{textAlignment:"left"},          content:[{type:"text",text:l.slice(2).trim(),styles:{}}], children:[] };
        return { type:'paragraph', props:{textAlignment:"left"}, content:[{type:"text",text:l,styles:{}}], children:[] };
      })
    );
}

function serializeDocumentForAI(blocks: any[]): string {
  if (!blocks?.length) return "(leer)";
  return blocks.map((b: any, i: number) => {
    const inl = (c: any) => Array.isArray(c) ? c.map((x: any) => x.type==="text"?x.text||"":"").join("") : "";
    const t = inl(b.content);
    if (b.type === "heading")          return `[${i}] H${b.props?.level||2}: "${t.slice(0,100)}"`;
    if (b.type === "image")            return `[${i}] BILD: alt="${(b.props?.caption||"").slice(0,80)}" url="${(b.props?.url||"").slice(0,60)}"`;
    if (b.type === "bulletListItem")   return `[${i}] LISTE: "${t.slice(0,80)}"`;
    if (b.type === "numberedListItem") return `[${i}] NUMM: "${t.slice(0,80)}"`;
    if (b.type === "blockquote" || b.type === "quote") return `[${i}] ZITAT: "${t.slice(0,100)}"`;
    return `[${i}] ABS: "${t.slice(0,130)}${t.length>130?"…":""}"`;
  }).join("\n");
}

function makeBlockFromAction(op: any, imageMap: Record<string, any> = {}): any | null {
  const mkC = (txt: string) => [{ type:"text", text: txt || "", styles:{} }];
  if (op.type === "heading")          return { type:"heading",          props:{level:op.level||2, textAlignment:"left"}, content:mkC(op.text), children:[] };
  if (op.type === "paragraph")        return { type:"paragraph",        props:{textAlignment:"left"},                    content:mkC(op.text), children:[] };
  if (op.type === "bulletListItem")   return { type:"bulletListItem",   props:{textAlignment:"left"},                    content:mkC(op.text), children:[] };
  if (op.type === "numberedListItem") return { type:"numberedListItem", props:{textAlignment:"left"},                    content:mkC(op.text), children:[] };
  if (op.type === "image") {
    const img = imageMap[op._imgKey];
    if (!img) return null;
    return { type:"image", props:{ url:img.url, caption:op.alt||op.query||"", previewWidth:512, backgroundColor:"default", textAlignment:"left" }, content:[], children:[] };
  }
  return null;
}

function applyActionsToBlocks(originalBlocks: any[], actions: any[], imageMap: Record<string, any>): any[] {
  const out: any[] = [];
  for (let i = 0; i < originalBlocks.length; i++) {
    for (const op of actions) if (op.op==="insert_before" && op.index===i) { const b=makeBlockFromAction(op,imageMap); if(b) out.push(b); }
    const del = actions.find((o: any) => o.op==="delete"  && o.index===i);
    const rep = actions.find((o: any) => o.op==="replace" && o.index===i);
    if      (del) { /* drop */ }
    else if (rep) { const b=makeBlockFromAction(rep,imageMap); if(b) out.push(b); }
    else          { out.push(originalBlocks[i]); }
    for (const op of actions) if (op.op==="insert_after" && op.index===i) { const b=makeBlockFromAction(op,imageMap); if(b) out.push(b); }
  }
  for (const op of actions) if (op.op==="append") { const b=makeBlockFromAction(op,imageMap); if(b) out.push(b); }
  return out.filter(Boolean);
}

function sparkActionDisplay(a: any): { icon: string; label: string; color: string } {
  const opIcon:  Record<string, string> = { replace:"✏", insert_after:"＋", insert_before:"＋", delete:"✕", append:"＋" };
  const opColor: Record<string, string> = { replace:"#7C3AED", insert_after:"#059669", insert_before:"#059669", delete:"#DC2626", append:"#059669" };
  const typeLabel: Record<string, string> = { heading:"Überschrift", paragraph:"Absatz", bulletListItem:"Aufzählung", numberedListItem:"Liste", image:"Bild" };
  let label = "";
  if (a.type === "image") label = `Bild: "${a.query?.slice(0,40)||""}"`;
  else if (a.op === "delete") label = `Block [${a.index}] entfernen`;
  else {
    const tl = typeLabel[a.type] || a.type;
    const txt = (a.text||"").slice(0,42) + ((a.text||"").length>42?"…":"");
    label = a.type==="heading" ? `H${a.level||2}: "${txt}"` : `${tl}: "${txt}"`;
  }
  return { icon: a.type==="image" ? "🖼" : (opIcon[a.op]||"•"), label, color: opColor[a.op]||"#6B7280" };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SparkPanelProps {
  editor: any;
  formRef: React.MutableRefObject<any>;
  wordCount: number;
  currentWorkspaceId: string | null;
  uploadItem: (item: any) => void;
  updateItem: (item: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SparkPanel({ editor, formRef, wordCount, currentWorkspaceId, uploadItem, updateItem, isOpen, onToggle }: SparkPanelProps) {
  const [messages,   setMessages]   = useState<any[]>([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [selInfo,    setSelInfo]    = useState<{ text: string; wordCount: number } | null>(null);
  const [undo,       setUndo]       = useState<{ blocks: any[]; msgId: string } | null>(null);

  const selRef    = useRef<Range | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef  = useRef("");

  // Track text selection
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 3) {
        setSelInfo({ text, wordCount: text.split(/\s+/).filter(Boolean).length });
        selRef.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      } else if (!text) {
        setSelInfo(null);
        selRef.current = null;
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const send = async (prompt?: string) => {
    const p = (prompt || inputRef.current).trim();
    if (!p || loading) return;
    setInput(""); inputRef.current = "";

    const isSel   = !!(selInfo && selRef.current);
    const ctxText  = isSel ? selInfo!.text : blocksToText(editor.document || []);
    const ctxWords = isSel ? selInfo!.wordCount : wordCount;
    const selRange = isSel ? selRef.current : null;

    setMessages(prev => [...prev, { id:uid(), role:"user", text:p, isSel, ctxWords }]);
    setLoading(true);

    try {
      if (isSel) {
        const sys = `${STORY_PERSONA}\n\nEMOJI-VERBOT (absolut): Niemals Emojis oder Unicode-Piktogramme im Text — weder in Überschriften noch in Listenpunkten noch im Fließtext.\n\nBearbeite NUR den folgenden markierten Text (${ctxWords} Wörter). Antworte NUR mit dem bearbeiteten Text – keine Erklärungen, keine Präfixe, keine Anführungszeichen.`;
        const result = await aiCall([{ role:"user", content:`${sys}\n\nText:\n${ctxText}\n\nAufgabe: ${p}` }], 2000);
        const trimmed = result.trim();
        if (!trimmed) throw new Error("empty");
        setMessages(prev => [...prev, { id:uid(), role:"spark", type:"suggestion", text:trimmed, isSel:true, selRange, applied:false }]);
      } else {
        const blocks     = editor.document || [];
        const serialized = serializeDocumentForAI(blocks);
        const sys = `${STORY_PERSONA}\n\nEMOJI-VERBOT (absolut): Niemals Emojis oder Unicode-Piktogramme — weder in Überschriften, Listenpunkten noch im Fließtext.\n\nDu bist Spark, der autonome KI-Editor von SocialFlow Pro. Du kennst jeden Block des Artikels und kannst gezielte Änderungen planen: Überschriften schreiben, Absätze umformulieren, Bilder suchen & einsetzen, Strukturen verbessern, Listenelemente hinzufügen und mehr.

ARTIKEL:
Titel: "${formRef.current.title || "(kein Titel)"}"
Kategorie: ${formRef.current.category || "–"} | Wörter: ${wordCount}

INHALT (${blocks.length} Blöcke, nummeriert):
${serialized}

AUFGABE: ${p}

Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt – kein Markdown-Code-Block, kein Text davor oder danach:
{
  "plan": "Was du tust (1–2 Sätze auf Deutsch)",
  "actions": [
    { "op": "replace",       "index": N, "type": "heading",          "level": 2,   "text": "..." },
    { "op": "replace",       "index": N, "type": "paragraph",                       "text": "..." },
    { "op": "insert_after",  "index": N, "type": "bulletListItem",                  "text": "..." },
    { "op": "insert_before", "index": N, "type": "numberedListItem",                "text": "..." },
    { "op": "insert_after",  "index": N, "type": "image",  "query": "english stock photo search term", "alt": "Bildbeschreibung" },
    { "op": "delete",        "index": N },
    { "op": "append",                    "type": "paragraph",                       "text": "..." }
  ]
}

REGELN:
- "index" = Position in der originalen Blockliste (nicht durch andere Aktionen verschoben)
- Bilder: "query" als präziser englischer Suchbegriff für Unsplash/Pexels
- Maximal 15 Aktionen – fokussiert und präzise
- Verändere nur was die Aufgabe verlangt
- Exakt valides JSON, ohne Code-Block-Backticks`;

        const result  = await aiCall([{ role:"user", content:sys }], 3500);
        const parsed  = parseJSON(result.trim());
        if (!parsed?.plan || !Array.isArray(parsed?.actions)) throw new Error("invalid json");
        const actions = parsed.actions.map((a: any) => a.type==="image" ? { ...a, _imgKey:uid() } : a);
        setMessages(prev => [...prev, { id:uid(), role:"spark", type:"plan", plan:parsed.plan, actions, status:"pending" }]);
      }
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 60);
    } catch {
      setMessages(prev => [...prev, { id:uid(), role:"spark", type:"error", text:"⚠️ KI nicht verfügbar oder hat kein gültiges JSON geliefert." }]);
    }
    setLoading(false);
  };

  const apply = (msg: any) => {
    if (!msg.text || msg.applied) return;
    const snapshot = JSON.parse(JSON.stringify(editor.document));
    setUndo({ blocks: snapshot, msgId: msg.id });
    if (msg.isSel && msg.selRange) {
      try {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(msg.selRange);
        document.execCommand("insertText", false, msg.text);
      } catch {}
    } else {
      const newBlocks = textToBlocks(msg.text);
      if (newBlocks.length) editor.replaceBlocks(editor.document, newBlocks);
    }
    setMessages(prev => prev.map((m: any) => m.id === msg.id ? { ...m, applied:true } : m));
    setSelInfo(null);
    selRef.current = null;
  };

  const executePlan = async (msg: any) => {
    setMessages(prev => prev.map((m: any) => m.id===msg.id ? { ...m, status:"applying" } : m));
    const snapshot = JSON.parse(JSON.stringify(editor.document));
    setUndo({ blocks: snapshot, msgId: msg.id });
    try {
      const imageActions = (msg.actions||[]).filter((a: any) => a.type==="image");
      const imageMap: Record<string, any> = {};
      await Promise.all(imageActions.map(async (a: any) => {
        for (const src of ["unsplash","pexels","pixabay"]) {
          if (!skGet(src)) continue;
          try {
            const res = await stockSearch(src, a.query, { orientation:"landscape", type:"photo" });
            if (!res?.[0]) continue;
            const found = res[0];
            imageMap[a._imgKey] = found;
            const newId = uid();
            const mediaItem = {
              ...found,
              id:          newId,
              category:    "Spark Auto",
              workspaceId: currentWorkspaceId || "ws-ppi-media",
              analyzing:   true,
            };
            uploadItem(mediaItem);
            analyzeUploadedImage(mediaItem, updateItem);
            break;
          } catch {}
        }
      }));
      const newBlocks = applyActionsToBlocks(snapshot, msg.actions||[], imageMap);
      if (newBlocks.length) editor.replaceBlocks(editor.document, newBlocks);
      const imgMiss = imageActions.filter((a: any) => !imageMap[a._imgKey]).length;
      setMessages(prev => prev.map((m: any) => m.id===msg.id ? {
        ...m, status:"applied",
        appliedSummary: imgMiss > 0 ? `${imgMiss} Bild${imgMiss>1?"er":""} nicht gefunden – API-Key unter Einstellungen hinterlegen.` : undefined,
      } : m));
    } catch {
      setMessages(prev => prev.map((m: any) => m.id===msg.id ? { ...m, status:"error" } : m));
    }
  };

  const undoApply = () => {
    if (!undo) return;
    try {
      editor.replaceBlocks(editor.document, undo.blocks);
      setMessages(prev => prev.map((m: any) => m.id === undo.msgId ? { ...m, applied:false } : m));
    } catch {}
    setUndo(null);
  };

  const visible = messages.filter((m: any) => !m.dismissed);

  return (
    <AccSection
      label="Spark"
      badge={visible.length > 0 ? visible.length : undefined}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>

        {/* Context indicator */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          <div style={{
            flex:1, display:"flex", alignItems:"center", gap:6,
            background: selInfo ? "#ECFDF5" : "#fff",
            border: `1px solid ${selInfo ? "#6EE7B7" : T.gray200}`,
            borderRadius:16, padding:"5px 10px",
          }}>
            <Sparkles size={13} color={selInfo ? "#10B981" : T.gray400} strokeWidth={2.5} style={{flexShrink:0}}/>
            <span style={{ fontSize:12, fontWeight:600, color: selInfo ? "#065F46" : T.gray500, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {selInfo ? `Auswahl · ${selInfo.wordCount} Wörter` : `Artikel · ${wordCount} Wörter`}
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setUndo(null); }}
              title="Chat leeren"
              style={{ background:"none", border:`1px solid ${T.gray200}`, borderRadius:6, color:T.gray400, cursor:"pointer", padding:"3px 7px", fontSize:11, fontFamily:FONT, flexShrink:0, lineHeight:1.4 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.gray300; e.currentTarget.style.color=T.gray600; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.gray200; e.currentTarget.style.color=T.gray400; }}
            >✕</button>
          )}
        </div>

        {/* Quick action chips */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, flexShrink:0 }}>
          {SPARK_ACTIONS.map(a => (
            <button
              key={a.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => send(a.prompt)}
              disabled={loading}
              style={{
                padding:"5px 11px", borderRadius:14, fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer",
                border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray600,
                opacity: loading ? .5 : 1, transition:"all .12s",
              }}
              onMouseEnter={e => { if(!loading){e.currentTarget.style.background=T.brand25;e.currentTarget.style.borderColor=T.brand200;e.currentTarget.style.color=T.brand600;} }}
              onMouseLeave={e => { e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=T.gray200;e.currentTarget.style.color=T.gray600; }}
            >{a.label}</button>
          ))}
        </div>

        {/* Chat history */}
        {(visible.length > 0 || loading) && (
          <div
            ref={scrollRef}
            style={{ maxHeight:240, overflowY:"auto", display:"flex", flexDirection:"column", gap:6, borderRadius:10, border:`1px solid ${T.gray100}`, padding:"8px", background:T.gray50 }}
          >
            {visible.map((msg: any) => {
              if (msg.role === "user") return (
                <div key={msg.id} style={{ display:"flex", justifyContent:"flex-end" }}>
                  <div style={{ background:"#fff", border:`1px solid ${T.gray200}`, borderRadius:"10px 10px 2px 10px", padding:"7px 11px", maxWidth:"90%", fontSize:13, color:T.gray700, fontFamily:FONT, lineHeight:1.5 }}>
                    {msg.isSel && <span style={{ fontSize:11, color:T.gray400, fontFamily:FONT, display:"block", marginBottom:2 }}>✂ Auswahl · {msg.ctxWords} Wörter</span>}
                    {msg.text}
                  </div>
                </div>
              );
              if (msg.type === "error") return (
                <div key={msg.id} style={{ fontSize:12, color:"#C4511E", background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, padding:"7px 10px", fontFamily:FONT, lineHeight:1.4 }}>
                  {msg.text}
                </div>
              );
              if (msg.type === "plan") return (
                <div key={msg.id} style={{ display:"flex", flexDirection:"column", gap:6, background:"#fff", border:`1px solid ${msg.status==="applied"?T.gray100:T.brand100}`, borderRadius:10, padding:"9px 10px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <Sparkles size={13} color={T.brand600} strokeWidth={2.5}/>
                    <span style={{ fontSize:11, fontWeight:700, color:T.brand600, fontFamily:FONT, letterSpacing:".04em", textTransform:"uppercase" }}>Spark · Plan</span>
                    {msg.status==="applied" && <><Check size={11} strokeWidth={3} color="#10B981" style={{marginLeft:"auto"}}/><span style={{fontSize:11,color:"#10B981",fontWeight:600,fontFamily:FONT}}>Erledigt</span></>}
                    {msg.status==="applying" && <><Loader size={11} color={T.brand600} strokeWidth={2} style={{marginLeft:"auto",animation:"spin .8s linear infinite"}}/><span style={{fontSize:11,color:T.brand600,fontWeight:600,fontFamily:FONT}}>Läuft…</span></>}
                    {msg.status==="error" && <span style={{fontSize:11,color:"#DC2626",fontWeight:600,fontFamily:FONT,marginLeft:"auto"}}>Fehler</span>}
                  </div>
                  <p style={{ margin:0, fontSize:13, color:T.gray700, fontFamily:FONT, lineHeight:1.55 }}>{msg.plan}</p>
                  {msg.status!=="applied" && msg.actions?.length>0 && (
                    <div style={{ borderTop:`1px solid ${T.gray100}`, paddingTop:6, display:"flex", flexDirection:"column", gap:3 }}>
                      {msg.actions.map((a: any, i: number) => {
                        const d = sparkActionDisplay(a);
                        return (
                          <div key={i} style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <span style={{ fontSize:11, color:d.color, fontWeight:800, fontFamily:"monospace", flexShrink:0, minWidth:16, textAlign:"center" }}>{d.icon}</span>
                            <span style={{ fontSize:11, color:T.gray500, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {msg.appliedSummary && <div style={{ fontSize:11, color:"#92400E", background:"#FFF7ED", borderRadius:6, padding:"4px 8px", fontFamily:FONT }}>{msg.appliedSummary}</div>}
                  {msg.status==="pending" && (
                    <div style={{ display:"flex", gap:5 }}>
                      <button onMouseDown={e=>e.preventDefault()} onClick={()=>executePlan(msg)}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:"none", background:C.accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                        <Check size={12} strokeWidth={3}/> Anwenden
                      </button>
                      <button onMouseDown={e=>e.preventDefault()} onClick={()=>setMessages(prev=>prev.map((m: any)=>m.id===msg.id?{...m,dismissed:true}:m))}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray500, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
                        Verwerfen
                      </button>
                    </div>
                  )}
                </div>
              );
              // Selection text-edit suggestion
              return (
                <div key={msg.id} style={{ display:"flex", flexDirection:"column", gap:6, background:"#fff", border:`1px solid ${msg.applied ? T.gray100 : T.brand100}`, borderRadius:10, padding:"9px 10px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <Sparkles size={13} color={T.brand600} strokeWidth={2.5}/>
                    <span style={{ fontSize:11, fontWeight:700, color:T.brand600, fontFamily:FONT, letterSpacing:".04em", textTransform:"uppercase" }}>Spark · Text</span>
                    {msg.applied && (
                      <span style={{ marginLeft:"auto", fontSize:11, color:"#10B981", fontWeight:600, fontFamily:FONT, display:"flex", alignItems:"center", gap:3 }}>
                        <Check size={11} strokeWidth={3}/> Übernommen
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:13, color: msg.applied ? T.gray400 : T.gray700, fontFamily:FONT, lineHeight:1.6, maxHeight:130, overflowY:"auto", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                    {msg.text}
                  </div>
                  {!msg.applied && (
                    <div style={{ display:"flex", gap:5 }}>
                      <button onMouseDown={e=>e.preventDefault()} onClick={()=>apply(msg)}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:"none", background:C.accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                        <Check size={12} strokeWidth={3}/> Übernehmen
                      </button>
                      <button onMouseDown={e=>e.preventDefault()} onClick={()=>setMessages(prev=>prev.map((m: any)=>m.id===msg.id?{...m,dismissed:true}:m))}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${T.gray200}`, background:"#fff", color:T.gray500, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
                        Verwerfen
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 2px" }}>
                <Sparkles size={13} color={T.brand600} strokeWidth={2.5}/>
                <div style={{ display:"flex", gap:4 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:T.brand600, animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input row */}
        <div style={{ display:"flex", gap:6, alignItems:"flex-end", flexShrink:0, borderTop:`1px solid ${T.gray100}`, paddingTop:8 }}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); inputRef.current = e.target.value; }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Frag Spark…"
            rows={2}
            style={{
              flex:1, resize:"none", padding:"8px 11px", borderRadius:9,
              border:`1.5px solid ${input ? C.accent + "55" : T.gray200}`,
              fontSize:13, fontFamily:FONT, color:C.text, outline:"none",
              background:"#fff", lineHeight:1.45, transition:"border-color .12s",
            }}
          />
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => send()}
            disabled={!inputRef.current.trim() || loading}
            style={{
              width:36, height:36, borderRadius:9, border:"none", flexShrink:0,
              background: input.trim() && !loading ? C.accent : T.gray200,
              color:"#fff", cursor: input.trim() && !loading ? "pointer" : "default",
              display:"flex", alignItems:"center", justifyContent:"center", transition:"background .12s",
            }}
          >
            {loading ? <Loader size={14} strokeWidth={2} style={{animation:"spin .8s linear infinite"}}/> : <Send size={14} strokeWidth={2.5}/>}
          </button>
        </div>

        {/* Undo */}
        {undo && (
          <button
            onClick={undoApply}
            style={{
              flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              padding:"7px 0", borderRadius:8, border:`1px solid ${T.gray200}`,
              background:T.gray50, color:T.gray500, fontSize:13, fontWeight:600,
              cursor:"pointer", fontFamily:FONT, transition:"all .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background=T.gray100; e.currentTarget.style.borderColor=T.gray300; }}
            onMouseLeave={e => { e.currentTarget.style.background=T.gray50; e.currentTarget.style.borderColor=T.gray200; }}
          >
            <RotateCcw size={13} strokeWidth={2.5}/> Rückgängig
          </button>
        )}

      </div>
    </AccSection>
  );
}
