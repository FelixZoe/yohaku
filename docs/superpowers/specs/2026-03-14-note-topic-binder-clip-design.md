# Note Topic Binder Clip UI Design

## Overview

When a note belongs to a topic, display a binder clip (长尾夹) element on the top-left corner of the Paper component. The clip visually indicates topic membership and provides quick access to topic details.

## Design Decisions

### Visual Style
- **Shape**: Corner-wrap binder clip body (no handles). A horizontal bar along the top edge carries the topic name, with a short vertical tab extending down the left edge — forming an "L" shape that wraps the paper's top-left corner.
- **Texture**: 3D embossed effect with gradient background, inner bevel highlight, and drop shadow to simulate a physical clip sitting on the paper.
- **Color**: Dynamically computed from a hash of the topic title. Each topic produces a unique hue. The gradient uses three stops (light → mid → dark) for depth. Dark mode uses slightly brighter variants of the same hue.

### Position & Layout
- Absolutely positioned at the Paper's top-left corner (`top: -1px; left: -1px`), overlapping the paper border.
- Horizontal bar: ~100px wide, ~22px tall, `border-radius: 0 5px 5px 0` (flush left, rounded right).
- Vertical tab: ~6px wide, ~20px tall, `border-radius: 0 0 3px 0`, extends below the horizontal bar.
- Content padding-top on Paper must accommodate the clip height (~36px top padding when clip is present).

### Interaction
- **Hover**: Clip brightens slightly (lighten gradient stops ~10%), gains a soft glow shadow (`box-shadow` with topic color at 30% opacity). Triggers a `FloatPopover` showing the `NoteTopicDetail` component (topic name, introduce, description, recent articles, article count).
- **Click**: Navigates to the topic detail page (`/notes/topics/[slug]`).
- **Cursor**: `pointer` on hover.
- **Transition**: `all 0.2s ease` for hover color/shadow changes.

### Responsive Behavior
- **Desktop (lg+)**: Clip visible, fully interactive.
- **Mobile**: Hidden (`hidden lg:block`). Users rely on the existing `NoteBottomTopic` card.

### Relationship with Existing Components
- **NoteBottomTopic**: Remains unchanged. Both coexist — the clip is a quick-access entry point, the bottom card provides detailed context.
- **NoteTopicInfo** (left sidebar): Remains unchanged.

### Color Generation
- Hash the topic title string to produce a hue value (0-360).
- Generate HSL color with constrained saturation (30-40%) and lightness (light mode: 35-45%, dark mode: 45-55%) to ensure readability of white text on the clip.
- Gradient: `linear-gradient(135deg, hsl(h, s, l+5%) 0%, hsl(h, s, l) 40%, hsl(h, s, l-5%) 100%)`.

### Dark Mode
- Same hue from hash, but lightness shifted up ~10% for visibility against dark paper background.
- Reduced highlight intensity (`rgba(255,255,255,0.12)` vs `0.2` in light mode).
- Stronger text shadow for contrast.

## Component Structure

```
NoteTopicBinderClip (new component)
├── FloatPopover (existing, wraps the clip)
│   ├── triggerElement: BinderClipVisual
│   │   ├── HorizontalBar (topic name text)
│   │   └── VerticalTab
│   └── popoverContent: NoteTopicDetail (existing)
└── Link to /notes/topics/[slug]
```

### New Files
- `apps/web/src/components/modules/note/NoteTopicBinderClip.tsx` — the clip component

### Modified Files
- `apps/web/src/app/[locale]/notes/[id]/page.tsx` — render `NoteTopicBinderClip` inside Paper, before other content

## Technical Notes

- Use `useCurrentNoteDataSelector` to access `topic` data.
- Use `useIsMobile()` or Tailwind responsive classes to hide on mobile.
- Reuse existing `FloatPopover` and `NoteTopicDetail` components.
- Color hash function: simple string hash → modulo 360 for hue. Can use a utility like `stringToHue(title: string): number`.
