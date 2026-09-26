# Modal Navigation Design

Date: 2026-09-23
Status: Approved design, not implemented

## Goal

Let a stacked modal push a new view inside the same panel, with a back affordance, the way a `UINavigationController` pushes inside an iOS sheet. Stacking a second modal stays available for the cases that want it.

This round builds the mechanism and a demo page only. No business call site adopts it yet.

## Scope

In scope:

- `push` / `back` / `canGoBack` on `useCurrentModal()`
- One navigation unit rendered by both the desktop modal (`stacked/modal.tsx`) and the mobile sheet (`sheet/Sheet.tsx`)
- Push and pop transitions for header and content, panel height animation
- Esc pops before it closes
- Demo route `app/dev-demos/modal-navigation/page.tsx`

Out of scope:

- Route params serialization, URL sync, pushing several views at once
- Edge-swipe-to-go-back on mobile (conflicts with the sheet's swipe-down dismissal)
- `push` inside `CustomModalComponent` modals (they draw their own chrome)
- Migrating `PostTagsFAB` or any other call site

## API

`present()` is unchanged. Content pushes through the modal context:

```tsx
const { push, back, canGoBack } = useCurrentModal()

push({
  title: `Tag: ${name}`,
  content: () => <TagDetail name={name} />,
})
```

- `push(route)` — `route` is `{ title: ReactNode; content: FC<ModalContentPropsInternal>; contentClassName?: string }`, the same content contract as `present()`. Pushed content receives `dismiss`.
- `back()` — pops one view. No-op at the root.
- `canGoBack` — `true` when depth > 1.
- `dismiss()` from any depth closes the whole modal.
- `present()` from a pushed view still stacks a new modal, which gets the between-layer scrim.
- In the `CustomModalComponent` path, `push` logs a dev warning and does nothing.

## Structure

### State

The route stack is local `useState` inside each modal, not part of `modalStackAtom`. The stack lives and dies with its modal. The root route is the `title` and `content` passed to `present()`.

The stack transitions are a pure reducer so they can be unit tested:

```ts
navReducer(state, { type: 'push', route }) // depth + 1, direction +1
navReducer(state, { type: 'pop' })         // depth - 1, direction -1; no-op at root
```

### `stacked/navigation.tsx`

`ModalNavigation` is a provider plus three slots, so each container places the pieces inside its own chrome:

```tsx
<ModalNavigation root={{ title, content, contentClassName }}>
  <ModalNavigation.Back />
  <ModalNavigation.Title />
  <ModalNavigation.Viewport />
</ModalNavigation>
```

- Provider: owns the route stack, extends `CurrentModalContext` with `push` / `back` / `canGoBack`.
- `Back`: the `‹ <previous title>` button. Rendered outside the title heading so screen readers do not read a button as the title.
- `Title`: the current route's title. It is the content of `Dialog.Title` (desktop) / `Drawer.Title` (mobile), so the accessible name always matches the visible view.
- `Viewport`: every route in the stack, mounted. Handles the cross-fade, offset, and height.

### Container changes

- `stacked/modal.tsx`: replaces its title block and content block with the navigation slots. The close button and the drag handle stay in `ModalInternal`, outside the navigation layer. This also brings the file back under 300 lines (currently 302).
- `sheet/Sheet.tsx`: adds one prop, `leading?: ReactNode`, rendered before `Drawer.Title`. `modal.tsx` wraps `PresentSheet` in the provider; React context crosses the portal.

## Transitions

### Principle

Only elements that differ between the two states animate. Anything present and in the same place before and after stays still.

| Element | Before → after push | Behavior |
| --- | --- | --- |
| Panel surface, border, close button | same | static, by construction (outside the navigation layer) |
| Title | `Tag cloud` → `Tag: Methodology` | old title becomes the back label; new title blurs in |
| Back button | none → `‹ Tag cloud` | receives the old title |
| Content | view A → view B | cross-fade with a 12px offset |
| Panel height | tall → short | animates to the new content height |

### Timing

Taken from `_UINavigationBarTitleTransitionSpec` (iOS 26.5), documented in the UIKitCore reverse-engineering post. A tap has zero velocity, so `bounce = 0` and the duration factor is `1.0`:

- Fast spring, 0.45s, bounce 0: alpha and gaussian blur
- Slow spring, 0.7s, bounce 0: position and height

No bounce anywhere, matching the rest of Yohaku's motion.

### Header

- Old title: shared element with the back label through motion `layoutId`. It shrinks and moves to the leading edge, becoming `‹ Tag cloud`. The chevron fades in with the fast spring.
- New title: enters from 15px trailing, gaussian blur 4px → 0 and alpha 0 → 1 on the fast spring, x on the slow spring.
- Pop reverses both: the back label grows back into the title position; the pushed title leaves toward trailing with blur-out.

### Content

A cross-fade with a small horizontal offset. No full-width slide: on desktop a panel-wide slide reads as too heavy.

- Push: the outgoing view fades out while moving 12px toward leading; the incoming view fades in from 12px trailing.
- Pop reverses: the top view fades out toward trailing; the view below fades in from leading.
- Opacity uses the fast spring; offset uses the slow spring.
- Views carry no background; the panel's `bg-paper` shows through both. An opaque view background would cover the outgoing view the moment the incoming one mounts, before either fade has run.
- The covered view becomes `inert` as soon as the push starts, and `hidden` once its fade ends.
- The viewport clips (`overflow: hidden`), so offset content never enters the header.

### Height

The viewport measures the active route with a `ResizeObserver` and animates its height on the slow spring, like an iOS form sheet whose `preferredContentSize` changes. The mobile sheet's `max-h` still clamps it.

### Reduced motion

With `prefers-reduced-motion: reduce`: no offset, no blur, no shared-element move. Views cross-fade over 0.15s; height changes instantly.

## Behavior

- Esc: when `canGoBack`, pop and cancel the close; at the root, close the modal. Desktop reads `eventDetails.reason === 'escape-key'` from `Dialog.Root` `onOpenChange` (`DialogRoot.ChangeEventDetails`, Base UI 1.7.0); the sheet does the same through `Drawer.Root`.
- Outside press, close button, sheet swipe-down: close the whole modal, stack included.
- Push during a running transition: springs retarget from their current values; nothing queues.
- Covered views stay mounted, marked `hidden` and `inert` once the transition ends. Component state (search input, expanded sections) survives a pop.
- Scroll: on push, save the scroll container's `scrollTop` for the current view; the new view starts at the top. On pop, restore it.

## Testing

The web vitest environment is `node` (no DOM), so coverage is split by layer:

1. Unit (`navigation.test.ts`): `navReducer` push, pop, pop at root is a no-op, direction sign.
2. SSR smoke (`renderToStaticMarkup`, same pattern as `TimelineProgress.test.tsx`): root-only render shows the root title and no back button.
3. Browser (verify skill, `localhost:2323/dev-demos/modal-navigation`): push, pop, Esc pops then closes, close button stays still, title-to-back-label morph, height animation, scroll restore, state kept on pop, reduced motion. Desktop and mobile width.

## Demo page

`app/dev-demos/modal-navigation/page.tsx` (under `dev-demos`, because `dev/` is gitignored). One button presents a modal with a three-level stack whose views differ sharply in height; the root view has a text input and a long scroll to exercise state and scroll restoration.
