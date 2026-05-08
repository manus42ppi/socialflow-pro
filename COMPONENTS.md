# SocialFlow Pro – Component Reference

> Vollständiger Projektkontext: **[CLAUDE.md](./CLAUDE.md)** (autoritativ)
> Architektur-Übersicht: **[ARCHITECTURE.md](./ARCHITECTURE.md)**

---

## UI Primitives — `src/components/ui/index.jsx`

| Komponente | Props | Zweck |
|---|---|---|
| `Sp` | `n` | Spacer (width + height = n px) |
| `Badge` | `color`, `bg`, `children` | Pill-Label |
| `Avatar` | `initials`, `imageUrl`, `size`, `color` | Initials- oder Bild-Avatar |
| `Btn` | `onClick`, `variant`, `size`, `disabled`, `loading` | Button (primary/ghost/danger) |
| `Card` | `style`, `children` | Surface-Box mit Border + Radius |
| `FL` | `gap`, `align`, `justify`, `wrap`, `children` | Flexbox-Helper |
| `TIn` | `label`, `value`, `onChange`, `placeholder`, `icon` | Text-Input mit Label |
| `SBadge` | `status` | Status-Pill (draft/pending/scheduled/published) |
| `SCrd` | `children`, `style` | Section-Card (leichtes Surface) |

---

## Channel Icons — `src/components/ui/ChIco.jsx`

```jsx
<ChIco id="instagram" size={20} color={C.accent} />
// id: instagram | twitter | linkedin | facebook | whatsapp | website | print
```

---

## Layout — `src/components/layout/`

| Datei | Zweck |
|---|---|
| `Sidebar.jsx` | Linke Navigation + **Mandanten-Switcher** (farbige Initialen-Avatare) |
| `TopBar.jsx` | Suchleiste + Notifications + "Neuer Post"-Button |
| `GlobalRightSidebar.jsx` | Rechte Sidebar (Widgets: Kalender, Posts, Media, Kampagnen) mit eigenem Drag |

### Sidebar – Mandanten-Switcher
- Zeigt aktuellen Mandant als farbigen Initialen-Avatar (z.B. „PM" für ppi Media)
- Dropdown mit allen zugänglichen Workspaces des eingeloggten Users
- „Alle Mandanten" erscheint wenn User >1 Workspace hat
- Außenklick-Schließung via `mousedown` (nicht `click`!) – wichtiges Pattern

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
| `Board.jsx` | Kanban-Board (`KCard` + `Board`), Status- und Kampagnen-Modus |

---

## Standalone Components

| Datei | Zweck |
|---|---|
| `AIPanel.jsx` | KI-Assistent im Post-Editor (Optimize, Hashtags, Varianten, Score, Hook, Ideas, Emojis) |
| `Login.jsx` | Login-Screen mit Demo-Zugängen (Accordion mit allen 3 Demo-Usern) |
| `MediaDetail.jsx` | Modal: Mediendatei-Details, Tags, Fokuspunkt, KI-Analyse, Datei-Info |
| `PostCard.jsx` | Post-Karte (Publisher-Kanban, Papierkorb) |
| `StockSearch.jsx` | Stock-Bildsuche (Unsplash / Pexels / Pixabay), API-Keys aus localStorage |

---

## Pages — `src/pages/`

| Datei | Route (`nav`) | Beschreibung |
|---|---|---|
| `Dashboard.jsx` | `dashboard` | Widgets, Stats, Timeline, Right Sidebar |
| `PublisherPage.jsx` | `publisher` | Kanban-Board (Entwurf → Freigabe → Geplant → Publiziert) |
| `CalendarPage.jsx` | `calendar` | Monatsansicht + Agenda |
| `PlannerPage.jsx` | `planner` | Gantt-Timeline |
| `CampaignsPage.jsx` | `campaigns` | Kampagnen-Verwaltung |
| `StoriesPage.jsx` | `stories` | Content Hub Übersicht (Grid + Filter + SEO-Score-Badges) |
| `UGCPortalPage.jsx` | `ugc` | **UGC-Einreichungsportal** (Submissions, Genehmigung, Story-Import) |
| `MediaPage.jsx` | `media` | Medienbibliothek (Upload, AI-Analyse, Fokuspunkt, **Workspace-Filterung**) |
| `PerformancePage.jsx` | `performance` | Analytics (Mock-Daten, in useMemo) |
| `MonitoringPage.jsx` | `monitoring` | Instagram-Monitoring (Business Discovery API) |
| `AdminPage.jsx` | `admin` | Kanal-Setup, Team, **Mandanten-Tab**, Stock-API-Keys, Instagram Token Guide |
| `TrashPage.jsx` | `trash` | Papierkorb (gelöschte Posts) |
| `ResearchPage.jsx` | `research` | Recherche-Seite |

### UGCPortalPage – Struktur
```
Stats-Row (Gesamt / Ausstehend / Genehmigt / Reaktionszeit)
├── Linkes Panel (360px): Einreichungs-Liste + Status-Filter + Suche
└── Rechtes Panel: Detail-Ansicht
    ├── Header: Name, E-Mail, Datum, Status-Badge
    ├── Titel, Kategorie, Länge, Bildanzahl, Rechte-Status
    ├── Artikeltext (scrollbar)
    ├── Redaktionsnotiz (editierbar)
    └── Aktionen: Genehmigen / Ablehnen / In Story umwandeln
```

---

## Modals — `src/modals/`

| Datei | State-Trigger | Beschreibung |
|---|---|---|
| `Editor.jsx` | `edPost` | Haupt-Post-Editor mit AIPanel, Vorschau, Stock-Suche |
| `StoryEditorModal.jsx` | `edStory` | Story-Editor (BlockNote, 3-Spalten, SEO-Panel, Unified Toolbar) |
| `SchedModal.jsx` | `schPost` | Zeitplan-Modal (Datum + Uhrzeit wählen) |
| `PostDetailDrawer.jsx` | `detailPost` | Post-Detail-Drawer (Read-only Ansicht) |

### StoryEditorModal – Spalten-Layout
```
Linke Spalte (230px, scrollbar):
  Status-Buttons | Kategorie | STORY_CHANNELS | Tags
  Kommentare | Versions-History

Mittlere Spalte (flex: 1):
  Titel-Input (FONT_DISPLAY, 32px, kein Border)
  Subtitle-Input
  BlockNote-Editor
    └── UnifiedFormattingToolbar (Format / KI / Loading / Result)
    └── MediaLibraryFilePanel (via createPortal)

Rechte Spalte (300px):
  Tab "Info":
    Materialien (Links, Notizen, Bilder)
    KI-Ableitungen (je Kanal: Button → Post-Entwurf)
  Tab "SEO":
    Score-Bar (0-100, farbkodiert)
    Keyword-Checks (8 Checks mit Gewichtung)
    Lesbarkeit (Flesch-Kincaid DE, 4 Level)
    Auto-Tags (KI-generiert, editierbar)
    Hashtags (KI-generiert)
    Meta-Titel + Meta-Description
    Google-Vorschau (simuliert)
```

---

## Hooks

| Hook | Datei | Zweck |
|---|---|---|
| `useApp()` | `context/AppContext.jsx` | Zugriff auf gesamten App-State inkl. Workspace |
| `useSections(key, userId, defaultOrder)` | `hooks/useSections.jsx` | Widget-Reihenfolge via localStorage, Drag-Support |

### `useSections` + `SecCard`
- Verwendet in: Dashboard, PerformancePage, StoriesPage
- `SecCard` ist ein draggbarer Container mit Drop-Indikator
- localStorage-Key: `sections_v2_{key}_{userId}`

---

## Constants — `src/constants/demo.js`

| Export | Inhalt |
|---|---|
| `CHANNELS` | 5 Social-Kanäle (instagram, twitter, linkedin, facebook, whatsapp) |
| `STORY_CHANNELS` | CHANNELS + website + print |
| `ROLES` | admin, editor, viewer mit Farben + Permissions |
| `DEMO_USERS` | 3 Demo-User (admin, editor, viewer) |
| `STAGES` | 4 Kanban-Stufen (draft, pending, scheduled, published) |
| `CAMP_COLORS` | 10 Kampagnen-Farben |
| `CAMP_ICONS` | 16 Kampagnen-Icon-Namen |
| `DEMO_WORKSPACES` | 4 Demo-Mandanten (ppi Media, ppi n3xt, ppi Talk, alphabeta neo) |
| `DEMO_WORKSPACE_MEMBERS` | 7 Mitgliedschafts-Einträge (userId + workspaceId + role) |
| `DEMO_CAMPAIGNS` | 4 Kampagnen mit `workspaceId` |
| `DEMO_POSTS` | 18 Posts mit `workspaceId` |
| `DEMO_STORIES` | 6 Storys mit `workspaceId`, SEO-Feldern, Blocks, Materialien |
| `DEMO_MEDIA` | 13 Media-Items mit `workspaceId` (picsum.photos URLs) |

---

## Cloudflare Functions — `functions/`

| Datei | Endpoint | Auth | Zweck |
|---|---|---|---|
| `ai.js` | `POST /ai` | — | Anthropic API Proxy (claude-sonnet-4-6) |
| `store.js` | `POST /store` | Clerk JWT | KV read/write |
| `instagram.js` | `POST /instagram` | Clerk JWT | Eigene IG Posts holen |
| `ig-monitor.js` | `POST /ig-monitor` | Access Token | Business Discovery API |
| `rss.js` | `GET /rss` | — | RSS-Feed Proxy |
