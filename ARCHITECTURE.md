# SocialFlow Pro – Architecture

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Inline styles (no CSS modules, no Tailwind) |
| Icons | lucide-react |
| Auth | Clerk (dev key in `main.jsx`); demo login built into `App.jsx` |
| State | React built-in (`useState`, `useReducer`-style patterns) |
| Persistence | Cloudflare KV via a `/store` HTTP endpoint |
| AI | Anthropic Claude API via a Node.js proxy at port 3002 (`/ai` endpoint) |
| Deployment | Cloudflare Pages — auto-deploys from `main` branch in ~30 s |
| Live URL | https://socialflow-pro.pages.dev |

Backend services (not in this repo):
- `socialflow-backend` — Node.js/Express, port 3001 (handles `/store` KV reads/writes and `/upload`)
- `socialflow-ai` — Node.js proxy, port 3002 (proxies requests to `api.anthropic.com`)

---

## Repository Layout

```
socialflow-pro/
├── src/
│   ├── App.jsx        # Entire application (~4900 lines, single-file SPA)
│   └── main.jsx       # React DOM entry, Clerk provider
├── public/
├── index.html
├── vite.config.js
├── package.json
├── ARCHITECTURE.md    # This file
└── COMPONENTS.md      # Component reference
```

---

## Single-File Architecture

All components, hooks, constants, and utilities live in `src/App.jsx`. This is an intentional design choice: zero build complexity, no import graph to manage, easy to grep the full codebase.

**Section order in `App.jsx`:**

| Lines | Content |
|---|---|
| 1–33 | React/lucide imports, module-level constants (`FONT`, `FONT_DISPLAY`, `IW`, `C`) |
| 34–47 | CSS keyframes string injected via `<style>` tag |
| 50–85 | Domain data constants (CHANNELS, ROLES, DEMO_USERS, STAGES, CAMP_COLORS, DEMO_CAMPAIGNS, DEMO_POSTS) |
| 88–109 | Utilities: `uid`, `fileToDataURL`, `getMediaType`, `fmtDate`, `fpos`, `aiCall`, `storeGet`, `storeSet` |
| 110–145 | `AI` object: `optimize`, `hashtags`, `variants`, `score`, `rewrite`, `hook`, `ideas`, `emojis`, `analyzeImg` |
| 146–211 | UI primitives: `Sp`, `Badge`, `Avatar`, `Btn`, `Card`, `FL`, `TIn`, `SBadge`, `SCrd` |
| 213–329 | Channel SVG icons (`ChIco`) and channel preview components (`IGPrev`, `TWPrev`, `LIPrev`, `FBPrev`, `TKPrev`, `WAPrev`) |
| 329 | `PREV` lookup map: `{instagram:IGPrev, twitter:TWPrev, ...}` |
| 330–393 | `Login` component |
| 395–569 | `NAV_GROUPS`, `DEMO_STORIES`, `NAV`, `Sidebar`, `TopBar` |
| 571–861 | `AIPanel` (score/optimize/rewrite/hook/hashtags/variants/ideas tabs) |
| 863–1142 | Stock image search: `STOCK_SRCS`, `stockSearch`, `SrcBadge`, `FP`, `Skeletons`, `StockKeyPanel`, `MediaPicker` |
| 1144–1394 | `MediaDetail` modal |
| 1396–1751 | `Editor` modal (main post editor) |
| 1752–1879 | `SchedModal`, `PostCard` |
| 1880–1977 | `KCard`, `Board` (Kanban view) |
| 1979–2095 | `CampaignsPage` |
| 2096–2446 | `MediaPage` (`LibTile`, `ExtTile`) |
| 2448–2585 | `MiniGantt` (dashboard widget) |
| 2587–2807 | `GlobalRightSidebar` |
| 2809–2874 | `WeekStrip` |
| 2876–2930 | `useSections` hook + `SecCard` component |
| 2932–3223 | `Dashboard` |
| 3225–3284 | `TrashPage` |
| 3286–3409 | `PublisherPage` |
| 3411–3488 | `PerformancePage` |
| 3490–3822 | `CalendarPage` (`AgendaView`, `MonthView`) |
| 3824–4093 | `PlannerPage` (Gantt timeline) |
| 4095–4399 | `AdminPage` |
| 4400–4599 | `StoryEditorModal` |
| 4601–4724 | `StoriesPage` |
| 4726–4875 | `App` root (default export) |

---

## State Management

All state lives in the `App` root component and is passed down as props. There is no Redux, Zustand, or context.

**Top-level state:**

| State | Type | Description |
|---|---|---|
| `user` | object\|null | Logged-in user; `null` shows Login screen |
| `nav` | string | Current page: `"dashboard"`, `"publisher"`, etc. |
| `posts` | Post[] | All posts including deleted (soft-delete via `deleted:true`) |
| `items` | MediaItem[] | Media library items |
| `campaigns` | Campaign[] | Campaigns |
| `stories` | Story[] | Story articles |
| `edPost` | Post\|null | Post currently open in Editor modal |
| `schPost` | Post\|null | Post currently open in SchedModal |
| `edStory` | Story\|null | Story open in StoryEditorModal |
| `filt` | string | Status filter for PublisherPage |
| `chFilt` | string | Channel filter for PublisherPage |

**KV Persistence pattern:**

Each entity (posts, campaigns, stories, media) has two effects:
1. Load on mount: `storeGet(key).then(data => { if(data?.length) setState(data); loadedRef.current=true; })`
2. Save on change: `useEffect(()=>{ if(!loadedRef.current) return; storeSet(key, state); }, [state])`

The `loadedRef` guard prevents writing stale demo data before the KV load completes.

**Media storage:** Media index (metadata) and image data are stored separately:
- `media:index` — array of metadata objects (no base64 URLs)
- `media:img:{id}` — `{url: "data:image/..."}` for each image

---

## Routing

Single-level flat routing via `nav` string state. Navigation is controlled by:
- `goNav(n)` — navigate and reset filters
- `goFilter(pg, f)` — navigate and set status filter
- `goChNav(chId)` — navigate to publisher with a channel filter

No React Router. URL does not reflect current page (SPA with no history API).

---

## Design System

### Color Tokens (`C` object, module-level)

```js
const C = {
  bg, surface, border, borderLight,
  text, textMid, textSoft, textMute,
  accent, accentHov, accentLight,
  success, warning, info,
  gradient, gradientHov,
}
```

All colors reference CSS variables or hardcoded hex values. `C` is defined once at module level and never recreated.

### Font System

| Constant | Value | Usage |
|---|---|---|
| `FONT` | `"Inter, system-ui, sans-serif"` | All body text, UI elements |
| `FONT_DISPLAY` | `"'Clash Display', 'Plus Jakarta Sans', Inter, sans-serif"` | Headings, display text |
| `IW` | `1.7` | Default `strokeWidth` for all lucide icons |

### Spacing

`Sp` component: `<Sp n={8}/>` renders a `div` with `height: n` and `width: n`. Used as a spacer.

### CSS Animations

Keyframes are injected as a string via `<style>{CSS}</style>` in the App root. Animations: `spin`, `fadeUp`, `fadeIn`, `shimmer`, `pulse`, `glow`.

---

## Component Patterns

### Drag-and-Drop System

HTML5 native drag API (no library). Two implementations:

**`useSections` + `SecCard` (widget reordering):**
- Used in Dashboard, PerformancePage, StoriesPage, GlobalRightSidebar
- `useSections(key, userId, defaultOrder)` — manages widget order in localStorage
- `SecCard` — draggable container with visual drop indicator
- LocalStorage key: `sections_v2_{key}_{userId}`

**GlobalRightSidebar internal drag:**
- Custom drag state (`dragId` ref + `dragOver` state)
- Handles reordering of sidebar widgets independently

**Board (Kanban) drag:**
- Native drag events on `KCard` components
- Moves posts between status columns by calling `onStatus`

### AI Integration

`AI` object provides async methods that call `aiCall(prompt)`:
- All AI calls go to `/ai` endpoint (proxy), never directly to Anthropic
- Methods: `optimize`, `hashtags`, `variants`, `score`, `rewrite`, `hook`, `ideas`, `emojis`, `analyzeImg`
- `analyzeImg` sends base64 image data with vision prompt

### Stock Image Search

`stockSearch(source, query)` — fetches from Unsplash/Pexels/Pixabay using API keys stored in localStorage (`apikeys` KV key). API keys are user-managed via AdminPage.

### Auto-Save Pattern

Both `Editor` and `StoryEditorModal` implement 30-second auto-save:
- A `ref` always holds the latest form state (`formRef.current = form`)
- `useEffect` debounces a 30s timer on content changes
- The timer callback reads from the ref (not the closure) to get fresh form data
- Prevents stale data being written on auto-save

---

## Known Limitations

- **Single file**: `App.jsx` is ~4900 lines. There are no tests, no component splitting, and no code splitting.
- **No real auth**: Clerk is initialized but the app uses a demo login with hardcoded users (`DEMO_USERS`). Any credentials are accepted.
- **PerformancePage mock data**: Reach/engagement numbers in PerformancePage are generated with `Math.random()` on mount (wrapped in `useMemo` to prevent flicker). No real analytics backend.
- **No URL routing**: Page navigation does not update browser history. Back button does not work.
- **Media storage size**: Images are stored as base64 in Cloudflare KV. Large images or many uploads may hit KV value size limits.
- **No optimistic updates**: KV writes are fire-and-forget. Network failures silently lose data.
- **LocalStorage widget order**: Widget order preferences are stored in localStorage per user ID, not synced across devices.
