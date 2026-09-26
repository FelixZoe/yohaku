# Hard Rules

> These apply everywhere. Violations are bugs. Read this before any UI task.

## Token-only styling

| ❌ Forbidden | ✅ Required |
|---|---|
| `text-neutral-500` (Tailwind palette) | `text-neutral-7` (Yohaku scale 1–10) |
| `style={{ color: '#242424' }}` | `className="text-neutral-9"` |
| `font-family: 'Charter'` | `var(--font-serif)` |
| `<strong class="font-bold">` on CJK | `font-medium` |
| `shadow-lg` / `xl` / `2xl` | `ring-1 ring-border` or `shadow-[0_4px_24px_rgba(0,0,0,0.05)]` |
| `rounded-3xl` | `rounded-2xl` cap |
| accent for active nav / hover | `bg-white/55` (light) or `bg-black/[0.02]` |
| `backdrop-blur` on dropdown popup | solid surface |

## Color

- Neutral scale **`text-neutral-1..10`** only. Tailwind's `neutral-50..950` is banned.
- Never `dark:text-neutral-N` — the scale auto-inverts via `apps/web/src/styles/variables.css`.
- Default body text `text-neutral-9`. Never use n-5 as text.
- Accent ≤ 5% surface coverage. Never accent for active nav / dropdown hover.

## Typography

- Heading weight `font-medium`. **Never `font-bold` on CJK** (faux-stroke artifacts).
- Font stacks via `var(--font-sans|serif|mono)` — hardcoded `font-family` is a lint failure.

## Depth

- `ring-1 ring-border` or `shadow-[0_4px_24px_rgba(0,0,0,0.05)]`. **Never `shadow-lg|xl|2xl`.**
- Radius cap `rounded-2xl`. **Never `rounded-3xl`.**

## Motion

- Spring presets from `~/constants/spring.ts` — never inline transition objects.
- Mobile drops 3D perspective. `prefers-reduced-motion` overrides everything.

## Token source

- Edit `packages/design-system/src/tokens.css` for token contract changes; never duplicate tokens in `apps/web`.
