// ── UTILS ──────────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2,10);
export const fileToDataURL = f => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
export const getMediaType = f => f.type.startsWith("video/")?"video": f.name.toLowerCase().includes("logo")?"logo": f.type.startsWith("image/")?"image":"document";
export const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}) : "";
export const fpos = m => m?.focusPoint ? `${m.focusPoint.x}% ${m.focusPoint.y}%` : "center";

// ── AI SERVICE (via Cloudflare Function Proxy) ────────────────────────────
export async function aiCall(messages, max_tokens=800) {
  const r = await fetch("/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens,messages}),
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data?.error?.message||`HTTP ${r.status}`);
  return data.content?.[0]?.text||"";
}
export const parseJSON = raw => { try{return JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{return null;} };

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
  analyzeImg:async(dataUrl)=>{
    const b64=dataUrl.split(",")[1],mime=dataUrl.split(";")[0].split(":")[1]||"image/jpeg";
    const raw=await aiCall([{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mime,data:b64}},
      {type:"text",text:'Analysiere dieses Bild fuer Social Media. NUR JSON:{"tags":[],"description":"","suggestedAlt":"","mood":"","subjects":[],"focalPoint":{"x":50,"y":50,"reason":""},"colorPalette":["#hex"],"score":{"brightness":0,"contrast":0,"composition":0,"engagementPotential":0,"overall":0},"platformFit":{"instagram":"gut","linkedin":"gut","facebook":"gut"},"improvements":[""]}'}
    ]}],700);
    return parseJSON(raw)||{};
  },
};
