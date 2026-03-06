# SocialFlow Pro – Claude Code Projektkontext

## Projekt-Übersicht
- **App:** SocialFlow Pro v5
- **Stack:** React + Vite, lucide-react
- **Repo:** https://github.com/manus42ppi/socialflow-pro
- **Live:** https://socialflow-pro.netlify.app
- **Lokaler Pfad:** /Users/mas/DEV/socialflow-pro

## Wichtigste Regel
- Die gesamte App lebt in EINER Datei: src/App.jsx
- KI-Assistent nutzt /.netlify/functions/ai als Proxy (NIEMALS direkt api.anthropic.com)

## Deployment
1. Änderungen machen
2. git add -A && git commit -m "beschreibung" && git push
3. Netlify deployed automatisch (~15 Sek)

## Bekannte Stolpersteine
- Build-Fehler = meist extra } am Dateiende
- lucide-react Icons müssen oben im Import stehen
