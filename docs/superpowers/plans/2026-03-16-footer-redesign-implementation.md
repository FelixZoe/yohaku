# Footer Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the footer to match the 書写·信纸·光影 design language — asymmetric split on desktop, flat inline flow on mobile, gradient fade boundary.

**Architecture:** Three files are modified: `Footer.tsx` (outer container + gradient fade), `FooterInfo.tsx` (full rewrite of layout and content), `GatewayInfo.tsx` (simplify connection indicator). All existing functionality is preserved; only visual layout and styling changes.

**Tech Stack:** Next.js App Router (async Server Components), React 19, Tailwind CSS v4, next-intl, Jotai, TanStack Query, @number-flow/react

**Spec:** `docs/superpowers/specs/2026-03-16-footer-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/components/layout/footer/Footer.tsx` | Modify | Outer `<footer>` container: gradient fade zone, background, padding, controls positioning |
| `apps/web/src/components/layout/footer/FooterInfo.tsx` | Rewrite | Desktop asymmetric split (brand left + link columns right) / mobile flat inline flow / bottom bar |
| `apps/web/src/components/layout/footer/GatewayInfo.tsx` | Modify | Simplify main display to small dot + text; keep radial gradient only in tooltip |
| `apps/web/src/components/layout/footer/config.ts` | No change | — |
| `apps/web/src/components/layout/footer/LocaleSwitcher.tsx` | No change | — |
| `apps/web/src/components/layout/footer/OwnerName.tsx` | No change | — |

---

## Chunk 1: Footer Container + Gradient Fade

### Task 1: Rewrite Footer.tsx

**Files:**
- Modify: `apps/web/src/components/layout/footer/Footer.tsx`

- [ ] **Step 1: Rewrite Footer.tsx**

Replace entire file with the new structure. Key changes:
- Remove `border-t` from footer element
- Add gradient fade div before footer content
- Move LocaleSwitcher + ThemeSwitcher inside FooterInfo (they are now part of the brand column on desktop / bottom block on mobile)

```tsx
import { ThemeSwitcher } from '~/components/ui/theme-switcher'

import { FooterInfo } from './FooterInfo'
import { LocaleSwitcher } from './LocaleSwitcher'

export const Footer = async () => (
  <>
    {/* Gradient fade boundary */}
    <div
      data-hide-print
      className="relative z-[1] mt-32 h-9 md:h-12"
      style={{
        background:
          'linear-gradient(to bottom, var(--color-root-bg, #fff), var(--footer-bg))',
      }}
    />

    <footer
      data-hide-print
      className="relative z-[1] bg-[var(--footer-bg)] pb-8 pt-0"
    >
      <div className="px-4 sm:px-8">
        <div className="mx-auto max-w-7xl lg:px-8">
          <FooterInfo
            localeSwitcher={<LocaleSwitcher />}
            themeSwitcher={<ThemeSwitcher />}
          />
        </div>
      </div>
    </footer>
  </>
)
```

- [ ] **Step 2: Verify Footer.tsx compiles**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -30`

This will likely fail because FooterInfo doesn't accept props yet. That's expected — we fix it in Task 2.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/footer/Footer.tsx
git commit -m "refactor(footer): restructure container with gradient fade boundary"
```

---

## Chunk 2: FooterInfo Rewrite

### Task 2: Rewrite FooterInfo.tsx

**Files:**
- Modify: `apps/web/src/components/layout/footer/FooterInfo.tsx`

This is the main rewrite. The file goes from ~220 lines to ~220 lines but with completely different layout structure.

- [ ] **Step 1: Rewrite FooterInfo.tsx**

Replace the entire file. Key structural changes:
- `FooterInfo` now accepts `localeSwitcher` and `themeSwitcher` as props (passed from Footer.tsx)
- Desktop: flex row with brand column (left, w-60) + link columns (right, flex-1)
- Mobile: vertical stack with brand → flat inline links → bottom meta
- `FooterLinkSection` renders columns on desktop, inline flow on mobile
- `FooterBottom` becomes a thin bottom bar (RSS/Sitemap/Subscribe · ICP)
- Motto moves from bottom copyright into brand area
- Remove `IonIosArrowDown` import
- Remove `Divider` component (replaced by dot separators)
- `StyledLink` updated with new hover style
- `PoweredBy` retains FloatPopover tooltip

```tsx
import 'server-only'

import { getTranslations } from 'next-intl/server'
import type { JSX, ReactNode } from 'react'

import { fetchAggregationData } from '~/app/[locale]/api'
import { SubscribeTextButton } from '~/components/modules/subscribe/SubscribeTextButton'
import { FloatPopover } from '~/components/ui/float-popover'
import { MarkdownLink } from '~/components/ui/link'
import { Link } from '~/i18n/navigation'

import type { FooterConfig } from './config'
import { getDefaultLinkSections } from './config'
import { GatewayInfo } from './GatewayInfo'
import { OwnerName } from './OwnerName'

interface FooterInfoProps {
  localeSwitcher: ReactNode
  themeSwitcher: ReactNode
}

export const FooterInfo = async ({
  localeSwitcher,
  themeSwitcher,
}: FooterInfoProps) => {
  const t = await getTranslations('common')
  const data = await fetchAggregationData()
  const { footer } = data.theme
  const footerConfig: FooterConfig = footer || {
    linkSections: getDefaultLinkSections(t),
    otherInfo: {} as any,
  }
  const { otherInfo } = footerConfig
  const currentYear = new Date().getFullYear().toString()
  const { date = currentYear, icp } = otherInfo || {}

  return (
    <>
      {/* Desktop: asymmetric split */}
      <div className="hidden md:flex md:gap-12">
        {/* Left: brand column */}
        <div className="w-60 shrink-0">
          <div className="text-base font-semibold text-neutral-9">
            <a href="/">
              <OwnerName />
            </a>
          </div>
          <div className="mt-1.5 text-xs leading-relaxed italic text-neutral-7">
            {t('footer_motto')}
          </div>

          <div className="mt-5 text-[11px] leading-loose text-neutral-6">
            <div>
              © {date.replace('{{now}}', currentYear)}
            </div>
            <PoweredBy />
          </div>

          <div className="mt-1 text-[11px] text-neutral-6">
            <GatewayInfo />
          </div>

          <div className="mt-4 flex gap-1.5">
            {localeSwitcher}
            {themeSwitcher}
          </div>
        </div>

        {/* Right: link columns */}
        <FooterLinkColumns sections={footerConfig.linkSections} />
      </div>

      {/* Mobile: flat inline flow */}
      <div className="md:hidden">
        {/* Brand block */}
        <div className="mb-4">
          <div className="mb-1 text-[15px] font-semibold text-neutral-9">
            <a href="/">
              <OwnerName />
            </a>
          </div>
          <div className="text-[11px] leading-relaxed italic text-neutral-7">
            {t('footer_motto')}
          </div>
        </div>

        {/* Links block */}
        <FooterLinkInline sections={footerConfig.linkSections} linksLabel={t('footer_links_label')} />

        {/* Bottom block */}
        <div className="border-t border-black/4 pt-3 dark:border-white/4">
          <div className="text-[10px] leading-relaxed text-neutral-6">
            <div>
              © {date.replace('{{now}}', currentYear)}{' '}
              <PoweredBy />
            </div>
            <div className="mt-0.5">
              <GatewayInfo />
            </div>
            {icp && (
              <div className="mt-0.5">
                <StyledLink
                  external
                  href={icp.link}
                  rel="noreferrer"
                >
                  {icp.text}
                </StyledLink>
              </div>
            )}
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[10px] text-neutral-6">
              <a href="/feed" rel="noreferrer" target="_blank">
                {t('rss_subscribe')}
              </a>
              <DotSep />
              <a href="/sitemap.xml" rel="noreferrer" target="_blank">
                {t('sitemap')}
              </a>
              <SubscribeTextButton>
                <DotSep />
              </SubscribeTextButton>
            </span>
            <div className="flex gap-1.5">
              {localeSwitcher}
              {themeSwitcher}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop bottom bar */}
      <div className="mt-6 hidden border-t border-black/4 pt-3 dark:border-white/4 md:flex md:items-center md:justify-between">
        <span className="text-[10px] text-neutral-6">
          <a href="/feed" rel="noreferrer" target="_blank">
            {t('rss_subscribe')}
          </a>
          <DotSep />
          <a href="/sitemap.xml" rel="noreferrer" target="_blank">
            {t('sitemap')}
          </a>
          <SubscribeTextButton>
            <DotSep />
          </SubscribeTextButton>
        </span>
        {icp && (
          <span className="text-[10px] text-neutral-6">
            <StyledLink
              external
              href={icp.link}
              rel="noreferrer"
            >
              {icp.text}
            </StyledLink>
          </span>
        )}
      </div>
    </>
  )
}

const DotSep = () => (
  <span className="mx-1.5 select-none text-neutral-5" aria-hidden>
    ·
  </span>
)

const FooterLinkColumns = ({
  sections,
}: {
  sections: FooterConfig['linkSections']
}) => (
  <div className="flex flex-1 gap-12 pt-0.5">
    {sections.map((section) => (
      <div key={section.name}>
        <div className="mb-2.5 text-[9px] font-medium uppercase tracking-[3px] text-neutral-6">
          {section.name}
        </div>
        <div className="text-xs leading-[2.4]">
          {section.links.map((link) => (
            <StyledLink
              key={link.name}
              className="block text-neutral-8/90 no-underline transition-[text-decoration] duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:underline hover:decoration-current/30 hover:underline-offset-2"
              external={link.external}
              href={link.href}
            >
              {link.name}
              {link.external && (
                <span className="ml-0.5 text-neutral-6"> ↗</span>
              )}
            </StyledLink>
          ))}
        </div>
      </div>
    ))}
  </div>
)

const FooterLinkInline = ({
  sections,
  linksLabel,
}: {
  sections: FooterConfig['linkSections']
  linksLabel: string
}) => {
  const allLinks = sections.flatMap((s) => s.links)

  return (
    <div className="mb-4">
      <div className="mb-2 text-[9px] font-medium uppercase tracking-[3px] text-neutral-6">
        {linksLabel}
      </div>
      <div className="text-[11px] leading-[2.2] text-neutral-8/90">
        {allLinks.map((link, i) => (
          <span key={link.name}>
            <StyledLink
              className="no-underline transition-[text-decoration] duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:underline hover:decoration-current/30 hover:underline-offset-2"
              external={link.external}
              href={link.href}
            >
              {link.name}
            </StyledLink>
            {i < allLinks.length - 1 && <DotSep />}
          </span>
        ))}
      </div>
    </div>
  )
}

const StyledLink = (
  props: JSX.IntrinsicElements['a'] & {
    external?: boolean
  },
) => {
  const { external, ...rest } = props
  const As = external ? 'a' : Link

  return (
    // @ts-ignore
    <As
      target={external ? '_blank' : props.target}
      rel={external ? 'noreferrer' : undefined}
      {...rest}
    >
      {props.children}
    </As>
  )
}

const PoweredBy = async () => {
  const t = await getTranslations('common')
  return (
    <span>
      Powered by{' '}
      <StyledLink
        className="underline decoration-black/15 underline-offset-2 dark:decoration-white/10"
        external
        href="https://github.com/mx-space"
      >
        Mix Space
      </StyledLink>
      <span className="mx-0.5">&</span>
      <FloatPopover
        mobileAsSheet
        type="tooltip"
        triggerElement={
          <StyledLink
            className="cursor-help underline decoration-black/15 underline-offset-2 dark:decoration-white/10"
            external
            href="https://github.com/Innei/Yohaku"
          >
            余白 / Yohaku
          </StyledLink>
        }
      >
        <div className="space-y-2">
          <p>
            {t.rich('shiroi_closed_source', {
              link: (chunks) => (
                <StyledLink
                  className="underline"
                  external
                  href="https://github.com/Innei/Yohaku"
                >
                  {chunks}
                </StyledLink>
              ),
            })}
          </p>
          <p>
            {t.rich('shiroi_get_via', {
              link: (chunks) => (
                <MarkdownLink
                  noIcon
                  href="https://github.com/sponsors/Innei"
                  popper={false}
                >
                  {chunks}
                </MarkdownLink>
              ),
            })}
          </p>
          {process.env.COMMIT_HASH && process.env.COMMIT_URL && (
            <p>
              <MarkdownLink noIcon href={process.env.COMMIT_URL} popper={false}>
                {t('version_hash', {
                  hash: process.env.COMMIT_HASH.slice(0, 8),
                })}
              </MarkdownLink>
            </p>
          )}
          {process.env.BUILD_TIME && (
            <p>
              {t('build_time', {
                time: new Date(process.env.BUILD_TIME).toLocaleDateString(),
              })}
            </p>
          )}
        </div>
      </FloatPopover>
      .
    </span>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | grep -E "error TS" | head -20`

Fix any type errors.

- [ ] **Step 3: Lint the modified files**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web exec eslint --fix apps/web/src/components/layout/footer/Footer.tsx apps/web/src/components/layout/footer/FooterInfo.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/footer/Footer.tsx apps/web/src/components/layout/footer/FooterInfo.tsx
git commit -m "feat(footer): redesign layout to asymmetric split desktop + inline flow mobile"
```

---

## Chunk 3: GatewayInfo Simplification

### Task 3: Simplify GatewayInfo main display

**Files:**
- Modify: `apps/web/src/components/layout/footer/GatewayInfo.tsx`

The main `GatewayInfo` export keeps its FloatPopover + RoomsInfo + Help. Only the visual indicator in the main inline display changes: from radial-gradient blob to a small 5px dot.

The `ConnectionStatus` component with its radial-gradient stays for the Help tooltip, but the main display just shows a small colored dot before the viewer count text.

- [ ] **Step 1: Add inline dot indicator to GatewayInfo export**

Modify the `GatewayInfo` component to show a small dot before the viewer text:

```tsx
export const GatewayInfo = () => {
  const t = useTranslations('gateway')
  const isActive = usePageIsActive()
  const count = useOnlineCount()
  const connected = useSocketIsConnect()

  if (!isActive) return null
  return (
    <div className="inline-flex items-center gap-2">
      <FloatPopover
        asChild
        mobileAsSheet
        offset={10}
        placement="top"
        trigger="both"
        triggerElement={
          <span className="inline-flex cursor-pointer items-center gap-1" key={count}>
            <span
              className="inline-block size-[5px] rounded-full"
              style={{
                backgroundColor: connected ? '#00FC47' : '#FC0000',
              }}
            />
            <span>
              {t('being_viewed')}
              <NumberFlow
                value={count}
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  verticalAlign: 'middle',
                }}
              />
              {t('viewers')}
            </span>
          </span>
        }
      >
        <RoomsInfo />
      </FloatPopover>
      <Help />
    </div>
  )
}
```

Note: `useSocketIsConnect` is already imported in this file. We add it to the GatewayInfo component so it can render the dot color.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | grep -E "error TS" | head -20`

- [ ] **Step 3: Lint**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web exec eslint --fix apps/web/src/components/layout/footer/GatewayInfo.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/footer/GatewayInfo.tsx
git commit -m "refactor(footer): simplify GatewayInfo to inline dot indicator"
```

---

## Chunk 4: Visual Verification

### Task 4: Dev server visual check

- [ ] **Step 1: Start dev server and verify**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web dev`

Check at `http://localhost:2323`:
1. Desktop (>768px): Asymmetric split — brand left (name, motto italic, ©, powered by, gateway dot, controls), link columns right (3 cols, section labels uppercase)
2. Mobile (<768px): Brand top → "LINKS" label → inline flow with dots → bottom meta with controls
3. Gradient fade: smooth transition from page background to footer background, no hard line
4. Dark mode: colors auto-invert correctly, gradient uses dark variables
5. All links work (internal + external with ↗ and target="_blank")
6. Yohaku tooltip still shows build info on hover
7. GatewayInfo popover still shows rooms info
8. LocaleSwitcher dropdown and ThemeSwitcher segmented control work correctly in their new position

- [ ] **Step 2: Fix any visual issues found**

Adjust spacing, colors, or layout as needed based on visual inspection.

- [ ] **Step 3: Final lint check on all modified files**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web exec eslint --fix apps/web/src/components/layout/footer/Footer.tsx apps/web/src/components/layout/footer/FooterInfo.tsx apps/web/src/components/layout/footer/GatewayInfo.tsx`

- [ ] **Step 4: Commit any fixes**

```bash
git add apps/web/src/components/layout/footer/
git commit -m "fix(footer): visual adjustments from dev review"
```
