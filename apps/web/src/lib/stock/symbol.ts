export type ParsedSymbol = {
  exchange?: string
  ticker: string
}

export function parseSymbolInput(input: string): ParsedSymbol {
  const raw = input.trim()
  if (!raw) return { ticker: '' }

  const colonIdx = raw.indexOf(':')
  if (colonIdx > 0) {
    const exchange = raw.slice(0, colonIdx).trim().toUpperCase()
    const ticker = raw
      .slice(colonIdx + 1)
      .trim()
      .toUpperCase()
    return exchange ? { exchange, ticker } : { ticker }
  }

  const dotIdx = raw.lastIndexOf('.')
  if (dotIdx > 0 && dotIdx < raw.length - 1) {
    const ticker = raw.slice(0, dotIdx).trim().toUpperCase()
    const suffix = raw
      .slice(dotIdx + 1)
      .trim()
      .toUpperCase()
    return suffix ? { exchange: suffix, ticker } : { ticker: raw.toUpperCase() }
  }

  return { ticker: raw.toUpperCase() }
}

export function normalizeSymbol(input: string): string {
  const raw = input.trim()
  if (!raw) return ''
  const colonIdx = raw.indexOf(':')
  if (colonIdx > 0)
    return raw
      .slice(colonIdx + 1)
      .trim()
      .toUpperCase()
  return raw.toUpperCase()
}

export function formatDisplay(parsed: ParsedSymbol): string {
  if (!parsed.ticker) return ''
  if (parsed.exchange) return `${parsed.exchange} · ${parsed.ticker}`
  return parsed.ticker
}
