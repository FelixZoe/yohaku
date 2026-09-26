import type { AggregateRootWithTheme } from '@mx-space/api-client'

export type AggregationDataPayload = Omit<
  AggregateRootWithTheme<AppThemeConfig>,
  'theme'
> & {
  categories?: AggregateRootWithTheme<AppThemeConfig> extends {
    categories: infer T
  }
    ? T
    : any[]
  pageMeta?: AggregateRootWithTheme<AppThemeConfig> extends {
    pageMeta: infer T
  }
    ? T
    : unknown | null
  theme: AppThemeConfig
}
