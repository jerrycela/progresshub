#!/bin/bash
# ProgressHub Backend Deployment Script
# Usage: ./scripts/deploy-backend.sh
#
# This script deploys the backend service to Zeabur using Docker.
# It MUST be run from the repo root or backend/ directory.
# Git push does NOT auto-deploy backend — always use this script.

set -euo pipefail

SERVICE_ID="69aa4be9a847f44e511ddb8a"
HEALTH_URL="https://progress-hub.zeabur.app/health/ready"
BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"

echo "=== ProgressHub Backend Deploy ==="
echo "Service: $SERVICE_ID"
echo "Source:  $BACKEND_DIR"
echo ""

# Pre-flight checks
echo "[1/4] Pre-flight checks..."
if ! command -v npx &> /dev/null; then
  echo "ERROR: npx not found. Install Node.js first."
  exit 1
fi

if [ ! -f "$BACKEND_DIR/Dockerfile" ]; then
  echo "ERROR: Dockerfile not found at $BACKEND_DIR/Dockerfile"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo "ERROR: package.json not found at $BACKEND_DIR/package.json"
  exit 1
fi

# Type check before deploy
echo "[2/4] Type checking backend..."
cd "$BACKEND_DIR"
npx tsc --noEmit
echo "  Type check passed."

# Deploy via Zeabur CLI (Docker mode)
echo "[3/4] Deploying to Zeabur..."
echo "Y" | npx zeabur@latest deploy --service-id "$SERVICE_ID"
echo "  Deploy triggered."

# Wait and verify
echo "[4/4] Waiting for deployment (120s)..."
sleep 120

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
BODY=$(curl -s "$HEALTH_URL" 2>/dev/null || echo "")

if echo "$BODY" | grep -q '"status":"ready"'; then
  echo "  Backend is HEALTHY (HTTP $HTTP_CODE)"
  echo "  $BODY"
else
  echo "  WARNING: Backend may not be ready yet (HTTP $HTTP_CODE)"
  echo "  Response: $BODY"
  echo ""
  echo "  Check Zeabur dashboard: https://zeabur.com/projects/69aa4bc8a847f44e511ddb89"
  echo "  Or retry health check: curl $HEALTH_URL"
  echo ""
  echo "=== Deploy NEEDS VERIFICATION ==="
  exit 1
fi

# [5/5] Smoke test critical API endpoints
echo "[5/5] Smoke testing critical endpoints..."
API_BASE="https://progress-hub.zeabur.app/api"
FAIL=0

# Test dev-login (requires ENABLE_DEV_LOGIN=true on Zeabur)
DEV_LOGIN=$(curl -s -X POST "$API_BASE/auth/dev-login" \
  -H "Content-Type: application/json" \
  -d '{"name":"SmokeTest","permissionLevel":"EMPLOYEE"}' 2>/dev/null)
if echo "$DEV_LOGIN" | grep -q '"success":true'; then
  TOKEN=$(echo "$DEV_LOGIN" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  dev-login: OK"
else
  echo "  dev-login: FAILED — $DEV_LOGIN"
  FAIL=1
fi

# Test auth/me with token from dev-login
if [ -n "${TOKEN:-}" ]; then
  ME_RESP=$(curl -s "$API_BASE/auth/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  if echo "$ME_RESP" | grep -q '"success":true'; then
    echo "  auth/me:   OK"
  else
    echo "  auth/me:   FAILED — $ME_RESP"
    FAIL=1
  fi
fi

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "=== Deploy SUCCESS ==="
else
  echo ""
  echo "=== Deploy SUCCESS (with smoke test warnings) ==="
fi
