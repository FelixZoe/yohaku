import type {
  ArticleTranslation,
  BaseResponseMeta,
  EnrichmentResult,
  InteractionMeta,
  NoteResponseMeta,
  PaywallMeta,
  PostResponseMeta,
  RelatedRef,
  SkillBundleView,
  SummaryMeta,
  TtsMeta,
} from '@mx-space/api-client'
import { metaFor } from '@mx-space/api-client'

export type ArticleMetaView = {
  translation: ArticleTranslation | undefined
  summary: SummaryMeta | undefined
  hasInsightsInLocale: boolean
  related: RelatedRef[]
  enrichments: Record<string, EnrichmentResult> | undefined
  interaction: InteractionMeta | undefined
  isLiked: boolean | undefined
  likeCount: number | undefined
  readCount: number | undefined
  skills: SkillBundleView[]
  paywall: PaywallMeta | undefined
  tts: TtsMeta | undefined
}

const flattenInteraction = (
  raw: BaseResponseMeta['interaction'],
  itemId?: string,
): InteractionMeta | undefined => {
  if (!raw) return undefined
  if ('isLiked' in raw || 'likeCount' in raw || 'readCount' in raw) {
    return raw as InteractionMeta
  }
  if (itemId && typeof raw === 'object') {
    return (raw as Record<string, InteractionMeta>)[itemId]
  }
  return undefined
}

const looksLikeEntryTranslation = (
  v: unknown,
): v is { article?: ArticleTranslation; fields?: Record<string, string> } => {
  if (!v || typeof v !== 'object') return false
  const candidate = v as Record<string, unknown>
  if ('article' in candidate || 'fields' in candidate) {
    return Object.values(candidate).every(
      (entry) =>
        entry === undefined ||
        typeof entry !== 'object' ||
        entry === null ||
        !('article' in (entry as Record<string, unknown>)),
    )
  }
  return false
}

const flattenTranslation = (
  raw: BaseResponseMeta['translation'],
  itemId?: string,
): ArticleTranslation | undefined => {
  if (!raw) return undefined
  if (looksLikeEntryTranslation(raw)) return raw.article
  if (typeof raw !== 'object') return undefined
  const record = raw as Record<string, { article?: ArticleTranslation }>
  if (itemId) return record[itemId]?.article
  const keys = Object.keys(record)
  if (keys.length === 1) return record[keys[0]]?.article
  return undefined
}

export const narrowMetaForItem = <M extends BaseResponseMeta | undefined>(
  meta: M,
  item: { id: string },
): M => {
  if (!meta) return meta
  const { translation, interaction } = metaFor(item, meta as any)
  return { ...meta, translation, interaction } as M
}

export const articleMetaOf = (
  meta: BaseResponseMeta | undefined,
  itemId?: string,
): ArticleMetaView => {
  const interaction = flattenInteraction(meta?.interaction, itemId)
  const hasInsights =
    !!meta && 'insights' in meta
      ? ((meta as PostResponseMeta).insights?.hasInLocale ?? false)
      : false
  const related =
    !!meta && 'related' in meta
      ? ((meta as PostResponseMeta).related ?? [])
      : []
  const skills =
    !!meta && 'skills' in meta ? ((meta as PostResponseMeta).skills ?? []) : []
  const paywall =
    !!meta && 'paywall' in meta
      ? ((meta as PostResponseMeta).paywall ?? undefined)
      : undefined
  const summary =
    !!meta && 'summary' in meta
      ? ((meta as PostResponseMeta | NoteResponseMeta).summary ?? undefined)
      : undefined
  const tts =
    !!meta && 'tts' in meta
      ? ((meta as PostResponseMeta | NoteResponseMeta).tts ?? undefined)
      : undefined

  return {
    translation: flattenTranslation(meta?.translation, itemId),
    summary,
    hasInsightsInLocale: hasInsights,
    related,
    enrichments: meta?.enrichments,
    interaction,
    isLiked: interaction?.isLiked,
    likeCount: interaction?.likeCount,
    readCount: interaction?.readCount,
    skills,
    paywall,
    tts,
  }
}
