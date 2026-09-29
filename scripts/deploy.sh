#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .deploy.local ]]; then
  set -a
  source .deploy.local
  set +a
fi

: "${DEPLOY_HOST:?Nastav DEPLOY_HOST (např. v .deploy.local)}"
: "${DEPLOY_PATH:?Nastav DEPLOY_PATH (např. v .deploy.local)}"

npm run build
ssh "$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH'"
rsync -az --delete dist/ "$DEPLOY_HOST:$DEPLOY_PATH/"

echo "Nasazeno${PUBLIC_URL:+: $PUBLIC_URL}"
