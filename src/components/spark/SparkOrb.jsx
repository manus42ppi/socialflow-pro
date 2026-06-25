import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, ChevronDown, Sparkles } from "lucide-react";
import { C, T, FONT, IW, TYPO } from "../../constants/colors.js";
import { aiCall, parseJSON, uid, getAuthHeader } from "../../utils/store.js";
import { useApp } from "../../context/AppContext.jsx";

// ── Voice states ─────────────────────────────────────────────────────────────
const IDLE = "idle";
const LISTENING = "listening";
const THINKING = "thinking";
const SPEAKING = "speaking";

// ── Orb colour per state ──────────────────────────────────────────────────────
const ORB = {
  [IDLE]:      "#6366F1",   // indigo – resting
  [LISTENING]: "#10B981",   // emerald – listening
  [THINKING]:  "#3B82F6",   // blue – processing
  [SPEAKING]:  "#8B5CF6",   // violet – speaking
};

const STATE_LABEL = {
  [IDLE]:      "",
  [LISTENING]: "Hört zu …",
  [THINKING]:  "Denkt …",
  [SPEAKING]:  "Spricht …",
};

// ── System prompt (embedded in messages because aiCall has no system param) ───
const SYSTEM = `Du bist Spark, der KI-Sprachassistent von SocialFlow Pro – einer Social-Media-Management-Plattform. Du hilfst dem Nutzer per Sprache, schnell zu navigieren und Inhalte zu erstellen. Deine Antworten sind freundlich, kurz und auf Deutsch.

Antworte AUSSCHLIESSLICH als reines JSON-Objekt (keine Markdown-Fences, kein sonstiger Text):
{"speak":"Was du dem Nutzer sagst","actions":[]}

Verfügbare Aktionen (actions-Array kann leer sein oder mehrere Einträge enthalten):

1. Navigation:
{"type":"navigate","target":"ZIEL"}
Ziele: dashboard | publisher | stories | campaigns | media | calendar | planner | performance | monitoring | admin | trash | trends | voodoo | ugc | produkte

2. Story erstellen (öffnet Story-Editor):
{"type":"createStory","title":"Titel der Story","tags":"tag1, tag2","status":"draft"}

3. Post erstellen (öffnet Post-Editor):
{"type":"createPost","title":"Titel","content":"Inhalt","channels":["instagram","twitter","linkedin"]}

Regeln:
- Bestätige kurz was du tust (1–2 Sätze)
- Mehrere Aktionen gleichzeitig sind erlaubt
- Bei unklaren Anfragen: stelle eine kurze Rückfrage
- Wenn keine Aktion nötig: actions:[]`;

// ── Canned first assistant message (used when we have history) ────────────────
const CANNED_FIRST = '{"speak":"Hallo! Ich bin Spark und helfe dir gerne.","actions":[]}';

export default function SparkOrb() {
  const { goNav, setEdStory, setEdPost, currentWorkspaceId } = useApp();

  const [active, setActive]   = useState(false);         // mic on/off
  const [vs, setVs]           = useState(IDLE);          // voice state
  const [msgs, setMsgs]       = useState([]);            // conversation history (UI)
  const [interim, setInterim] = useState("");            // live transcript bubble
  const [open, setOpen]       = useState(false);         // conversation panel visible

  const recRef      = useRef(null);                      // SpeechRecognition instance
  const synthRef    = useRef(window.speechSynthesis);    // SpeechSynthesis (fallback)
  const audioRef    = useRef(null);                      // OpenAI TTS Audio element
  const histRef     = useRef([]);                        // [{role,content}] for API
  const busyRef     = useRef(false);                     // true while thinking/speaking
  const activeRef   = useRef(false);                     // mirror of active (no stale closure)
  const panelEndRef = useRef(null);                      // auto-scroll anchor
  const recRunning  = useRef(false);                     // true = SR is actively listening
  const ttsAvail    = useRef(null);                      // null=unknown, true/false after first call

  // Keep refs in sync with state
  useEffect(() => { activeRef.current = active; }, [active]);

  // Auto-scroll panel to bottom whenever messages change
  useEffect(() => {
    panelEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, interim]);

  // Pre-load voices on mount (Chrome loads them asynchronously)
  useEffect(() => {
    const syn = synthRef.current;
    syn.getVoices();
    if ("onvoiceschanged" in syn) syn.onvoiceschanged = () => syn.getVoices();
  }, []);

  // ── Shared: called when any TTS finishes (or errors) ─────────────────────
  const onSpeakEnd = useCallback(() => {
    busyRef.current = false;
    setVs(activeRef.current ? LISTENING : IDLE);
    if (activeRef.current && recRef.current) {
      setTimeout(() => {
        if (activeRef.current && recRef.current) {
          try { recRef.current.start(); } catch { /* already running */ }
        }
      }, 400);
    }
  }, []);

  // ── Pause SR so Spark can't hear itself ───────────────────────────────────
  const pauseRec = useCallback(() => {
    if (recRef.current && recRunning.current) {
      try { recRef.current.stop(); } catch {}
    }
  }, []);

  // ── Browser TTS fallback ──────────────────────────────────────────────────
  const speakBrowser = useCallback((text) => {
    const syn = synthRef.current;
    syn.cancel();
    pauseRec();
    const utt   = new SpeechSynthesisUtterance(text);
    utt.lang    = "de-DE";
    utt.rate    = 0.95;
    utt.pitch   = 1.0;
    // Prefer Google neural voice in Chrome
    const voices = syn.getVoices();
    const voice  = voices.find(v => v.lang === "de-DE" && v.name.toLowerCase().includes("google"))
                || voices.find(v => v.lang === "de-DE" && !v.localService)
                || voices.find(v => v.lang.startsWith("de") && !v.localService)
                || voices.find(v => v.lang.startsWith("de"))
                || null;
    if (voice) utt.voice = voice;
    utt.onstart = () => setVs(SPEAKING);
    utt.onend   = onSpeakEnd;
    utt.onerror = onSpeakEnd;
    syn.speak(utt);
  }, [pauseRec, onSpeakEnd]);

  // ── OpenAI TTS (primary) — falls back to browser on error / no key ────────
  const speak = useCallback(async (text) => {
    pauseRec();

    // If we already know /tts is unavailable, skip straight to browser
    if (ttsAvail.current === false) { speakBrowser(text); return; }

    try {
      setVs(SPEAKING);
      const auth = await getAuthHeader();
      const r = await fetch("/tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { "Authorization": auth } : {}) },
        body:    JSON.stringify({ text, voice: "nova", model: "tts-1" }),
      });

      if (!r.ok) {
        // 503 = no API key configured → use browser forever
        if (r.status === 503) ttsAvail.current = false;
        throw new Error(`TTS ${r.status}`);
      }

      ttsAvail.current = true;
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);

      // Clean up previous audio element
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio       = new Audio(url);
      audioRef.current  = audio;
      audio.onended     = () => { URL.revokeObjectURL(url); onSpeakEnd(); };
      audio.onerror     = () => { URL.revokeObjectURL(url); speakBrowser(text); };
      await audio.play();
    } catch {
      speakBrowser(text);
    }
  }, [pauseRec, speakBrowser, onSpeakEnd]);

  // ── Execute Spark Actions ─────────────────────────────────────────────────
  const executeActions = useCallback((actions) => {
    if (!actions?.length) return;
    for (const a of actions) {
      switch (a.type) {
        case "navigate":
          if (a.target) goNav(a.target);
          break;

        case "createStory":
          setEdStory({
            id:             uid(),
            title:          a.title   || "Neue Story",
            subtitle:       "",
            coverMediaId:   null,
            category:       "",
            blocks:         [],
            materials:      [],
            derivatives:    [],
            targetChannels: [],
            status:         a.status  || "draft",
            tags:           a.tags    || "",
            lockedBy:       null,
            comments:       [],
            history:        [],
            createdAt:      new Date().toISOString(),
            updatedAt:      new Date().toISOString(),
            workspaceId:    currentWorkspaceId || "ws-ppi-media",
          });
          goNav("stories");
          break;

        case "createPost":
          setEdPost({
            id:            null,
            title:         a.title    || "",
            content:       a.content  || "",
            channels:      a.channels || [],
            scheduledDate: "",
            scheduledTime: "",
            status:        "draft",
            mediaId:       null,
            campaignId:    null,
            workspaceId:   currentWorkspaceId || "ws-ppi-media",
          });
          break;

        default:
          break;
      }
    }
  }, [goNav, setEdStory, setEdPost, currentWorkspaceId]);

  // ── Process Transcript → Claude → Speak ──────────────────────────────────
  const processText = useCallback(async (text) => {
    if (!text.trim() || busyRef.current) return;
    busyRef.current = true;
    setVs(THINKING);
    setInterim("");
    setMsgs(prev => [...prev, { from: "user", text, ts: Date.now() }]);

    // Build Anthropic messages array
    const userMsg   = { role: "user",      content: text };
    const hist      = histRef.current;
    const apiMsgs   = hist.length === 0
      // First turn: embed system prompt in user message
      ? [{ role: "user", content: `${SYSTEM}\n\n---\nNutzereingabe: ${text}` }]
      // Subsequent turns: system → canned ack → history → new user msg
      : [
          { role: "user",      content: SYSTEM        },
          { role: "assistant", content: CANNED_FIRST  },
          ...hist,
          userMsg,
        ];

    try {
      const raw     = await aiCall(apiMsgs, 400);
      const parsed  = parseJSON(raw) || { speak: raw.slice(0, 300), actions: [] };
      const reply   = parsed.speak || "Verstanden.";

      setMsgs(prev => [...prev, { from: "spark", text: reply, ts: Date.now() }]);
      // Keep last 6 messages (= 3 exchanges) in history
      histRef.current = [
        ...hist.slice(-6),
        userMsg,
        { role: "assistant", content: raw },
      ];
      executeActions(parsed.actions || []);
      speak(reply);
    } catch (e) {
      console.error("[Spark]", e);
      const errTxt = "Entschuldigung, da ist etwas schiefgelaufen. Bitte versuch es nochmal.";
      setMsgs(prev => [...prev, { from: "spark", text: errTxt, ts: Date.now() }]);
      speak(errTxt);
    }
  }, [executeActions, speak]);

  // ── SpeechRecognition lifecycle ───────────────────────────────────────────
  useEffect(() => {
    // ── Tear down on deactivate ────────────────────────────────────────────
    if (!active) {
      if (recRef.current) {
        recRef.current.onend = null;   // prevent restart loop
        try { recRef.current.stop(); } catch {}
        recRef.current = null;
      }
      synthRef.current.cancel();
      busyRef.current = false;
      setVs(IDLE);
      setInterim("");
      return;
    }

    // ── Set up recognition ─────────────────────────────────────────────────
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Dein Browser unterstützt keine Spracherkennung. Bitte nutze Chrome oder Edge.");
      setActive(false);
      return;
    }

    const rec          = new SR();
    rec.lang           = "de-DE";
    rec.continuous     = true;
    rec.interimResults = true;
    recRef.current     = rec;

    let finalBuf = "";
    let silTimer = null;

    rec.onstart = () => {
      recRunning.current = true;
      if (!busyRef.current) setVs(LISTENING);
    };

    rec.onresult = (e) => {
      // Ignore input while processing (thinking / speaking)
      if (busyRef.current) {
        finalBuf = "";
        setInterim("");
        return;
      }
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalBuf += t + " ";
        else interimText += t;
      }
      setInterim(finalBuf + interimText);

      // Commit after 1.2 s of silence following the last final result
      clearTimeout(silTimer);
      if (finalBuf.trim()) {
        silTimer = setTimeout(() => {
          const toProcess = finalBuf.trim();
          finalBuf = "";
          setInterim("");
          processText(toProcess);
        }, 1200);
      }
    };

    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("[Spark SR]", e.error);
      }
    };

    rec.onend = () => {
      recRunning.current = false;
      clearTimeout(silTimer);
      // Auto-restart only if still active AND not busy (busy = speak() will restart after)
      if (activeRef.current && !busyRef.current) {
        try { rec.start(); } catch {}
      }
    };

    rec.start();
    setOpen(true);
    setVs(LISTENING);

    return () => {
      clearTimeout(silTimer);
      rec.onend = null;
      try { rec.stop(); } catch {}
    };
  }, [active, processText]);

  // ── Toggle handler ────────────────────────────────────────────────────────
  const toggle = () => {
    if (!hasSR) {
      // Show panel with hint instead of silently doing nothing
      setOpen(true);
      if (msgs.length === 0) {
        setMsgs([{ from: "spark", text: "Spracherkennung ist in deinem Browser nicht verfügbar. Bitte nutze Chrome oder Edge für den vollen Spark-Erfahrung.", ts: Date.now() }]);
      }
      return;
    }
    if (active) setActive(false);
    else        setActive(true);
  };

  // ── Browser SpeechRecognition support ────────────────────────────────────
  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── Derived colours ───────────────────────────────────────────────────────
  const orbColor = hasSR ? ORB[vs] : T.gray400;   // grey-out when SR unavailable
  const label    = hasSR ? STATE_LABEL[vs] : "Kein Mikrofon-Support";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
      fontFamily: FONT,
    }}>

      {/* ── Conversation panel ─────────────────────────────────────────────── */}
      {open && (
        <div style={{
          width: 310, maxHeight: 360, display: "flex", flexDirection: "column",
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, boxShadow: T.shadowLg, overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: orbColor,
                boxShadow: vs !== IDLE ? `0 0 6px ${orbColor}` : "none",
                transition: "background .3s, box-shadow .3s",
              }} />
              <span style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Spark</span>
              {label && (
                <span style={{ ...TYPO.caption, color: C.textMute }}>{label}</span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ border: "none", background: "none", cursor: "pointer", color: C.textMute, display: "flex", padding: 2 }}
            >
              <ChevronDown size={15} strokeWidth={IW} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 7,
          }}>
            {msgs.length === 0 && !interim && (
              <div style={{ ...TYPO.caption, color: C.textMute, textAlign: "center", padding: "24px 0" }}>
                Sag etwas — ich höre zu!
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "7px 11px", borderRadius: 12,
                  fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                  background: m.from === "user" ? orbColor : C.bg,
                  color:      m.from === "user" ? "#fff"    : C.text,
                  borderBottomRightRadius: m.from === "user"  ? 3  : 12,
                  borderBottomLeftRadius:  m.from === "spark" ? 3  : 12,
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Live interim transcript */}
            {interim && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  maxWidth: "82%", padding: "6px 10px",
                  borderRadius: 12, borderBottomRightRadius: 3,
                  background: `${orbColor}40`, color: C.text,
                  fontSize: 13, fontStyle: "italic",
                }}>
                  {interim}
                </div>
              </div>
            )}

            {/* Thinking dots */}
            {vs === THINKING && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 14px", borderRadius: 12, borderBottomLeftRadius: 3, background: C.bg }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 5, height: 5, borderRadius: "50%", background: C.textSoft,
                        animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={panelEndRef} />
          </div>
        </div>
      )}

      {/* ── Bottom row: badge + orb ────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Collapsed panel badge */}
        {!open && msgs.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "6px 12px", borderRadius: 20,
              border: `1px solid ${C.border}`, background: C.surface,
              color: C.text, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: FONT, boxShadow: T.shadowXs,
            }}
          >
            {msgs.length} Nachrichten
          </button>
        )}

        {/* ── The orb ──────────────────────────────────────────────────────── */}
        <button
          onClick={toggle}
          title={active ? "Spark ausschalten" : "Spark Sprachassistent starten"}
          style={{
            width: 56, height: 56, borderRadius: "50%",
            border: "none", cursor: "pointer",
            background: `radial-gradient(circle at 35% 35%, ${orbColor}ee, ${orbColor}88)`,
            boxShadow: active
              ? `0 0 0 3px ${orbColor}40, 0 0 20px ${orbColor}60, 0 4px 14px rgba(0,0,0,.2)`
              : `0 4px 14px ${orbColor}40, 0 2px 6px rgba(0,0,0,.15)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            transition: "background .3s, box-shadow .3s",
          }}
        >
          {/* Icon or spinner */}
          {vs === THINKING ? (
            <div style={{
              width: 20, height: 20,
              border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "#fff",
              borderRadius: "50%", animation: "spin .8s linear infinite",
            }} />
          ) : active ? (
            <MicOff size={22} color="#fff" strokeWidth={IW} />
          ) : (
            <Sparkles size={22} color="#fff" strokeWidth={IW} />
          )}

          {/* Pulse ring – listening */}
          {vs === LISTENING && (
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              border: `2px solid ${orbColor}60`,
              animation: "pulse 1.8s ease-in-out infinite",
              pointerEvents: "none",
            }} />
          )}

          {/* Outer glow ring – speaking */}
          {vs === SPEAKING && (
            <div style={{
              position: "absolute", inset: -9, borderRadius: "50%",
              border: `2px solid ${orbColor}40`,
              animation: "pulse 1s ease-in-out infinite",
              pointerEvents: "none",
            }} />
          )}
        </button>
      </div>
    </div>
  );
}
