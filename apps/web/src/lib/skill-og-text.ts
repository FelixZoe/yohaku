const WIDE_CHAR =
  /[\u{1100}-\u{115F}\u{2E80}-\u{303E}\u{3041}-\u{4DBF}\u{4E00}-\u{A4CF}\u{AC00}-\u{D7A3}\u{F900}-\u{FAFF}\u{FE30}-\u{FE4F}\u{FF00}-\u{FF60}\u{FFE0}-\u{FFE6}]/u

const TERMINATOR = /[。！；？]|[!.;?](?=\s|$)/g
const HEADING = /^(#{1,3})\s+(.+?)\s*#*$/
const HEADING_MARKUP = /[!*[\]_`]/g
const HEADING_URL = /\((?:#|\.{0,2}\/|[a-z][\d+.a-z-]*:)[^)]*\)/g

const TITLE_MAX_WIDTH = 60
const DESCRIPTION_MAX_WIDTH = 170
const SECTION_MAX_COUNT = 4
const SECTION_MAX_WIDTH = 24
const SECTION_ROW_MAX_WIDTH = 88

export const SKILL_OG_LABEL = 'AI SKILL'

const charWidth = (char: string) => (WIDE_CHAR.test(char) ? 2 : 1)

export const visualWidth = (value: string) => {
  let width = 0
  for (const char of value) width += charWidth(char)
  return width
}

export const truncateToWidth = (value: string, maxWidth: number) => {
  if (visualWidth(value) <= maxWidth) return value

  const chars = [...value]
  let width = 0
  let cut = chars.length
  for (const [index, char] of chars.entries()) {
    const next = width + charWidth(char)
    if (next > maxWidth - 1) {
      cut = index
      break
    }
    width = next
  }

  const head = chars.slice(0, cut).join('')
  const lastSpace = head.lastIndexOf(' ')
  const body = lastSpace > head.length * 0.6 ? head.slice(0, lastSpace) : head
  return `${body.replace(/[\s,./:;—…-]+$/, '')}…`
}

const firstLine = (value: string) =>
  value
    .split('\n')
    .map((entry) => entry.trim())
    .find(Boolean) ?? ''

// `e.g.` / `v1.2.` end in a period followed by a space, so a bare terminator
// scan would cut the sentence mid-thought. CJK terminators are unambiguous and
// skip the guard.
const looksLikeAbbreviation = (line: string, index: number) => {
  const lastToken = line.slice(0, index).split(/\s+/).at(-1) ?? ''
  return lastToken.length < 2 || lastToken.includes('.')
}

export const splitSentences = (value: string) => {
  const line = firstLine(value)
  const sentences: string[] = []
  let start = 0

  for (const match of line.matchAll(TERMINATOR)) {
    if (/[!.;?]/.test(match[0]) && looksLikeAbbreviation(line, match.index)) {
      continue
    }
    const end = match.index + match[0].length
    const sentence = line.slice(start, end).trim()
    if (sentence) sentences.push(sentence)
    start = end
  }

  const tail = line.slice(start).trim()
  if (tail) sentences.push(tail)
  return sentences
}

export const clampSentences = (value: string, maxWidth: number) => {
  const sentences = splitSentences(value)
  if (sentences.length === 0) return ''

  let accumulated = ''
  for (const sentence of sentences) {
    const next = accumulated ? `${accumulated} ${sentence}` : sentence
    if (visualWidth(next) > maxWidth) break
    accumulated = next
  }
  return accumulated || truncateToWidth(sentences[0], maxWidth)
}

export const extractSections = (body: string) => {
  const byLevel = new Map<number, string[]>()
  let insideFence = false

  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('```')) {
      insideFence = !insideFence
      continue
    }
    if (insideFence) continue

    const match = HEADING.exec(line)
    if (!match) continue

    const text = match[2]
      .replaceAll(HEADING_MARKUP, '')
      .replaceAll(HEADING_URL, '')
      .trim()
    if (!text) continue

    const level = match[1].length
    const bucket = byLevel.get(level) ?? []
    if (!bucket.includes(text)) bucket.push(text)
    byLevel.set(level, bucket)
  }

  const candidates = byLevel.get(2) ?? byLevel.get(1) ?? byLevel.get(3) ?? []
  const picked: string[] = []
  let rowWidth = 0

  for (const heading of candidates) {
    if (picked.length >= SECTION_MAX_COUNT) break
    const width = visualWidth(heading)
    if (width > SECTION_MAX_WIDTH) continue
    if (rowWidth + width > SECTION_ROW_MAX_WIDTH) break
    picked.push(heading)
    rowWidth += width + 3
  }

  return picked
}

export const skillTitleFontSize = (width: number) => {
  if (width <= 28) return 54
  if (width <= 44) return 44
  return 34
}

export interface SkillOgText {
  description: string
  eyebrow: string
  sections: string[]
  title: string
  titleFontSize: number
}

export const buildSkillOgText = ({
  body,
  description,
  name,
}: {
  body?: string
  description?: string
  name: string
}): SkillOgText => {
  const title = truncateToWidth(name, TITLE_MAX_WIDTH)
  return {
    eyebrow: SKILL_OG_LABEL,
    title,
    titleFontSize: skillTitleFontSize(visualWidth(title)),
    description: clampSentences(description ?? '', DESCRIPTION_MAX_WIDTH),
    sections: extractSections(body ?? ''),
  }
}
