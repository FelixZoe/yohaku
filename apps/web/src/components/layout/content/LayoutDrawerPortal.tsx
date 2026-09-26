/**
 * Layout-level right-side drawer slot. Lives inside `<Content>` as a flex
 * sibling of the main content area, so it actually participates in layout:
 * its width (driven by `--yohaku-panel-w`) pushes the main column inward
 * via flexbox, and the global header naturally re-centers via the
 * `.yohaku-page-right-inset` rule that reads the same var.
 *
 * Drawer overlays (e.g. the post Yohaku drawer) `createPortal` their
 * content into `#layout-drawer-portal` and absolute-position themselves
 * inside it. The host is `sticky; top: 0; h-100dvh` so the drawer stays
 * pinned to the viewport while the article scrolls.
 */
export function LayoutDrawerPortal() {
  return (
    <aside
      aria-hidden
      className="yohaku-layout-drawer-host sticky top-[4.5rem] h-[100dvh] shrink-0 -translate-y-[4.5rem] overflow-hidden print:hidden"
      data-yohaku-layout-drawer-host=""
      id="layout-drawer-portal"
      style={{ width: 'var(--yohaku-panel-w, 0px)' }}
    />
  )
}
