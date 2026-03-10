#!/bin/bash
# ProgressHub Frontend Deployment Script
# Usage: ./scripts/deploy-frontend.sh
#
# Frontend (tartion) service on Zeabur.
# IMPORTANT: Deploy only dist/ folder to force Zeabur "static" plan.
#   Deploying the full project dir causes Zeabur to detect package.json
#   and use "nodejs" buildpack which fails for this monorepo setup.

set -euo pipefail

SERVICE_ID="69aa8a1cebc88ca7819244ee"
HEALTH_URL="https://progresshub-cb.zeabur.app/"
FRONTEND_DIR="$(cd "$(dirname "$0")/../packages/frontend" && pwd)"
DIST_DIR="$FRONTEND_DIR/dist"

echo "=== ProgressHub Frontend Deploy ==="
echo "Service: $SERVICE_ID"
echo "Source:  $DIST_DIR"
echo ""

# Pre-flight: type check + build
echo "[1/5] Type checking frontend..."
cd "$FRONTEND_DIR"
npx vue-tsc --noEmit
echo "  Type check passed."

echo "[2/5] Building frontend..."
npx vite build
echo "  Build passed."

# Record expected asset hash for verification
LOCAL_HASH=$(ls "$DIST_DIR/assets/" | grep '^index-.*\.js$' | head -1)
echo "  Expected asset: $LOCAL_HASH"

# Deploy only dist/ to force static plan type
echo "[3/5] Deploying dist/ to Zeabur (static mode)..."
cd "$DIST_DIR"
echo "Y" | npx zeabur@latest deploy --service-id "$SERVICE_ID"
echo "  Deploy triggered."

# Wait for container swap
echo "[4/5] Waiting for deployment (90s)..."
sleep 90

# Verify: HTTP status + asset version match
echo "[5/5] Verifying deployment..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
REMOTE_HASH=$(curl -s "$HEALTH_URL" 2>/dev/null | grep -o 'index-[^"]*\.js' || echo "UNKNOWN")

if [ "$HTTP_CODE" != "200" ]; then
  echo "  FAILED: Frontend returned HTTP $HTTP_CODE"
  echo "  Check: https://zeabur.com/projects/69aa4bc8a847f44e511ddb89"
  echo ""
  echo "=== Deploy FAILED ==="
  exit 1
fi

if [ "$REMOTE_HASH" = "$LOCAL_HASH" ]; then
  echo "  Frontend is UP (HTTP $HTTP_CODE)"
  echo "  Asset version MATCHES: $REMOTE_HASH"
  echo ""
  echo "=== Deploy SUCCESS ==="
else
  echo "  WARNING: Asset version MISMATCH"
  echo "  Remote: $REMOTE_HASH"
  echo "  Local:  $LOCAL_HASH"
  echo "  Frontend may be serving old version. Check Zeabur dashboard."
  echo ""
  echo "=== Deploy NEEDS VERIFICATION ==="
  exit 1
fi
