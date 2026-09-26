# Debugging

> Common failure modes and their fixes.

## Accent color

| Symptom | Fix |
|---|---|
| Wrong site-wide accent | DevTools → `<style id="accent-color-style">` (top of `<head>`). Confirm OKLCH value. If mounted twice, only first wins — find duplicate. |
| Wrong page-specific accent | DevTools → second `<style id="accent-color-style">` from `PageColorGradient`. Trace `seed` back through page tree. Check `glow.server.ts` `hashString` for determinism. |
| Hue not affecting glow | Check `--accent-hue` on `.page-glow-accent`. Ensure portal mounted (`RootPortal.tsx`). |
| Cascade override | `grep` CSS files for `--color-accent:` — anything outside `tokens.css`, `AccentColorStyleInjector`, or `PageColorGradient` is a bug. |
| Safari blank glow | Expected — `.is-safari` disables it. Confirm class on `<html>`. |

## Layout

| Symptom | Fix |
|---|---|
| Sidebar not sticky | Must use `LayoutRightSidePortal`, not flex sibling. |
| Sidebar visible in reading mode | Add `yohaku-fadeable` class. Check `body[data-yohaku-state]` is set. |
| Content jumps on hydrate | Add `lcpOptimization` to transition view. Check `HydrationEndDetector`. |
| 3-column grid broken on mobile | Expected — grid collapses below `xl`. Sidebars hide via `hidden xl:block`. |

## Motion

| Symptom | Fix |
|---|---|
| Animation flash on mount | Use `opacity: 0.001` not `0`. Add `lcpOptimization`. |
| Stagger feels sluggish | Reduce cadence to 45-60 ms. |
| Safari animations broken | Scroll-driven CSS should have `@supports` fallback. Glow is intentionally disabled via `.is-safari`. |
| `layoutId` flicker | Ensure the ID is unique and stable across mounts. Namespace by domain. |

## Theming

| Symptom | Fix |
|---|---|
| New variable doesn't switch in dark | Declare both `:root` and `[data-theme='dark']` in `variables.css`. |
| `dark:text-neutral-N` needed | Wrong — the scale auto-inverts. Use `text-neutral-N` without `dark:` prefix. |
