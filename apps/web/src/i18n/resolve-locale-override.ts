export async function resolveLocaleOverride(
  explicitLocale: string | undefined,
  getRequestLocale: () => Promise<string>,
) {
  if (explicitLocale) {
    return explicitLocale
  }

  return getRequestLocale()
}
