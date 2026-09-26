import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  bundlerEnv,
  nowMs,
  PORT,
  sampleTreeRss,
  sleep,
  stripAnsi,
  WARMUP_ROUTES,
} from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const bundler = process.argv[2]
if (!['rspack', 'turbopack'].includes(bundler)) {
  console.error('Usage: node dev.mjs <rspack|turbopack>')
  process.exit(1)
}

const READY_RE = /Ready in ([\d.]+)\s*(s|ms)/i
const COMPILE_RE = /✓ Compiled\s+\/([^\s]*)?\s+in\s+([\d.]+)\s*(s|ms)/i
const COMPILE_GENERIC = /✓ Compiled\s+in\s+([\d.]+)\s*(s|ms)/i

function toMs(value, unit) {
  const v = Number(value)
  return unit === 'ms' ? v : v * 1000
}

const cwd = resolve(__dirname, '..', '..')

async function main() {
  console.log(`\n=== DEV BENCH: ${bundler} ===`)
  const env = bundlerEnv(bundler)
  const startWallMs = nowMs()

  const proc = spawn(
    'node_modules/.bin/next',
    ['dev', '-p', String(PORT)],
    {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  let readyMs = null
  let readyAtWall = null
  const compileEvents = []
  let buffer = ''
  let stderrBuffer = ''

  function handleLine(line) {
    process.stdout.write(`  > ${line}\n`)
    const clean = stripAnsi(line)
    const m1 = clean.match(READY_RE)
    if (m1 && readyMs === null) {
      readyMs = toMs(m1[1], m1[2])
      readyAtWall = nowMs() - startWallMs
    }
    const m2 = clean.match(COMPILE_RE)
    if (m2) {
      compileEvents.push({
        route: '/' + (m2[1] || ''),
        ms: toMs(m2[2], m2[3]),
        at: nowMs() - startWallMs,
      })
      return
    }
    const m3 = clean.match(COMPILE_GENERIC)
    if (m3) {
      compileEvents.push({
        route: '?',
        ms: toMs(m3[1], m3[2]),
        at: nowMs() - startWallMs,
      })
    }
  }

  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) if (line.trim()) handleLine(line)
  })
  proc.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString()
    const lines = stderrBuffer.split('\n')
    stderrBuffer = lines.pop() || ''
    for (const line of lines) if (line.trim()) handleLine(line)
  })

  // Wait for ready (up to 5min)
  const readyDeadline = Date.now() + 5 * 60_000
  while (readyMs === null && Date.now() < readyDeadline) {
    if (proc.exitCode !== null) {
      throw new Error(`next dev exited early (code=${proc.exitCode})`)
    }
    await sleep(200)
  }
  if (readyMs === null) {
    proc.kill('SIGTERM')
    throw new Error('Timeout waiting for Ready')
  }

  console.log(`  -> Ready in ${readyMs.toFixed(0)} ms (wall ${readyAtWall.toFixed(0)} ms)`)

  // Warm up routes sequentially
  const routeResults = []
  for (const route of WARMUP_ROUTES) {
    const url = `http://127.0.0.1:${PORT}${route}`
    const t0 = nowMs()
    let status = 0
    let bytes = 0
    try {
      const resp = await fetch(url, { redirect: 'manual' })
      status = resp.status
      const buf = await resp.arrayBuffer()
      bytes = buf.byteLength
    } catch (e) {
      status = -1
    }
    const t1 = nowMs()
    routeResults.push({ route, status, ms: t1 - t0, bytes })
    console.log(`  hit ${route} → ${status} (${(t1 - t0).toFixed(0)} ms, ${bytes}b)`)
  }

  // Idle 30s for GC stabilization
  console.log('  idling 30s...')
  await sleep(30_000)

  const memSample = sampleTreeRss(proc.pid)
  console.log(
    `  RSS total: ${memSample.totalMb} MB across ${memSample.pids.length} pids`,
  )

  proc.kill('SIGTERM')
  await sleep(2000)
  if (proc.exitCode === null) proc.kill('SIGKILL')

  const out = {
    bundler,
    timestamp: new Date().toISOString(),
    readyMs,
    readyAtWallMs: readyAtWall,
    routes: routeResults,
    compileEvents,
    memory: memSample,
  }

  mkdirSync(resolve(__dirname, 'results'), { recursive: true })
  const outPath = resolve(__dirname, 'results', `dev-${bundler}.json`)
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\n  saved → ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})