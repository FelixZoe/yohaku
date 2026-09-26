# Specs Status

## Purpose

`docs/superpowers/specs` 里同时存在两类文档：

| Type | Meaning |
| --- | --- |
| 当前仍可参考的设计 spec | 和实现基本一致，适合继续指导后续视觉修改 |
| 历史设计草案 | 当时的目标方案，但代码后来已经偏离，不应直接当成现状 |

当前设计以代码实现为准，不以 spec 文档为准。

## Decision Flow

```text
Need current design guidance?
        |
        v
Open the implemented component first
        |
        v
If code is unclear, check this status table
        |
        v
Only then read a matching spec for historical intent
```

## Audited Specs

| Spec | Status | Current source files | Notes |
| --- | --- | --- | --- |
| `2026-03-13-errorboundary-redesign.md` | aligned | `apps/web/src/components/common/ErrorBoundary.tsx` | 仍可直接参考 |
| `2026-03-14-note-letter-bottom-design.md` | aligned | `apps/web/src/components/modules/note/NoteLatestRender.tsx` | 仍可直接参考 |
| `2026-03-14-note-topic-binder-clip-design.md` | aligned | `apps/web/src/components/modules/note/NoteTopicBinderClip.tsx` | 仍可直接参考 |
| `2026-03-14-notes-list-page-design.md` | historical | `apps/web/src/components/modules/note/NoteListTimeline.tsx`, `apps/web/src/components/modules/note/NoteListCard.tsx` | 当前不是月分组 diary timeline |
| `2026-03-14-notes-list-hero-latest-design.md` | aligned | `apps/web/src/components/modules/note/NoteLatestRender.tsx` | 仍可直接参考 |
| `2026-03-14-timeline-list-redesign.md` | partial | `apps/web/src/components/ui/list/TimelineList.tsx`, `apps/web/src/components/ui/list/TimelineListItem.tsx` | 看实现后再引用 |
| `2026-03-15-hero-redesign-design.md` | historical | `apps/web/src/app/[locale]/(home)/components/Hero.tsx` | spec 已不是当前 Hero 终态 |
| `2026-03-15-second-screen-redesign-design.md` | partial | `apps/web/src/app/[locale]/(home)/components/SecondScreen.tsx` | 核心隐喻保留，细节已变 |
| `2026-03-15-timeline-redesign-design.md` | aligned | `apps/web/src/app/[locale]/(home)/components/HomePageTimeLine.tsx` | 仍可直接参考 |
| `2026-03-15-scroll-driven-animation-design.md` | partial | `apps/web/src/styles/animation.css`, home components | 先看类名和组件 wiring |
| `2026-03-15-header-redesign-design.md` | partial | `apps/web/src/components/layout/header/internal/HeaderContent.tsx` | spec 对 blur 的判断已过时 |
| `2026-03-15-mobile-header-redesign-design.md` | partial | `apps/web/src/components/layout/header/internal/HeaderDrawerContent.tsx` | 思路还在，token 已演化 |
| `2026-03-16-button-redesign-design.md` | aligned | `apps/web/src/components/ui/button/*` | 仍可直接参考 |
| `2026-03-16-dropdown-menu-redesign-design.md` | aligned | `apps/web/src/components/ui/dropdown-menu/*` | 仍可直接参考 |
| `2026-03-16-float-popover-panel-redesign-design.md` | aligned | `apps/web/src/components/ui/float-popover/FloatPopover.tsx`, `apps/web/src/components/ui/float-panel/FloatPanel.tsx` | 仍可直接参考 |
| `2026-03-16-modal-redesign-design.md` | aligned | `apps/web/src/components/ui/modal/stacked/modal.tsx` | 仍可直接参考 |
| `2026-03-16-footer-redesign-design.md` | historical | `apps/web/src/components/layout/footer/Footer.tsx`, `apps/web/src/components/layout/footer/FooterInfo.tsx` | 当前 footer 不是 spec 的精确终态 |
| `2026-03-17-posts-page-redesign-design.md` | historical | `apps/web/src/components/modules/post/PostFeaturedCard.tsx`, `apps/web/src/components/modules/post/PostListItem.tsx`, `apps/web/src/components/modules/post/PostListActions.tsx` | 当前 posts 列表未收敛到 spec 所写极简版 |
| `2026-03-17-post-detail-redesign-design.md` | partial | `apps/web/src/components/modules/shared/NoticeCard.tsx`, `apps/web/src/components/modules/post/PostMetaBar.tsx` | 只把已落地部分当依据 |

## Not Audited In This Cleanup

| Spec |
| --- |
| `2026-03-14-terminology-i18n-design.md` |
| `2026-03-15-comment-config-guard-design.md` |

## Rule

如果你准备继续做设计修改：

1. 先打开对应组件实现。
2. 再看这里的状态表。
3. 只有状态是 `aligned` 时，才把 spec 当成当前参考。
