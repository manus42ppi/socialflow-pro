# Creation Voodoo – Spark Technische Dokumentation

> Letztes Update: Mai 2026

---

## Überblick

**Creation Voodoo** ist das Landing-Page- und One-Pager-Generator-Feature von SocialFlow Pro.
Der Nutzer wählt Inhaltsquellen (Storys, Posts, Medien, externe URLs) aus einem Projekt
und Spark generiert daraus vollständige, responsive HTML-Seiten — inklusive Live-Deploy.

Die gesamte KI-Logik ist in `src/utils/spark.js` gekapselt: reine Funktionen, testbar ohne
Browser oder Mock-Calls. Das React-UI lebt in `src/pages/VoodooPage.jsx`.

---

## Ablauf aus User-Sicht

```
1. Projekt anlegen (Name, Inhaltsquellen auswählen)
2. "Spark starten" → Preflight: 4 Rückfragen
3. Antworten bestätigen → Generierung startet
   (User kann navigieren — Pill in Sidebar zeigt Status)
4. Fertig → Tab "Live-Seite" öffnet sich automatisch
5. Verfeinern: freie Anweisung oder Quick-Action → sofort deployed
```

---

## Generierungsschritt (generatePage)

### Token-Budget
- Input: Projekt-Kontext + Preflight-Antworten + Bilder + Prompt ≈ 4000–8000 Token
- Output: max 6000 Token (HTML ~12–20 kB)
- Web-Search: Anthropic `web_search_20250305` (max 5 Suchen), verbraucht 1000–2500 Token

### CSS-Sentinel-Trick
`PAGE_CSS` (~3 KB / ~750 Token) wird im Prompt durch `/* PAGE_CSS_PLACEHOLDER */` ersetzt.
Das Modell schreibt den Platzhalter in seine Ausgabe; danach wird er clientseitig
durch das echte CSS ersetzt. Spart ~750 Token auf Input **und** Output.

### Struktur jeder generierten Seite (7 Pflicht-Sections)
```
NAV   – sticky, Logo + 3–4 Anker-Links + CTA-Button
HERO  – H1, Subtext, 2 CTA-Buttons (.btn-p + .btn-o)
BENEFITS – 3er-Grid mit den 3 stärksten Vorteilen
CONTENT  – Kerninhalt + Bilder
STATS    – 3–4 KPIs (.stat + .stat-l)
CTA-BLOCK – (.cta-b) finaler Conversion-Push
FOOTER   – (.footer-g) Links + Copyright
```

---

## Auto-Repair-Loop

Nach jeder Generierung/Verfeinerung durchläuft der HTML-Output drei Reparatur-Stufen:

### Tier 1 — DOM-Repair (0 Token, immer)
`repairPage()` verwendet DOMParser im Browser:
- **Script-Leak**: Text-Nodes die JavaScript enthalten werden gelöscht
  (passiert wenn das Modell `LINK_GUARD` als sichtbaren Text reproduziert)
- **Broken Anchors**: `href="#xyz"` ohne `id="xyz"` → Heading-Text-Matching:
  - Strategy A: Section dessen `<h1/h2/h3>` den ID-Keyword enthält → `id` setzen
  - Strategy B: nächste Section ohne `id` → `id` zuweisen

### Tier 2 — Section-Injektion (~3000 Token, max. 2×)
`generateMissingSections()` fragt die KI nur nach den fehlenden `<section>`-Tags.
- **Ausgabeformat**: plain HTML (kein JSON — JSON scheitert an Quote-Escaping in HTML-Attributen)
- **Parsing**: `new DOMParser().parseFromString('<div>${raw}</div>', 'text/html')`
- **Injektion**: via `insertBefore(.cta-b || footer)` — korrekte Dokumentreihenfolge

### Tier 3 — refinePage-Fallback (~6000 Token, max. 1×)
`buildRepairInstruction(issues)` erstellt einen gezielten Reparatur-Prompt aus
`validatePage()`-Issues. Dann ruft `autoRepairLoop` `refinePage()` auf.

⚠️ **Wichtig**: `sparkRefine()` übergibt `maxTier=2` — kein nested `refinePage`
innerhalb eines laufenden `refinePage`-Calls (verhindert Token-Doubling + Rate-Limits).

---

## refinePage (Verfeinerung)

Der User gibt eine freie Anweisung ein (z. B. "Mach den Hero auffälliger").
Spark überarbeitet gezielt nur den betroffenen Teil — alle anderen Sections bleiben erhalten.

### Token-Budget (dynamisch)
```js
const max_tokens = Math.min(6000, Math.max(4000, Math.ceil(compactHtml.length / 4 * 2.2)));
```
Typisch: 8–16 kB komprimiertes HTML → 4000–6000 Token.

### Retry-Logik
Bei transientem Fehler (HTTP 529 Overload, Netzwerk) erfolgt automatisch
**1 Retry nach 2,5 Sekunden**. Der User sieht "⏳ Kurze Pause – erneuter Versuch…".

### Fehlermeldungen (erkennbar, nicht generisch)
```
⚠️ KI-Server überlastet — bitte 30 Sekunden warten
⚠️ Netzwerkfehler — bitte erneut versuchen
⚠️ Ungültige Antwort — Seite neu generieren
⚠️ Fehler — bitte erneut versuchen
```

---

## Hintergrund-Job

JavaScript `async/await` läuft weiter auch wenn React-Komponenten unmounten.
`setSparkJob` referenziert AppContext-Funktionen (nicht lokalen State) → Ergebnis
landet via `onSave()` im globalen State.

```
User startet Generierung
  → sparkJob: { status:"running", ... } in AppContext gesetzt
  → Sidebar zeigt animierte Zap-Pill
User navigiert weg (andere Page oder anderer Mandant)
  → VoodooPage unmountet, async bleibt laufen
User navigiert zurück
  → VoodooPage mountet neu, useEffect auf project.generatedHtml synct Ergebnis
  → Tab wechselt automatisch zu "Live-Seite"
Pill-Klick:
  → navigiert zu richtigem Workspace + Projekt in einem Schritt
```

---

## LINK_GUARD (Skript in jeder generierten Page)

```js
// Injected vor </body>
// Behandelt drei Fälle:
// 1. #anchor mit existierender ID → normales Browser-Scroll
// 2. #anchor mit fehlender ID → Fuzzy-Match auf section[id], smooth-scroll
// 3. Externe https-Links → window.open('_blank') — kein iframe-Navigation
// mailto / tel → passthrough
```

Das Skript wird vor dem Senden an die KI entfernt (`GUARD_RE = /<script>…<\/script>/i`)
und nach dem Stream von `postProcessHtml()` wieder eingefügt — immer die aktuelle Version.

---

## Validierung (validatePage)

Drei Checks:
1. **Script-Leak**: JavaScript als sichtbarer Text (LINK_GUARD außerhalb `<script>`)
2. **Broken Anchors**: `href="#xyz"` ohne `id="xyz"` im Dokument
3. **Section-Count**: < 5 Sections (Minimum 7 erwartet)

Rückgabe: `Array<{type:"error"|"warn", msg:string}>` — leer = alles OK.

---

## Deploy-Flow

```
POST /deploy-site { slug: "projekt-name-xxxx", html: "<!DOCTYPE html>…" }
  → functions/deploy-site.js
  → Slug-Validierung: /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/
  → env.SOCIALFLOW_KV.put("site:{slug}", html)
  → { ok: true, url: "https://socialflow-pro.pages.dev/site/{slug}" }

GET /site/{slug}
  → functions/site/[slug].js
  → env.SOCIALFLOW_KV.get("site:{slug}")
  → Response HTML mit Cache-Control: public, s-maxage=60

DELETE /deploy-site { slug, delete: true }
  → env.SOCIALFLOW_KV.delete("site:{slug}")
  → Aufgerufen beim Löschen eines Projekts aus AppContext
```

---

## Bekannte Einschränkungen

| Problem | Ursache | Workaround |
|---|---|---|
| Bilder nur via URL (kein Upload) | KI schreibt `<img src="...">` | Stock-APIs (Pexels/Unsplash) werden automatisch genutzt |
| ~1–2 Nav-Anker kaputt nach Generierung | KI inkonsistent bei IDs | Auto-Repair Tier 1+2 behebt ~90% der Fälle |
| Local Dev: Deploy schlägt fehl | KV nicht lokal verfügbar | Normales Verhalten — erst auf `develop`-Branch testbar |
| Web-Search kann Antwort verzögern | Anthropic sucht bis zu 5× | 6000-Token-Budget deckt auch lange Search-Responses ab |
