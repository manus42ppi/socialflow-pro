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

## Features & Fixes

- 🔜 **Medienbibliothek: KI-Analyse-Persistenz**  
  KI-Analyse-Ergebnisse (Score, Tags, Alt-Text) werden nach Page-Reload nicht wiederhergestellt.  
  Overlay-Fixes: z.B. Fokuspunkt-Overlay z-Index-Probleme.

- 📋 **Workspace-Zugriffsrechte im Admin änderbar**  
  Aktuell: Berechtigungen nur in `constants/demo.js` hardcoded.  
  Ziel: Admin-UI zum Hinzufügen/Entfernen von User-Workspace-Zuweisungen.

- 📋 **Mobile Responsive**  
  Aktuell keine Mobile-Unterstützung. Breakpoints definieren, kritische Seiten anpassen.

- 📋 **Echter Publish-Endpunkt Social Channels**  
  Post-Status "scheduled" → tatsächlicher API-Call an Instagram / LinkedIn etc.  
  Abhängigkeit: OAuth-Tokens pro Workspace speichern.

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
| Mai 2026 | StoryEditorModal Split + React Router + Wrangler Cache-Fix |
| Mai 2026 | Creation Voodoo: pdfMode Direkter-Download-Fix |
| Mai 2026 | Creation Voodoo: PDF-Modus-Toggle (Email-Formular vs. Direkter Download) |
| Mai 2026 | Spark Hintergrund-Job (Pill in Sidebar, Navigation weg & zurück) |
| Mai 2026 | Auto-Repair-Loop 3-Tier (DOM → Section-Injektion → refinePage) |
