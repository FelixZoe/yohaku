---
name: design-language
description: Use for any UI work in apps/web — components, pages, routes, animations, accent colors, CSS variables, domain modules, or visual/style changes. Triggers on "make a button", "add a route", "animate this", "fix the accent", "build a post list", "tweak the paper surface".
---

# Yohaku Design Language — Index

> All design and UI rules for `apps/web`. Read the sections you need via the links below.

## Table of Contents

| # | Document | When to read |
|---|---|---|
| 1 | [Hard Rules](./yohaku/rules.md) | **Always** — banned patterns, token-only styling, size budgets. Pre-flight for any UI task. |
| 2 | [Runtime Theming](./yohaku/theming.md) | Accent colors, CSS vars, glow, state-machine layout, cascade order. |
| 3 | [UI Primitives](./yohaku/component.md) | Creating/modifying `ui/` components, `tv()` variants, ref forwarding, barrel exports. |
| 4 | [Page Layout](./yohaku/page-layout.md) | Routes, containers, sidebars, server vs client, detail/list page recipes. |
| 5 | [Module Composition](./yohaku/module-composition.md) | Domain modules (post, note, comment, thinking…), data providers, TOC, comments. |
| 6 | [Motion](./yohaku/motion.md) | Springs, stagger, scroll-driven, modal choreography, shared-element transitions. |
| 7 | [Debugging](./yohaku/debugging.md) | Common failure modes, accent color troubleshooting, hydration fixes. |
| 8 | [Verification](./yohaku/verification.md) | How to validate your changes — commands, visual checks, cross-browser. |

## Quick reference

- Upstream spec: **`DESIGN.md`** at project root
- Static tokens: `packages/design-system/src/tokens.css`
- Token cheatsheet: `packages/design-system/CHEATSHEET.md`
