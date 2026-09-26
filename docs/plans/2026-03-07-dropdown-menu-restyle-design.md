# Dropdown Menu Restyle Design

**Date:** 2026-03-07

**Scope:** Visual-only restyle of `@haklex/rich-editor-ui` dropdown menu primitives.

**Goal:** Make the existing dropdown visually match the provided Base UI reference more closely while preserving the current exported API, structure, and interaction behavior.

## Constraints

- Keep the current component exports in `haklex/rich-editor-ui/src/components/dropdown-menu/index.tsx`.
- Do not change external call sites.
- Keep Base UI primitives and portal/theme handling intact.
- Prefer token-driven styling via `@haklex/rich-style-token` and Vanilla Extract.

## Chosen Approach

Use the existing component structure and restyle it in place.

- Adjust popup visuals to feel lighter and more card-like: rounded corners, subtle border, softer shadow, cleaner padding, and refined open/close transitions.
- Adjust item density and spacing to better match the reference: tighter icon sizing, more even horizontal padding, rounded hover/highlight states, and consistent row height.
- Align label, separator, checkbox, and radio indicator placement with the reference so all menu variants feel like one system.
- Keep implementation changes localized to `index.tsx` and `styles.css.ts`.

## Why This Approach

- Lowest compatibility risk because public API and composition model stay unchanged.
- Easy to review because the change is isolated to one primitive package.
- Future consumers such as toolbar, code snippet menus, and renderer edit UIs inherit the improved look automatically.

## Validation

- Build `@haklex/rich-editor-ui` successfully.
- Check edited files for lint issues.
- Spot-check menu states for normal item, highlighted item, disabled item, checkbox item, and radio item.
