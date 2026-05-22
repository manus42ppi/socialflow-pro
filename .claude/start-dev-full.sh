#!/bin/bash
# Full-stack dev: Vite (Frontend) + Wrangler Pages Dev (Cloudflare Functions)
# Requires .dev.vars with ANTHROPIC_API_KEY in project root
# Access via http://localhost:8788 (wrangler proxies non-function requests to Vite)

cd /Users/mas/DEV/socialflow-pro

# Start Vite on 5173 (background)
node node_modules/vite/bin/vite.js --port 5173 &
VITE_PID=$!

# Give Vite a moment to start
sleep 2

# Start Wrangler Pages Dev on 8788, proxy to Vite
# --proxy: forwards non-function requests to Vite
# .dev.vars is loaded automatically from project root
npx wrangler pages dev --port 8788 --proxy http://localhost:5173 --compatibility-date 2024-01-01

# Cleanup Vite when wrangler exits
kill $VITE_PID 2>/dev/null
