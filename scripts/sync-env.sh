#!/usr/bin/env bash
# Liest .env und pusht alle Secrets zu Cloudflare Pages
# Usage: npm run sync-env
# Setzt Secrets für BEIDE Environments (production + preview) auf einmal.

set -e
PROJECT="socialflow-pro"
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Keine .env Datei gefunden. Kopiere .env.example → .env und fülle die Werte."
  exit 1
fi

echo "🔑 Synce Secrets zu Cloudflare Pages ($PROJECT) ..."

while IFS= read -r line || [ -n "$line" ]; do
  # Leere Zeilen und Kommentare überspringen
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  # Auskommentierte Variablen überspringen
  [[ "$line" =~ ^#.*= ]] && continue

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Platzhalter überspringen
  [[ "$VALUE" == "sk-ant-..."* || "$VALUE" == "sk-..."* ]] && {
    echo "  ⚠️  $KEY übersprungen (Platzhalter)"
    continue
  }

  echo "  → $KEY"
  # Production
  echo "$VALUE" | npx wrangler pages secret put "$KEY" \
    --project-name "$PROJECT" \
    --env production 2>/dev/null

  # Preview (develop-Branch)
  echo "$VALUE" | npx wrangler pages secret put "$KEY" \
    --project-name "$PROJECT" \
    --env preview 2>/dev/null

done < "$ENV_FILE"

echo ""
echo "✅ Fertig! Secrets sind jetzt in Production und Preview gesetzt."
echo "   Cloudflare baut beim nächsten git push automatisch neu."
