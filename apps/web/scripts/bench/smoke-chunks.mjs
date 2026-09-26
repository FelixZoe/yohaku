import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bundlerEnv, nowMs, sleep, stripAnsi } from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cwd = resolve(__dirname, '..', '..')

const PORT = 23233
const ROUTES = [
  '/',
  '/posts',
  '/notes',
  '/timeline',
  '/search',
  '/friends',
  '/categories',
  '/projects',
  '/says',
  '/thinking',
  '/preview',
  '/about',
  '/posts/tinkering/migrating-nextjs-to-react-router-framework-mode-ai-agent-perspective',
  '/notes/214',
]

async function main() {
  const env = bundlerEnv('rspack')
  env.PORT = String(PORT)
  const proc = spawn('node_modules/.bin/next', ['start', '-p', String(PORT)], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let ready = false
  let buf = ''
  const errLines = []
  function consume(chunk) {
    buf += chunk.toString()
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      const clean = stripAnsi(line)
      if (/started server on|Local:\s+http/.test(clean)) ready = true
      if (/Error|TypeError|ReferenceError|Cannot find/i.test(clean)) {
        errLines.push(clean)
      }
    }
  }
  proc.stdout.on('data', consume)
  proc.stderr.on('data', consume)

  const deadline = Date.now() + 30_000
  while (!ready && Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('server exited')
    await sleep(200)
  }
  console.log(`server ready @ http://127.0.0.1:${PORT}`)
  await sleep(800)

  const base = `http://127.0.0.1:${PORT}`
  const allChunks = new Set()
  const routeChunks = []

  for (const route of ROUTES) {
    const t0 = nowMs()
    const resp = await fetch(base + route)
    const html = await resp.text()
    const matches = [
      ...html.matchAll(/(?:src|href)="(\/_next\/static\/(?:chunks|css|media)\/[^"]+)"/g),
    ]
    const chunks = [...new Set(matches.map((m) => m[1]))]
    chunks.forEach((c) => allChunks.add(c))
    routeChunks.push({ route, status: resp.status, chunkCount: chunks.length, ms: nowMs() - t0 })
    console.log(`  ${route.padEnd(60)} ${resp.status}  ${chunks.length} chunks  ${(nowMs() - t0).toFixed(0)}ms`)
  }

  console.log(`\nFound ${allChunks.size} unique chunk URLs across ${ROUTES.length} routes`)

  // HEAD-verify every chunk
  let ok404 = 0
  let okOther = 0
  const failed = []
  let i = 0
  for (const url of allChunks) {
    i++
    try {
      const r = await fetch(base + url, { method: 'GET' })
      if (r.status === 200) {
        // drain body
        await r.arrayBuffer()
        okOther++
      } else if (r.status === 404) {
        ok404++
        failed.push({ url, status: 404 })
      } else {
        failed.push({ url, status: r.status })
      }
    } catch (e) {
      failed.push({ url, status: -1, error: e.message })
    }
    if (i % 100 === 0) console.log(`  ...verified ${i}/${allChunks.size}`)
  }

  console.log(
    `\nChunk verify: ok=${okOther}  404=${ok404}  failed=${failed.length}`,
  )
  if (failed.length) {
    console.log('--- failed chunks (first 20) ---')
    for (const f of failed.slice(0, 20))
      console.log(' ', f.status, f.url, f.error || '')
  }
  console.log(`\nServer stderr error lines: ${errLines.length}`)
  for (const l of errLines.slice(0, 10)) console.log('  ' + l.slice(0, 200))

  proc.kill('SIGTERM')
  await sleep(1000)
  if (proc.exitCode === null) proc.kill('SIGKILL')

  if (failed.length) process.exitCode = 2
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})