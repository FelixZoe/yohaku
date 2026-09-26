interface MImageType {
  footnote?: string
  name?: string
  url: string
}
export const pickImagesFromMarkdown = (md: string) => {
  /* eslint-disable regexp/no-empty-lookarounds-assertion, regexp/strict, regexp/optimal-lookaround-quantifier -- markdown image alt; nested brackets */
  const regexp =
    /^!\[((?:\[[^\]]*]|[^[\]]|](?=[^[]*))*)]\(\s*<?((?:[^\s\\]|\\.)*?)>?(?:\s+["'](.*?)["'])?\s*\)/s
  /* eslint-enable regexp/no-empty-lookarounds-assertion, regexp/strict, regexp/optimal-lookaround-quantifier */

  const lines = md.split('\n')

  const res: MImageType[] = []

  for (const line of lines) {
    if (!line.startsWith('!') && isRawImageUrl(line)) {
      res.push({ url: line, name: line })
      continue
    }

    const match = regexp.exec(line)
    if (!match) {
      continue
    }

    const [, name, url, footnote] = match
    res.push({ name, url, footnote })
  }

  return res
}

const isRawImageUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url)
    return Boolean(parsedUrl)
  } catch {
    return false
  }
}
