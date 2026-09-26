#!/usr/bin/env bash
# Commit dirty yohaku-oss, push it, point this repo at that SHA, then push.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OSS="$ROOT/yohaku-oss"

DRY_RUN=false
MESSAGE=""

usage() {
  cat <<'EOF'
Usage: scripts/ship-oss.sh -m "<message>" [--dry-run]

From the closed-source repo: commit and push yohaku-oss, then commit the
gitlink (plus any other already-dirty parent files) and push this repo.

  -m, --message   Required when yohaku-oss or parent-only files need a commit.
                  Parent gitlink commits use:
                    chore(mobile): bump public iOS source — <oss subject>
  --dry-run       Print actions without committing or pushing.
EOF
}

die() {
  printf 'ship-oss: %s\n' "$*" >&2
  exit 1
}

log() {
  printf 'ship-oss: %s\n' "$*"
}

run() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

repo_branch() {
  git -C "$1" rev-parse --abbrev-ref HEAD
}

require_branch() {
  local label="$1" repo="$2"
  git -C "$repo" symbolic-ref -q HEAD >/dev/null \
    || die "$label is detached HEAD; checkout a branch first"
}

is_dirty() {
  [[ -n "$(git -C "$1" status --porcelain)" ]]
}

has_upstream() {
  git -C "$1" rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1
}

ahead_count() {
  if has_upstream "$1"; then
    git -C "$1" rev-list --count '@{upstream}..HEAD'
  else
    echo 1
  fi
}

needs_push() {
  [[ "$(ahead_count "$1")" -gt 0 ]]
}

recorded_oss_sha() {
  git -C "$ROOT" ls-tree HEAD yohaku-oss | awk '{ print $3 }'
}

parent_other_dirty() {
  local line path
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    path="${line:3}"
    path="${path#\"}"
    path="${path%\"}"
    case "$path" in
      yohaku-oss | yohaku-oss/* | reporter-assets | reporter-assets/*) continue ;;
    esac
    printf '%s\n' "$path"
  done < <(git -C "$ROOT" status --porcelain)
}

stage_parent() {
  local path
  run git -C "$ROOT" add yohaku-oss
  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    run git -C "$ROOT" add -- "$path"
  done < <(parent_other_dirty)
}

parent_should_commit() {
  if [[ "$DRY_RUN" == true ]]; then
    [[ "$OSS_DIRTY" == true \
      || "$(recorded_oss_sha)" != "$(git -C "$OSS" rev-parse HEAD)" \
      || -n "$(parent_other_dirty)" ]]
    return
  fi
  ! git -C "$ROOT" diff --cached --quiet
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m | --message)
      [[ $# -ge 2 ]] || die "missing value for $1"
      MESSAGE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
done

cd "$ROOT"

[[ -e "$OSS/.git" ]] || die "yohaku-oss is not a git checkout (run git submodule update --init)"

require_branch 'closed repo' "$ROOT"
require_branch 'yohaku-oss' "$OSS"

OSS_DIRTY=false
PARENT_OTHER=false
POINTER_STALE=false

if is_dirty "$OSS"; then
  OSS_DIRTY=true
fi
if [[ -n "$(parent_other_dirty)" ]]; then
  PARENT_OTHER=true
fi
if [[ "$(recorded_oss_sha)" != "$(git -C "$OSS" rev-parse HEAD)" ]]; then
  POINTER_STALE=true
fi

if [[ "$OSS_DIRTY" == true && -z "$MESSAGE" ]]; then
  die "yohaku-oss is dirty; pass -m \"<message>\""
fi
if [[ "$OSS_DIRTY" == false && "$PARENT_OTHER" == true && "$POINTER_STALE" == false && -z "$MESSAGE" ]]; then
  die "parent has local changes; pass -m \"<message>\""
fi

if [[ "$OSS_DIRTY" == false && "$PARENT_OTHER" == false && "$POINTER_STALE" == false ]] \
  && ! needs_push "$OSS" && ! needs_push "$ROOT"; then
  log 'nothing to ship'
  exit 0
fi

if [[ "$OSS_DIRTY" == true ]]; then
  log "committing yohaku-oss on $(repo_branch "$OSS")"
  if [[ "$DRY_RUN" == true ]]; then
    git -C "$OSS" status --short
  fi
  run git -C "$OSS" add -A
  if [[ "$DRY_RUN" == true ]] || ! git -C "$OSS" diff --cached --quiet; then
    run git -C "$OSS" commit -m "$MESSAGE"
  fi
fi

if [[ "$OSS_DIRTY" == true ]] || needs_push "$OSS"; then
  log "pushing yohaku-oss $(repo_branch "$OSS")"
  run git -C "$OSS" push -u origin HEAD
fi

OSS_HEAD="$(git -C "$OSS" rev-parse HEAD)"
if [[ "$OSS_DIRTY" == true ]]; then
  OSS_SUBJECT="$MESSAGE"
else
  OSS_SUBJECT="$(git -C "$OSS" log -1 --format=%s)"
fi

if [[ "$PARENT_OTHER" == true && "$POINTER_STALE" == false && "$OSS_DIRTY" == false ]]; then
  PARENT_MESSAGE="$MESSAGE"
else
  PARENT_MESSAGE="chore(mobile): bump public iOS source — $OSS_SUBJECT"
fi

if [[ "$OSS_DIRTY" == true || "$POINTER_STALE" == true || "$PARENT_OTHER" == true ]] \
  || [[ "$(recorded_oss_sha)" != "$OSS_HEAD" ]]; then
  log "pointing closed repo at yohaku-oss $OSS_HEAD"
  stage_parent
  if parent_should_commit; then
    log "committing closed repo on $(repo_branch "$ROOT")"
    run git -C "$ROOT" commit -m "$PARENT_MESSAGE"
  fi
fi

if needs_push "$ROOT" || [[ "$DRY_RUN" == true && ( "$OSS_DIRTY" == true || "$POINTER_STALE" == true || "$PARENT_OTHER" == true ) ]]; then
  log "pushing closed repo $(repo_branch "$ROOT")"
  run git -C "$ROOT" push -u origin HEAD
fi

log "yohaku-oss  $(git -C "$OSS" rev-parse --short HEAD)  $(repo_branch "$OSS")"
log "closed      $(git -C "$ROOT" rev-parse --short HEAD)  $(repo_branch "$ROOT")"
