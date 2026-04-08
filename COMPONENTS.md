# SocialFlow Pro – Component Reference

> Vollständiger Projektkontext: **[CLAUDE.md](./CLAUDE.md)** (autoritativ)
> Architektur-Übersicht: **[ARCHITECTURE.md](./ARCHITECTURE.md)**

---

## UI Primitives — `src/components/ui/index.jsx`

| Komponente | Props | Zweck |
|---|---|---|
| `Sp` | `n` | Spacer (width + height = n px) |
| `Badge` | `color`, `bg`, `children` | Pill-Label |
| `Avatar` | `name`, `size`, `color` | Initials-Avatar |
| `Btn` | `onClick`, `variant`, `size`, `disabled`, `loading`, `icon` | Button (primary/ghost/danger) |
| `Card` | `style`, `children` | Surface-Box mit Border + Radius |
| `FL` | `gap`, `align`, `justify`, `wrap`, `children` | Flexbox-Helper |
| `TIn` | `value`, `onChange`, `placeholder`, `style` | Text-Input |
| `SBadge` | `status` | Status-Pill (draft/pending/scheduled/published) |
| `SCrd` | `children`, `style` | Section-Card (leichtes Surface) |

---

## Channel Icons — `src/components/ui/ChIco.jsx`

```jsx
<ChIco id="instagram" size={20} />
// id: instagram | twitter | linkedin | facebook | whatsapp | website | print
```

---

## Layout — `src/components/layout/`

| Datei | Zweck |
|---|---|
| `Sidebar.jsx` | Linke Navigation (NAV_GROUPS, User-Info) |
| `TopBar.jsx` | Suchleiste + Notifications + "Neuer Post"-Button |
| `GlobalRightSidebar.jsx` | Rechte Sidebar (Widgets: Agenda, Drafts, Media, Campaigns) mit eigenem Drag |

---

## Previews — `src/components/previews/index.jsx`

| Komponente | Kanal |
|---|---|
| `IGPrev` | Instagram |
| `TWPrev` | Twitter/X |
| `LIPrev` | LinkedIn |
| `FBPrev` | Facebook |
| `TKPrev` | TikTok |
| `WAPrev` | WhatsApp |

---

## Widgets — `src/components/widgets/`

| Datei | Zweck |
|---|---|
| `WeekStrip.jsx` | 7-Tage-Vorschau-Streifen |
| `MiniGantt.jsx` | Kompakte Kampagnen-Timeline |
| `Board.jsx` | Kanban-Board (PublisherPage) |

---

## Standalone Components

| Datei | Zweck |
|---|---|
| `AIPanel.jsx` | KI-Assistent-Panel im Post-Editor (Optimize, Hashtags, Varianten, Score, Hook, Ideas, Emojis) |
| `Login.jsx` | Login-Screen mit Demo-Zugängen (Accordion) |
| `MediaDetail.jsx` | Modal: Mediendatei-Details, Tags, Fokuspunkt, KI-Analyse |
| `PostCard.jsx` | Post-Karte (Publisher-Kanban, Papierkorb) |
| `StockSearch.jsx` | Stock-Bildsuche (Unsplash / Pexels / Pixabay), API-Keys aus localStorage |

---

## Pages — `src/pages/`

| Datei | Route (`nav`) | Beschreibung |
|---|---|---|
| `Dashboard.jsx` | `dashboard` | Widgets, Stats, Timeline, Right Sidebar |
| `PublisherPage.jsx` | `publisher`, `drafts` | Kanban-Board |
| `CalendarPage.jsx` | `calendar` | Monatsansicht + Agenda |
| `PlannerPage.jsx` | `planner` | Gantt-Timeline |
| `CampaignsPage.jsx` | `campaigns` | Kampagnen-Verwaltung |
| `StoriesPage.jsx` | `stories` | Content Hub Übersicht (Grid + Filter) |
| `MediaPage.jsx` | `media` | Medienbibliothek (Upload, AI-Analyse, Fokuspunkt) |
| `PerformancePage.jsx` | `performance` | Analytics (Mock-Daten, in useMemo) |
| `MonitoringPage.jsx` | `monitoring` | Instagram-Monitoring (Business Discovery API) |
| `AdminPage.jsx` | `admin` | Kanal-Setup, Team, Stock-API-Keys, Instagram Token Guide |
| `TrashPage.jsx` | `trash` | Papierkorb (gelöschte Posts) |
| `ResearchPage.jsx` | `research` | Recherche-Seite |

---

## Modals — `src/modals/`

| Datei | State-Trigger | Beschreibung |
|---|---|---|
| `Editor.jsx` | `edPost` | Haupt-Post-Editor mit AIPanel, Vorschau, Stock-Suche |
| `StoryEditorModal.jsx` | `edStory` | Story-Editor (BlockNote, 3-Spalten, Materialien, KI-Ableitungen) |
| `SchedModal.jsx` | `schPost` | Zeitplan-Modal (Datum + Uhrzeit wählen) |
| `PostDetailDrawer.jsx` | `detailPost` | Post-Detail-Drawer (Read-only Ansicht) |

---

## Hooks

| Hook | Datei | Zweck |
|---|---|---|
| `useApp()` | `context/AppContext.jsx` | Zugriff auf gesamten App-State |
| `useSections(key, userId, defaultOrder)` | `hooks/useSections.jsx` | Widget-Reihenfolge via localStorage, mit Drag-Support |

### `useSections` + `SecCard`
- Verwendet in: Dashboard, PerformancePage, StoriesPage
- `SecCard` ist ein draggbarer Container mit Drop-Indikator
- localStorage-Key: `sections_v2_{key}_{userId}`

---

## Cloudflare Functions — `functions/`

| Datei | Endpoint | Auth | Zweck |
|---|---|---|---|
| `ai.js` | `POST /ai` | — | Anthropic API Proxy (claude-sonnet-4-6) |
| `store.js` | `POST /store` | Clerk JWT | KV read/write |
| `instagram.js` | `POST /instagram` | Clerk JWT | Eigene IG Posts holen |
| `ig-monitor.js` | `POST /ig-monitor` | Access Token | Business Discovery API |
| `rss.js` | `GET /rss` | — | RSS-Feed Proxy |
