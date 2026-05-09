#!/bin/bash
# SocialFlow Pro – Lokaler Dev-Server
# Starten: bash /Users/mas/DEV/socialflow-pro/start.sh

echo "🚀 SocialFlow Pro startet..."
echo "   Lokal:  http://localhost:5173"
echo "   Live:   https://socialflow-pro.pages.dev"
echo ""

cd /Users/mas/DEV/socialflow-pro
/usr/local/bin/node node_modules/vite/bin/vite.js
