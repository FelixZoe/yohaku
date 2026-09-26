import { simpleCamelcaseKeys } from '@mx-space/api-client'

/**
 * The SDK pass would otherwise mangle URL strings used as object keys —
 * e.g. `enrichments`'s URL→entry map turns
 * `https://github.com/mx-space/...` into `https://github.com/mxSpace/...`,
 * silently breaking URL-based lookups downstream. URL-shaped keys are
 * application-level identity, not snake_case identifiers; keep them as-is.
 */
const isUrlKey = (key: string) => /^[a-z][\w+.-]*:\/\//i.test(key)

export function camelcaseKeysWithUrlSkip<T = any>(data: any): T {
  return simpleCamelcaseKeys<T>(data, { shouldSkipKey: isUrlKey })
}
