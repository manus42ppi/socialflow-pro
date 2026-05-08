# SocialFlow Pro – Claude Projektkontext

> **Dieses Dokument ist die einzige Quelle der Wahrheit für Claude Code.**
> Es wird bei jeder Session automatisch geladen. Vollständig aktuell halten.

---

## 1. Infrastruktur & Branches

| Layer | Technologie | URL / Details |
|---|---|---|
| Frontend | React 18 + Vite | Single-Page-App, Inline-Styles, kein CSS/Tailwind |
| Auth | Clerk (Dev-Key) | Demo-Login via `DEMO_USERS` in `constants/demo.js` |
| AI-Proxy | Cloudflare Function | `POST /ai` → Anthropic API (NIEMALS direkt!) |
| KV-Store | Cloudflare KV | `POST /store` → Clerk-JWT geschützt, Demo-User: kein KV |
| Backend | `functions/` | Cloudflare Pages Functions (ai, store, instagram, ig-monitor, rss) |
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

# Tests ausführen (141 Tests, müssen alle grün sein vor jedem Push)
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
  const target = clickable.find(el => el.textContent.trim() === 'Storys');
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

### BlockNote AddBlockButton – vollständiger Test

```js
// Schritt 1: Block hovern → SideMenu erscheint
const block = document.querySelector('[data-node-type="blockContainer"]');
const r0 = block.getBoundingClientRect();
block.dispatchEvent(new MouseEvent('mouseover', { bubbles:true, clientX:r0.left+20, clientY:r0.top+10 }));
block.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX:r0.left+20, clientY:r0.top+10 }));

// Schritt 2: 400ms warten → + Button suchen → echtes mousedown dispatchen
await new Promise(r => setTimeout(r, 400));
const addBtn = [...document.querySelectorAll('button')].find(b => b.title === 'Block einfügen');
const r1 = addBtn.getBoundingClientRect();
addBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true,
  clientX: r1.left + r1.width/2, clientY: r1.top + r1.height/2 }));

// Schritt 3: 500ms warten → Picker prüfen (muss im DOM sein, auch wenn SideMenu umgehängt wurde)
await new Promise(r => setTimeout(r, 500));
const pickerOK = document.body.innerHTML.includes('Block-Typ') &&
  document.body.innerHTML.includes('Aufzählung');

// Schritt 4: Item im Picker anklicken (echtes mousedown)
const menu = [...document.querySelectorAll('div')].find(d =>
  d.textContent.includes('Block-Typ') && d.textContent.includes('Aufzählung'));
const h2Row = [...menu.querySelectorAll('div')].find(d => d.textContent.trim() === 'H2Überschrift 2');
const r2 = h2Row.getBoundingClientRect();
h2Row.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true,
  clientX: r2.left + r2.width/2, clientY: r2.top + r2.height/2 }));

// Schritt 5: 400ms warten → Block-Typ prüfen
await new Promise(r => setTimeout(r, 400));
const blocks = [...document.querySelectorAll('[data-node-type="blockContainer"]')]
  .map(b => ({ type: b.querySelector('[data-content-type]')?.getAttribute('data-content-type'),
               tag: b.querySelector('h1,h2,h3')?.tagName }));
// Erwartung: [ {type:'paragraph', tag:null}, {type:'heading', tag:'H2'} ]
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
│   ├── MediaPage.jsx
│   ├── PerformancePage.jsx
│   ├── MonitoringPage.jsx
│   ├── AdminPage.jsx
│   ├── TrashPage.jsx
│   ├── ResearchPage.jsx
│   └── UGCPortalPage.jsx
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
        └── postcard.test.jsx

functions/
├── ai.js          # POST /ai → Anthropic API Proxy (claude-sonnet-4-6)
├── store.js       # POST /store → Cloudflare KV (Clerk-JWT required)
├── instagram.js   # POST /instagram
├── ig-monitor.js  # POST /ig-monitor → Business Discovery API
└── rss.js         # GET /rss → RSS-Feed Proxy
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

---

## 8. Story-Workflow (BlockNote v0.47.3)

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
- **Links (230px):** Status, Kategorie, STORY_CHANNELS, Tags, Kommentare, History
- **Mitte:** Titel (FONT_DISPLAY, 32px) + Subtitle + BlockNote-Editor
- **Rechts (300px):** Tabs "Info" (Materialien, Ableitungen) + "SEO" (Score, Lesbarkeit, Meta)

---

## 9. Tests

```bash
# Alle Tests ausführen (141 Tests, alle müssen grün sein)
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
| `ui.test.jsx` | Btn, Badge, Avatar |
| `postcard.test.jsx` | PostCard-Rendering |

---

## 10. Datenmodelle

### Post
```js
{ id, workspaceId, title, content, channels:[],
  status:"draft"|"pending"|"scheduled"|"published",
  scheduledDate, scheduledTime, mediaId, campaignId, storyId, deleted:false, updatedAt }
```

### Story
```js
{ id, workspaceId, title, subtitle, blocks:[],
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

---

## 11. Kritische Regeln

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

---

## 12. Secrets & Umgebungsvariablen

Niemals committen. In Cloudflare Pages Dashboard setzen:
- `ANTHROPIC_API_KEY` – für `/ai` Function
- Clerk Keys – in `main.jsx` (Dev-Key für lokale Arbeit, nie committen)

API-Keys für Stock-Suche (Unsplash, Pexels, Pixabay):
→ User gibt sie im Admin-Bereich ein → `localStorage`

---

## 13. Entwicklungsstand (Mai 2026)

### ✅ Fertig
- Dashboard, Publisher (Kanban), Kalender, Planner (Gantt), Kampagnen
- Medienbibliothek (Upload, KI-Analyse, Fokuspunkt)
- Performance (Mock-Analytics), Instagram Monitoring
- Post-Editor (KI-Panel), Story-Workflow (BlockNote, SEO, Ableitungen)
- Multi-Tenant / Mandanten-System (4 Demo-Mandanten)
- UGC Portal (Einreichungen, Genehmigungs-Workflow)
- Build-Metadaten: `v1.0.{BUILD_NUMBER}` in Sidebar + Login

### 🔄 Geplant / Nächste Schritte
- Medienbibliothek: KI-Analyse-Persistenz, Overlay-Fixes, Datei-Typ/Auflösung (Plan existiert)
- Workspace-Zugriffsrechte änderbar machen
- Mobile Responsive
- Echter Publish-Endpunkt
