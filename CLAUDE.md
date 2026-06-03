# SocialFlow Pro – Claude Projektkontext

> **Dieses Dokument ist die einzige Quelle der Wahrheit für Claude Code.**
> Es wird bei jeder Session automatisch geladen. Vollständig aktuell halten.

## Session-Start Checkliste

1. `tasks/lessons.md` lesen — bekannte Fallstricke reviewen
2. `tasks/todo.md` lesen — offene Tasks kennen
3. Branch prüfen: `git branch --show-current` → muss `develop` sein

> **Stand: Juni 2026** — 246 Tests, 9 Test-Files, develop @ `13fe936`

---

## 1. Infrastruktur & Branches

| Layer | Technologie | URL / Details |
|---|---|---|
| Frontend | React 18 + Vite | Single-Page-App, Inline-Styles, kein CSS/Tailwind |
| Auth | Clerk (Dev-Key) | Demo-Login via `DEMO_USERS` in `constants/demo.js` |
| AI-Proxy | Cloudflare Function | `POST /ai` → Anthropic API (NIEMALS direkt!) |
| KV-Store | Cloudflare KV | `POST /store` → Clerk-JWT geschützt, Demo-User: kein KV |
| Backend | `functions/` | Cloudflare Pages Functions (12 Endpunkte) |
| Produktion | https://socialflow-pro.pages.dev | Auto-deploy: `main` Branch |
| Dev-Preview | https://develop.socialflow-pro.pages.dev | Auto-deploy: `develop` Branch |
| Repo | https://github.com/manus42ppi/socialflow-pro | |

### Branch-Strategie ⚠️ WICHTIG

```
develop  →  Preview-URL  – hier wird IMMER gearbeitet
main     →  Produktion   – NUR bei explizitem "jetzt deployen" / "release"
```

**Claude Code arbeitet AUSSCHLIESSLICH auf `develop`.**  
Merge zu `main` nur wenn der User explizit "deployen" oder "release" sagt.  
Jeder Push = 1 Cloudflare Build (500 Min/Monat Quota auf Free Plan).

Commits die KEINEN Build brauchen:
```bash
git commit -m "refactor: ... [skip ci]"
```

---

## 2. Entwicklungs-Workflow

```bash
# Aktuellen Branch prüfen — muss immer "develop" sein
git branch --show-current

# Tests ausführen (246 Tests, müssen alle grün sein vor jedem Push)
node node_modules/.bin/vitest run

# Build prüfen
node node_modules/.bin/vite build

# Auf develop pushen → Preview-URL baut
git push origin develop

# Release (NUR auf explizite Anfrage):
git checkout main && git merge develop && git push origin main && git checkout develop
```

---

## 3. Testing-Workflow (Claude Preview Tools)

### Warum nicht Chrome?

Die Claude-in-Chrome Extension hat ein eigenes Domain-Allowlist-System.
Sie blockiert **alle** Domains die wir nutzen:
- `*.pages.dev` (Cloudflare Pages — Preview und Produktion)
- `localhost` / `127.0.0.1`
- `*.loca.lt` (Localtunnel)

**Chrome-Extension ist für dieses Projekt nicht nutzbar.** Nicht weiter versuchen.

### Was wir stattdessen nutzen: Claude Preview Tools

Konfiguriert in `.claude/launch.json` → startet `.claude/start-dev.sh` auf Port 5173.

```js
// Verfügbare Tools (Schema via ToolSearch laden):
mcp__Claude_Preview__preview_start       // Dev-Server starten
mcp__Claude_Preview__preview_screenshot  // Screenshot
mcp__Claude_Preview__preview_snapshot    // Accessibility-Tree (für Selektoren)
mcp__Claude_Preview__preview_click       // Element klicken
mcp__Claude_Preview__preview_fill        // Input befüllen
mcp__Claude_Preview__preview_eval        // JavaScript ausführen
mcp__Claude_Preview__preview_resize      // Viewport setzen (preset: "desktop")
```

### Test-Session starten

```js
// 1. Server starten
preview_start({ name: "dev" })
// → serverId merken für alle weiteren Calls

// 2. Viewport auf Desktop setzen
preview_resize({ serverId, preset: "desktop" })

// 3. Screenshot zur Orientierung
preview_screenshot({ serverId })
```

### Demo-Login via eval (React Events funktionieren nicht direkt)

```js
preview_eval({ serverId, expression: `(() => {
  // Demo-Zugänge Accordion öffnen
  const btn = Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.includes('Demo-Zugänge'));
  btn?.click();
})()` })

// Kurz warten, dann Admin einloggen:
preview_eval({ serverId, expression: `(() => {
  const divs = Array.from(document.querySelectorAll('[style*="cursor: pointer"]'));
  const admin = divs.find(d => d.textContent.includes('admin@'));
  admin?.click();
})()` })
```

### Navigation

```js
preview_eval({ serverId, expression: `(() => {
  const clickable = Array.from(document.querySelectorAll('[style*="cursor"]'));
  const target = clickable.find(el => el.textContent.trim() === 'Inhalte');
  target?.click();
})()` })
```

### ⚠️ Goldene Regel: NIEMALS React-Fiber-Props direkt aufrufen

```js
// ❌ FALSCH – NIEMALS SO TESTEN:
const propsKey = Object.keys(btn).find(k => k.startsWith('__reactProps'));
btn[propsKey].onMouseDown({ preventDefault: ()=>{}, stopPropagation: ()=>{} });
// Grund: Umgeht das Browser-Event-System. Side effects (z.B. BlockNote
// re-rendert → SideMenu unmountet → State verloren) werden NICHT reproduziert.
// Test besteht, aber Live-Site bricht. Das ist WERTLOSER Test.

// ✅ RICHTIG – Echte Browser-Events dispatchen:
const btn = [...document.querySelectorAll('button')].find(b => b.title === 'Block einfügen');
const r = btn.getBoundingClientRect();
btn.dispatchEvent(new MouseEvent('mousedown', {
  bubbles: true, cancelable: true,
  clientX: r.left + r.width/2,
  clientY: r.top + r.height/2
}));
// Dann 400–500ms warten damit React re-renders sich setzen:
await new Promise(r => setTimeout(r, 500));
// Dann DOM-State prüfen (nicht Fiber-State):
const pickerVisible = document.body.innerHTML.includes('Block-Typ');
const blockCount = document.querySelectorAll('[data-node-type="blockContainer"]').length;
```

---

## 4. Dateistruktur `src/`

```
src/
├── App.jsx                    # Root-Komponente, State-basiertes Routing
├── main.jsx                   # Vite Entry, ClerkProvider
│
├── constants/
│   ├── colors.js              # C, T (Farb-Tokens), FONT, FONT_DISPLAY, IW, CSS
│   ├── demo.js                # CHANNELS, STORY_CHANNELS, ROLES, DEMO_USERS,
│   │                          # DEMO_WORKSPACES, DEMO_WORKSPACE_MEMBERS,
│   │                          # DEMO_CAMPAIGNS, DEMO_POSTS, DEMO_STORIES, DEMO_MEDIA,
│   │                          # DEMO_PROJECTS (leer), VOODOO_SOURCE_TYPES
│   └── nav.js                 # NAV_GROUPS, NAV_UTILITY, NAV, TITLE, CHCLR
│
├── context/
│   └── AppContext.jsx         # Gesamter App-State + Multi-Tenant + KV-Persistenz
│
├── hooks/
│   └── useSections.jsx        # useSections() Hook + SecCard – draggable Dashboard-Karten
│
├── utils/
│   ├── store.js               # uid, fileToDataURL, getMediaType, fmtDate, fpos,
│   │                          # aiCall, aiCallStream, parseJSON,
│   │                          # storeGet, storeSet, storeDelete,
│   │                          # igSync, igMonitor, AI-Objekt
│   └── spark.js               # Creation Voodoo — alle Spark-KI-Funktionen (testbar)
│                              # PAGE_CSS, LINK_GUARD, WEB_SEARCH_TOOL, SPARK_PERSONA
│                              # slugify, blocksToPlain, postProcessHtml, buildContext
│                              # validatePage, buildRepairInstruction
│                              # generateMissingSections, runPreflight
│                              # generatePage, refinePage, searchImages
│
├── components/
│   ├── ui/
│   │   ├── index.jsx          # Sp, Badge, Avatar, Btn, Card, FL, TIn, SBadge, SCrd
│   │   └── ChIco.jsx          # Channel-Icons
│   ├── layout/
│   │   ├── Sidebar.jsx        # Linke Navigation + Mandanten-Switcher + Spark-Pill
│   │   ├── TopBar.jsx         # Suchleiste + Notifications + "Neuer Post"
│   │   └── GlobalRightSidebar.jsx
│   ├── previews/              # IGPrev, TWPrev, LIPrev, FBPrev, TKPrev, WAPrev
│   ├── widgets/               # WeekStrip, MiniGantt, Board
│   ├── AIPanel.jsx
│   ├── Login.jsx
│   ├── MediaDetail.jsx
│   ├── PostCard.jsx
│   └── StockSearch.jsx
│
├── pages/
│   ├── Dashboard.jsx
│   ├── ContentLibraryPage.jsx  # ← Unified Content Hub (COPE / Hub & Spoke)
│   ├── PublisherPage.jsx
│   ├── CalendarPage.jsx
│   ├── PlannerPage.jsx
│   ├── CampaignsPage.jsx
│   ├── StoriesPage.jsx
│   ├── MediaPage.jsx
│   ├── PerformancePage.jsx
│   ├── MonitoringPage.jsx         # Instagram Business Discovery API
│   ├── AdminPage.jsx
│   ├── TrashPage.jsx
│   ├── UGCPortalPage.jsx
│   ├── VoodooPage.jsx             # Creation Voodoo – Landing Page Generator
│   │
│   ├── TrendsPage.jsx             # RSS-Feed + Trendanalyse (Tagesschau, Heise, t3n …)
│   ├── DomainAnalysePage.jsx      # Domain-Analyse via /content + /analyze Function
│   ├── WettbewerberPage.jsx       # Wettbewerber-Vergleich via /analyze
│   ├── ContentAuditPage.jsx       # SEO Content-Audit via /analyze
│   ├── StructureAuditPage.jsx     # Schema.org Strukturdaten-Audit via /schema-validate
│   └── SocialIntelligencePage.jsx # Social Media Analytics via /social-analyze
│
├── modals/
│   ├── Editor.jsx
│   ├── StoryEditorModal.jsx   # BlockNote + SEO-Panel + Unified Toolbar
│   ├── SchedModal.jsx
│   └── PostDetailDrawer.jsx
│
└── __tests__/
    ├── setup.js
    ├── utils.test.js
    ├── demo.test.js
    ├── campaigns.test.js
    ├── story.test.js
    └── components/
        ├── ui.test.jsx
        ├── postcard.test.jsx
        └── spark.test.js          # 193 Tests für spark.js (validatePage, buildRepairInstruction …)

functions/
├── ai.js              # POST /ai → Anthropic API Proxy (claude-sonnet-4-6), stream + non-stream
├── tts.js             # POST /tts → OpenAI TTS Proxy (nova voice, audio/mpeg stream)
├── store.js           # POST /store → Cloudflare KV (Clerk-JWT required, User-isoliert)
├── instagram.js       # POST /instagram → Instagram Graph API Proxy
├── ig-monitor.js      # POST /ig-monitor → Business Discovery API (öffentliche Accounts)
├── rss.js             # GET  /rss?url=… → RSS-Feed Proxy (CORS-Umgehung)
├── content.js         # POST /content → URL fetchen + Text extrahieren
├── analyze.js         # POST /analyze → Haupt-Orchestrator (Content+Social+Schema parallel)
├── social-analyze.js  # POST /social-analyze → Social-Media-Metriken
├── schema-validate.js # POST /schema-validate → Schema.org / JSON-LD Validator via KI
├── blog.js            # POST /blog → Public Blog API (KV: "public:blog:{slug}")
├── track.js           # POST /track → Blog-Artikel-Analytics (KV: "stats:blog:{slug}")
├── deploy-site.js     # POST /deploy-site → Voodoo Landing Page in KV schreiben/löschen
└── site/
    └── [slug].js      # GET  /site/:slug → Deployed Voodoo Page öffentlich ausliefern
```

---

## 5. Design-System

### Farb-Tokens – `src/constants/colors.js`

```js
const C = { bg, surface, border, borderLight,
            text, textMid, textSoft, textMute,
            accent, accentHov, accentLight,
            success, warning, info, gradient, gradientHov }

const T = { gray50…gray900, white, brand25…brand200,
            warning500, warningBg, warningText,
            success500, successBg, successText,
            error600, errorBg,
            rSm, rMd, rLg, shadowXs, shadowLg }
```

⚠️ `C` und `T` sind **Modul-Level-Konstanten**. NIEMALS in Komponenten-Body definieren!

### Konstanten
- `FONT = "Inter, system-ui, sans-serif"` – Body-Text überall
- `FONT_DISPLAY = "'Clash Display', 'Plus Jakarta Sans', Inter, sans-serif"` – Headlines
- `IW = 1.7` – Standard `strokeWidth` für alle Lucide-Icons
- `CSS` – Keyframes-String (spin, fadeUp, fadeIn, shimmer, pulse, glow)

### Styling-Regel
**Ausschließlich Inline-Styles.** Kein CSS, kein Tailwind, keine CSS Modules.

---

## 6. State-Architektur (`AppContext.jsx`)

### Context-Value-Felder
```
// Auth
isLoaded, user, demoUser, setDemoUser, handleLogout, handleUpdateMe

// Navigation
nav, goNav, goFilter, goChNav

// Posts (workspace-gefiltert)
posts, setPosts, filt, setFilt, chFilt, setChFilt,
save, del, restore, purge, purgeAll, approve, chSt, chCamp, newPost

// Editor-Modals
edPost, setEdPost, schPost, setSchPost, saveSch

// Kampagnen (workspace-gefiltert)
campaigns, setCampaigns

// Medien (workspace-gefiltert)
items, uploadItem, updateItem, deleteItems

// Storys (workspace-gefiltert)
stories, edStory, setEdStory, saveStory, updateStory,
lockStory, unlockStory, delStory, newStory

// Post-Detail
detailPost, setDetailPost

// Projects (Creation Voodoo) — workspace-UNFILTERED für aktive Projekte
projects, saveProject, delProject, voodooProjectId, setVoodooProjectId

// Spark background job
sparkJob, setSparkJob
// Shape: null | { projectId, projectName, workspaceId,
//                 type:"generate"|"refine", chars:0, status:"running"|"done"|"error" }

// Workspace / Multi-Tenant
workspaces, userWorkspaces,
currentWorkspaceId, setCurrentWorkspaceId, currentWorkspace
```

### KV-Persistenz-Pattern (Load-Guard)

```js
// Laden beim Start (re-runs bei Login/Logout)
useEffect(() => {
  storeGet("posts").then(data => {
    postsLoaded.current = true;
    if (data?.length) setPosts(data);
    else setPosts(DEMO_POSTS);
  });
}, [isSignedIn, isLoaded]);

// Speichern (Guard: nicht überschreiben vor dem Laden)
useEffect(() => {
  if (!postsLoaded.current) return;
  storeSet("posts", posts); // ← raw posts, NICHT filteredPosts!
}, [posts]);
```

Demo-User → kein KV → localStorage-Fallback für Media (`"demo_media"`), Stories (`"demo_stories"`), Projects (`"demo_projects"`).

### Demo-Versionierung (Stale-Cache-Schutz)
```js
// constants/demo.js — bei JEDER Änderung der Demo-Daten erhöhen:
export const DEMO_MEDIA_VERSION   = "3";  // bump wenn DEMO_MEDIA ändert
export const DEMO_STORIES_VERSION = "1";  // bump wenn DEMO_STORIES ändert
// AppContext prüft localStorage("demo_media_version") gegen Konstante.
// Mismatch → localStorage löschen → frische Demo-Daten laden.
// Sofort-Fix im Browser: localStorage.removeItem("demo_media"); location.reload()
```

### Projects-KV-Schema (getrennte Speicherung)
```js
// Metadata-Index (ohne generatedHtml — hält Payload klein)
storeSet("projects", projects.map(({ generatedHtml, ...meta }) => meta));

// HTML pro Projekt separat (nur wenn status === "live")
storeSet(`project:html:${p.id}`, { html: p.generatedHtml });

// Beim Löschen: beide Keys aufräumen
storeDelete(`project:html:${p.id}`);
// + DELETE /deploy-site { slug, delete: true } → KV-Eintrag "site:{slug}" entfernen
```

### Auto-Save-Pattern (Editor & StoryEditorModal)

```js
const formRef = useRef(form);
formRef.current = form; // immer aktuell, kein stale closure

useEffect(() => {
  clearTimeout(timerRef.current);
  if (!form.content && !form.title) return;
  timerRef.current = setTimeout(() => {
    onSave({ ...formRef.current, status: "draft" });
  }, 30000);
  return () => clearTimeout(timerRef.current);
}, [form.content, form.title]);
```

### Routing
React Router v7 (`react-router-dom`). `BrowserRouter` in `main.jsx` → `Routes`/`Route` in `App.jsx`.  
Navigation via `useNavigate` / `useLocation`. `goNav(target)` im AppContext navigiert zu `/${target}`.  
Modals (edPost, edStory, schPost, detailPost) bleiben Context-basiert — keine URL-Parameter.

### Sidebar-Navigation (NAV_GROUPS in `nav.js`)

| Gruppe | Items |
|---|---|
| WORKSPACE | Dashboard |
| ERSTELLEN | **Inhalte** (unified Hub & Spoke), Produkte, UGC Portal |
| PUBLISHING | Publisher (Kanban), Kampagnen, Kalender, Planner |
| ASSETS | Medienbibliothek |
| CREATION VOODOO | Creation Voodoo |
| ANALYSE | Performance, Monitoring, Trends, Domain-Analyse, Wettbewerber, Content-Audit, Structure-Audit, Social Intelligence |

**„Storys" existiert NICHT mehr als Menüpunkt** — Artikel/Stories werden vollständig über „Inhalte" (`/content`) verwaltet. Die `/stories`-Route ist noch im Router vorhanden (Backwards-Compat), aber nicht in der Sidebar.

---

## 7. Multi-Tenant / Mandanten-System

### Konzept
Marketing-Agentur betreut mehrere Mandanten. Jeder User hat Zugang zu 1..n Mandanten.

### Demo-Mandanten
| ID | Name | Farbe |
|---|---|---|
| `ws-ppi-media` | ppi Media | #0077B5 |
| `ws-ppi-n3xt` | ppi n3xt | #6941C6 |
| `ws-ppi-talk` | ppi Talk | #027A48 |
| `ws-alphabeta` | alphabeta neo | #E1306C |

### Berechtigungen
- Admin (id:"1") → alle 4 Mandanten
- Editor (id:"2") → ppi Media + ppi n3xt
- Viewer (id:"3") → ppi Talk

### Datenmodell-Erweiterung
```js
// Alle Entitäten haben workspaceId:
{ id, workspaceId: "ws-ppi-media", ... }
```

### Sidebar-Switcher (kritisches Pattern)
```js
// Außenklick: mousedown verwenden, NICHT click!
document.addEventListener("mousedown", close);
// Container stoppt Propagation:
<div onMouseDown={e => e.stopPropagation()}>
```

`currentWorkspace` gibt `null` zurück wenn kein Mandant — NICHT `DEMO_WORKSPACES[0]`.

### Projects sind workspace-unabhängig beim Lesen
```js
// VoodooPage: aktives Projekt über ALLE workspaces suchen (nicht wsProjects.find!)
const project = projects.find(p => p.id === voodooProjectId) || null;
// Sonst: Workspace-Wechsel während Generierung → Projekt verschwindet
```

---

## 8. Creation Voodoo (`spark.js` + `VoodooPage.jsx`)

### Überblick
Spark generiert vollständige Landing Pages / One-Pager aus Storys, Posts, Medien und URLs.
KI-Modell: `claude-sonnet-4-6` via `/ai` Proxy.

### Architektur `src/utils/spark.js`

| Export | Typ | Tokens | Beschreibung |
|---|---|---|---|
| `PAGE_CSS` | Konstante | — | ~3 KB Inline-CSS für generierte Pages |
| `LINK_GUARD` | Konstante | — | Anchor-Repair + iframe-Guard Script |
| `WEB_SEARCH_TOOL` | Konstante | — | Anthropic web_search Tool-Definition |
| `SPARK_PERSONA` | Konstante | — | Kombinierter Werbetexter/Redakteur/Designer-Prompt |
| `slugify(str)` | Pure | — | String → URL-sicherer Slug |
| `blocksToPlain(blocks)` | Pure | — | BlockNote-Blöcke → Plaintext |
| `postProcessHtml(raw)` | Pure | — | Normalisierung + LINK_GUARD-Injektion |
| `validatePage(html)` | Pure | — | Prüft Script-Leak, Anker-IDs, Section-Count |
| `buildRepairInstruction(issues)` | Pure | — | validatePage-Output → KI-Reparatur-Prompt |
| `buildContext(form, …)` | Pure | — | Projekt-Quellen → Kontext-String |
| `generateMissingSections({html, missingIds})` | Async | ~3000 | Nur fehlende `<section>`-Tags generieren |
| `runPreflight(name, desc, ctx)` | Async | ~600 | 4 Rückfragen für den User generieren |
| `searchImages(query, count, …)` | Async | — | Stock-Foto-API (Pexels/Unsplash/Pixabay) |
| `generatePage({form, ctx, …})` | Async | ~6000 | Vollständige Landing Page + Web-Search |
| `refinePage({html, instruction, …})` | Async | 4000–6000 | Gezielte Überarbeitung einer bestehenden Page |

### CSS-Sentinel-Trick (Token-Sparung)
```js
const CSS_SENTINEL = "/* PAGE_CSS_PLACEHOLDER */";
// Im Prompt: ${CSS_SENTINEL} statt vollen PAGE_CSS (~3 KB / ~750 Token)
// Nach Stream: raw.replace(CSS_SENTINEL, PAGE_CSS)
// Spart ~750 Token auf Input UND Output
```

### Auto-Repair-Loop (`VoodooPage.jsx`)
Drei-Stufen-Strategie nach jeder Generierung/Verfeinerung:

```
Tier 1 — DOM repair (0 Token, immer)
  repairPage() → DOMParser → Script-Leak-Text-Nodes entfernen
                           → Anker-IDs via Heading-Text zuweisen

Tier 2 — Section injection (~3000 Token, bis 2×)
  generateMissingSections() → plain HTML (kein JSON) → DOMParser-Injektion
  vor .cta-b oder footer einfügen

Tier 3 — refinePage fallback (~6000 Token, max. 1×)
  buildRepairInstruction(issues) → refinePage()
  NUR aus generate() — sparkRefine() nutzt maxTier=2 (kein nested refinePage)
```

### Hintergrund-Job (sparkJob in AppContext)
```js
// Shape: null | { projectId, projectName, workspaceId, type, chars, status }
// Sidebar-Pill zeigt Live-Status (Zap-Icon animiert, chars-Counter)
// Klick navigiert direkt zur richtigen Page + Workspace
// Bei Workspace-Wechsel bleibt async-Job laufen — Ergebnis landet via onSave()
// VoodooPage synct generatedHtml zurück via useEffect auf project.generatedHtml
```

### Deploy-Flow
```
generate() / sparkRefine()
  → fetch("/deploy-site", { slug, html })
  → Cloudflare Function schreibt KV "site:{slug}"
  → öffentliche URL: /site/{slug}
  → Deploy-Fehler werden korrekt weitergereicht (! data.ok → throw)
```

---

## 9. Content Library – COPE / Hub & Spoke

### Konzept

**COPE = Create Once, Publish Everywhere.**  
Ein Artikel (Hub) wird einmal geschrieben und daraus werden automatisch Posts (Spokes) für Social Media abgeleitet. Die `ContentLibraryPage` zeigt Articles und Posts in einer einzigen, einheitlichen Liste.

### Route & Navigation

| Route | Komponente | Nav-Label |
|---|---|---|
| `/content` | `ContentLibraryPage.jsx` | „Inhalte" (Layers-Icon) |

### Hub & Spoke Beziehung

```
Story (Hub)  ────  story.derivatives[{id, channel, postId, createdAt}]
                          ↓
                    Post (Spoke)     ← verlinkt via postId
```

**Keine Datenmigration nötig** — die Beziehung wird zur Laufzeit aus `story.derivatives[].postId` aufgelöst:

```js
// ContentLibraryPage – childMap aufbauen
const childMap = useMemo(() => {
  const map = {};
  stories.forEach(s => {
    const ids = (s.derivatives || []).map(d => d.postId).filter(Boolean);
    map[s.id] = allPosts.filter(p => ids.includes(p.id));
  });
  return map;
}, [stories, allPosts]);

// Posts die NICHT abgeleitet sind (eigenständige Posts)
const derivedIds = new Set(Object.values(childMap).flat().map(p => p.id));
const standalonePosts = allPosts.filter(p => !derivedIds.has(p.id));
```

### Content-Typen

```js
const CT = {
  article: { label:"Artikel", Icon:BookOpen, color:"#3B82F6", bg:"#EFF6FF", border:"#BFDBFE" },
  post:    { label:"Post",    Icon:Send,     color:"#059669", bg:"#ECFDF5", border:"#A7F3D0" },
};
```

### UI-Struktur

- **Stats-Strip:** 3 Karten (Artikel-Count, Post-Count, Published-Count)
- **Filter-Bar:** Suche + Typ-Chips (Alle/Artikel/Posts) + Status-Select + Kanal-Icons
- **Liste:** Artikel mit aufklappbaren Ableitungen (blaue Spoke-Rows mit Verbindungslinie), darunter eigenständige Posts
- **„Neuer Inhalt"-Button:** TypePicker-Dropdown → `newStory()` oder `newPost()`

### Ableitungen erstellen

Neue Ableitungen werden im **StoryEditorModal → Tab „Info" → Ableitungen** erstellt.  
Die ContentLibraryPage zeigt sie nur lesend (Klick auf Ableitung → öffnet Post-Editor).

---

## 9a. Spark Voice Assistant (`SparkOrb.jsx`)

### Übersicht

Schwebendes Mikrofon-Orb (bottom-right, immer sichtbar in App).

**States:** `IDLE | LISTENING | THINKING | SPEAKING`  
**Orb-Farben:** `{ idle:"#6366F1", listening:"#10B981", thinking:"#3B82F6", speaking:"#8B5CF6" }`

### TTS-Chain

```
1. POST /tts → Cloudflare Function → OpenAI TTS (nova voice) → audio/mpeg
2. Fallback: Browser SpeechSynthesis (bevorzugt Google Deutsch neural)
```

`ttsAvail` Ref wird beim ersten Aufruf gecacht — bei 503 (OPENAI_API_KEY fehlt) wird dauerhaft auf Browser-TTS umgeschaltet.

### Erkennungszyklus

```
SpeechRecognition (continuous, interimResults, de-DE)
  → 1,2s Silence-Timer
  → processText(text)
  → aiCall(messages) → JSON { speak, actions[] }
  → speak(text)           ← pauseRec() VOR dem Sprechen (kein Feedback-Loop)
  → onSpeakEnd()          → busyRef=false → restartRec nach 400ms
```

### AI-Antwortformat

```json
{ "speak": "Was du sagst", "actions": [{ "type": "navigate", "target": "publisher" }] }
```

**Actions:** `navigate(target)`, `createStory()`, `createPost()`

### Secrets

`OPENAI_API_KEY` im Cloudflare Pages Dashboard (Wert: sk-…, nie committen!)

---

## 10. Story-Workflow (BlockNote v0.47.3)

### Import-Pflicht

```js
import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import "@blocknote/ariakit/style.css";     // ← PFLICHT für Slash-Menü-Icons

import { BlockNoteView } from "@blocknote/ariakit"; // ← NICHT aus @blocknote/react!
import {
  useCreateBlockNote, useBlockNoteEditor,
  FormattingToolbarController, FormattingToolbar,
  BlockTypeSelect, BasicTextStyleButton, CreateLinkButton,
  SideMenuController, SideMenu, DragHandleButton, DeleteButton,
  SuggestionMenuController, getDefaultReactSlashMenuItems,
} from "@blocknote/react";
```

### BlockNoteView Setup

```jsx
<BlockNoteView editor={editor} theme="light" filePanel={false} formattingToolbar={false} slashMenu={false}>
  <FormattingToolbarController formattingToolbar={UnifiedFormattingToolbar} />
  <FilePanelController filePanel={MediaLibraryFilePanel} />
  <SideMenuController sideMenu={props => (
    <SideMenu {...props}>
      <AddBlockButton block={props.block} />
      <DragHandleButton {...props} />
      <DeleteButton {...props} />
    </SideMenu>
  )} />
  <SuggestionMenuController triggerCharacter="/" getItems={...} />
</BlockNoteView>
```

### AddBlockButton — Slash-Menü via execCommand

```js
// Korrekte Implementierung (StoryEditorModal.jsx):
function AddBlockButton({ block }) {
  const editor = useBlockNoteEditor();
  const handleOpen = (e) => {
    e.preventDefault(); e.stopPropagation();
    const [nb] = editor.insertBlocks([{ type: "paragraph" }], block, "after");
    if (!nb) return;
    editor.setTextCursorPosition(nb, "end");
    editor.focus();
    // execCommand geht durch ProseMirror's nativen Input-Handler → triggert Suggestion-Plugin
    // editor.insertInlineContent() würde das Plugin bypassen — deshalb execCommand!
    document.execCommand("insertText", false, "/");
  };
  return <button onMouseDown={handleOpen}>+</button>;
}
```

### StoryEditorModal – 3-Spalten Vollbild
- **Links (230px):** Status, Kategorie, STORY_CHANNELS, Tags, **Titelbild** (coverMediaId), Materialien, Ableitungen, Website, History, Kommentare
- **Mitte:** Titel (FONT_DISPLAY, 32px) + Subtitle + BlockNote-Editor
- **Rechts (300px, resizable):** Tabs "Spark" (KI-Assistent) + "SEO" (Score, Lesbarkeit, Meta)

### Titelbild-Picker (coverMediaId)
```jsx
// AccSection "Titelbild" im linken Panel
// Zeigt 16:9-Vorschau wenn form.coverMediaId gesetzt
// X-Button → coverMediaId: null
// Öffnet ImagePicker (./StoryEditor/ImagePicker.tsx) → Media-Bibliothek
// Wird via ...form-Spread in updateStory() automatisch persistiert
```

---

## 11. Tests

```bash
# Alle Tests ausführen (246 Tests, alle müssen grün sein)
node node_modules/.bin/vitest run

# E2E Tests (Playwright, Chromium)
node node_modules/.bin/playwright test
```

| Datei | Inhalt |
|---|---|
| `utils.test.js` | uid, getMediaType, fmtDate, fpos, parseJSON |
| `demo.test.js` | CHANNELS, STORY_CHANNELS, ROLES, DEMO_CAMPAIGNS, DEMO_POSTS |
| `campaigns.test.js` | dateProg, fmtBudget |
| `story.test.js` | blocksToText, sectionsToBlocks, computeReadability |
| `spark.test.js` | validatePage, buildRepairInstruction, slugify, blocksToPlain |
| `ui.test.jsx` | Btn, Badge, Avatar |
| `postcard.test.jsx` | PostCard-Rendering |

---

## 12. Datenmodelle

### Post
```js
{ id, workspaceId, title, content, channels:[],
  status:"draft"|"pending"|"scheduled"|"published",
  scheduledDate, scheduledTime, mediaId, campaignId, storyId, deleted:false, updatedAt }
```

### Story
```js
{ id, workspaceId, title, subtitle, blocks:[],
  coverMediaId: null|string,              // ← Titelbild: id aus items[]
  materials:[{id, type:"link"|"note"|"image", url, title, addedAt}],
  derivatives:[{id, channel, postId, createdAt}],
  targetChannels:[], status:"idea"|"draft"|"ready"|"published",
  category, tags, seoKeyword, metaTitle, metaDesc, hashtags,
  comments:[{id, text, authorId, authorName, createdAt, resolved}],
  history:[{id, savedAt, savedBy, wordCount, title}],
  lockedBy:null|{userId, name, since}, createdAt, updatedAt }
```

### Media-Item
```js
{ id, workspaceId, name, url, type:"image"|"video"|"logo"|"document",
  size, date, width, height, tags, description, altText, category,
  focusPoint:{x,y}, mood, analyzing:bool, aiError:bool,
  aiAnalysis:{score, platforms, colors, tags, description, suggestedAlt, focalPoint},
  source:"upload"|"unsplash"|"pexels"|"pixabay" }
```

### Project (Creation Voodoo)
```js
{ id, workspaceId, slug, name, description,
  storyIds:[], postIds:[], mediaIds:[], externalUrls:[{id, url, label}],
  generatedHtml:null|string,   // null in KV-Index; geladen via project:html:{id}
  lastGeneratedAt:null|string, // ISO timestamp
  status:"draft"|"live",
  createdAt, updatedAt }
```

---

## 13. Kritische Regeln

| ❌ Verboten | ✅ Korrekt |
|---|---|
| `C` / `T` in Komponente definieren | Aus `constants/colors.js` importieren |
| `useMemo`/`useCallback` entfernen | Bestehende Memoization erhalten |
| `api.anthropic.com` direkt aufrufen | Immer über `/ai` Cloudflare Function |
| `.env` committen | Nur im Cloudflare Dashboard setzen |
| `console.log` stehen lassen | Nur `console.error` in catch-Blöcken |
| `CHANNELS` im Story-Editor | `STORY_CHANNELS` verwenden |
| `BlockNoteView` aus `@blocknote/react` | Aus `@blocknote/ariakit` |
| `@blocknote/ariakit/style.css` weglassen | Immer importieren |
| `editor.insertInlineContent("/")` für Slash-Menü | `document.execCommand("insertText", false, "/")` |
| `loadedRef`-Guard weglassen | Immer `if(!loadedRef.current) return` |
| Direkt auf `main` pushen | Immer auf `develop`, release nur auf Anfrage |
| Chrome Extension für Browser-Tests | Claude Preview Tools (`mcp__Claude_Preview__*`) |
| `wsProjects.find(...)` für aktives Projekt | `projects.find(...)` (workspace-unabhängig) |
| Deploy-Fehler in `sparkRefine()` ignorieren | `if (!deployData.ok) throw new Error(...)` |
| `${SENTINEL}` im Spark-Prompt | `${CSS_SENTINEL}` (korrekte Konstantenname) |
| `refinePage()` aus `autoRepairLoop()` wenn bereits in `sparkRefine()` | `maxTier=2` übergeben |

---

## 14. Secrets & Umgebungsvariablen

Niemals committen. In Cloudflare Pages Dashboard setzen:
- `ANTHROPIC_API_KEY` – für `/ai` Function
- `OPENAI_API_KEY` – für `/tts` Function (OpenAI TTS nova voice); ohne Key → 503 → Browser-TTS-Fallback
- Clerk Keys – in `main.jsx` (Dev-Key für lokale Arbeit, nie committen)

API-Keys für Stock-Suche (Unsplash, Pexels, Pixabay):
→ User gibt sie im Admin-Bereich ein → `localStorage`

---

## 15. Entwicklungsstand (Juni 2026)

### ✅ Fertig & aktiv

**Core-Workflow**
- Dashboard, Publisher (Kanban), Kalender, Planner (Gantt), Kampagnen
- **Medienbibliothek** — Upload, KI-Analyse (persistiert via onUpdate), Fokuspunkt
  - PDF-Vorschau: iframe für HTTPS-URLs, Datei-Icon für data: URLs
  - Buttons „Im Browser öffnen" + „Herunterladen" für Dokumente
  - Nur Metadaten-Tab für Dokumente (Bild-Score/Plattform-Fit ausgeblendet)
- Performance (Mock-Analytics), Instagram Monitoring
- **PostEditorModal** (BlockNote Full-Screen) — Medienbibliothek-Picker integriert
- **Story-Workflow** (BlockNote, SEO, Varianten)
  - **Titelbild-Picker** — AccSection "Titelbild" im linken Panel, setzt `coverMediaId`
  - 16:9-Vorschau + X-Button zum Löschen
- **Content Library** (`/content`) — COPE / Hub & Spoke unified view (Articles + Posts)
- Multi-Tenant / Mandanten-System (4 Demo-Mandanten)
- UGC Portal (Einreichungen, Genehmigungs-Workflow)
- Build-Metadaten: `v1.0.{BUILD_NUMBER}` in Sidebar + Login
- **Spark Voice Assistant** (SparkOrb) — SpeechRecognition + OpenAI TTS nova + Browser-Fallback

**Creation Voodoo (Spark)**
- Landing-Page-Generierung aus Projekt-Inhalten via KI + Web-Search
- Preflight Q&A, Auto-Bilder, Live-Preview im iFrame
- Verfeinern mit freier Anweisung + Quick-Actions
- Hintergrund-Job: Navigation weg & zurück möglich (sparkJob Pill in Sidebar)
- Auto-Repair-Loop (3 Tiers: DOM → Section-Injektion → refinePage)
- CSS-Sentinel: ~750 Token Einsparung pro Aufruf
- Deployed Pages unter `/site/{slug}` öffentlich erreichbar
- **Social-Share-Sheet** — „Teilen"-Button im Live-Header öffnet Kanal-Picker + Caption-Editor → erstellt Draft-Post im PostEditorModal

**Demo-System (Radsport-Thema)**
- Demo-User: ppi Media, ppi n3xt, ppi Talk, alphabeta neo
- Cycling-Content: Stories (Gravel Cycling, E-Bike 2026, Wintertraining), 6 Bilder mit KI-Analyse, 2 Produkte
- Demo-PDF „Gravel & E-Bike Sommer 2026 – Dossier.pdf" in Medienbibliothek (ws-ppi-media)
- `DEMO_MEDIA_VERSION = "3"`, `DEMO_STORIES_VERSION = "1"` — automatische Cache-Invalidierung

**Analyse-Suite**
- Trends: RSS-Feed Reader (Tagesschau, DW, Heise, t3n, Golem …)
- Domain-Analyse, Wettbewerber, Content-Audit, Structure-Audit (Schema.org), Social Intelligence

### 🔄 Geplant / Nächste Schritte

| Priorität | Task |
|---|---|
| Hoch | KI-Analyse-Persistenz (Ergebnisse bleiben nach Reload) |
| Hoch | `public/_headers` Cache-Control: no-store |
| Mittel | Workspace-Zugriffsrechte im Admin änderbar |
| Mittel | Content Library: Inline-Bearbeitung, Bulk-Aktionen |
| Niedrig | Mobile Responsive |
| Niedrig | Echter Publish-Endpunkt für Social Channels |
| Infrastruktur | Medien-Upload → Cloudflare R2 (Base64-in-KV löst sich ab) |

**→ Vollständige Aufgabenliste: `tasks/todo.md`**

---

## 16. Task Management & Self-Improvement

### Pflicht bei jeder Session

**Session-Start:**
- `tasks/lessons.md` lesen (bekannte Fallstricke, verhindert Wiederholungsfehler)
- `tasks/todo.md` lesen (offene Tasks, aktueller Stand)

**Nach einer Korrektur durch den User:**
- `tasks/lessons.md` sofort mit dem Muster ergänzen (Format: `L-NNN: Titel`)
- Regel so formulieren, dass Claude Code denselben Fehler nie wieder macht

**Nach Abschluss eines Tasks:**
- `tasks/todo.md` aktualisieren: Status setzen, "Zuletzt erledigt" eintragen
- Neue erkannte Aufgaben direkt als `📋 Offen` eintragen

### Verification Before Done

Bevor ein Task als fertig gilt:
- Tests grün: `node node_modules/.bin/vitest run` → alle Tests bestehen
- Build erfolgreich: `node node_modules/.bin/vite build`
- Selbstfrage: „Würde ein Staff Engineer das so abnicken?"

### Autonomes Arbeiten

- Bei Bugreport: direkt fixen, keine Rückfragen für Offensichtliches
- Failing Tests → Root Cause finden und beheben, nicht patchen
- Bei hacky wirkendem Fix: elegante Lösung implementieren
