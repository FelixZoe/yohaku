---
name: neutral-color-spec
description: Use when writing or reviewing code that uses neutral/gray colors — enforces the 3-tier neutral scale (1-10) with contrast rules
---

# Neutral Scale — Pure

True gray (zero hue), compressed range, 3-tier convention, auto-inverts in dark mode. Only `neutral-1` through `neutral-10`. The old `neutral-50~950` scale is deprecated and must not be used.

## Values

| Step | Light   | Dark (inverted) | Contrast vs n-1 |
|------|---------|-----------------|-----------------|
| 1    | #f8f8f8 | #141414         | —               |
| 2    | #f0f0f0 | #242424         | 1.1:1           |
| 3    | #e3e3e3 | #404040         | 1.3:1           |
| 4    | #d0d0d0 | #5c5c5c         | 1.7:1           |
| 5    | #a8a8a8 | #787878         | 2.4:1           |
| 6    | #787878 | #a8a8a8         | 3.8:1           |
| 7    | #5c5c5c | #d0d0d0         | 5.6:1           |
| 8    | #404040 | #e3e3e3         | 8.6:1           |
| 9    | #242424 | #f0f0f0         | 14.5:1          |
| 10   | #141414 | #f8f8f8         | 17.8:1          |

## 3-Tier Rules

### Tier 1: Surface (1–4)

`bg-neutral-1` page bg / `bg-neutral-2` card / `bg-neutral-3` hover / `bg-neutral-4` active

`text-neutral-1/2/3/4` is **forbidden** — contrast < 2:1.

### Tier 2: Structure (5–7)

| Step | Usage | Text rule |
|------|-------|-----------|
| 5 | Borders, dividers, decorative icons | No text (except decorative fade e.g. timeline) |
| 6 | Placeholder, timestamps, captions | Small text only (≤12px or unimportant info) |
| 7 | Secondary text, descriptions, meta | AA compliant (5.6:1), usable at body size |

### Tier 3: Content (8–10)

| Step | Usage |
|------|-------|
| 8 | Secondary body text, long paragraphs |
| 9 | Primary body text — **recommended default** |
| 10 | Headings, emphasis, highest visual weight |

## Key Constraints

1. `neutral-1~10` auto-inverts in dark mode — **most cases need no `dark:` prefix**
2. Non-theme contexts (e.g. image EXIF overlay) use fixed values like `bg-black/70`, `text-white`
3. `text-neutral-5` is only allowed in decorative gradient contexts (e.g. timeline fade); forbidden for regular text
4. `text-neutral-9` is the recommended body default
5. `neutral-50~950` is **banned** — do not use
