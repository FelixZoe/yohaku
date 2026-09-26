import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { AI_GEN_PRESET_OPTIONS } from '~/components/modules/ai/ai-gen'

const srcRoot = join(process.cwd(), 'src')
const messagesRoot = join(srcRoot, 'messages')

const aiPresetKeys = AI_GEN_PRESET_OPTIONS.flatMap((option) => [
  `preset_${option.i18nKey}_label`,
  `preset_${option.i18nKey}_option_label`,
  `preset_${option.i18nKey}_description`,
])

const dynamicKeyAllowlist = {
  ai: aiPresetKeys,
  comment: [
    'deleted_placeholder',
    'owner_badge',
    'commented_on_block',
    'avatar_alt',
    'from_location',
    'loading_more_replies',
    'load_more_replies',
    'sort_newest',
    'sort_oldest',
    'sort_pinned',
    'moderation_pending',
    'moderation_pending_owner',
    'moderation_published',
  ],
  common: [
    'nav_home',
    'nav_timeline',
    'nav_thinking',
    'nav_more',
    'nav_friends',
    'nav_projects',
    'nav_says',
    'nav_memories',
    'nav_travel',
    'nav_friends_desc',
    'nav_projects_desc',
    'nav_says_desc',
    'nav_travel_desc',
    'actions_back',
    'aria_donate',
    'page_title_posts',
    'page_title_projects',
    'page_title_friends',
    'page_title_notes',
    'page_title_thinking',
    'page_title_says',
    'page_description_posts',
    'page_description_projects',
    'page_description_friends',
    'page_description_notes',
    'page_description_thinking',
    'page_description_says',
    'page_description_timeline',
    'redirecting_to',
    'comment_placeholders',
    'footer_section_about',
    'footer_about_site',
    'footer_about_me',
    'footer_about_project',
    'footer_section_more',
    'footer_monitor',
    'footer_section_contact',
    'footer_write_message',
    'footer_send_email',
    'weather_sunny',
    'weather_cloudy',
    'weather_overcast',
    'weather_snow',
    'weather_rain',
    'weather_thunderstorm',
    'mood_happy',
    'mood_sad',
    'mood_crying',
    'mood_angry',
    'mood_pain',
    'mood_sorrow',
    'mood_unhappy',
    'mood_excited',
    'mood_worried',
    'mood_scary',
    'mood_hateful',
    'mood_despair',
    'mood_anxious',
    'nav_dropdown_using',
    'no_modification',
    'order_asc',
    'order_desc',
    'order_label',
    'posts_heading',
    'read_full',
    'search_rebuild_failed',
    'search_rebuild_index',
    'search_rebuild_success',
    'sort_by',
    'sort_created',
    'sort_default',
    'sort_modified',
    'view_compact',
    'view_mode',
    'view_preview',
    'yohaku_ribbon_close',
    'yohaku_ribbon_close_aria',
    'yohaku_ribbon_open_aria',
    'yohaku_meta_time',
    'yohaku_meta_literary_time',
    'yohaku_meta_literary_time_fallback',
    'yohaku_difficulty_easy',
    'yohaku_difficulty_medium',
    'yohaku_difficulty_hard',
    'yohaku_difficulty_literary_easy',
    'yohaku_difficulty_literary_medium',
    'yohaku_difficulty_literary_hard',
    'yohaku_genre_architecture',
    'yohaku_genre_tutorial',
    'yohaku_genre_post_mortem',
    'yohaku_genre_comparison',
    'yohaku_genre_mechanism',
    'yohaku_genre_diary',
    'yohaku_genre_travelogue',
    'yohaku_genre_essay',
    'yohaku_genre_review',
    'yohaku_genre_memorial',
    'yohaku_genre_retrospective',
    'yohaku_genre_literary_architecture',
    'yohaku_genre_literary_tutorial',
    'yohaku_genre_literary_post_mortem',
    'yohaku_genre_literary_comparison',
    'yohaku_genre_literary_mechanism',
    'yohaku_genre_literary_diary',
    'yohaku_genre_literary_travelogue',
    'yohaku_genre_literary_essay',
    'yohaku_genre_literary_review',
    'yohaku_genre_literary_memorial',
    'yohaku_genre_literary_retrospective',
    'activity_media_playing',
    'activity_media_paused',
    'nav_dropdown_online',
    'nav_dropdown_quiet',
  ],
  error: ['500_title'],
  home: [
    'windsock_newYear',
    'windsock_valentine',
    'windsock_halloween',
    'windsock_christmas',
    'ending_greeting_spring_early',
    'ending_greeting_spring_mid',
    'ending_greeting_spring_late',
    'ending_greeting_summer_early',
    'ending_greeting_summer_mid',
    'ending_greeting_summer_late',
    'ending_greeting_autumn_early',
    'ending_greeting_autumn_mid',
    'ending_greeting_autumn_late',
    'ending_greeting_winter_early',
    'ending_greeting_winter_mid',
    'ending_greeting_winter_late',
    'ending_nav_friends',
    'ending_nav_projects',
    'ending_nav_says',
    'ending_nav_travel',
    'timeline_view_relaxed',
    'timeline_view_dense',
    'timeline_view_skim',
    'hero_recently_writing',
    'musings_verb_watched',
    'musings_verb_read',
    'musings_verb_listened',
    'musings_verb_studied',
    'musings_verb_linked_to',
  ],
  post: [
    'category_empty',
    'category_meta_title',
    'copyright_author',
    'copyright_license_text',
    'copyright_link',
    'copyright_modified',
    'copyright_title',
    'related_after',
  ],
  subscribe: ['type_post', 'type_note', 'type_say', 'type_recently'],
  thinking: ['feed_reference', 'feed_comment_cta'],
  stock: [
    'symbolNotFound',
    'quoteUnavailable',
    'candlesIntraday',
    'sessions',
    'live',
    'frozen',
    'todayIntraday',
  ],
} as const satisfies Record<string, readonly string[]>

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)

    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function flattenMessages(
  input: Record<string, unknown>,
  prefix = '',
): string[] {
  return Object.entries(input).flatMap(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenMessages(value as Record<string, unknown>, nextKey)
    }

    return [nextKey]
  })
}

function collectMessageKeys(locale: string) {
  const localeRoot = join(messagesRoot, locale)

  return Object.fromEntries(
    walk(localeRoot)
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const namespace = file.slice(localeRoot.length + 1, -'.json'.length)
        const json = JSON.parse(readFileSync(file, 'utf8')) as Record<
          string,
          unknown
        >

        return [namespace, flattenMessages(json)]
      }),
  ) as Record<string, string[]>
}

function collectSourceFiles() {
  return walk(srcRoot).filter(
    (file) =>
      /\.(ts|tsx)$/.test(file) &&
      !file.includes('/messages/') &&
      !file.endsWith('message-usage.test.ts'),
  )
}

function collectUsedKeys() {
  const usage = new Map<string, Set<string>>()
  const references: { namespaces: string[]; key: string }[] = []
  const sourceFiles = collectSourceFiles()

  const record = (namespaces: string[], key: string) => {
    for (const namespace of namespaces) {
      if (!usage.has(namespace)) {
        usage.set(namespace, new Set())
      }
      usage.get(namespace)!.add(key)
    }
    references.push({ namespaces, key })
  }

  for (const file of sourceFiles) {
    const source = readFileSync(file, 'utf8')
    const translationVars = new Map<string, Set<string>>()
    const jsonVars = new Map<string, string>()

    for (const match of source.matchAll(
      // eslint-disable-next-line unicorn/better-regex
      /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:'([^']+)'|"([^"]+)"|\{[^}]*?namespace:\s*(?:'([^']+)'|"([^"]+)"))/g,
    )) {
      const variableName = match[1]
      const namespace = match[2] || match[3] || match[4] || match[5]

      if (variableName && namespace) {
        if (!translationVars.has(variableName)) {
          translationVars.set(variableName, new Set())
        }
        translationVars.get(variableName)!.add(namespace)
      }
    }

    for (const match of source.matchAll(
      /import\s+(\w+)\s+from\s+["'][.~]?\/?messages\/(?:en|ja|zh)\/([^"']+)\.json["']/g,
    )) {
      jsonVars.set(match[1], match[2])
    }

    for (const [variableName, namespaces] of translationVars) {
      const translationPattern = new RegExp(
        String.raw`(?<![\w$.])${variableName}(?:\.(?:rich|raw|markup))?\(\s*['"]([^'"]+)['"]`,
        'g',
      )

      for (const match of source.matchAll(translationPattern)) {
        record([...namespaces], match[1])
      }
    }

    for (const [variableName, namespace] of jsonVars) {
      const dotPropertyPattern = new RegExp(
        String.raw`(?<![\w$.])${variableName}\.([A-Za-z0-9_]+)`,
        'g',
      )
      const bracketPropertyPattern = new RegExp(
        String.raw`(?<![\w$.])${variableName}\[['"]([A-Za-z0-9_]+)['"]\]`,
        'g',
      )

      for (const match of source.matchAll(dotPropertyPattern)) {
        record([namespace], match[1])
      }

      for (const match of source.matchAll(bracketPropertyPattern)) {
        record([namespace], match[1])
      }
    }
  }

  for (const [namespace, keys] of Object.entries(dynamicKeyAllowlist)) {
    for (const key of keys) {
      record([namespace], key)
    }
  }

  return { usage, references }
}

// YohakuMetaHeader renders the literary variants only when locale.startsWith('zh')
const zhGatedKeys = new Set(
  [
    'yohaku_meta_literary_time',
    'yohaku_meta_literary_time_fallback',
    'yohaku_difficulty_literary_easy',
    'yohaku_difficulty_literary_medium',
    'yohaku_difficulty_literary_hard',
    'yohaku_genre_literary_architecture',
    'yohaku_genre_literary_tutorial',
    'yohaku_genre_literary_post_mortem',
    'yohaku_genre_literary_comparison',
    'yohaku_genre_literary_mechanism',
    'yohaku_genre_literary_diary',
    'yohaku_genre_literary_travelogue',
    'yohaku_genre_literary_essay',
    'yohaku_genre_literary_review',
    'yohaku_genre_literary_memorial',
    'yohaku_genre_literary_retrospective',
  ].map((key) => `common.${key}`),
)

describe('next-intl message usage', () => {
  it('defines every referenced key in all locales', () => {
    const { references } = collectUsedKeys()
    const locales = readdirSync(messagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    const missingByLocale = locales
      .map((locale) => {
        const localeKeys = collectMessageKeys(locale)
        const definedByNamespace = new Map(
          Object.entries(localeKeys).map(([namespace, keys]) => [
            namespace,
            new Set(keys),
          ]),
        )
        const missing = [
          ...new Set(
            references
              .filter(
                ({ namespaces, key }) =>
                  !namespaces.some((namespace) =>
                    definedByNamespace.get(namespace)?.has(key),
                  ) &&
                  !(
                    !locale.startsWith('zh') &&
                    namespaces.some((namespace) =>
                      zhGatedKeys.has(`${namespace}.${key}`),
                    )
                  ),
              )
              .map(({ namespaces, key }) => `${namespaces.join('|')}.${key}`),
          ),
        ]

        return [locale, missing] as const
      })
      .filter(([, missing]) => missing.length > 0)

    expect(missingByLocale).toEqual([])
  })

  it('keeps only referenced keys in locale files', () => {
    const { usage } = collectUsedKeys()
    const localeKeys = collectMessageKeys('zh')

    const unusedByNamespace = Object.entries(localeKeys)
      .map(([namespace, keys]) => {
        const usedKeys = usage.get(namespace) ?? new Set<string>()
        const unusedKeys = keys.filter((key) => !usedKeys.has(key))

        return [namespace, unusedKeys] as const
      })
      .filter(([, unusedKeys]) => unusedKeys.length > 0)

    expect(unusedByNamespace).toEqual([])
  })
})
