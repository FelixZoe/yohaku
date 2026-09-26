#!/usr/bin/env node
// Compare two baseline dirs using median across runs per metric.
// Usage: node diff.mjs <before-dir> <after-dir>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename,join } from 'node:path'

const root = new URL('.', import.meta.url).pathname
const before = process.argv[2]
const after = process.argv[3]
if (!before || !after) {
  console.error('usage: node diff.mjs <before> <after>')
  process.exit(1)
}

const median = (xs) => {
  const sorted = xs
    .filter((x) => x != null && Number.isFinite(x))
    .sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const loadGrouped = (dir) => {
  const files = readdirSync(join(root, dir)).filter(
    (f) => f.endsWith('.report.json') && !f.startsWith('_warmup'),
  )
  const bySlug = new Map()
  for (const f of files) {
    const stem = basename(f, '.report.json')
    const m = stem.match(/^(.+)-(\d+)$/)
    const slug = m ? m[1] : stem
    if (!bySlug.has(slug)) bySlug.set(slug, [])
    bySlug.get(slug).push(JSON.parse(readFileSync(join(root, dir, f), 'utf8')))
  }
  return bySlug
}

const a = loadGrouped(before)
const b = loadGrouped(after)
const slugs = [...new Set([...a.keys(), ...b.keys()])].sort()

const pick = (reports, k) =>
  median((reports || []).map((r) => r?.audits?.[k]?.numericValue ?? null))
const score = (reports) =>
  median(
    (reports || []).map((r) => (r?.categories?.performance?.score ?? null) * 100),
  )
const transfer = (reports, t) =>
  median(
    (reports || []).map(
      (r) =>
        (r?.audits?.['resource-summary']?.details?.items || []).find(
          (x) => x.resourceType === t,
        )?.transferSize ?? 0,
    ),
  )

const fmtMs = (n) =>
  n == null ? '—' : n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(2)}s`
const fmtKb = (n) => `${Math.round((n || 0) / 1024)}KB`
const delta = (bv, av, unit = 'ms') => {
  if (bv == null || av == null) return '—'
  const d = av - bv
  const sign = d > 0 ? '+' : ''
  const pct = bv === 0 ? '∞' : Math.round((d / bv) * 100)
  const valStr =
    unit === 'kb'
      ? `${sign}${Math.round(d / 1024)}KB`
      : `${sign}${unit === 'ms' && Math.abs(d) >= 1000 ? (d / 1000).toFixed(2) + 's' : Math.round(d) + 'ms'}`
  return `${valStr} (${sign}${pct}%)`
}

let md = `# Diff: ${before} → ${after}\n\n`
md += `_medians across runs per page (before n=${[...a.values()][0]?.length ?? 0}, after n=${[...b.values()][0]?.length ?? 0})_\n\n`

md += '## Performance score\n\n'
md += '| Page | Before | After | Δ |\n| --- | ---:| ---:| ---:|\n'
for (const s of slugs) {
  const sb = score(a.get(s))
  const sa = score(b.get(s))
  const d = sb != null && sa != null ? sa - sb : null
  md += `| ${s} | ${sb?.toFixed(0) ?? '—'} | ${sa?.toFixed(0) ?? '—'} | ${d == null ? '—' : (d > 0 ? '+' : '') + d.toFixed(0)} |\n`
}

const metric = (label, key, unit = 'ms') => {
  md += `\n## ${label}\n\n`
  md += '| Page | Before | After | Δ |\n| --- | ---:| ---:| ---:|\n'
  for (const s of slugs) {
    const vb = pick(a.get(s), key)
    const va = pick(b.get(s), key)
    md += `| ${s} | ${fmtMs(vb)} | ${fmtMs(va)} | ${delta(vb, va, unit)} |\n`
  }
}
metric('LCP', 'largest-contentful-paint')
metric('FCP', 'first-contentful-paint')
metric('TBT', 'total-blocking-time')
metric('TTI', 'interactive')
metric('Speed Index', 'speed-index')

md += '\n## CLS\n\n'
md += '| Page | Before | After | Δ |\n| --- | ---:| ---:| ---:|\n'
for (const s of slugs) {
  const vb = pick(a.get(s), 'cumulative-layout-shift')
  const va = pick(b.get(s), 'cumulative-layout-shift')
  const d = vb != null && va != null ? va - vb : null
  md += `| ${s} | ${vb?.toFixed(3) ?? '—'} | ${va?.toFixed(3) ?? '—'} | ${d == null ? '—' : (d > 0 ? '+' : '') + d.toFixed(3)} |\n`
}

md += '\n## Font transfer\n\n'
md += '| Page | Before | After | Δ |\n| --- | ---:| ---:| ---:|\n'
for (const s of slugs) {
  const vb = transfer(a.get(s), 'font')
  const va = transfer(b.get(s), 'font')
  md += `| ${s} | ${fmtKb(vb)} | ${fmtKb(va)} | ${delta(vb, va, 'kb')} |\n`
}

md += '\n## Total transfer\n\n'
md += '| Page | Before | After | Δ |\n| --- | ---:| ---:| ---:|\n'
for (const s of slugs) {
  const vb = transfer(a.get(s), 'total')
  const va = transfer(b.get(s), 'total')
  md += `| ${s} | ${fmtKb(vb)} | ${fmtKb(va)} | ${delta(vb, va, 'kb')} |\n`
}

writeFileSync(join(root, `diff-${before}-vs-${after}.md`), md)
console.info(`wrote diff-${before}-vs-${after}.md`)
console.info()
console.info(md)
