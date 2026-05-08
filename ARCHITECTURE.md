# SocialFlow Pro – Architecture

> Vollständiger Projektkontext: **[CLAUDE.md](./CLAUDE.md)** (autoritativ, wird bei jeder Claude-Session geladen)

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| Frontend | React 18 + Vite | Single-Page-App, State-based Routing |
| Styling | Inline-Styles only | Kein CSS, kein Tailwind, keine CSS Modules |
| Icons | lucide-react | `strokeWidth={IW}` (IW = 1.7) überall |
| Auth | Clerk (dev key) | Demo-Login via `DEMO_USERS` ohne echten Account |
| State | React Context (`AppContext`) | Kein Redux, Zustand oder externes State-Mgmt |
| Persistence | Cloudflare KV | `/store` Function, Clerk-JWT gesichert |
| AI | Anthropic Claude API | Proxy via `/ai` Cloudflare Function (NIEMALS direkt) |
| Rich Text | BlockNote v0.47.3 | Story-Editor, `@blocknote/ariakit` für korrekte UI |
| Deployment | Cloudflare Pages | Auto-deploy von `main` Branch, ~30 Sek |
| Live URL | https://socialflow-pro.pages.dev | |
| Repo | https://github.com/manus42ppi/socialflow-pro | |

---

## Repository Layout

```
socialflow-pro/
├── src/
│   ├── App.jsx                    # Root + State-basiertes Routing
│   ├── main.jsx                   # Vite Entry, ClerkProvider
│   ├── constants/
│   │   ├── colors.js              # C, T (Farb-Tokens), FONT, IW, CSS
│   │   ├── demo.js                # CHANNELS, STORY_CHANNELS, ROLES, DEMO_USERS,
│   │   │                          # DEMO_WORKSPACES, DEMO_WORKSPACE_MEMBERS,
│   │   │                          # DEMO_CAMPAIGNS, DEMO_POSTS, DEMO_STORIES, DEMO_MEDIA
│   │   └── nav.js                 # NAV_GROUPS, NAV_UTILITY, TITLE-Map
│   ├── context/
│   │   └── AppContext.jsx         # Gesamter App-State, Multi-Tenant, KV-Persistenz
│   ├── utils/
│   │   └── store.js               # uid, aiCall, storeGet, storeSet, AI-Objekt, …
│   ├── components/
│   │   ├── ui/                    # Primitives (Btn, Badge, Avatar, …) + ChIco
│   │   ├── layout/                # Sidebar (inkl. Mandanten-Switcher), TopBar, GlobalRightSidebar
│   │   ├── previews/              # IGPrev, TWPrev, LIPrev, FBPrev, TKPrev, WAPrev
│   │   ├── widgets/               # WeekStrip, MiniGantt, Board
│   │   ├── AIPanel.jsx
│   │   ├── Login.jsx
│   │   ├── MediaDetail.jsx
│   │   ├── PostCard.jsx
│   │   └── StockSearch.jsx
│   ├── pages/                     # Dashboard, Publisher, Calendar, Planner, UGCPortalPage, …
│   ├── modals/                    # Editor, StoryEditorModal, SchedModal, PostDetailDrawer
│   └── __tests__/                 # Vitest unit tests (116 Tests)
├── functions/                     # Cloudflare Pages Functions
│   ├── ai.js                      # POST /ai → Anthropic API Proxy
│   ├── store.js                   # POST /store → KV (Clerk-JWT)
│   ├── instagram.js               # POST /instagram
│   ├── ig-monitor.js              # POST /ig-monitor (Business Discovery API)
│   └── rss.js                     # GET /rss
├── e2e/                           # Playwright E2E Tests
├── wrangler.json                  # Cloudflare KV-Binding
├── vite.config.js
└── playwright.config.js
```

---

## State Architecture

Gesamter App-State lebt in `AppContext.jsx` und wird via `useApp()` Hook bereitgestellt.

### Workspace-Filterung
```
Raw State:         posts, campaigns, stories, items  (alle Mandanten)
Filtered (UI):     filteredPosts, filteredCampaigns, filteredStories, filteredItems
Context exposes:   posts = filteredPosts, campaigns = filteredCampaigns, etc.
KV Persistence:    schreibt raw state (nicht gefiltert)
```

### KV-Persistenz-Pattern (Load-Guard)
```js
// Laden (re-runs bei Login/Logout)
useEffect(() => {
  storeGet("posts").then(data => {
    postsLoaded.current = true;
    if (data?.length) setPosts(data);
    else setPosts(DEMO_POSTS);
  });
}, [isSignedIn, isLoaded]);

// Speichern (Guard verhindert Überschreiben vor dem Laden)
useEffect(() => {
  if (!postsLoaded.current) return;
  storeSet("posts", posts); // raw posts, nie filteredPosts
}, [posts]);
```

Demo-User haben keinen Clerk-Account → `storeGet` gibt null zurück → localStorage-Fallback für Media.

---

## Routing

Rein State-basiert via `nav`-String in `AppContext`. Kein React Router. Browser-Back funktioniert nicht.

```
dashboard | publisher | trash | stories | ugc | campaigns |
media | calendar | planner | performance | research | monitoring | admin
```

---

## Design System

### Farb-Tokens – `src/constants/colors.js`

```js
const C = { bg, surface, border, borderLight,
            text, textMid, textSoft, textMute,
            accent, accentHov, accentLight,
            success, warning, info,
            gradient, gradientHov }

const T = { gray50…gray900, white,
            brand25, brand50, brand100, brand200,
            warning500, warningBg, warningText,
            success500, successBg, successText,
            error600, errorBg,
            rSm, rMd, rLg, shadowXs, shadowLg }
```

- `FONT = "Inter, system-ui, sans-serif"` — Body
- `FONT_DISPLAY = "'Clash Display', 'Plus Jakarta Sans', Inter, sans-serif"` — Headlines
- `IW = 1.7` — Standard `strokeWidth` für alle Lucide-Icons
- `CSS` — Keyframes-String (spin, fadeUp, fadeIn, shimmer, pulse, glow)

⚠️ `C` und `T` sind Modul-Level — niemals innerhalb einer Komponente definieren.

---

## Story-Workflow (BlockNote)

`StoryEditorModal` nutzt BlockNote v0.47.3 mit ariakit-Integration:

```jsx
import { BlockNoteView } from "@blocknote/ariakit";   // ← aus ariakit, nicht react!
import "@blocknote/ariakit/style.css";                 // ← Pflicht für Slash-Menü
import { FormattingToolbarController, FilePanelController } from "@blocknote/react";

<BlockNoteView editor={editor} filePanel={false} formattingToolbar={false}>
  <FormattingToolbarController formattingToolbar={UnifiedFormattingToolbar} />
  <FilePanelController filePanel={MediaLibraryFilePanel} />
</BlockNoteView>
```

### UnifiedFormattingToolbar
Vereint Formatierung + KI in einem BlockNote-nativen Toolbar:
- `format` → Formatierungs-Buttons
- `ai` → 6 KI-Aktionen
- `loading` → Spinner
- `result` → Kompakter Status + Portal-Panel mit vollem KI-Text (400px, `position:fixed`)

### SEO-Panel (rechte Sidebar, Tab "SEO")
- Score 0–100 (grün/amber/rot) basierend auf Keyword-Checks
- Lesbarkeit: Flesch-Kincaid adaptiert für Deutsch (`FRE = 180 − ASL − 58.5 × ASW`)
- Auto-Tags via KI, Hashtag-Generator via KI
- Meta-Titel + Meta-Description + Google-Vorschau

`MediaLibraryFilePanel` öffnet via `createPortal` ein Vollbild-Modal über dem gesamten UI.

---

## Multi-Tenant System

### Konzept
Marketing-Agentur verwaltet mehrere Mandanten. Alle Daten (Posts, Kampagnen, Storys, Medien) sind `workspaceId`-gestempelt. Sidebar-Switcher wechselt den aktiven Mandanten, alle Views filtern automatisch.

### Sidebar-Switcher (kritisches Pattern)
```js
// Außenklick-Schließung MUSS mousedown verwenden, nicht click!
// (mousedown feuert vor click → click auf Dropdown-Item wird sonst nie registriert)
useEffect(() => {
  if (!wsOpen) return;
  const close = () => setWsOpen(false);
  document.addEventListener("mousedown", close);
  return () => document.removeEventListener("mousedown", close);
}, [wsOpen]);

// Dropdown-Container stoppt mousedown-Propagation:
<div onMouseDown={e => e.stopPropagation()}>
  {/* Workspace-Buttons */}
</div>
```

### currentWorkspace = null
Wenn `currentWorkspaceId === null` → "Alle Mandanten". `currentWorkspace` gibt `null` zurück
(NICHT `DEMO_WORKSPACES[0]` als Fallback!). Sidebar zeigt "ALL"-Badge.

---

## UGC Portal

`src/pages/UGCPortalPage.jsx` – Einreichungsportal für externe Inhalte.

- Submissions sind `workspaceId`-gestempelt und filtern mit dem Mandanten-Switcher
- `useEffect([currentWorkspaceId])` setzt Filter/Suche/Auswahl beim Wechsel zurück
- Genehmigungs-Workflow: `pending → approved` mit optionalem Story-Import via `setEdStory`

---

## Tests

| Framework | Zweck | Ausführen |
|---|---|---|
| Vitest | Unit + Component Tests (116 Tests) | `node node_modules/.bin/vitest run` |
| Playwright | E2E Tests (Chromium) | `node node_modules/.bin/playwright test` |
