#!/bin/bash
# SocialFlow Auto-Pull – läuft alle 60 Sekunden im Hintergrund
REPO="$HOME/socialflow-pro"
LOG="$REPO/.git/auto-pull.log"
cd "$REPO" || exit 1
git fetch origin main 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date '+%H:%M:%S'): Neue Commits – pull..." >> "$LOG"
  git pull origin main >> "$LOG" 2>&1
  echo "$(date '+%H:%M:%S'): Fertig." >> "$LOG"
fi
