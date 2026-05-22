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
| Mai 2026 | StoryEditorModal Split + React Router + Wrangler Cache-Fix |
| Mai 2026 | Creation Voodoo: pdfMode Direkter-Download-Fix |
| Mai 2026 | Creation Voodoo: PDF-Modus-Toggle (Email-Formular vs. Direkter Download) |
| Mai 2026 | Spark Hintergrund-Job (Pill in Sidebar, Navigation weg & zurück) |
| Mai 2026 | Auto-Repair-Loop 3-Tier (DOM → Section-Injektion → refinePage) |
