// ── UTILS ──────────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2,10);
export const fileToDataURL = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
export const getMediaType = f => f.type.startsWith("video/")?"video": f.name.toLowerCase().includes("logo")?"logo": f.type.startsWith("image/")?"image":"document";
export const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}) : "";
export const fpos = m => m?.focusPoint ? `${m.focusPoint.x}% ${m.focusPoint.y}%` : "center";

// ── AI SERVICE (via Cloudflare Function Proxy) ────────────────────────────
export async function aiCall(messages, max_tokens=800, tools=null) {
  const body = {model:"claude-sonnet-4-6",max_tokens,messages};
  if (tools?.length) body.tools = tools;
  const r = await fetch("/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body),
  });
  const data = await r.json();
  if(!r.ok){
    if(import.meta.env.DEV && r.status===404)
      throw new Error("Wrangler nicht gestartet – starte `npx wrangler pages dev dist` für lokale AI-Tests.");
    throw new Error(data?.error?.message||`HTTP ${r.status}`);
  }
  return data.content?.[0]?.text||"";
}
export const parseJSON = raw => { try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{return null;} };

// Streaming variant — forwards Anthropic's SSE through the /ai Worker.
// Calls onChunk(newChunk, fullTextSoFar) after each token.
// Returns the complete text when the stream ends.
// Uses stream:true so the Worker bypasses the 30s buffer timeout.
// Internal: one attempt of streaming. Throws on network/stream/API errors.
async function _aiStreamOnce(messages, max_tokens, onChunk, tools) {
  const body = { model: "claude-sonnet-4-6", max_tokens, messages, stream: true };
  if (tools?.length) body.tools = tools;
  const r = await fetch("/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    if(import.meta.env.DEV && r.status===404)
      throw new Error("Wrangler nicht gestartet – starte `npx wrangler pages dev dist` für lokale AI-Tests.");
    throw new Error(data?.error?.message || `HTTP ${r.status}`);
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buf = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        const ev = JSON.parse(raw);
        // Detect Anthropic SSE error events (e.g. overloaded, rate-limit)
        if (ev.type === "error") {
          throw new Error(ev.error?.message || "Anthropic stream error");
        }
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          const chunk = ev.delta.text;
          full += chunk;
          onChunk?.(chunk, full);
        }
      } catch (parseErr) {
        // Re-throw real errors; ignore malformed SSE lines
        if (parseErr.message !== "Unexpected token") throw parseErr;
      }
    }
  }
  return full;
}

/**
 * Streaming AI call with automatic 1-retry on transient connection errors.
 * "Error in input stream" / "Failed to fetch" → retries once after 1.5 s.
 */
export async function aiCallStream(messages, max_tokens = 800, onChunk = null, tools = null) {
  try {
    return await _aiStreamOnce(messages, max_tokens, onChunk, tools);
  } catch (err) {
    // Transient stream / network errors → one silent retry
    const isTransient = /input stream|fetch|network|Failed to fetch|overloaded/i.test(err.message);
    if (isTransient) {
      await new Promise(r => setTimeout(r, 1500));
      // Reset accumulated text before retry so onChunk starts fresh
      return await _aiStreamOnce(messages, max_tokens, onChunk, tools);
    }
    throw err;
  }
}

// ── KV STORAGE HELPERS ──────────────────────────────────────────────────────
// Clerk-JWT holen (globale Clerk-Instanz, nach ClerkProvider verfügbar)
// Demo-User haben keine Clerk-Session → token = null → kein Persist
async function getClerkToken() {
  try { return await window.Clerk?.session?.getToken() ?? null; }
  catch { return null; }
}

export async function storeGet(path) {
  try {
    const token = await getClerkToken();
    if (!token) return null;
    const r = await fetch("/store", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ method: "get", path }),
    });
    const d = await r.json();
    return d.ok ? d.data : null;
  } catch { return null; }
}

export async function storeSet(path, value) {
  try {
    const token = await getClerkToken();
    if (!token) return; // Demo-User → silent no-op
    await fetch("/store", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ method: "set", path, value }),
    });
  } catch {}
}

export async function storeDelete(path) {
  try {
    const token = await getClerkToken();
    if (!token) return; // Demo-User → silent no-op
    await fetch("/store", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ method: "delete", path }),
    });
  } catch {}
}

// ── INSTAGRAM SYNC ─────────────────────────────────────────────────────────
// Ruft /instagram auf (Cloudflare Function) und gibt normalisierte Posts zurück
export async function igSync(accessToken, instagramUserId) {
  const token = await getClerkToken();
  if (!token) throw new Error("Kein Clerk-Account. Bitte mit echtem Account einloggen, nicht Demo-Modus.");
  const r = await fetch("/instagram", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ accessToken, instagramUserId }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d; // { posts: [...], count: N }
}

// ── INSTAGRAM MONITORING (Business Discovery API) ──────────────────────────
// Ruft /ig-monitor auf und gibt Profil + Posts eines öffentlichen Accounts zurück
export async function igMonitor(accessToken, igUserId, targetUsername) {
  const token = await getClerkToken();
  if (!token) throw new Error("Kein Clerk-Account. Bitte mit echtem Account einloggen.");
  const r = await fetch("/ig-monitor", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ accessToken, igUserId, targetUsername }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d; // { profile: {...}, posts: [...] }
}

// ── AI OBJECT ──────────────────────────────────────────────────────────────
export const AI = {
  optimize:(text,ch,tone)=>aiCall([{role:"user",content:`Du bist Social-Media-Experte. Optimiere fuer ${ch} im Ton "${tone}". NUR der optimierte Text:\n\n${text}`}]),
  hashtags:(text,ch)=>aiCall([{role:"user",content:`Generiere 8-12 performante Hashtags fuer ${ch}. Mische populaere, mittelgrosse und Nischen-Hashtags. NUR kommagetrennte Hashtags:\n\n${text}`}],300),
  variants:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`3 Post-Varianten fuer ${ch} nach AIDA, PAS und Hook+Value. NUR JSON:{"variants":[{"formula":"AIDA","tone":"Attention-Interest-Desire-Action","text":""},{"formula":"PAS","tone":"Problem-Agitation-Solution","text":""},{"formula":"Hook","tone":"Hook+Wert+CTA","text":""}]}\n\nOriginal:\n${text}`}],1500);
    return parseJSON(raw)?.variants||[];
  },
  score:async(text,ch,maxChars)=>{
    const raw=await aiCall([{role:"user",content:`Analysiere diesen Post fuer ${ch}. NUR JSON:{"total":0,"readability":{"score":0,"hint":""},"engagement":{"score":0,"hint":""},"cta":{"score":0,"hint":""},"platform":{"score":0,"hint":""},"topTip":""}\nJede Dimension max 25 Punkte. Kanal:${ch}, Limit:${maxChars}, Aktuell:${text.length} Zeichen\n\n${text}`}],500);
    return parseJSON(raw);
  },
  rewrite:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`Rewrite diesen Post optimal fuer ${ch}. Passe Laenge, Ton und Stil an die Plattformkultur an. NUR JSON:{"rewritten":"","changes":["","",""]}\n\nOriginal:\n${text}`}],800);
    return parseJSON(raw);
  },
  hook:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`4 starke Einstiegssaetze (Hooks) fuer ${ch}: Frage, Provokation, Zahl/Statistik, Storytelling. NUR JSON:{"hooks":[{"type":"Frage","text":""},{"type":"Provokation","text":""},{"type":"Statistik","text":""},{"type":"Story","text":""}]}\n\nThema:\n${text}`}],600);
    return parseJSON(raw)?.hooks||[];
  },
  ideas:async(text,ch)=>{
    const raw=await aiCall([{role:"user",content:`4 kreative Content-Ideen fuer ${ch}. NUR JSON:{"ideas":[{"title":"","hook":"","format":"Karussell|Reel|Story|Post","emoji":""}]}\n\nThema: ${text}`}],900);
    return parseJSON(raw)?.ideas||[];
  },
  emojis:async(text)=>{
    const raw=await aiCall([{role:"user",content:`10 passende Emojis fuer diesen Post. NUR JSON:{"emojis":[]}\n\n${text}`}],200);
    return parseJSON(raw)?.emojis||[];
  },
  analyzeImg:async(url)=>{
    // Support both base64 data URLs (uploaded files) and external HTTP URLs (stock imports)
    let imageSource;
    if(url && url.startsWith("data:")){
      const b64=url.split(",")[1], mime=url.split(";")[0].split(":")[1]||"image/jpeg";
      imageSource={type:"base64",media_type:mime,data:b64};
    } else {
      // External HTTP URL → Anthropic supports type:"url" directly
      imageSource={type:"url",url};
    }
    const raw=await aiCall([{role:"user",content:[
      {type:"image",source:imageSource},
      {type:"text",text:`Analysiere dieses Bild fuer Social Media Marketing. Antworte NUR mit validem JSON, kein Text davor oder danach.

JSON-Schema (alle Felder pflicht):
{
  "tags": ["max 6 kurze Schlagwoerter"],
  "description": "1-2 Saetze was zu sehen ist",
  "suggestedAlt": "SEO-optimierter Alt-Text",
  "mood": "3-4 Adjektive durch Komma",
  "subjects": ["Hauptmotive im Bild"],
  "focalPoint": {"x": 0-100, "y": 0-100, "reason": "Begruendung wohin das Auge geht"},
  "colorPalette": ["#hex1","#hex2","#hex3"],
  "score": {
    "brightness": 0-100,
    "contrast": 0-100,
    "composition": 0-100,
    "engagementPotential": 0-100,
    "overall": 0-100
  },
  "platformFit": {
    "instagram": {"rating": "gut|ok|schlecht", "reason": "1 Satz warum - beziehe dich auf Format 1:1 oder 4:5, Bildqualitaet, Motiv, Farben, Storytelling-Potenzial"},
    "linkedin":  {"rating": "gut|ok|schlecht", "reason": "1 Satz warum - beziehe dich auf Professionalitaet, Corporate-Wirkung, B2B-Relevanz, Sachlichkeit"},
    "facebook":  {"rating": "gut|ok|schlecht", "reason": "1 Satz warum - beziehe dich auf emotionale Ansprache, Shareability, Zielgruppenbreite, Storytelling"},
    "twitter":   {"rating": "gut|ok|schlecht", "reason": "1 Satz warum - beziehe dich auf Aufmerksamkeitswert im Feed, 16:9-Format, klare Aussage auf den ersten Blick"},
    "tiktok":    {"rating": "gut|ok|schlecht", "reason": "1 Satz warum - beziehe dich auf 9:16-Hochformat, Jugendlichkeit, Trendpotenzial, Dynamik"}
  },
  "improvements": ["max 3 konkrete Verbesserungsvorschlaege"]
}

Bewertungskriterien fuer rating:
- "gut": Bild erfuellt die plattformspezifischen Anforderungen ohne Anpassung
- "ok": Bild funktioniert mit kleineren Anpassungen (z.B. Zuschnitt, Helligkeit)
- "schlecht": Bild passt grundlegend nicht zur Plattform (falsche Stimmung, Format, Qualitaet)`}
    ]}],900);
    return parseJSON(raw)||{};
  },
};
