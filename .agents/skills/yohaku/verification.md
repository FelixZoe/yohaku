# Verification

> How to validate your changes.

## Commands

```bash
pnpm --filter @yohaku/design-system check    # tokens + templates
pnpm --filter @yohaku/web lint               # ESLint + typecheck on changed files
pnpm --filter @yohaku/web dev                # http://localhost:2323
```

## Visual checks

- **Theme**: toggle light / dark via `<ThemeSwitcher>` or DevTools. Confirm both modes look correct.
- **Mobile** (≤ md): no 3D effects, sidebars collapse, no horizontal scroll.
- **Reduced motion**: toggle `prefers-reduced-motion` in DevTools → animations stop or shorten.
- **Safari**: scroll-driven CSS falls back, glow hidden, content visible.
- **Navigation**: list → detail → back. Confirm shared-layout-ID transitions work.
- **Accent**: inspect `<head>` for two `<style id="accent-color-style">` tags (site + page). Confirm per-page hue changes between detail pages.

## Module-specific

- Comments load after 500 ms (no layout shift).
- TOC highlights correct heading on scroll.
- Presence indicator appears in real-time sections.
