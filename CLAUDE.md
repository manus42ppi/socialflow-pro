# SocialFlow Pro – Projektkontext für Claude Code

## Stack
- **Frontend:** React + Vite (socialflow-pro)
- - **Backend:** Node.js/Express (socialflow-backend) → Port 3001
  - - **AI Service:** Node.js Proxy (socialflow-ai) → Port 3002
    - - **Live:** https://socialflow-pro.pages.dev (Cloudflare Pages)
     
      - ## Wichtige Hinweise
      - - KI-Assistent nutzt den AI-Service als Proxy (NIEMALS direkt api.anthropic.com im Frontend)
        - - Clerk wird für Auth genutzt (Dev-Key in main.jsx)
          - - `.env` Dateien NIEMALS committen
           
            - ## Workflow
            - 1. Code ändern und auf GitHub pushen (main branch)
              2. 2. Cloudflare Pages deployed automatisch (~30 Sek)
                 3. 3. Live-URL: https://socialflow-pro.pages.dev
                    4. 
