import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bundlerEnv, nowMs, sleep, stripAnsi } from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cwd = resolve(__dirname, '..', '..')

const MODE = process.argv[2]
if (!['dev', 'prod'].includes(MODE)) {
  console.error('Usage: node smoke.mjs <dev|prod>')
  process.exit(1)
}
const PORT = MODE === 'dev' ? 23231 : 23232
const DYNAMIC_SAMPLE = Number(process.env.DYNAMIC_SAMPLE || 5)

const STATIC_ROUTES = [
  '/',
  '/notes',
  '/notes/series',
  '/posts',
  '/timeline',
  '/search',
  '/friends',
  '/categories',
  '/projects',
  '/says',
  '/thinking',
  '/preview',
]

// regex patterns that, when found in the response body, strongly indicate
// a real failure (Next.js error overlay, React runtime error, server crash text).
// Avoid generic words that appear in legitimate content.
const ERROR_PATTERNS = [
  /Application error: a (client|server)-side exception has occurred/i,
  /__NEXT_ERROR_OVERLAY__/,
  /This page could not be rendered/,
  /<title>500: Internal Server Error<\/title>/i,
  /<title>Server Error<\/title>/i,
  /Cannot find module/,
  /ReferenceError:/,
  /TypeError: .*is not a function/,
  /Unhandled Runtime Error/,
  /Uncaught .*Error/,
]

// log-line patterns from the next server stdout/stderr that indicate trouble
const SERVER_ERR_PATTERNS = [
  /\bunhandledRejection\b/i,
  /\buncaughtException\b/i,
  /\berror\b.*\bstack\b/i,
  /TypeError:/,
  /ReferenceError:/,
  /Cannot find module/,
  /Module not found/,
  /Failed to compile/,
  /Internal Server Error/,
  /\[ERROR\]/,
]

async function fetchSitemapPaths(base) {
  try {
    const resp = await fetch(`${base}/sitemap`)
    if (!resp.ok) return []
    const xml = await resp.text()
    const locs = []
    const re = /<loc>([^<]+)<\/loc>/g
    let m
    while ((m = re.exec(xml)) !== null) {
      try {
        const u = new URL(m[1])
        locs.push(u.pathname + (u.search || ''))
      } catch {
        if (m[1].startsWith('/')) locs.push(m[1])
      }
    }
    return locs
  } catch (e) {
    console.log(`  sitemap fetch failed: ${e.message}`)
    return []
  }
}

function sampleByType(paths, sample) {
  const byType = new Map()
  for (const p of paths) {
    const seg = p.split('/').filter(Boolean)[0] || '/'
    if (!byType.has(seg)) byType.set(seg, [])
    byType.get(seg).push(p)
  }
  const out = []
  for (const [, list] of byType) {
    out.push(...list.slice(0, sample))
  }
  return [...new Set(out)]
}

async function main() {
  console.log(`\n=== SMOKE: ${MODE} ===`)
  const env = bundlerEnv('rspack')
  env.PORT = String(PORT)

  let bin, args
  if (MODE === 'dev') {
    bin = 'node_modules/.bin/next'
    args = ['dev', '-p', String(PORT)]
  } else {
    bin = 'node_modules/.bin/next'
    args = ['start', '-p', String(PORT)]
  }

  const proc = spawn(bin, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })

  const serverHits = []
  let buf = ''
  let buf2 = ''
  let ready = false

  function consume(chunk, src) {
    const ref = src === 'out' ? 'o' : 'e'
    const join = ref === 'o' ? (buf += chunk.toString()) : (buf2 += chunk.toString())
    const lines = (ref === 'o' ? buf : buf2).split('\n')
    const last = lines.pop() || ''
    if (ref === 'o') buf = last
    else buf2 = last
    for (const line of lines) {
      if (!line.trim()) continue
      const clean = stripAnsi(line)
      if (/Ready in /.test(clean) || /started server on/i.test(clean) || /Local:\s+http/.test(clean)) {
        ready = true
      }
      for (const re of SERVER_ERR_PATTERNS) {
        if (re.test(clean)) {
          serverHits.push({ at: Date.now(), line: clean.slice(0, 400) })
          process.stdout.write(`  ⚠ ${clean.slice(0, 200)}\n`)
          break
        }
      }
    }
  }

  proc.stdout.on('data', (c) => consume(c, 'out'))
  proc.stderr.on('data', (c) => consume(c, 'err'))

  const deadline = Date.now() + 5 * 60_000
  while (!ready && Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`next ${MODE} exited early (code=${proc.exitCode})`)
    }
    await sleep(200)
  }
  if (!ready) {
    proc.kill('SIGTERM')
    throw new Error('Timeout waiting for server ready')
  }

  console.log(`  server ready @ http://127.0.0.1:${PORT}`)
  // Give server a moment to settle
  await sleep(1500)

  const base = `http://127.0.0.1:${PORT}`
  const sitemapPaths = await fetchSitemapPaths(base)
  console.log(`  sitemap returned ${sitemapPaths.length} URLs`)
  const dynamicSampled = sampleByType(sitemapPaths, DYNAMIC_SAMPLE)
  console.log(`  sampled to ${dynamicSampled.length} dynamic routes (per-bucket cap=${DYNAMIC_SAMPLE})`)

  const routes = [...new Set([...STATIC_ROUTES, ...dynamicSampled])]
  console.log(`  total routes to hit: ${routes.length}`)

  const results = []
  let okCount = 0
  let failCount = 0

  for (const route of routes) {
    const url = base + route
    const t0 = nowMs()
    let status = 0
    let bytes = 0
    let bodyErrors = []
    try {
      const resp = await fetch(url, { redirect: 'manual' })
      status = resp.status
      const text = await resp.text()
      bytes = text.length
      for (const re of ERROR_PATTERNS) {
        if (re.test(text)) bodyErrors.push(re.toString())
      }
    } catch (e) {
      status = -1
      bodyErrors.push(`fetch-error: ${e.message}`)
    }
    const t1 = nowMs()
    const ok = status >= 200 && status < 400 && bodyErrors.length === 0
    if (ok) okCount++
    else failCount++
    results.push({ route, status, ms: t1 - t0, bytes, bodyErrors })
    const marker = ok ? '✓' : '✗'
    console.log(
      `  ${marker} ${route.padEnd(60)} ${status} ${(t1 - t0).toFixed(0).padStart(5)}ms ${bytes}b${bodyErrors.length ? ' ⚠ ' + bodyErrors.length : ''}`,
    )
  }

  // Settle window for any post-render server errors
  await sleep(2000)

  proc.kill('SIGTERM')
  await sleep(1500)
  if (proc.exitCode === null) proc.kill('SIGKILL')

  const out = {
    mode: MODE,
    timestamp: new Date().toISOString(),
    totalRoutes: routes.length,
    ok: okCount,
    fail: failCount,
    results,
    serverErrorLines: serverHits,
  }

  mkdirSync(resolve(__dirname, 'results'), { recursive: true })
  const outPath = resolve(__dirname, 'results', `smoke-${MODE}.json`)
  writeFileSync(outPath, JSON.stringify(out, null, 2))

  console.log(
    `\n  SUMMARY: ok=${okCount} fail=${failCount} serverErrLines=${serverHits.length}`,
  )
  console.log(`  saved → ${outPath}`)

  if (failCount > 0 || serverHits.length > 0) process.exitCode = 2
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})