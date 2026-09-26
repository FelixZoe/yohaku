#!/usr/bin/env bash
set -e
REPO_ROOT=$(pwd)

# Monorepo: build web app (use build:ci in CI for Next.js standalone)
pnpm --filter @shiro/web build:ci

cd apps/web/.next
pwd
rm -rf cache
cp -r ../public ./standalone/public
# Monorepo: static goes under standalone/apps/web/.next/
mv ./static ./standalone/apps/web/.next/static

cd ./standalone
echo ';process.title = "Shiro (NextJS)"' >> server.js

WEB_DIR="$REPO_ROOT/apps/web"
[ -f "$WEB_DIR/ecosystem.standalone.config.cjs" ] && cp "$WEB_DIR/ecosystem.standalone.config.cjs" ./ecosystem.config.js
[ -f "$WEB_DIR/.env.template" ] && cp "$WEB_DIR/.env.template" .env.template

cd "$REPO_ROOT"

mkdir -p "$REPO_ROOT/assets"
rm -rf "$REPO_ROOT/assets/release.zip"
# Archive contents of apps/web/.next (standalone/, static/, etc.) so unzip gives standalone/ at top level
(cd apps/web/.next && zip --symlinks -r "$REPO_ROOT/assets/release.zip" ./*)
