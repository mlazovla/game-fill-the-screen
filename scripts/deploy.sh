#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-vml@192.168.0.242}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/mlazovaci.cz/sites/fillthescreengame/www}"
PUBLIC_URL="${PUBLIC_URL:-https://fillthescreengame.mlazovaci.cz}"

cd "$(dirname "$0")/.."

npm run build
ssh "$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH'"
rsync -az --delete dist/ "$DEPLOY_HOST:$DEPLOY_PATH/"

echo "Nasazeno: $PUBLIC_URL"
