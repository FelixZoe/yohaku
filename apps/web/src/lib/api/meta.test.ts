import type {
  InteractionMeta,
  NoteResponseMeta,
  PostResponseMeta,
} from '@mx-space/api-client'
import { describe, expect, it } from 'vitest'

import { articleMetaOf, narrowMetaForItem } from './article-meta'

describe('articleMetaOf', () => {
  it('returns safe defaults for empty meta', () => {
    const result = articleMetaOf(undefined)

    expect(result.translation).toBeUndefined()
    expect(result.summary).toBeUndefined()
    expect(result.hasInsightsInLocale).toBe(false)
    expect(result.related).toEqual([])
    expect(result.enrichments).toBeUndefined()
    expect(result.interaction).toBeUndefined()
    expect(result.isLiked).toBeUndefined()
    expect(result.likeCount).toBeUndefined()
    expect(result.readCount).toBeUndefined()
    expect(result.skills).toEqual([])
  })

  it('extracts post fields from PostResponseMeta', () => {
    const meta: PostResponseMeta = {
      insights: { hasInLocale: true },
      related: [
        {
          id: 'rel-1',
          title: 'Related',
        },
      ],
      summary: {
        id: 'sum-1',
        text: 'summary text',
        lang: 'en',
        createdAt: new Date().toISOString(),
      },
      interaction: { isLiked: true, likeCount: 42, readCount: 9001 },
      translation: {
        article: {
          isTranslated: true,
          targetLang: 'ja',
          sourceLang: 'en',
        },
      },
      skills: [
        {
          id: 'skill-1',
          name: 'skill',
          description: 'desc',
          rawUrl: '/s/sk/skill/SKILL.md',
          assets: [],
        },
      ],
    }

    const result = articleMetaOf(meta)

    expect(result.hasInsightsInLocale).toBe(true)
    expect(result.related).toHaveLength(1)
    expect(result.summary?.text).toBe('summary text')
    expect(result.isLiked).toBe(true)
    expect(result.likeCount).toBe(42)
    expect(result.readCount).toBe(9001)
    expect(result.translation?.isTranslated).toBe(true)
    expect(result.translation?.targetLang).toBe('ja')
    expect(result.skills).toHaveLength(1)
    expect(result.skills[0].name).toBe('skill')
  })

  it('extracts note fields from NoteResponseMeta', () => {
    const meta: NoteResponseMeta = {
      summary: {
        id: 'sum-2',
        text: 'note summary',
        lang: 'zh',
        createdAt: new Date().toISOString(),
      },
      interaction: { likeCount: 7 } as InteractionMeta,
      translation: {
        article: {
          isTranslated: false,
        },
      },
    }

    const result = articleMetaOf(meta)

    expect(result.summary?.text).toBe('note summary')
    expect(result.hasInsightsInLocale).toBe(false)
    expect(result.related).toEqual([])
    expect(result.skills).toEqual([])
    expect(result.likeCount).toBe(7)
    expect(result.translation?.isTranslated).toBe(false)
  })

  it('reads per-item interaction map by itemId', () => {
    const meta: PostResponseMeta = {
      interaction: {
        'note-1': { isLiked: true, likeCount: 10 } as InteractionMeta,
        'note-2': { isLiked: false, likeCount: 3 } as InteractionMeta,
      },
    }

    const r1 = articleMetaOf(meta, 'note-1')
    const r2 = articleMetaOf(meta, 'note-2')
    const r3 = articleMetaOf(meta, 'note-missing')

    expect(r1.isLiked).toBe(true)
    expect(r1.likeCount).toBe(10)
    expect(r2.isLiked).toBe(false)
    expect(r2.likeCount).toBe(3)
    expect(r3.interaction).toBeUndefined()
  })

  it('reads per-item translation map by itemId', () => {
    const meta: PostResponseMeta = {
      translation: {
        'item-a': {
          article: { isTranslated: true, targetLang: 'fr' },
        },
      },
    }

    const result = articleMetaOf(meta, 'item-a')
    expect(result.translation?.isTranslated).toBe(true)
    expect(result.translation?.targetLang).toBe('fr')
  })

  it('unwraps single-key translation record on detail endpoints', () => {
    const meta: NoteResponseMeta = {
      translation: {
        'note-1': {
          article: { isTranslated: true, sourceLang: 'zh', targetLang: 'en' },
        },
      },
    }

    const result = articleMetaOf(meta)
    expect(result.translation?.isTranslated).toBe(true)
    expect(result.translation?.sourceLang).toBe('zh')
    expect(result.translation?.targetLang).toBe('en')
  })

  it('returns undefined when multi-key translation record has no itemId', () => {
    const meta: PostResponseMeta = {
      translation: {
        'item-a': { article: { isTranslated: true, targetLang: 'fr' } },
        'item-b': { article: { isTranslated: true, targetLang: 'ja' } },
      },
    }

    const result = articleMetaOf(meta)
    expect(result.translation).toBeUndefined()
  })
})

describe('narrowMetaForItem', () => {
  it('passes through undefined meta', () => {
    expect(narrowMetaForItem(undefined, { id: 'x' })).toBeUndefined()
  })

  it('resolves multi-key translation record to the current item entry', () => {
    const meta: NoteResponseMeta = {
      translation: {
        'note-1': {
          article: { isTranslated: true, sourceLang: 'zh', targetLang: 'ja' },
        },
        'note-2': {
          article: { isTranslated: true, sourceLang: 'zh', targetLang: 'en' },
        },
      },
    }

    const narrowed = narrowMetaForItem(meta, { id: 'note-1' })

    expect(articleMetaOf(narrowed).translation?.targetLang).toBe('ja')
  })

  it('preserves single-form translation as-is', () => {
    const meta: PostResponseMeta = {
      translation: {
        article: { isTranslated: true, targetLang: 'fr' },
      },
    }

    const narrowed = narrowMetaForItem(meta, { id: 'whatever' })

    expect(articleMetaOf(narrowed).translation?.targetLang).toBe('fr')
  })

  it('resolves multi-key interaction record to the current item entry', () => {
    const meta: PostResponseMeta = {
      interaction: {
        'post-a': { isLiked: true, likeCount: 5 } as InteractionMeta,
        'post-b': { isLiked: false, likeCount: 0 } as InteractionMeta,
      },
    }

    const narrowed = narrowMetaForItem(meta, { id: 'post-a' })

    expect(articleMetaOf(narrowed).isLiked).toBe(true)
    expect(articleMetaOf(narrowed).likeCount).toBe(5)
  })
})
