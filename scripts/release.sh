#!/bin/bash
set -e

cd "$(dirname "$0")/.."

DRY_RUN=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --skip-build) SKIP_BUILD=true ;;
  esac
done

PACKAGES=(
  "packages/rich-style-token"
  "packages/rich-editor-ui"
  "packages/rich-editor"
  "packages/rich-static-renderer"
  "packages/rich-renderer-alert"
  "packages/rich-renderer-banner"
  "packages/rich-renderer-codeblock"
  "packages/rich-renderer-image"
  "packages/rich-renderer-katex"
  "packages/rich-renderer-linkcard"
  "packages/rich-renderer-mention"
  "packages/rich-renderer-mermaid"
  "packages/rich-renderer-video"
  "packages/rich-ext-code-snippet"
  "packages/rich-ext-embed"
  "packages/rich-ext-gallery"
  "packages/rich-ext-excalidraw"
  "packages/rich-plugin-floating-toolbar"
  "packages/rich-plugin-link-edit"
  "packages/rich-plugin-slash-menu"
  "packages/rich-plugin-table"
  "packages/rich-renderers"
  "packages/rich-renderers-edit"
  "packages/rich-kit-shiro"
  "packages/rich-diff"
)

get_pkg_name() {
  jq -r '.name' "$1/package.json"
}

publish_cmd() {
  local dir="$1"
  if [ "$DRY_RUN" = true ]; then
    echo "[DRY-RUN] pnpm publish $dir --access public --no-git-checks"
  else
    (cd "$dir" && pnpm publish --access public --no-git-checks)
  fi
}

if [ "$SKIP_BUILD" = false ]; then
  echo "Building packages..."
  for pkg in "${PACKAGES[@]}"; do
    if [ -f "$pkg/package.json" ]; then
      name=$(get_pkg_name "$pkg")
      echo "Building $name..."
      pnpm --filter "$name" build
    fi
  done
fi

echo "Publishing..."
for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ]; then
    publish_cmd "$pkg"
  fi
done

echo "Done!"
