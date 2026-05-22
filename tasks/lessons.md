# Lessons Learned – SocialFlow Pro

> Wird nach jeder Korrektur durch den User aktualisiert.
> Bei Session-Start: relevante Einträge reviewen.

---

## BlockNote

### L-001: BlockNoteView Import-Quelle
**Fehler:** `import { BlockNoteView } from "@blocknote/react"`  
**Korrekt:** `import { BlockNoteView } from "@blocknote/ariakit"`  
**Kontext:** Slash-Menü-Icons fehlen ohne `@blocknote/ariakit/style.css`. Style-Import ist Pflicht.

### L-002: Slash-Menü triggern
**Fehler:** `editor.insertInlineContent("/")` — bypasses ProseMirror's input handler, Suggestion-Plugin wird nicht getriggert  
**Korrekt:** `document.execCommand("insertText", false, "/")` — geht durch den nativen Input-Handler  
**Kontext:** `AddBlockButton` in `StoryEditorModal` / `SideMenuButtons.tsx`

### L-003: Controller als direkte Children
`FormattingToolbarController`, `SideMenuController`, `FilePanelController`, `SuggestionMenuController` müssen **direkte Children** von `<BlockNoteView>` bleiben. Kein Wrapping in eigene Komponenten.

### L-004: Event-Testing in BlockNote
**Falsch:** React-Fiber-Props direkt aufrufen (`btn[__reactPropsKey].onMouseDown(...)`)  
**Richtig:** Echte Browser-Events dispatchen (`dispatchEvent(new MouseEvent(...))`) + 400–500ms warten  
**Grund:** Fiber-Direktaufruf umgeht das Browser-Event-System → Tests bestehen, Live-Site bricht.

---

## Wrangler / Cloudflare

### L-005: Wrangler überschreibt Cache-Control
**Problem:** Wrangler Proxy (Port 8788) ersetzt `Cache-Control: no-store` (von Vite) mit `public, max-age=0, must-revalidate` UND generiert einen statischen ETag (`"a8822897c04470dd788db5e3ba259862"`) für ALLE Dateien gleich → Browser bekommt immer 304 Not Modified → stale JS-Module  
**Fix:** `public/_headers` anlegen:
```
/src/*
  Cache-Control: no-store
```
**Workaround bei Debugging:** Port 5173 direkt nutzen (Vite ohne Wrangler-Proxy)

### L-006: fetch-Patching für Tests
**Problem circular reference:** `window.fetch = patched; window.__origFetch = window.fetch` → `window.fetch` war bereits die gepatchte Version → Stack overflow  
**Korrekt:** Nativen fetch VOR dem Patchen sichern:
```js
window.__nativeFetch = window.fetch.bind(window); // BEFORE any patching
window.fetch = function patchedFetch(url, opts) {
  if (url === '/ai') return window.__nativeFetch('http://localhost:8788/ai', opts);
  if (url === '/deploy-site') return Promise.resolve(new Response(JSON.stringify({ok:true})));
  return window.__nativeFetch(url, opts);
};
```

### L-007: /deploy-site bei Port-5173-Tests faken
Wenn ohne Wrangler getestet wird: `/deploy-site` schlägt fehl → `setForm()` wird nie aufgerufen → generiertes HTML landet nicht im State. Im fetch-Patch immer `{ok: true}` zurückgeben.

---

## React / Architektur

### L-008: useNavigate braucht BrowserRouter als Ancestor
`useNavigate()` und `useLocation()` (in `AppContext.jsx`) erfordern, dass `BrowserRouter` im Komponentenbaum **oberhalb** von `AppContext` sitzt.  
**Korrekte Reihenfolge:** `StrictMode > ClerkProvider > BrowserRouter > App > AppProvider`

### L-009: Mousedown statt Click für Outside-Close
Für Dropdown/Popover-Außenklick-Erkennung `mousedown` verwenden, NICHT `click`:
```js
document.addEventListener("mousedown", close);
// Container stoppt Propagation:
<div onMouseDown={e => e.stopPropagation()}>
```
**Grund:** BlockNote konsumiert `click`-Events — `mousedown` ist zuverlässiger.

### L-010: Projects workspace-unabhängig suchen
**Falsch:** `wsProjects.find(p => p.id === voodooProjectId)` — liefert `undefined` nach Workspace-Wechsel  
**Korrekt:** `projects.find(p => p.id === voodooProjectId)` — sucht über alle Workspaces  
**Kontext:** VoodooPage — Generierung läuft auch bei Workspace-Wechsel im Hintergrund weiter

---

## Spark / KI-Funktionen

### L-011: pdfMode als 5. Argument übergeben
**Fehler:** `renderTemplate(templateId, content, dossierUrl, ctaUrl)` — 4 Args, pdfMode fehlt  
**Korrekt:** `renderTemplate(templateId, content, dossierUrl, ctaUrl, form.pdfMode || "email")`  
**Kontext:** VoodooPage.jsx Zeile 605 — Direkter-Download-Modus war trotz Toggle wirkungslos

### L-012: CSS-Sentinel für Token-Einsparung
Im Spark-Prompt `/* PAGE_CSS_PLACEHOLDER */` statt dem vollen `PAGE_CSS` (~3 KB / ~750 Token) einsetzen. Nach dem Stream: `raw.replace(CSS_SENTINEL, PAGE_CSS)`.  
**Variable heißt:** `CSS_SENTINEL` (nicht `SENTINEL` oder `PAGE_CSS_PLACEHOLDER`)

---

## Tooling

### L-013: Testanzahl in CLAUDE.md aktuell halten
Nach jedem neuen Test-File die Zahl in CLAUDE.md (Abschnitt "Tests ausführen") anpassen:  
- `node node_modules/.bin/vitest run` → letzte Zeile zeigt aktuelle Anzahl
- Stand Mai 2026: **212 Tests** (8 Test-Files)
