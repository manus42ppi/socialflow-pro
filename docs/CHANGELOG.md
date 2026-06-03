# SocialFlow Pro – Changelog

---

## [develop] Juni 2026 – Session-Log

### Features

#### `feat(story-editor)`: Titelbild-Picker im Story-Editor — `42512dd`
- Neue AccSection „Titelbild" im linken Panel des StoryEditorModal (zwischen Tags und Materialien)
- Zeigt 16:9-Vorschau wenn `form.coverMediaId` gesetzt ist
- X-Button (oben rechts auf dem Bild) → `coverMediaId: null`
- „Titelbild wählen"-Button öffnet `ImagePicker.tsx` (Mediabibliothek)
- `coverMediaId` wird via `...form`-Spread in allen `updateStory()`-Calls automatisch persistiert
- Neu: `Image`, `X` zu Lucide-Imports; `ImagePicker` direkt in `StoryEditorModal.jsx` importiert
- **Dateien:** `src/modals/StoryEditorModal.jsx`

#### `feat(media)`: PDF-Vorschau in Medienbibliothek — `375f706`
- `MediaDetail.jsx` erkennt `type === "document"` und zeigt:
  - **HTTPS-URL:** `<iframe>` mit nativem Browser-PDF-Rendering (340 px Höhe)
  - **data:-URL (lokal):** Datei-Icon + erklärender Hinweis „Vorschau nicht verfügbar"
- Buttons „Im Browser öffnen" und „Herunterladen" statt Fokuspunkt/KI-Analyse
- Tab-Leiste zeigt für Dokumente nur „📝 Metadaten" (Bild-Score + Plattform-Fit versteckt)
- **Dateien:** `src/components/MediaDetail.jsx`

#### `feat(voodoo)`: Social-Media-Share direkt aus Live-Seite — `13fe936`
- Neuer „Teilen"-Button im Voodoo-Header (nur sichtbar wenn `form.status === "live"`)
- Öffnet Share-Sheet (absolut-positioniertes Dropdown) mit:
  - Kanal-Picker: alle 5 CHANNELS mit Icon, Häkchen-Overlay bei Auswahl
  - Caption-Textarea (vorausgefüllt: Projektname + Beschreibung + Live-URL)
  - Vorauswahl: LinkedIn + Instagram
- „Post-Editor öffnen" → `setEdPost({...})` mit Channels + Caption → PostEditorModal öffnet
- Sheet schließt bei Außenklick (mousedown-Listener auf `document`, stoppt bei `[data-share-sheet]`)
- **Dateien:** `src/pages/VoodooPage.jsx`

### Fixes & Demo-Daten

#### `fix(demo)`: DEMO_STORIES_VERSION – stale Cache-Invalidierung — `3df79ea`
- Neue Konstante `DEMO_STORIES_VERSION = "1"` in `constants/demo.js`
- `AppContext` prüft `localStorage("demo_stories_version")` gegen Konstante
- Mismatch → alte Stories werden verworfen → frische DEMO_STORIES geladen
- Verhindert: Demo-User sieht alte Stories nach Content-Änderung
- **Dateien:** `src/constants/demo.js`, `src/context/AppContext.jsx`

#### `fix(demo)`: Demo-PDF in Medienbibliothek + DEMO_MEDIA_VERSION 2→3 — `5ac5dc8`
- Neues Item `doc-d1` in DEMO_MEDIA (ws-ppi-media):
  - Name: „Gravel & E-Bike Sommer 2026 – Dossier.pdf"
  - `type: "document"`, 2,1 MB, HTTPS-URL
- Ohne dieses Item war der „Aus Medienbibliothek wählen"-Button in VoodooPage → Dossier PDF komplett unsichtbar (`items.filter(m => m.type==="document").length === 0`)
- **Dateien:** `src/constants/demo.js`

### Demo-Content (Radsport-Serie) — `848410f` + Fixes

Vollständiger Demo-Content für Präsentation als Radsport-Medienmarke „ppi Media":
- **Stories:** story-11 „Gravel Cycling" (published), story-12 „E-Bike 2026" (ready), story-13 „7 Profi-Tipps Wintertraining" (published)
- **Bilder:** img-c1…img-c6 — alle mit vollständiger KI-Analyse (Score 76–91, Plattform-Fit, Verbesserungsvorschläge)
- **Produkte:** prod-1 Canyon Grail SL 8, prod-2 Specialized Turbo Creo SL
- **Hub & Spoke:** story-12 hat Ableitungen für Instagram + LinkedIn + Facebook

---

## [develop] Mai 2026 – Session-Log

### Kritische Bugfixes

#### `fix(spark)`: sparkRefine crashed bei jedem Aufruf
- **Ursache**: `refinePage()` baute seinen Prompt mit `${SENTINEL}` — eine undefinierte
  Variable. Die korrekte Konstante heißt `CSS_SENTINEL`.
  → `ReferenceError` bei jedem Aufruf, gefangen als "⚠️ Fehler – bitte erneut versuchen"
- **Fix**: `${SENTINEL}` → `${CSS_SENTINEL}` in `spark.js` Zeile 619
- **Datei**: `src/utils/spark.js`

#### `fix(spark)`: sparkRefine Deploy-Fehler wurde stillschweigend ignoriert
- **Ursache**: `sparkRefine()` rief `/deploy-site` auf, inspizierte aber die Response nicht.
  Fehler (z. B. ungültiger Slug, KV nicht verfügbar) wurden verschluckt; der User sah
  trotzdem "✓ Seite aktualisiert".
- **Fix**: Deploy-Response prüfen wie in `generate()`: `if (!deployData.ok) throw new Error(...)`
- **Datei**: `src/pages/VoodooPage.jsx`

#### `fix(spark)`: nested refinePage in autoRepairLoop → Doppelter Token-Verbrauch + Rate-Limits
- **Ursache**: `autoRepairLoop()` rief in Tier 3 `refinePage()` auf — auch wenn es selbst
  von `sparkRefine()` gerufen wurde, das bereits `refinePage()` laufen hatte.
  → 2 parallele Vollseiten-Rewrites, erhöhtes Risiko für 529-Overload-Fehler.
- **Fix**: `autoRepairLoop(html, maxAttempts=2, maxTier=3)` — `sparkRefine()` übergibt `maxTier=2`
- **Datei**: `src/pages/VoodooPage.jsx`

### Verbesserungen

#### `feat(spark)`: Retry-Logik + bessere Fehlermeldungen in sparkRefine
- 1 automatischer Retry nach 2,5 s für transiente 529/Netzwerkfehler
- Unterscheidet: "KI-Server überlastet" / "Netzwerkfehler" / "Ungültige Antwort"
- **Datei**: `src/pages/VoodooPage.jsx`

#### `refactor(app)`: TITLE-Map aus nav.js importieren statt lokal duplizieren
- `App.jsx` hatte eine identische Kopie der TITLE-Map die bereits in `nav.js` exportiert wird
- **Fix**: `import { TITLE } from "./constants/nav.js"` + lokale Kopie gelöscht
- **Datei**: `src/App.jsx`, `src/constants/nav.js`

### Aufräumen (Dead Code entfernt)

#### `chore`: `src/App.artifact.jsx` gelöscht (1369 Zeilen)
- Nie importiert, nie referenziert — frühe Monolith-Version vor der Modularisierung
- Kein Datenverlust, nur toter Code

#### `chore`: `src/pages/ResearchPage.jsx` gelöscht (2481 Zeilen)
- In 6 eigenständige Seiten aufgeteilt: TrendsPage, DomainAnalysePage, WettbewerberPage,
  ContentAuditPage, StructureAuditPage, SocialIntelligencePage
- Alter Monolith war nie in App.jsx importiert oder in nav.js registriert

### Dokumentation

#### `docs`: CLAUDE.md vollständig aktualisiert
- Testanzahl korrigiert: 141 → 193
- Dateistruktur: alle 6 neuen Analyse-Pages ergänzt
- Dateistruktur: alle 12 CF Functions dokumentiert (vorher nur 5)
- `spark.js` API-Tabelle mit allen Exports + Token-Budgets
- Creation-Voodoo-Architektur (Hintergrund-Job, CSS-Sentinel, Auto-Repair, Deploy-Flow)
- Projects KV-Schema (getrennte HTML-Speicherung)
- Datenmodell Project ergänzt
- Kritische Regeln: 4 neue Spark-spezifische Regeln
- Entwicklungsstand: Creation Voodoo + Analyse-Suite als "Fertig" markiert

#### `docs`: `docs/SPARK.md` neu erstellt
- Vollständige technische Dokumentation des Creation-Voodoo-Features
- Ablauf, Token-Budgets, Auto-Repair-Loop, LINK_GUARD, Deploy-Flow, Einschränkungen

---

## Frühere Sessions (Zusammenfassung)

### Creation Voodoo / Spark (April–Mai 2026)

| Commit | Beschreibung |
|---|---|
| `feat: extract Spark AI logic into spark.js` | spark.js Modul erstellt, testbar |
| `feat: embed copywriter persona` | SPARK_PERSONA (3-in-1 Experte) |
| `feat: background task` | sparkJob in AppContext, Sidebar-Pill |
| `feat: auto-repair loop` | autoRepairLoop (DOM + Section + refinePage) |
| `fix: project survives workspace switch` | projects.find statt wsProjects.find |
| `perf: cut auto-repair token cost ~75%` | CSS-Sentinel, dynamic max_tokens, DOMParser |
| `fix: reliable auto-repair` | plain HTML statt JSON, DOMParser-Injektion |
| `fix: sparkRefine crash` | ${SENTINEL} → ${CSS_SENTINEL} (Primary Bug) |

### Core Features (März–April 2026)

- Multi-Tenant / Mandanten-System (4 Demo-Mandanten, Workspace-Switcher)
- Story-Workflow (BlockNote v0.47.3, SEO-Panel, Ableitungen)
- UGC Portal (Einreichungen, Genehmigungs-Workflow)
- Analyse-Suite (Trends, Domain, Wettbewerber, Content-Audit, Schema, Social)
- KV-Persistenz mit Load-Guard und User-Isolation
