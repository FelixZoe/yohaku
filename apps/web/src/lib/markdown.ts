import RemoveMarkdown from 'remove-markdown'

export const getWordCountFromText = (text: string, locale?: string): number => {
  if (!text.trim()) return 0

  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })
  let count = 0
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike) count += 1
  }
  return count
}

export const getWordCountFromMd = (text: string, locale?: string): number =>
  getWordCountFromText(RemoveMarkdown(text), locale)

export function getSummaryFromMd(text: string): string
export function getSummaryFromMd(
  text: string,
  options: { count: true; length?: number },
): { description: string; wordCount: number }

export function getSummaryFromMd(
  text: string,
  options: { count?: boolean; length?: number } = {
    count: false,
    length: 150,
  },
) {
  const rawText = RemoveMarkdown(text)
  const description = rawText.slice(0, options.length).replaceAll(/\s/g, ' ')
  if (options.count) {
    return {
      description,
      wordCount: getWordCountFromText(rawText),
    }
  }
  return description
}
