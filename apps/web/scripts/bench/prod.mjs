import { execSync, spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bundlerEnv, countFiles, dirSizeKb, nowMs, stripAnsi } from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cwd = resolve(__dirname, '..', '..')

const bundler = process.argv[2]
const runs = Number(process.argv[3] || 3)
if (!['rspack', 'turbopack'].includes(bundler)) {
  console.error('Usage: node prod.mjs <rspack|turbopack> [runs]')
  process.exit(1)
}

const COMPILE_RE = /Compiled successfully in\s+([\d.]+)\s*(s|ms|m)/i

function toMs(value, unit) {
  const v = Number(value)
  if (unit === 'ms') return v
  if (unit === 'm') return v * 60_000
  return v * 1000
}

async function buildOnce(env) {
  rmSync(resolve(cwd, '.next'), { recursive: true, force: true })

  const start = nowMs()
  return await new Promise((resolveP, rejectP) => {
    const proc = spawn('node_modules/.bin/next', ['build'], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let reportedCompileMs = null
    const tailLines = []
    let buf = ''
    let buf2 = ''

    function consume(chunk, src) {
      const ref = src === 'out' ? 'out' : 'err'
      const which = ref === 'out' ? (buf += chunk.toString()) : (buf2 += chunk.toString())
      const split =
        ref === 'out' ? buf.split('\n') : buf2.split('\n')
      const last = split.pop() || ''
      if (ref === 'out') buf = last
      else buf2 = last
      for (const line of split) {
        if (!line.trim()) continue
        process.stdout.write(`  > ${line}\n`)
        tailLines.push(line)
        if (tailLines.length > 200) tailLines.shift()
        const clean = stripAnsi(line)
        const m = clean.match(COMPILE_RE)
        if (m && reportedCompileMs === null) reportedCompileMs = toMs(m[1], m[2])
      }
    }

    proc.stdout.on('data', (c) => consume(c, 'out'))
    proc.stderr.on('data', (c) => consume(c, 'err'))
    proc.on('exit', (code) => {
      const wallMs = nowMs() - start
      if (code !== 0) {
        rejectP(new Error(`next build exited ${code}\nTail:\n${tailLines.slice(-30).join('\n')}`))
        return
      }
      resolveP({ wallMs, reportedCompileMs })
    })
    proc.on('error', rejectP)
  })
}

async function main() {
  console.log(`\n=== PROD BENCH: ${bundler} ×${runs} ===`)
  const env = bundlerEnv(bundler)
  const runResults = []

  for (let i = 0; i < runs; i++) {
    console.log(`\n--- run ${i + 1}/${runs} ---`)
    const r = await buildOnce(env)
    console.log(
      `  build done: wall=${(r.wallMs / 1000).toFixed(1)}s` +
        (r.reportedCompileMs
          ? ` reported=${(r.reportedCompileMs / 1000).toFixed(1)}s`
          : ''),
    )
    runResults.push(r)
  }

  const nextDir = resolve(cwd, '.next')
  const staticKb = dirSizeKb(resolve(nextDir, 'static'))
  const serverKb = dirSizeKb(resolve(nextDir, 'server'))
  const standaloneKb = dirSizeKb(resolve(nextDir, 'standalone'))
  const totalKb = dirSizeKb(nextDir)
  const chunkCount = countFiles(resolve(nextDir, 'static', 'chunks'))
  const jsCount = (() => {
    try {
      return Number(
        execSync(
          `find ${JSON.stringify(resolve(nextDir, 'static', 'chunks'))} -type f -name '*.js' | wc -l`,
          { encoding: 'utf8' },
        ).trim(),
      )
    } catch {
      return 0
    }
  })()

  const wallTimes = runResults.map((r) => r.wallMs)
  const reported = runResults.map((r) => r.reportedCompileMs).filter(Boolean)
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  const min = (xs) => Math.min(...xs)
  const max = (xs) => Math.max(...xs)

  const out = {
    bundler,
    timestamp: new Date().toISOString(),
    runs: runResults,
    summary: {
      wallMsMean: mean(wallTimes),
      wallMsMin: min(wallTimes),
      wallMsMax: max(wallTimes),
      reportedMsMean: reported.length ? mean(reported) : null,
    },
    artifacts: {
      nextTotalKb: totalKb,
      staticKb,
      serverKb,
      standaloneKb,
      chunkFiles: chunkCount,
      chunkJsFiles: jsCount,
    },
  }

  mkdirSync(resolve(__dirname, 'results'), { recursive: true })
  const outPath = resolve(__dirname, 'results', `prod-${bundler}.json`)
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\n  saved → ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})