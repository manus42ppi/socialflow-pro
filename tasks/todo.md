# Task Backlog – SocialFlow Pro

> Versioniert im Repo. Claude hält diese Liste aktuell.
> Status: ✅ Erledigt | 🔄 In Arbeit | 📋 Offen | 🔜 Als nächstes

---

## Strukturelle Refactorings

- ✅ **StoryEditorModal aufteilen** (Mai 2026)  
  3252 → 1322 Zeilen. 14 Sub-Komponenten in `src/modals/StoryEditor/`. Panel-lokaler State migriert.

- ✅ **React Router v6 einführen** (Mai 2026)  
  `nav`-String → URL-Pfade. Browser-Back/Forward funktioniert. Alle 22 Routen. Null Call-Site-Änderungen.

- ✅ **Wrangler Cache-Fix** (Mai 2026)  
  `public/_headers` mit `Cache-Control: no-store` für `/src/*`. Verhindert 304-Stale-Module.

- 📋 **AppContext aufteilen** (Future)  
  604-Zeilen-Monolith → domain-spezifische Contexts (PostsContext, StoriesContext, MediaContext …).  
  Voraussetzung: Erst wenn AppContext Änderungen häufiger Probleme verursacht.

---

## Sprint 1 — Produktionsreif (aus UX-Analyse Mai 2026)

- ✅ **K-1: Medienbibliothek KI-Analyse-Persistenz** (Mai 2026)  
  `runAI()` in `MediaDetail` ruft nach Analyse sofort `onUpdate(updated)` auf (inkl. `aiAnalysis`).  
  `MediaPage` übergibt `onUpdate={onUpdate}` als separaten Prop neben `onSave`.  
  Bild-Score + Plattform-Fit Tabs bleiben nach Reload erhalten.

- ✅ **K-2: Fokuspunkt-Overlay Z-Index** (Mai 2026)  
  Transparentes Overlay-Div (position:absolute; inset:0; zIndex:10; cursor:crosshair) über dem Bild,  
  nur wenn fmode aktiv. Fängt Klicks zuverlässig ab — auch wenn Farbpalette-Strip oder andere  
  absolute Kinder Events blockieren würden.

- 📋 **K-3: Voodoo Spark Dev-Mode Hinweis**  
  "HTTP 404" statt erklärendem Text wenn Wrangler nicht läuft.  
  Fix: `if (import.meta.env.DEV)` → Info-Banner "Starte Wrangler für lokale AI-Tests".

- 📋 **H-1: Clerk Login-Branding**  
  "Sign in to My Application" → Clerk Dashboard: App-Name auf "SocialFlow Pro" setzen.

- 📋 **H-2: Publisher Filter-Labels**  
  Zwei Filterzeilen beide mit "Alle" ohne Label. → "KANAL:" und "STATUS:" als Prefix hinzufügen.

- 📋 **H-4: Story-Editor Workspace-Name falsch**  
  "WEBSITE · PPI N3XT" hardcoded. Fix: dynamisch aus `story.workspaceId` → `workspace.name`.

- 📋 **H-6: Kampagnen Tab-Overflow**  
  "Abgeschlossen" rutscht auf zweite Zeile. Fix: `overflow-x:auto; white-space:nowrap` auf Tab-Container.

- 📋 **M-10: Voodoo Live-Seite Race Condition**  
  Beim Klick auf ein Live-Projekt zeigt Live-Seite kurz "Nicht generiert".  
  Fix: `useEffect([]){if(project.generatedHtml && status==='live') setTab('site')}` on mount.

---

## Sprint 2 — Polished Demo

- 📋 **H-3: Post-Editor Label + Textarea**  
  "Haupttext" → "Post-Text / Caption". Textarea min-height:160px. Zeichenzähler mit Plattform-Icons.

- 📋 **H-5: Medienbibliothek Bildnamen**  
  Namen nur per Hover sichtbar. Fix: 1-Zeilen-Caption unter jedem Bild im Grid.

- 📋 **H-7: Dashboard Widget-Button**  
  "Hinzu sortieren" öffnet nichts. Entweder deaktivieren oder Tooltip "Kommt bald".

- 📋 **M-2: Voodoo Validierungsfehler für `<style>`-Tags**  
  `validatePage()` warnt fälschlicherweise bei `<style>` im generierten HTML. Fix: nur `<script>` im `<body>` validieren.

- 📋 **M-1: Voodoo Template-Vorschau-Thumbnails**  
  Template-Karten zeigen nur Namen. Kleines Screenshot-Thumbnail + 1-Zeilen-Beschreibung pro Template.

- 📋 **M-3: Kampagnenkarte Zeitanzeige**  
  "39T übrig" ggf. als "397" lesbar. Fix: "39 Tage" mit ausgeschriebener Einheit.

- 📋 **M-7: Performance Demo-Daten Hinweis**  
  Mock-Zahlen ohne Hinweis. Fix: kleiner Info-Banner "Demo-Daten für Präsentationszwecke".

---

## Features & Fixes

- 📋 **Workspace-Zugriffsrechte im Admin änderbar**  
  Aktuell: Berechtigungen nur in `constants/demo.js` hardcoded.  
  Ziel: Admin-UI zum Hinzufügen/Entfernen von User-Workspace-Zuweisungen.

- 📋 **Mobile Responsive**  
  Aktuell keine Mobile-Unterstützung. Breakpoints definieren, kritische Seiten anpassen.

- 📋 **Echter Publish-Endpunkt Social Channels**  
  Post-Status "scheduled" → tatsächlicher API-Call an Instagram / LinkedIn etc.  
  Abhängigkeit: OAuth-Tokens pro Workspace speichern.

---

## Infrastruktur / Skalierung (wenn nötig)

- 📋 **Medien-Upload auf Cloudflare R2 migrieren**  
  Aktuell: Bilder als Base64 direkt im KV-Value → 25 MB KV-Limit, kein CDN.  
  Ziel: Upload → R2 Object Storage, KV speichert nur URL.  
  Kosten: 10 GB/Monat kostenlos, Egress immer kostenlos (kein S3-Egress-Problem).  
  Aufwand: `functions/store.js` + `uploadItem` in AppContext anpassen.

- 📋 **Datenhaltung auf Cloudflare D1 migrieren (bei echtem Multi-Tenant)**  
  Aktuell: Cloudflare KV (Key-Value, user-isoliert, kein Sharing zwischen Usern).  
  Problem bei Wachstum: Workspace-Trennung ist nur Frontend-logisch, kein DB-seitiger Zugriff,  
  kein Filtern/Suchen serverseitig — immer kompletter Array-Load.  
  Ziel: D1 (SQLite-kompatibel) mit echten Workspace-Tabellen + Row-Level-Security.  
  Kosten D1 Free: 5 GB Storage, 25 Mio. Reads/Tag, 100.000 Writes/Tag — dauerhaft kostenlos  
  für Agentur-Größe. Workers Paid Plan (5 $/Monat) erst bei ernsthafter Skalierung nötig.  
  Voraussetzung: Erst angehen wenn echter User-Sharing oder >1 Agentur-Mandant live geht.

---

## Technische Schulden

- 📋 **Build-Chunk-Größe reduzieren**  
  `index-*.js` ist 3 MB (857 KB gzip). Code-Splitting via `import()` für große Seiten.

- 📋 **tsconfig.json aktivieren**  
  Liegt im Repo, wird von Vite aber noch nicht für Type-Checks genutzt. TypeScript-Migration inkrementell ausbauen.

---

## Zuletzt erledigt

| Datum | Task |
|---|---|
| Mai 2026 | UX-Analyse: vollständige Marketing-Mitarbeiter-Simulation, 10 Storys + 20 Posts + 3 Voodoo-Landingpages + vollständiger Verbesserungsplan in `docs/ux-improvement-plan.md` |
| Mai 2026 | StoryEditorModal Split + React Router + Wrangler Cache-Fix |
| Mai 2026 | Creation Voodoo: pdfMode Direkter-Download-Fix |
| Mai 2026 | Creation Voodoo: PDF-Modus-Toggle (Email-Formular vs. Direkter Download) |
| Mai 2026 | Spark Hintergrund-Job (Pill in Sidebar, Navigation weg & zurück) |
| Mai 2026 | Auto-Repair-Loop 3-Tier (DOM → Section-Injektion → refinePage) |
