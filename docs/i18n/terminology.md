# I18n Terminology

## Purpose

This document records preferred terminology for multilingual UI copy. Use these mappings when adding or revising user-facing strings so the same concept is not translated differently across modules.

## Recommended Terms

| Concept | zh-CN | en | ja |
| --- | --- | --- | --- |
| Notes section | 手记 | Notes | 手記 |
| Note item | 手记 | Note | 手記 |
| Posts section | 文稿 | Posts | 記事 |
| Article detail | 文章 | Article | 記事 |
| Series | 专栏 | Series | コラム |
| Timeline | 时间线 | Timeline | タイムライン |
| Summary | 摘要 | Summary | 要約 |
| Original text | 原文 | Original | 原文 |
| Translation | 翻译 | Translation | 翻訳 |

## Preferred Brand And Proper-Noun Forms

| Term | Preferred form |
| --- | --- |
| GitHub | GitHub |
| Vercel | Vercel |
| Algolia | Algolia |
| Token | Token |
| English language label | English |
| Chinese language label | 中文 |
| Japanese language label | 日本語 |

## Avoid Or Migrate

| Avoid | Use instead | Reason |
| --- | --- | --- |
| In notes UI, using `文章` for a note | `手记` | Distinguishes notes from posts/articles |
| In notes UI, using `Article` for a note | `Note` or `Notes` | Keeps English aligned with section naming |
| In notes UI, using `記事` for a note | `手記` | Keeps Japanese aligned with section naming |
| Mixing `专题`, `系列`, `专栏` for the same notes concept | `专栏` | Existing navigation and note copy already use this canonical term |

## Naming Guidance

- Prefer existing shared namespaces before introducing new keys.
- A key name may remain historical if its displayed copy is still correct and local usage is clear.
- Add a new key only when the old key name keeps causing semantic drift.
