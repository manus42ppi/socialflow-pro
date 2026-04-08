# SocialFlow Pro

Social Media Management Platform für Content-Teams. Planung, Erstellung, KI-Assistenz und Performance-Tracking in einer App.

**Live:** https://socialflow-pro.pages.dev

---

## Stack

| Layer | Technologie |
|---|---|
| Frontend | React 19 + Vite, Inline-Styles |
| Auth | Clerk (Demo-Login ohne Account möglich) |
| AI | Anthropic Claude (Proxy via Cloudflare Function) |
| Storage | Cloudflare KV (Clerk-JWT gesichert) |
| Deployment | Cloudflare Pages (auto-deploy bei Push auf `main`) |

---

## Features

- **Publisher** – Kanban-Board (Entwurf → Freigabe → Geplant → Publiziert)
- **Story-Workflow** – Content Hub mit BlockNote-Editor, KI-Ableitungen für alle Kanäle
- **Kalender** – Monatsansicht + Agenda
- **Planner** – Gantt-Timeline
- **Medienbibliothek** – Upload, KI-Analyse, Fokuspunkt, Usage-Tracking
- **Kampagnen** – Verwaltung mit Budget und Laufzeit
- **Performance** – Analytics-Dashboard
- **Instagram Monitoring** – fremde Accounts beobachten via Business Discovery API
- **KI-Assistent** – Optimize, Hashtags, Varianten, Score, Hook, Ideas, Emojis

---

## Entwicklung

```bash
# Dev-Server (npm nicht im PATH → direkt node aufrufen)
/usr/local/bin/node node_modules/vite/bin/vite.js

# Build prüfen
/usr/local/bin/node node_modules/vite/bin/vite.js build

# Unit-Tests (Vitest)
/usr/local/bin/node node_modules/.bin/vitest run

# E2E-Tests (Playwright)
/usr/local/bin/node node_modules/.bin/playwright test
```

---

## Deployment

Push auf `main` → Cloudflare Pages deployed automatisch (~30 Sekunden).

Secrets werden im Cloudflare Dashboard gesetzt (niemals committen):
- `ANTHROPIC_API_KEY`
- Clerk Keys

---

## Dokumentation

Vollständiger Projektkontext für Claude Code: **[CLAUDE.md](./CLAUDE.md)**
