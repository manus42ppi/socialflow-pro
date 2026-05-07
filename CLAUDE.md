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
| KV-Store | Cloudflare KV | `/store` → Clerk-JWT geschützt, Demo-User: kein KV |
| Backend-Fns | `functions/` | Cloudflare Pages Functions (ig-monitor, instagram, store, ai, rss) |
| Live | https://socialflow-pro.pages.dev | Cloudflare Pages, auto-deploy bei Push auf `main` |
| Preview | https://develop.socialflow-pro.pages.dev | Auto-deploy bei Push auf `develop` |
| Repo | https://github.com/manus42ppi/socialflow-pro | Arbeits-Branch: `develop` |

### Branch-Strategie (WICHTIG — Cloudflare Build-Quota schonen)
```
develop  →  Preview-URL (develop.socialflow-pro.pages.dev)  – hier wird gearbeitet
main     →  Produktion  (socialflow-pro.pages.dev)          – nur bei bewusstem Release
```

**Claude Code arbeitet IMMER auf `develop`, NIEMALS direkt auf `main`.**
Merge zu `main` nur wenn der User explizit "jetzt deployen" oder "release" sagt.

### Dev-Workflow
```bash
# Aktuellen Branch prüfen — muss immer "develop" sein
git branch --show-current

# Dev-Server starten (npm nicht im PATH → direkt node)
/usr/local/bin/node node_modules/vite/bin/vite.js

# Build prüfen
/usr/local/bin/node node_modules/vite/bin/vite.js build

# Tests ausführen
node node_modules/.bin/vitest run

# Normale Arbeit: auf develop pushen → Preview-URL
git push origin develop

# Release auf Produktion: develop → main mergen (nur auf explizite Anfrage!)
git checkout main && git merge develop && git push origin main && git checkout develop
```

### Commit-Strategie
- WIP-Commits die KEINEN Cloudflare-Build brauchen: `[skip ci]` ans Ende der Message
- Normale Feature-Commits auf develop: bauen die Preview-URL (1 Build)
- Release auf main: 1 weiterer Build für Produktion

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

### Dateistruktur `src/`

```
src/
├── App.jsx                    # Root-Komponente, Routing (State-based, kein Router)
├── main.jsx                   # Vite Entry, ClerkProvider
│
├── constants/
│   ├── colors.js              # C (Farb-Tokens), T (erweitert), FONT, FONT_DISPLAY, IW, CSS
│   ├── demo.js                # CHANNELS, STORY_CHANNELS, ROLES, DEMO_USERS,
│   │                          # STAGES, CAMP_COLORS, CAMP_ICONS,
│   │                          # DEMO_WORKSPACES, DEMO_WORKSPACE_MEMBERS,
│   │                          # DEMO_CAMPAIGNS, DEMO_POSTS, DEMO_STORIES, DEMO_MEDIA
│   └── nav.js                 # NAV_GROUPS, NAV_UTILITY, TITLE-Map
│
├── context/
│   └── AppContext.jsx         # Gesamter App-State + Multi-Tenant + KV-Persistenz
│
├── utils/
│   └── store.js               # uid, fileToDataURL, getMediaType, fmtDate, fpos,
│                              # aiCall, parseJSON, storeGet, storeSet,
│                              # igSync, igMonitor, AI-Objekt
│
├── components/
│   ├── ui/
│   │   ├── index.jsx          # Sp, Badge, Avatar, Btn, Card, FL, TIn, SBadge, SCrd
│   │   └── ChIco.jsx          # Channel-Icons
│   ├── layout/
│   │   ├── Sidebar.jsx        # Linke Navigation + Mandanten-Switcher
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
│   ├── PublisherPage.jsx
│   ├── CalendarPage.jsx
│   ├── PlannerPage.jsx
│   ├── CampaignsPage.jsx
│   ├── StoriesPage.jsx
│   ├── MediaPage.jsx          # Workspace-aware (filtert nach Mandant)
│   ├── PerformancePage.jsx
│   ├── MonitoringPage.jsx
│   ├── AdminPage.jsx          # inkl. Mandanten-Tab
│   ├── TrashPage.jsx
│   ├── ResearchPage.jsx
│   └── UGCPortalPage.jsx      # UGC-Einreichungsportal (neu)
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
    └── components/
        ├── ui.test.jsx
        └── postcard.test.jsx

functions/
├── ai.js                      # POST /ai → Anthropic API Proxy (claude-sonnet-4-6)
├── store.js                   # POST /store → Cloudflare KV (Clerk-JWT required)
├── instagram.js               # POST /instagram
├── ig-monitor.js              # POST /ig-monitor → Business Discovery API
└── rss.js                     # GET /rss → RSS-Feed Proxy
```

---

## Design-System

### Farb-Tokens – `src/constants/colors.js`
```js
const C = { bg, surface, border, borderLight, text, textMid, textSoft, textMute,
            accent, accentHov, accentLight, success, warning, info, gradient, gradientHov }

const T = { gray50…gray900, white, brand25…brand200,
            warning500, warningBg, warningText,
            success500, successBg, successText,
            error600, errorBg,
            rSm, rMd, rLg, shadowXs, shadowLg }
```
⚠️ `C` und `T` sind Modul-Level. NIEMALS in Komponenten-Body definieren!

### Konstanten
- `FONT = "Inter, system-ui, sans-serif"` – Body
- `FONT_DISPLAY = "'Clash Display', 'Plus Jakarta Sans', Inter, sans-serif"` – Headlines
- `IW = 1.7` – Standard `strokeWidth` für alle Lucide-Icons
- `CSS` – Keyframes-String (spin, fadeUp, fadeIn, shimmer, pulse, glow)

### Styling-Regel
**Ausschließlich Inline-Styles.** Kein CSS, kein Tailwind, keine CSS Modules.

---

## State-Architektur (`AppContext.jsx`)

### Vollständige Context-Value-Felder
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

// Workspace / Multi-Tenant
workspaces,             // alle DEMO_WORKSPACES
userWorkspaces,         // gefiltert nach Demo-User-Mitgliedschaft
currentWorkspaceId,     // null = Alle Mandanten
setCurrentWorkspaceId,  // persistiert in localStorage("sf_workspace")
currentWorkspace,       // Workspace-Objekt oder null
```

### Multi-Tenant-Filterung
```js
// In AppContext: gefilterte Collections für die UI
const filteredPosts = useMemo(() =>
  currentWorkspaceId ? posts.filter(p => p.workspaceId === currentWorkspaceId) : posts
, [posts, currentWorkspaceId]);

// context value.posts = filteredPosts (Mutations laufen über raw setPosts)
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
  storeSet("posts", posts);
}, [posts]); // ← raw posts, nicht filteredPosts!
```

Demo-User → kein KV → localStorage-Fallback für Media (`"demo_media"`).

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
Rein State-basiert via `nav`-String. Kein React Router. Browser-Back funktioniert nicht.

```
dashboard | publisher | trash | stories | ugc | campaigns |
media | calendar | planner | performance | research | monitoring | admin
```

---

## Feature: Multi-Tenant / Mandanten-System

### Konzept
Marketing-Agentur betreut mehrere Mandanten. Jeder User hat Zugang zu 1..n Mandanten.
Beim Wechsel des Mandanten ändern sich Posts, Kampagnen, Storys, Medien und UGC-Einreichungen.

### Demo-Mandanten (`DEMO_WORKSPACES`)
| ID | Name | Farbe |
|---|---|---|
| `ws-ppi-media` | ppi Media | #0077B5 |
| `ws-ppi-n3xt` | ppi n3xt | #6941C6 |
| `ws-ppi-talk` | ppi Talk | #027A48 |
| `ws-alphabeta` | alphabeta neo | #E1306C |

### Demo-Berechtigungen (`DEMO_WORKSPACE_MEMBERS`)
- Admin (id:"1") → alle 4 Mandanten
- Editor (id:"2") → ppi Media + ppi n3xt
- Viewer (id:"3") → ppi Talk

### Datenmodell-Erweiterung
Alle Entitäten haben jetzt `workspaceId`:
```js
// Post, Kampagne, Story, Media-Item:
{ id, workspaceId: "ws-ppi-media", ... }
```

### Sidebar-Switcher
- Farbige Initialen-Avatare (gleiche Sprache wie User-Avatar)
- Dropdown mit `onMouseDown`-Außenklick-Schließung (nicht `onClick`!)
- `null` = "Alle Mandanten" (Gesamtübersicht, nur wenn >1 Workspace)

---

## Feature: Story-Workflow (BlockNote)

### StoriesPage
Grid, Status-Filter, SEO-Score-Badge auf Story-Karten.

### StoryEditorModal – 3-Spalten Vollbild
**Links (230px):** Status, Kategorie, STORY_CHANNELS, Tags, Kommentare, History

**Mitte:** Titel (FONT_DISPLAY, 32px) + Subtitle + BlockNote-Editor

**Rechts (300px):** Tabs
- "Info": Materialien (Links, Notizen), Ableitungen per KI
- "SEO": Score (0-100), Keyword-Dichte, Lesbarkeit (Flesch-Kincaid DE),
  Auto-Tags, Hashtag-Generator, Meta-Titel + Meta-Description, Google-Vorschau

### Unified Formatting Toolbar
BlockNote `FormattingToolbarController` mit 4 Modi:
- `format` – Standard-Formatierung (Bold, Italic, Link, etc.)
- `ai` – 6 KI-Aktionen (Verbessern, Kürzen, etc.)
- `loading` – Spinner während KI-Call
- `result` – Kompakter Indikator + Portal-Panel (400px, fixed, unterhalb Selection)

### BlockNote – korrekte API
```jsx
import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import "@blocknote/ariakit/style.css";          // ← PFLICHT für Slash-Menü-Icons
import { useCreateBlockNote, FilePanelController,
         FormattingToolbarController, FormattingToolbar } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit"; // ← NICHT aus @blocknote/react!
import { createPortal } from "react-dom";

<BlockNoteView editor={editor} theme="light" filePanel={false} formattingToolbar={false}>
  <FormattingToolbarController formattingToolbar={UnifiedFormattingToolbar} />
  <FilePanelController filePanel={MediaLibraryFilePanel} />
</BlockNoteView>
```

### STORY_CHANNELS (erweitert CHANNELS)
```js
export const STORY_CHANNELS = [
  ...CHANNELS, // instagram, twitter, linkedin, facebook, whatsapp
  { id:"website", label:"Website / Blog",  color:"#0EA5E9", ... },
  { id:"print",   label:"Print / Zeitung", color:"#64748B", ... },
];
// CHANNELS (ohne website/print) für Publisher, Admin, Editor verwenden!
```

---

## Feature: UGC Portal (`src/pages/UGCPortalPage.jsx`)

Einreichungsportal für externe Inhalte (Vereine, Schulen, Organisationen).
Inspiriert von StoryBox (Schwäbische Zeitung).

### Workflow
1. Externe Einreichung über öffentliches Formular (Preview-Modal)
2. Redaktion sieht alle Einreichungen gefiltert nach Mandant
3. Genehmigen → optional direkt als Story importieren (öffnet StoryEditorModal)
4. Ablehnen mit interner Notiz

### Datenmodell
```js
{
  id, workspaceId, submittedAt,
  name, email, title, articleLength:"short"|"medium"|"long",
  text, imageCount, category, rightsConfirmed:bool,
  status:"pending"|"approved"|"rejected",
  storyId:null|string, notes:string
}
```

---

## Feature: Instagram Monitoring

**MonitoringPage** – Account per @Username hinzufügen, Profil-Stats, Post-Grid.
**ig-monitor.js** – `POST /ig-monitor` → Facebook Business Discovery API.
⚠️ Benötigt echten Clerk-Account + Instagram Business Token.

---

## Datenmodelle

### Post
```js
{ id, workspaceId, title, content, channels:[],
  status:"draft"|"pending"|"scheduled"|"published",
  scheduledDate, scheduledTime, mediaId, campaignId, storyId, deleted:false,
  updatedAt }
```

### Story
```js
{ id, workspaceId, title, subtitle,
  blocks:[],          // BlockNote JSON
  materials:[{id, type:"link"|"note"|"image", url, title, addedAt}],
  derivatives:[{id, channel, postId, createdAt}],
  targetChannels:[], status:"idea"|"draft"|"ready"|"published",
  category, tags, seoKeyword, metaTitle, metaDesc, hashtags,
  comments:[{id, text, authorId, authorName, createdAt, resolved}],
  history:[{id, savedAt, savedBy, wordCount, title}],
  lockedBy:null|{userId, name, since},
  createdAt, updatedAt }
```

### Kampagne
```js
{ id, workspaceId, name, icon, color, description, goal, status,
  startDate, endDate, channels:[], budget:{total, spent, currency},
  kpis:{impressions, reach, engagementRate, clicks} }
```

### Media-Item
```js
{ id, workspaceId, name, url, type:"image"|"video"|"logo"|"document",
  size, date, width, height, tags, description, altText, category,
  focusPoint:{x,y}, mood, analyzing:bool, aiError:bool,
  aiAnalysis:{score, platforms, colors, tags, description, suggestedAlt, focalPoint},
  source:"upload"|"unsplash"|"pexels"|"pixabay" }
```

### Workspace
```js
{ id, name, color, emoji, description }
```

### WorkspaceMember
```js
{ workspaceId, userId, role:"admin"|"editor"|"viewer" }
```

---

## Tests (116 Tests, alle grün)

```bash
node node_modules/.bin/vitest run
```

```
src/__tests__/
├── utils.test.js       – uid, getMediaType, fmtDate, fpos, parseJSON
├── demo.test.js        – CHANNELS, STORY_CHANNELS, ROLES, DEMO_CAMPAIGNS, DEMO_POSTS, STAGES
├── campaigns.test.js   – dateProg, fmtBudget
└── components/
    ├── ui.test.jsx     – Btn, Badge, Avatar
    └── postcard.test.jsx – PostCard-Rendering
```

---

## Kritische Regeln (niemals brechen)

| ❌ Verboten | ✅ Korrekt |
|---|---|
| `C` oder `T` in Komponente definieren | Aus `constants/colors.js` importieren |
| `useMemo`/`useCallback` entfernen | Bestehende Memoization erhalten |
| `api.anthropic.com` direkt aufrufen | Immer über `/ai` Cloudflare Function |
| `.env` committen | Nur in Cloudflare Dashboard setzen |
| `console.log` stehen lassen | Nur `console.error` in catch-Blöcken |
| `CHANNELS` im Story-Editor nutzen | `STORY_CHANNELS` verwenden |
| `BlockNoteView` aus `@blocknote/react` | Aus `@blocknote/ariakit` |
| `@blocknote/ariakit/style.css` weglassen | Immer importieren |
| `filePanel` direkt auf `BlockNoteView` | `<FilePanelController filePanel={...} />` |
| `formattingToolbar` direkt auf `BlockNoteView` | `<FormattingToolbarController ... />` |
| `loadedRef`-Guard weglassen | Immer `if(!loadedRef.current) return` |
| Dropdown mit `onClick` außen schließen | `mousedown` verwenden (feuert vor `click`) |
| `currentWorkspace: ... \|\| DEMO_WORKSPACES[0]` | `null` zurückgeben wenn kein Mandant |

---

## Entwicklungsstand (Stand: 10. April 2026)

### ✅ Fertig & Live
- Dashboard (Widgets, Timeline, Stats, Right Sidebar mit drag-barer Widget-Reihenfolge)
- Publisher (Kanban-Board mit Drag & Drop, Status- + Kampagnen-Modus)
- Kalender (Monats- + Agenda-Ansicht)
- Planner (Gantt-Timeline)
- Kampagnen-Verwaltung
- Medienbibliothek (Upload, KI-Analyse, Fokuspunkt, Workspace-Filterung)
- Performance (Mock-Analytics)
- Admin (Kanal-Setup, Team, Mandanten-Tab, Instagram Token Guide)
- Post-Editor (mit KI-Panel: Optimize, Hashtags, Varianten, Score, Hook, Ideas)
- **Story-Workflow** (BlockNote-Editor, SEO-Panel, Unified Toolbar, KI-Ableitungen)
- **Instagram Monitoring** (Business Discovery API)
- **Multi-Tenant / Mandanten-System** (4 Demo-Mandanten, Sidebar-Switcher, Workspace-Filterung)
- **UGC Portal** (Einreichungen, Genehmigungs-Workflow, Story-Import)
- Papierkorb, Recherche-Seite

### 🔄 Ideen / Nächste Schritte
- Workspace-Zugriffsrechte per Klick änderbar (aktuell read-only Demo)
- KV-Persistenz pro Workspace (aktuell flat keys)
- Instagram Monitoring Demo-Mode ohne Clerk
- Story-Ableitungen: Preview vor dem Erstellen
- Mobile Responsive (aktuell Desktop-optimiert)
- Echter Publish-Endpunkt

---

## Secrets & Umgebungsvariablen

Niemals committen. In Cloudflare Pages Dashboard setzen:
- `ANTHROPIC_API_KEY` – für `/ai` Function
- `CF_KV_NAMESPACE` – für `/store` Function
- Clerk Publishable/Secret Key – in `main.jsx` (Dev-Key für lokale Arbeit)

API-Keys für Stock-Suche (Unsplash, Pexels, Pixabay):
→ User gibt sie im Admin-Bereich ein → werden in `localStorage` gespeichert.
