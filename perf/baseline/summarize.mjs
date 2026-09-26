#!/usr/bin/env node
// Usage: node summarize.mjs <date-dir>
// Scans <slug>-N.report.json files (and falls back to <slug>.report.json for
// the old single-run layout). Reports the median per metric across runs.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename,join } from 'node:path'

const root = new URL('.', import.meta.url).pathname
const dateArg = process.argv[2] || new Date().toISOString().slice(0, 10)
const dir = join(root, dateArg)
const pagesMeta = JSON.parse(readFileSync(join(root, 'pages.json'), 'utf8'))

const median = (xs) => {
  const sorted = xs
    .filter((x) => x != null && Number.isFinite(x))
    .sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const allFiles = readdirSync(dir).filter(
  (f) => f.endsWith('.report.json') && !f.startsWith('_warmup'),
)

// Group by slug. <slug>-N.report.json → slug; <slug>.report.json → slug.
const bySlug = new Map()
for (const f of allFiles) {
  const stem = basename(f, '.report.json')
  const m = stem.match(/^(.+)-(\d+)$/)
  const slug = m ? m[1] : stem
  if (!bySlug.has(slug)) bySlug.set(slug, [])
  bySlug.get(slug).push(f)
}

const rows = []
const oppsBySlug = new Map()

for (const [slug, files] of bySlug) {
  const reports = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  const pick = (k) =>
    median(reports.map((r) => r.audits?.[k]?.numericValue ?? null))
  const score = median(
    reports.map((r) => (r.categories?.performance?.score ?? null) * 100),
  )
  const transfer = (t) =>
    median(
      reports.map(
        (r) =>
          (r.audits?.['resource-summary']?.details?.items || []).find(
            (x) => x.resourceType === t,
          )?.transferSize ?? 0,
      ),
    )

  rows.push({
    slug,
    runs: reports.length,
    score: score == null ? '—' : Math.round(score),
    fcp: fmtMs(pick('first-contentful-paint')),
    lcp: fmtMs(pick('largest-contentful-paint')),
    tbt: fmtMs(pick('total-blocking-time')),
    cls: fmtNum(pick('cumulative-layout-shift'), 3),
    si: fmtMs(pick('speed-index')),
    ttfb: fmtMs(pick('server-response-time')),
    tti: fmtMs(pick('interactive')),
    js: fmtKb(transfer('script')),
    css: fmtKb(transfer('stylesheet')),
    font: fmtKb(transfer('font')),
    total: fmtKb(transfer('total')),
  })

  // Opportunities: take first run as representative (these are categorical lists,
  // not noisy numbers; medians wouldn't make sense).
  const a = reports[0].audits || {}
  const op = Object.values(a)
    .filter((x) => x?.details?.type === 'opportunity' && x?.numericValue > 0)
    .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
    .slice(0, 5)
    .map((x) => `${x.title} — est. ${fmtMs(x.numericValue)}`)
  oppsBySlug.set(slug, op)
}

const pagePath = (slug) => pagesMeta.pages.find((p) => p.slug === slug)?.path ?? '?'

let md = ''
md += `# Lighthouse Baseline — ${dateArg}\n\n`
md += `- host: \`${pagesMeta._meta.host}\`\n`
md += `- api: \`${pagesMeta._meta.api}\`\n`
md += `- preset: ${pagesMeta._meta.preset}\n`
md += `- rounds: ${pagesMeta._meta.rounds}\n\n`
md += `## Scorecard (median across runs)\n\n`
md += `| Page | Path | Runs | Score | LCP | FCP | TBT | CLS | SI | TTFB | TTI | JS | CSS | Font | Total |\n`
md += `| --- | --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:|\n`
for (const r of rows.sort((a, b) => a.slug.localeCompare(b.slug))) {
  md += `| ${r.slug} | \`${pagePath(r.slug)}\` | ${r.runs} | ${r.score} | ${r.lcp} | ${r.fcp} | ${r.tbt} | ${r.cls} | ${r.si} | ${r.ttfb} | ${r.tti} | ${r.js} | ${r.css} | ${r.font} | ${r.total} |\n`
}
md += `\n## Top Opportunities (first run, ≤5)\n\n`
for (const [slug, op] of [...oppsBySlug.entries()].sort()) {
  md += `### ${slug}\n\n`
  if (!op.length) md += `_no opportunity audits triggered_\n\n`
  else for (const line of op) md += `- ${line}\n`
  md += '\n'
}

writeFileSync(join(dir, 'summary.md'), md)
console.info(`wrote ${join(dir, 'summary.md')}`)

function fmtMs(n) {
  if (n == null) return '—'
  if (n < 1000) return `${Math.round(n)}ms`
  return `${(n / 1000).toFixed(2)}s`
}
function fmtNum(n, d = 2) {
  if (n == null) return '—'
  return Number(n).toFixed(d)
}
function fmtKb(n) {
  if (n == null) return '—'
  return `${Math.round(n / 1024)}KB`
}
