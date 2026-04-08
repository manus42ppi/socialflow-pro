# SocialFlow Pro – Architecture

> Vollständiger Projektkontext: **[CLAUDE.md](./CLAUDE.md)** (autoritativ, wird bei jeder Claude-Session geladen)

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| Frontend | React 19 + Vite | Single-Page-App, State-based Routing |
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
│   │   ├── colors.js              # C (Farb-Tokens), FONT, FONT_DISPLAY, IW, CSS
│   │   ├── demo.js                # CHANNELS, STORY_CHANNELS, DEMO_USERS, DEMO_POSTS …
│   │   └── nav.js                 # NAV_GROUPS, TITLE-Map
│   ├── context/
│   │   └── AppContext.jsx         # Gesamter App-State + KV-Persistenz
│   ├── utils/
│   │   └── store.js               # uid, aiCall, storeGet, storeSet, AI-Objekt, …
│   ├── components/
│   │   ├── ui/                    # Primitives (Btn, Badge, Avatar, …) + ChIco
│   │   ├── layout/                # Sidebar, TopBar, GlobalRightSidebar
│   │   ├── previews/              # IGPrev, TWPrev, LIPrev, FBPrev, TKPrev, WAPrev
│   │   ├── widgets/               # WeekStrip, MiniGantt
│   │   ├── AIPanel.jsx            # KI-Assistent (im Post-Editor)
│   │   ├── Login.jsx
│   │   ├── MediaDetail.jsx
│   │   ├── PostCard.jsx
│   │   └── StockSearch.jsx
│   ├── pages/                     # Dashboard, Publisher, Calendar, Planner, …
│   ├── modals/                    # Editor, StoryEditorModal, SchedModal, …
│   └── __tests__/                 # Vitest unit + Playwright E2E
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

```
posts, campaigns, stories, items (media),
nav, edPost, edStory, schPost, detailPost,
user, isLoaded, setDemoUser,
setPosts, setCampaigns, setStories, setItems,
setNav, setEdPost, setEdStory, setSchPost, setDetailPost,
uploadItem, updateItem, saveStory, newStory
```

### KV-Persistenz-Pattern (Load-Guard)

```js
// Laden beim Start
useEffect(() => {
  storeGet("posts").then(data => {
    if (data?.length) setPosts(data);
    loadedRef.current = true;
  });
}, []);

// Speichern (Guard verhindert Überschreiben vor dem Laden)
useEffect(() => {
  if (!loadedRef.current) return;
  storeSet("posts", posts);
}, [posts]);
```

Demo-User haben keinen Clerk-Account → `storeGet` gibt null zurück → kein KV-Persist.

---

## Routing

Rein State-basiert via `nav`-String in `AppContext`. Kein React Router. Browser-Back funktioniert nicht.

```
dashboard | publisher | drafts | trash | campaigns | media |
calendar | planner | performance | research | monitoring | stories | admin
```

---

## Design System

Alle Tokens in `src/constants/colors.js`:

```js
const C = { bg, surface, border, borderLight,
            text, textMid, textSoft, textMute,
            accent, accentHov, accentLight,
            success, warning, info, gradient, gradientHov }
```

- `FONT = "Inter, system-ui, sans-serif"` — Body
- `FONT_DISPLAY = "'Clash Display', 'Plus Jakarta Sans', Inter, sans-serif"` — Headlines
- `IW = 1.7` — Standard `strokeWidth` für alle Lucide-Icons
- `CSS` — Keyframes-String (spin, fadeUp, fadeIn, shimmer, pulse, glow)

⚠️ `C` ist Modul-Level — niemals innerhalb einer Komponente definieren.

---

## Story-Workflow (BlockNote)

`StoryEditorModal` nutzt BlockNote v0.47.3 mit korrekter ariakit-Integration:

```jsx
import { BlockNoteView } from "@blocknote/ariakit";   // ← aus ariakit, nicht react!
import "@blocknote/ariakit/style.css";                 // ← Pflicht für Slash-Menü
import { FilePanelController } from "@blocknote/react";

<BlockNoteView editor={editor} filePanel={false}>
  <FilePanelController filePanel={MediaLibraryFilePanel} />
</BlockNoteView>
```

`MediaLibraryFilePanel` öffnet via `createPortal` ein Vollbild-Modal über dem gesamten UI.

---

## Tests

| Framework | Zweck | Ausführen |
|---|---|---|
| Vitest | Unit + Component Tests | `node node_modules/.bin/vitest run` |
| Playwright | E2E Tests (Chromium) | `node node_modules/.bin/playwright test` |
| GitHub Actions | CI bei Push auf `main` | Automatisch |
