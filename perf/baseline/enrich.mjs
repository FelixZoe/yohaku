#!/usr/bin/env node
// Pulls extra detail per slug (first run only — these are categorical lists
// not noisy numbers). Appends to summary.md.
// Usage: node enrich.mjs <date-dir>

import { appendFileSync,readdirSync, readFileSync } from 'node:fs'
import { basename,join } from 'node:path'

const root = new URL('.', import.meta.url).pathname
const dateArg = process.argv[2] || new Date().toISOString().slice(0, 10)
const dir = join(root, dateArg)

const allFiles = readdirSync(dir).filter(
  (f) => f.endsWith('.report.json') && !f.startsWith('_warmup'),
)

// For each slug, pick the FIRST run (lowest -N) as representative.
const firstBySlug = new Map()
for (const f of allFiles) {
  const stem = basename(f, '.report.json')
  const m = stem.match(/^(.+)-(\d+)$/)
  const slug = m ? m[1] : stem
  const n = m ? Number.parseInt(m[2], 10) : 0
  const existing = firstBySlug.get(slug)
  if (!existing || existing.n > n) firstBySlug.set(slug, { f, n })
}

let md = '\n## Detail (transfer, mainthread, LCP element, CLS)\n\n'
md += '| Page | JS KB | CSS KB | Img KB | Font KB | Total KB | Reqs | Bootup | Main work | LCP el |\n'
md += '| --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| --- |\n'

const rows = []
for (const [slug, { f }] of firstBySlug) {
  const r = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  const a = r.audits || {}
  const byteWeight = a['resource-summary']?.details?.items || []
  const find = (k) => byteWeight.find((x) => x.resourceType === k) || {}
  const js = Math.round((find('script').transferSize || 0) / 1024)
  const css = Math.round((find('stylesheet').transferSize || 0) / 1024)
  const img = Math.round((find('image').transferSize || 0) / 1024)
  const font = Math.round((find('font').transferSize || 0) / 1024)
  const total = Math.round((find('total').transferSize || 0) / 1024)
  const reqs = find('total').requestCount || 0
  const bootup = a['bootup-time']?.numericValue
  const mainwork = a['mainthread-work-breakdown']?.numericValue
  const lcpEl =
    a['lcp-breakdown-insight']?.details?.items?.find((x) => x.type === 'node')
      ?.snippet || '—'
  rows.push({ slug, js, css, img, font, total, reqs, bootup, mainwork, lcpEl })
}

rows.sort((a, b) => a.slug.localeCompare(b.slug))
for (const r of rows) {
  md += `| ${r.slug} | ${r.js} | ${r.css} | ${r.img} | ${r.font} | ${r.total} | ${r.reqs} | ${fmt(r.bootup)} | ${fmt(r.mainwork)} | \`${truncate(r.lcpEl, 60)}\` |\n`
}

md += '\n## CLS culprits (where layout shifts originate)\n\n'
for (const [slug, { f }] of [...firstBySlug.entries()].sort()) {
  const r = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  const items = r.audits?.['layout-shifts']?.details?.items || []
  if (!items.length) continue
  md += `### ${slug} (CLS = ${(r.audits?.['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)})\n\n`
  for (const it of items.slice(0, 5)) {
    const score = (it.score ?? 0).toFixed(4)
    const snippet =
      it.node?.snippet || it.subItems?.items?.[0]?.node?.snippet || '—'
    md += `- score=${score} — \`${truncate(snippet, 100)}\`\n`
  }
  md += '\n'
}

md += '\n## Render-blocking resources\n\n'
let any = false
for (const [slug, { f }] of [...firstBySlug.entries()].sort()) {
  const r = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  const items = r.audits?.['render-blocking-resources']?.details?.items || []
  if (!items.length) continue
  any = true
  md += `### ${slug}\n\n`
  for (const it of items.slice(0, 6)) {
    const url = it.url?.replace(/^http:\/\/[^/]+/, '')
    md += `- ${fmt(it.wastedMs)} — \`${truncate(url, 90)}\` (${Math.round((it.totalBytes || 0) / 1024)}KB)\n`
  }
  md += '\n'
}
if (!any) md += '_none flagged on any page_\n\n'

appendFileSync(join(dir, 'summary.md'), md)
console.info('appended details to summary.md')

function fmt(n) {
  if (n == null) return '—'
  if (n < 1000) return `${Math.round(n)}ms`
  return `${(n / 1000).toFixed(2)}s`
}
function truncate(s, n) {
  if (!s) return '—'
  s = String(s).replaceAll('\n', ' ').replaceAll('|', '\\|')
  return s.length > n ? s.slice(0, n) + '…' : s
}
