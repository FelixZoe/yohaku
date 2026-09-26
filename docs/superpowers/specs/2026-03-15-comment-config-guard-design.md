# Comment Config Guard Design

## Summary

Expose global comment configuration to the frontend so the comment UI can distinguish three separate states:

- content-level comment availability via `allowComment`
- site-wide comment shutdown via `commentOptions.disableComment`
- anonymous comment permission via `commentOptions.allowGuestComment`

The frontend comment box should then enforce a guard:

- if `!allowComment` or `disableComment`, show the existing "comments closed" state
- if comments are open but `allowGuestComment === false` and the viewer is not logged in, force the auth comment view and remove the anonymous entry path
- otherwise keep the current guest/reader behavior

## Motivation

The current frontend only understands the content-level `allowComment` flag. It does not know whether the backend has globally disabled comments or disabled anonymous comments only. That creates a mismatch:

- the UI may still show comment inputs while the backend rejects requests
- anonymous users can still be shown the legacy comment form even when guest comments are forbidden

The frontend needs both global comment flags so it can make the same routing decision the backend enforces.

## Data Model

### Existing

- content detail payloads already expose `allowComment`

### New frontend-visible fields

Expose these through aggregate data:

```ts
aggregate.commentOptions = {
  disableComment: boolean
  allowGuestComment: boolean
}
```

This keeps responsibilities clean:

- content payload decides whether this specific post/page/note/recently item accepts comments
- aggregate comment options decide whether the whole site is open for comments and whether anonymous comments are allowed

## Frontend Guard

### Decision order

1. `allowComment === false`
   - show closed state
2. `disableComment === true`
   - show closed state
3. `!sessionReader && allowGuestComment === false`
   - force auth comment mode
   - hide the mode switch
   - hide the anonymous comment entry button
4. otherwise
   - current comment behavior remains available

### UI behavior when guest comments are disabled

For signed-out users:

- comment area stays on the auth view
- only social sign-in entry remains visible
- the "guest comment" button is removed
- the user cannot switch into the legacy anonymous form

For signed-in readers and owner:

- no behavior change

## Implementation Shape

### Backend

- extend aggregate response typing to include:
  - `commentOptions.disableComment`
  - `commentOptions.allowGuestComment`

### Frontend

- read `disableComment` and `allowGuestComment` from aggregate data
- keep reading `allowComment` from the content payload
- update:
  - `CommentAreaRoot`
  - `CommentBoxRoot`
  - `SwitchCommentMode`
  - `SignedOutContent`

## Testing

- aggregate typing accepts `commentOptions.disableComment`
- aggregate typing accepts `commentOptions.allowGuestComment`
- signed-out user with `allowGuestComment=false` cannot enter legacy comment mode
- `disableComment=true` still renders the closed state
- existing logged-in reader comment path remains unaffected
