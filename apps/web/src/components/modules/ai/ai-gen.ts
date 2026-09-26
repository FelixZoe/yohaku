// AI 披露 preset 值
// -1 handmade · 0 assist · 2 fully · 3 story_organize · 4 title · 8 illustration · 9 dictation
// 旧值 1/5/6/7 已合并入 0 assist，保留兼容老数据：lookup 仍可读取，但不在选项里出现
export type AiGenPresetValue = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type AiGenValue = AiGenPresetValue | (string & {})
export type AiGenValueOrArray = AiGenValue | AiGenValue[]

type I18nKey =
  | 'handmade'
  | 'assist'
  | 'fully'
  | 'story_organize'
  | 'title'
  | 'illustration'
  | 'dictation'

export const AI_GEN_PRESET_OPTIONS: {
  value: AiGenPresetValue
  singleSelect: boolean
  i18nKey: I18nKey
}[] = [
  { value: -1, i18nKey: 'handmade', singleSelect: true },
  { value: 0, i18nKey: 'assist', singleSelect: false },
  { value: 2, i18nKey: 'fully', singleSelect: true },
  { value: 3, i18nKey: 'story_organize', singleSelect: false },
  { value: 4, i18nKey: 'title', singleSelect: false },
  { value: 8, i18nKey: 'illustration', singleSelect: false },
  { value: 9, i18nKey: 'dictation', singleSelect: false },
]

const AI_GEN_I18N_KEY_BY_VALUE: Record<AiGenPresetValue, I18nKey> = {
  [-1]: 'handmade',
  0: 'assist',
  1: 'assist',
  2: 'fully',
  3: 'story_organize',
  4: 'title',
  5: 'assist',
  6: 'assist',
  7: 'assist',
  8: 'illustration',
  9: 'dictation',
}

type TranslatorLike = (key: string, values?: Record<string, any>) => string
export const getAiGenLabel = (t: TranslatorLike, value: AiGenPresetValue) =>
  t(`preset_${AI_GEN_I18N_KEY_BY_VALUE[value]}_label`)
export const getAiGenOptionLabel = (
  t: TranslatorLike,
  value: AiGenPresetValue,
) => t(`preset_${AI_GEN_I18N_KEY_BY_VALUE[value]}_option_label`)
export const getAiGenDescription = (
  t: TranslatorLike,
  value: AiGenPresetValue,
) => t(`preset_${AI_GEN_I18N_KEY_BY_VALUE[value]}_description`)

const AI_VALID_VALUES = new Set(
  Object.keys(AI_GEN_I18N_KEY_BY_VALUE).map(Number),
)
export const isAiGenPreset = (value: unknown): value is AiGenPresetValue =>
  AI_VALID_VALUES.has(value as number)
