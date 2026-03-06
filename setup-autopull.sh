#!/bin/bash
# Einmalig ausführen: bash ~/socialflow-pro/setup-autopull.sh
echo "🔧 SocialFlow Auto-Pull wird eingerichtet..."

# Shell Script ausführbar machen
chmod +x ~/socialflow-pro/.git/auto-pull.sh

# LaunchAgent installieren
cp ~/socialflow-pro/com.socialflow.autopull.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.socialflow.autopull.plist

echo "✅ Fertig! Dein Mac pullt jetzt automatisch alle 60 Sekunden."
echo "📋 Log: ~/socialflow-pro/.git/auto-pull.log"
