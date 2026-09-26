# Footer Redesign — Design Spec

## Overview

Redesign the footer (`apps/web/src/components/layout/footer/`) to align with the 書写·信纸·光影 design language. All existing content blocks are preserved; only visual treatment and layout change.

## User Decisions

- **Desktop layout**: C — Asymmetric Split (left brand, right link columns)
- **Mobile layout**: C3 — Flat Inline Flow (brand top, links inline with dot separators)
- **Top boundary**: D1 — Gradient Fade (no hard border-t)

## Content Blocks (all retained)

1. **Link sections** — About / More / Contact (3 groups, each with 3 links, from API config)
2. **Bottom info** — © year + owner name, RSS, Sitemap, SubscribeTextButton (client component, opens subscribe modal), Motto
3. **Powered by** — Mix Space & 余白/Yohaku + build info tooltip
4. **GatewayInfo** — online viewer count + Socket connection indicator
5. **Controls** — LocaleSwitcher (dropdown) + ThemeSwitcher (segmented three-button group)
6. **VercelPoweredBy** — currently unused (not imported by Footer.tsx), excluded from this redesign

## Desktop Layout (md+)

### Structure

```
┌─────────────────────────────────────────────────────────┐
│ gradient-fade zone (h-12, from page-bg to --footer-bg)  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐   ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Owner    │   │ ABOUT   │ │ MORE    │ │ CONTACT │   │
│  │ Name     │   │ Link 1  │ │ Link 1  │ │ Link 1  │   │
│  │          │   │ Link 2  │ │ Link 2  │ │ Link 2  │   │
│  │ Motto    │   │ Link 3↗ │ │ Link 3↗ │ │ Link 3↗ │   │
│  │ (italic) │   └─────────┘ └─────────┘ └─────────┘   │
│  │          │                                           │
│  │ © + PWR  │                                           │
│  │ Gateway  │                                           │
│  │ [En][☀]  │                                           │
│  └──────────┘                                           │
│                                                         │
│  ─ ─ ─ ─ ─ ─ ─ (0.5px hairline black/4) ─ ─ ─ ─ ─ ─  │
│  RSS · Sitemap · Subscribe                    ICP 备案  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Left Column (brand area, flex-shrink-0 w-60)

- **Owner name**: text-base font-semibold (serif inherits from page; ensure a `font-serif` ancestor is present)
- **Motto**: text-xs italic text-neutral-7, leading-relaxed, mt-1.5. **Moved here from the old bottom copyright line** — it no longer appears inline with ©.
- **Copyright + Powered by**: text-[11px] text-neutral-6, line-height loose (leading-loose), mt-5
  - Links (Mix Space, 余白) use underline with `decoration-black/15 dark:decoration-white/10 underline-offset-2`
  - 余白/Yohaku retains FloatPopover tooltip with build info
- **GatewayInfo**: text-[11px] text-neutral-6, mt-1, inline-flex with green dot (w-[5px] h-[5px] rounded-full bg-[#00FC47])
- **Controls**: flex gap-1.5, mt-4
  - LocaleSwitcher and ThemeSwitcher are used as-is (existing components, not restyled). They are simply repositioned into the left brand column.

### Right Area (link columns, flex-1)

- Three columns in a flex row with gap-12
- **Section label**: text-[9px] uppercase tracking-[3px] text-neutral-6 font-medium mb-2.5
- **Links**: text-xs leading-[2.4] text-neutral-8/90
  - Each link is a block element (display: block)
  - Hover: underline with ink-pressure style (opacity increase, no scale)
  - External links: append ` ↗` suffix (text-neutral-6)
- No arrow icon (remove IonIosArrowDown from current design)

### Bottom Bar

- Separated by 0.5px hairline: `border-t border-black/4 dark:border-white/4`
- flex justify-between, mt-6 pt-3
- Left: RSS · Sitemap · SubscribeTextButton (text-[10px] text-neutral-6, dot separators with text-neutral-5)
- Right: ICP info if present (text-[10px] text-neutral-6)

## Mobile Layout (<md)

### Structure

```
┌───────────────────────────┐
│ gradient-fade (h-9)       │
├───────────────────────────┤
│                           │
│ Owner Name                │
│ Motto (italic)            │
│                           │
│ LINKS                     │
│ Link1 · Link2 · Link3 ·  │
│ Link4 · Link5 · Link6 ·  │
│ Link7 · Link8 · Link9    │
│                           │
│ ─ ─ (hairline) ─ ─ ─ ─   │
│ © 2020–2026 · PWR         │
│ 🟢 3 viewers online       │
│                           │
│ RSS·Sitemap·Sub   [En][☀] │
└───────────────────────────┘
```

### Brand Block

- **Owner name**: text-[15px] font-semibold, mb-1
- **Motto**: text-[11px] italic text-neutral-7, leading-relaxed
- mb-4 below brand block

### Links Block

- **Section label**: text-[9px] uppercase tracking-[3px] text-neutral-6, mb-2, reads "Links" (single label, not per-group)
- All links from all sections flattened into a single inline flow
- text-[11px] text-neutral-8/90, leading-[2.2]
- Separated by ` · ` (dot, text-neutral-5)
- mb-4 below links block

### Bottom Block

- border-t border-black/4 dark:border-white/4, pt-3
- **Line 1**: © + year + Powered by (text-[10px] text-neutral-6)
- **Line 2**: GatewayInfo with green dot, mt-0.5, text-[10px] text-neutral-6
- **Line 3**: ICP info if present (text-[10px] text-neutral-6)
- **Line 4**: flex justify-between items-center, mt-2.5
  - Left: RSS · Sitemap · SubscribeTextButton (text-[10px] text-neutral-6, dot separators text-neutral-5)
  - Right: LocaleSwitcher + ThemeSwitcher (existing components, repositioned)

## Gradient Fade Boundary

Replace current `border-t` with a gradient transition zone:

- **Element**: A div before the footer content
- **Desktop**: `h-12` with `background: linear-gradient(to bottom, var(--color-root-bg, #fff), var(--footer-bg))`
- **Mobile**: `h-9`
- **Dark mode**: Gradient from dark root-bg to dark footer-bg (automatic via CSS variables)
- The footer element itself: remove `border-t`, keep `bg-[var(--footer-bg)]`

## Color Tokens

| Element | Light | Dark |
|---------|-------|------|
| Footer background | `var(--footer-bg)` (existing) | `var(--footer-bg)` (existing) |
| Owner name | `text-neutral-9` | auto-inverts |
| Motto | `text-neutral-7` italic | auto-inverts |
| Section labels | `text-neutral-6` | auto-inverts |
| Links | `text-neutral-8/90` | auto-inverts |
| External arrow | `text-neutral-6` | auto-inverts |
| Meta text (©, PWR, RSS) | `text-neutral-6` | auto-inverts |
| Dot separators | `text-neutral-5` (decorative) | auto-inverts |
| Control borders | `border-black/6` | `dark:border-white/8` |
| Bottom hairline | `border-black/4` | `dark:border-white/4` |
| Gateway dot | `bg-[#00FC47]` (connected) / `bg-[#FC0000]` (disconnected) | same |

## Typography

- Owner name: inherits page serif, font-semibold
- Motto: serif italic
- Section labels: 9px, uppercase, tracking 3px, font-medium
- Links: 12px (desktop) / 11px (mobile)
- Meta text: 10-11px

## Animation

- No entry animations for footer (it's below-fold, always visible when scrolled to)
- Link hover: color transition 200ms with project easing `cubic-bezier(0.22, 1, 0.36, 1)`
- Control hover: border-opacity increase, 200ms same easing

## Interaction

- Links: hover shows underline (`underline decoration-current/30 underline-offset-2`)
- External links: `target="_blank"` + ↗ suffix
- Yohaku link: retains cursor-help + FloatPopover tooltip (build info)
- GatewayInfo: retains FloatPopover with rooms info on click/hover
- Controls: ink-pressure model (opacity deepen on hover, translateY(1px) on active)

## Files to Modify

- `Footer.tsx` — remove border-t, add gradient fade div, restructure layout
- `FooterInfo.tsx` — rewrite to asymmetric split (desktop) / flat inline (mobile), remove IonIosArrowDown, update typography
- `GatewayInfo.tsx` — simplify to inline dot + text (remove radial gradient indicator for the main display; keep in tooltip)
- `config.ts` — no changes needed
- `LocaleSwitcher.tsx` — no changes needed (repositioned in layout, used as-is)
- `OwnerName.tsx` — no changes needed
- `VercelPoweredBy.tsx` — currently unused (not imported), no changes needed

## CSS Variables Required

- `--color-root-bg` — already exists in accent-color.ts (generated as CSS variable for root background)
- `--footer-bg` — already exists in accent-color.ts

## Responsive Breakpoint

- Single breakpoint at `md` (768px), consistent with existing footer
- Desktop (md+): Asymmetric split with flex-row
- Mobile (<md): Vertical stack with inline flow links

## Accessibility

- All links remain focusable with proper href
- External links retain `target="_blank"` with `rel="noreferrer"`
- Color contrast: neutral-8/90 on footer-bg meets WCAG AA for body text
- Gateway connection status: color + text label (not color-only)
