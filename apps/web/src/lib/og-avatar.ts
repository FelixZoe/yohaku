export const resolveOgAvatar = (url: string, size: number): string => {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'avatars.githubusercontent.com') {
      parsed.searchParams.set('s', String(size))
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}
