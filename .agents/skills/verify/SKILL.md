---
name: verify
description: Runtime verification recipe for @yohaku/web — how to launch the app and drive changed flows in a real browser for evidence capture
---

# Verify @yohaku/web changes at runtime

## Launch

```bash
pnpm --filter @yohaku/web dev   # port 2323, ready in <1s (Turbopack)
```

- Env comes from `apps/web/.env`; the app talks to a local mx-core API at `localhost:2333`. Make sure mx-core dev is running or point env at the production API first.
- Real content is served (Innei's blog data), so flows like timeline/posts/notes have realistic entries to click.

## Drive

Use Codex-in-chrome tools against `http://localhost:2323/<route>`.

- `find` returns hrefs in its element descriptions — useful to pick an entry by URL shape (e.g. `/notes/2026/4/19/slug` vs `/notes/123`) before clicking.
- Peek modals (timeline/list links on desktop) animate in over ~1-2s; screenshot once for mid-entrance, wait 2s and screenshot again for the settled frame.
- While a peek modal is open, `find`/ref-clicks can land on links *behind* the overlay and open a second peek. Press Escape and confirm the modal is gone (URL loses `?peek-to=`) before the next click.
- `read_network_requests` starts tracking only after its first call — call it once right after opening the tab, then perform the action, then read with `urlPattern`.
- API traffic goes to `localhost:2333` (not 2323); filter network reads accordingly.

## Gotchas

- `resize_window` reports success but has no effect when the Chrome window is maximized/fullscreen — mobile-breakpoint behavior could not be driven this way; note it as not exercised instead of retrying.
- Known pre-existing failures on main (not caused by your diff): `tsc --noEmit` errors in `src/providers/root/socket-provider.tsx` (AppRouterInstance/bfcacheId drift), and vitest `src/messages/message-usage.test.ts` unused-keys check.
