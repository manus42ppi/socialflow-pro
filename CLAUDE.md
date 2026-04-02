# SocialFlow Pro – Claude Projektkontext

> **Dieses Dokument ist die einzige Quelle der Wahrheit für Claude Code.**
> Es wird bei jeder Session gelesen. Bitte vollständig aktuell halten.

---

## Stack & Infrastruktur

| Layer | Technologie | Details |
|---|---|---|
| Frontend | React 18 + Vite | Single-Page-App, Inline-Styles, kein CSS/Tailwind |
| Auth | Clerk (Dev-Key) | Demo-Login via `DEMO_USERS` in `constants/demo.js` |
| AI-Proxy | Cloudflare Function | `/ai` → Anthropic API (NIEMALS direkt `api.anthropic.com`) |
| KV-Store | Cloudflare KV | `/store` → Clerk-JWT geschützt, Demo-User: kein Persist |
| Backend-Fns | `functions/` | Cloudflare Pages Functions (ig-monitor, instagram, store, ai, rss) |
| Live | https://socialflow-pro.pages.dev | Cloudflare Pages, auto-deploy bei Push auf `main` |
| Repo | https://github.com/manus42ppi/socialflow-pro | Branch: `main` |

### Dev-Workflow
```bash
# Dev-Server starten (npm nicht im PATH → direkt node)
/usr/local/bin/node node_modules/vite/bin/vite.js

# Build prüfen
/usr/local/bin/node node_modules/vite/bin/vite.js build

# Tests ausführen (85 Tests, alle grün)
/usr/local/bin/node node_modules/.bin/vitest run

# Push → Cloudflare deployed automatisch (~30 Sek)
git push origin main
```

### Preview-Server (Claude Code `.claude/launch.json`)
```json
{
  "runtimeExecutable": "/usr/local/bin/node",
  "runtimeArgs": ["../../../node_modules/vite/bin/vite.js", "--config", "../../../vite.config.js"],
  "port": 5173
}
```

### Demo-Login im Preview (React Events funktionieren nicht nativ)
```js
// 1. Accordion öffnen
const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('DEMO-ZUGÄNGE'));
['mousedown','mouseup','click'].forEach(t => btn.dispatchEvent(new MouseEvent(t, {bubbles:true,cancelable:true,view:window})));

// 2. Admin einloggen via React Props
const span = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim() === 'admin@demo.com');
const el = span.parentElement;
el[Object.keys(el).find(k => k.startsWith('__reactProps'))].onClick?.({});
```

---

## Architektur-Übersicht

Die App war ursprünglich eine Single-File-SPA (`App.jsx`). Sie wurde in eine
modulare Struktur refaktoriert. **`App.jsx` enthält nur noch Root-State und Routing.**

### Dateistruktur `src/`

```
src/
├── App.jsx                    # Root-Komponente, Routing (State-based, kein Router)
├── main.jsx                   # Vite Entry, ClerkProvider
│
├── constants/
│   ├── colors.js              # C (Farb-Tokens), FONT, FONT_DISPLAY, IW, CSS
│   ├── demo.js                # CHANNELS, STORY_CHANNELS, ROLES, DEMO_USERS,
│   │                          # STAGES, CAMP_COLORS, CAMP_ICONS,
│   │                          # DEMO_CAMPAIGNS, DEMO_POSTS, DEMO_STORIES
│   └── nav.js                 # NAV_GROUPS, TITLE-Map, Lucide-Icons
│
├── context/
│   └── AppContext.jsx         # Gesamter App-State + Persistenz-Effekte + newStory()
│
├── utils/
│   └── store.js               # uid, fileToDataURL, getMediaType, fmtDate, fpos,
│                              # aiCall, parseJSON, storeGet, storeSet,
│                              # igSync, igMonitor, AI-Objekt
│
├── components/
│   ├── ui/
│   │   ├── index.jsx          # Sp, Badge, Avatar, Btn, Card, FL, TIn, SBadge, SCrd
│   │   └── ChIco.jsx          # Channel-Icons: instagram, twitter, linkedin,
│   │                          # facebook, whatsapp, website (Globe), print (SVG)
│   ├── layout/
│   │   ├── Sidebar.jsx        # Linke Navigation
│   │   └── TopBar.jsx         # Suchleiste + Notifications + "Neuer Post"
│   ├── previews/              # IGPrev, TWPrev, LIPrev, FBPrev, TKPrev, WAPrev
│   ├── widgets/               # GlobalRightSidebar, WeekStrip, MiniGantt
│   ├── AIPanel.jsx            # KI-Assistent-Panel (im Post-Editor)
│   ├── Login.jsx              # Login-Screen mit Demo-Zugängen
│   ├── MediaDetail.jsx        # Modal: Mediendatei-Details & Bearbeitung
│   ├── PostCard.jsx           # Post-Karte (Publisher, Kanban)
│   └── StockSearch.jsx        # Stock-Bildsuche (Unsplash/Pexels/Pixabay)
│
├── pages/
│   ├── Dashboard.jsx          # Haupt-Dashboard (Widgets, Stats, Timeline)
│   ├── PublisherPage.jsx      # Kanban-Board (Entwurf→Freigabe→Geplant→Publiziert)
│   ├── CalendarPage.jsx       # Kalender (Monatsansicht + Agenda)
│   ├── PlannerPage.jsx        # Gantt-Timeline
│   ├── CampaignsPage.jsx      # Kampagnen-Verwaltung
│   ├── StoriesPage.jsx        # Story-Grid (Content Hub Übersicht) ← NEU
│   ├── MediaPage.jsx          # Medienbibliothek
│   ├── PerformancePage.jsx    # Analytics (Mock-Daten)
│   ├── MonitoringPage.jsx     # Instagram-Monitoring (fremde Accounts) ← NEU
│   ├── AdminPage.jsx          # Einstellungen, Kanal-Verbindungen, User-Mgmt
│   ├── TrashPage.jsx          # Papierkorb
│   └── ResearchPage.jsx       # Recherche-Seite
│
├── modals/
│   ├── Editor.jsx             # Haupt-Post-Editor (mit AIPanel)
│   ├── StoryEditorModal.jsx   # Story-Editor: BlockNote + 3-Spalten + KI-Ableitungen ← NEU
│   ├── SchedModal.jsx         # Zeitplan-Modal
│   └── PostDetailDrawer.jsx   # Post-Detail-Drawer
│
└── __tests__/
    ├── setup.js               # Vitest-Setup (jsdom)
    ├── utils.test.js          # uid, getMediaType, fmtDate, fpos, parseJSON
    ├── demo.test.js           # CHANNELS, STORY_CHANNELS, ROLES, DEMO_CAMPAIGNS
    ├── campaigns.test.js      # dateProg, fmtBudget
    └── components/
        ├── ui.test.jsx        # Btn, Badge, Avatar
        └── postcard.test.jsx  # PostCard-Rendering

functions/                     # Cloudflare Pages Functions
├── ai.js                      # POST /ai → Anthropic API Proxy (claude-sonnet-4-6)
├── store.js                   # POST /store → Cloudflare KV (Clerk-JWT required)
├── instagram.js               # POST /instagram → eigene IG Posts holen
├── ig-monitor.js              # POST /ig-monitor → Business Discovery API
└── rss.js                     # GET /rss → RSS-Feed Proxy
```

---

## Design-System

### Farb-Tokens (`C`) – `src/constants/colors.js`
```js
const C = { bg, surface, border, borderLight, text, textMid, textSoft, textMute,
            accent, accentHov, accentLight, success, warning, info, gradient, gradientHov }
```
⚠️ `C` ist Modul-Level. NIEMALS in Komponenten-Body definieren!

### Konstanten
- `FONT = "Inter, system-ui, sans-serif"` – Body
- `FONT_DISPLAY = "'Clash Display', 'Plus Jakarta Sans', Inter, sans-serif"` – Headlines
- `IW = 1.7` – Standard `strokeWidth` für alle Lucide-Icons
- `CSS` – Keyframes-String (spin, fadeUp, fadeIn, shimmer, pulse, glow)

### Styling-Regel
**Ausschließlich Inline-Styles.** Kein CSS, kein Tailwind, keine CSS Modules.

---

## State-Architektur (`AppContext.jsx`)

```
user, posts, campaigns, stories, items (media),
nav (aktuelle Seite), edPost (offener Post), edStory (offene Story),
setPosts, setCampaigns, setStories, setItems, setNav, setEdPost, setEdStory,
saveStory(), newStory()
```

### KV-Persistenz-Pattern
```js
// Laden beim Start
useEffect(() => {
  storeGet("posts").then(data => {
    if (data?.length) setPosts(data);
    loadedRef.current = true;
  });
}, []);

// Speichern bei Änderungen (Guard: nicht überschreiben vor dem Laden)
useEffect(() => {
  if (!loadedRef.current) return;
  storeSet("posts", posts);
}, [posts]);
```

### Auto-Save-Pattern (Editor & StoryEditorModal)
```js
const formRef = useRef(form);
formRef.current = form; // immer aktuelle Daten, kein stale closure

useEffect(() => {
  clearTimeout(timerRef.current);
  if (!form.title) return;
  timerRef.current = setTimeout(() => {
    onSave({ ...formRef.current, status: "draft" }); // formRef.current = fresh data
  }, 20000);
  return () => clearTimeout(timerRef.current);
}, [form.title]);
```

### Routing
Rein State-basiert via `nav`-String. Kein React Router. Browser-Back funktioniert nicht.

---

## Feature-Detail: Story-Workflow

### Konzept
Story = Content Hub. Eine Story ist der Ursprungstext, aus dem Ableitungen
für alle Kanäle (Social, Web, Print) per KI generiert werden.

### StoriesPage (`src/pages/StoriesPage.jsx`)
- Grid: `repeat(auto-fill, minmax(300px, 1fr))`
- Status-Filter-Pills: Alle / 💡 Idee / ✏️ Entwurf / ✅ Bereit / 🚀 Veröffentlicht
- StoryCard: Farbbalken oben (Statusfarbe), Kategorie + Status Badges,
  Titel/Subtitle, Kanal-Chips, Stats (Wörter, Lesezeit, Materialien, Ableitungen)

### StoryEditorModal (`src/modals/StoryEditorModal.jsx`)
3-Spalten Vollbild-Layout (position:fixed, inset:0):

**Links (230px):** Status-Buttons, Kategorie-Select, STORY_CHANNELS-Toggles, Tags

**Mitte:** Titel-Input (FONT_DISPLAY, 32px) + Subtitle + BlockNote-Editor

**Rechts (300px):** Tabs
- "Materialien": Link / Notiz / Bild hinzufügen + Liste
- "Ableitungen": KI-Entwurf-Button pro Kanal mit Loading-State

### BlockNote (v0.47.3) – korrekte API
```jsx
import { BlockNoteViewRaw, BlockNoteDefaultUI, useCreateBlockNote } from "@blocknote/react";
// NICHT "BlockNoteView" – wird in dieser Version nicht exportiert!

const editor = useCreateBlockNote({ initialContent: blocks });

<BlockNoteViewRaw editor={editor} theme="light" onChange={() => {
  const text = blocksToText(editor.document || []);
  setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
}}>
  <BlockNoteDefaultUI />
</BlockNoteViewRaw>
```

### KI-Ableitungen
```js
// CH_ANGLE: kanalspezifischer Stil-Hinweis für den Prompt
// CH_LIMITS: max. Zeichenzahl pro Kanal
const prompt = `Schreibe einen ${channel.label}-Post basierend auf: ${storyText}
  Stil: ${CH_ANGLE[chId]}  Max: ${CH_LIMITS[chId]} Zeichen`;
const content = await aiCall([{ role:"user", content: prompt }], 1200);
// Fallback: Text abschneiden wenn aiCall fehlschlägt
```

### STORY_CHANNELS (erweitert CHANNELS)
```js
// src/constants/demo.js
export const STORY_CHANNELS = [
  ...CHANNELS, // instagram, twitter, linkedin, facebook, whatsapp
  { id:"website", label:"Website / Blog",  color:"#0EA5E9", bg:"#f0f9ff", maxChars:100000 },
  { id:"print",   label:"Print / Zeitung", color:"#64748B", bg:"#f8fafc", maxChars:100000 },
];
// CHANNELS (ohne website/print) weiterhin für Publisher, Admin, Editor verwenden!
```

### sectionsToBlocks() – Migrationshelfer
Konvertiert altes `story.sections[]`-Format → BlockNote JSON.
Wird in StoryEditorModal aufgerufen wenn `story.blocks` leer ist.

---

## Feature-Detail: Instagram Monitoring

**MonitoringPage** (`src/pages/MonitoringPage.jsx`)
- Account per @Username hinzufügen
- Profil-Stats: Follower, Posts, Bio
- Post-Grid: Thumbnails, Hover-Overlay (Caption, Likes, Kommentare)
- Aktionen: "Entwurf erstellen" (Post übernehmen), "Öffnen" (extern)
- KV-Persistenz: `storeGet/storeSet("monitoring:accounts")`
- ⚠️ Benötigt echten Clerk-Account + Instagram Business Token

**ig-monitor.js** (`functions/ig-monitor.js`)
- `POST /ig-monitor` mit `{ accessToken, igUserId, targetUsername }`
- Nutzt Facebook Business Discovery API
- Friendly Errors: Token abgelaufen, keine Permissions, kein Business Account

**IgTokenGuide** – eingebettet in `AdminPage.jsx` im Instagram-Accordion
- 6-Schritte Anleitung für Access Token Beschaffung

---

## Datenmodelle

### Post
```js
{ id, title, content, channels:[], status:"draft"|"pending"|"scheduled"|"published",
  scheduledDate, scheduledTime, mediaId, campaignId, storyId, deleted:false }
```

### Story
```js
{ id, title, subtitle,
  blocks:[],          // BlockNote JSON Array
  materials:[{id, type:"link"|"note"|"image", url, title, mediaId?, addedAt}],
  derivatives:[{id, channel, postId, createdAt}],
  targetChannels:[],  // Channel-IDs
  status:"idea"|"draft"|"ready"|"published",
  category, tags, createdAt, updatedAt }
```

### Kampagne
```js
{ id, name, icon, color, description, goal, status, startDate, endDate, budget, channels:[] }
```

### Media-Item
```js
{ id, name, url, type:"image"|"video"|"logo"|"document",
  description, tags:[], focusPoint:{x,y} }
```

---

## Tests (85 Tests, alle grün)

```
src/__tests__/
├── utils.test.js       – uid, getMediaType, fmtDate, fpos, parseJSON
├── demo.test.js        – CHANNELS, STORY_CHANNELS, ROLES, DEMO_CAMPAIGNS, DEMO_POSTS, STAGES
├── campaigns.test.js   – dateProg, fmtBudget, Kampagnen-Helfer
└── components/
    ├── ui.test.jsx     – Btn, Badge, Avatar
    └── postcard.test.jsx – PostCard-Rendering
```

---

## Kritische Regeln (niemals brechen)

| ❌ Verboten | ✅ Korrekt |
|---|---|
| `C` in Komponente definieren | `C` aus `constants/colors.js` importieren |
| `useMemo`/`useCallback` entfernen | Bestehende Memoization erhalten |
| `api.anthropic.com` direkt aufrufen | Immer über `/ai` Cloudflare Function |
| `.env` committen | Nur in Cloudflare Dashboard setzen |
| `console.log` stehen lassen | Nur `console.error` in catch-Blöcken |
| `CHANNELS` im Story-Editor nutzen | `STORY_CHANNELS` verwenden |
| `BlockNoteView` importieren | `BlockNoteViewRaw` + `BlockNoteDefaultUI` |
| `loadedRef`-Guard weglassen | Immer `if(!loadedRef.current) return` |

---

## Entwicklungsstand (Stand: 02. April 2026)

### ✅ Fertig & Live
- Dashboard (Widgets, Timeline, Stats, Right Sidebar mit drag-barer Widget-Reihenfolge)
- Publisher (Kanban-Board mit Drag & Drop)
- Kalender (Monats- + Agenda-Ansicht)
- Planner (Gantt-Timeline)
- Kampagnen-Verwaltung
- Medienbibliothek
- Performance (Mock-Analytics)
- Admin (Kanal-Setup, Team, Instagram Token Guide)
- Post-Editor (mit KI-Panel: Optimize, Hashtags, Varianten, Score, Hook, Ideas)
- **Story-Workflow** (BlockNote-Editor, Materialien, KI-Ableitungen, Website/Print)
- **Instagram Monitoring** (Business Discovery API, KV-Persistenz)
- Papierkorb
- Recherche-Seite

### 🔄 Ideen / Nächste Schritte
- Instagram Monitoring: Demo-Mode ohne Clerk-Account
- Story-Ableitungen: Preview-Dialog vor dem Erstellen
- Mobile Responsive (aktuell Desktop-optimiert)
- Onboarding-Flow für neue User
- Echter Publish-Endpunkt (aktuell nur Status-Änderung)
- Push-Benachrichtigungen für Freigabe

---

## Secrets & Umgebungsvariablen

Niemals committen. In Cloudflare Pages Dashboard setzen:
- `ANTHROPIC_API_KEY` – für `/ai` Function
- `CF_KV_NAMESPACE` – für `/store` Function
- Clerk Publishable/Secret Key – in `main.jsx` (Dev-Key für lokale Arbeit)

API-Keys für Stock-Suche (Unsplash, Pexels, Pixabay):
→ User gibt sie im Admin-Bereich ein → werden in `localStorage` gespeichert.
