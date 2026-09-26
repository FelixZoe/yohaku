#!/bin/sh
# Restore the pre-#173 layout for Docker / `next build` without changing the
# git consumer model (yohaku-oss submodule + committed workspace symlinks).
#
# Next does not resolve `@yohaku/rich-content/*` through the double symlink
#   node_modules → packages/<name> → yohaku-oss/...
# even with transpilePackages / outputFileTracingRoot / turbopack.root (#177).
# Dereference those workspace links into real directories before `pnpm install`.
#
# A dangling link means yohaku-oss was not in the build context (gitlink /
# submodule dropped). Fail loudly instead of letting `next build` emit
# "Can't resolve '@yohaku/rich-content/...'".
set -eu

links='packages/rich-content packages/design-system packages/dom-webview apps/mobile'

fail_missing() {
  link=$1
  target_hint=$2
  echo "ERROR: $link is a dangling symlink (target=${target_hint})." >&2
  echo "The yohaku-oss submodule was not present in the Docker build context." >&2
  echo "Checkout with submodules: recursive; BuildKit must not drop gitlinks." >&2
  ls -la yohaku-oss >&2 || true
  ls -la yohaku-oss/packages >&2 || true
  ls -la yohaku-oss/apps >&2 || true
  ls -la yohaku-oss/design-system >&2 || true
  exit 1
}

for link in $links; do
  if [ -L "$link" ]; then
    raw=$(readlink "$link")
    target=$(readlink -f "$link" 2>/dev/null || true)
    if [ -z "$target" ] || [ ! -e "$target" ]; then
      fail_missing "$link" "$raw"
    fi
    echo "Materializing $link <- $target"
    rm "$link"
    cp -a "$target" "$link"
  elif [ -d "$link" ]; then
    echo "Keeping $link (already a real directory)"
  else
    echo "ERROR: expected $link to be a symlink into yohaku-oss or a real directory." >&2
    echo "The yohaku-oss submodule was not present in the Docker build context." >&2
    exit 1
  fi
done
