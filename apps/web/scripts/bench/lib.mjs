import { execSync } from 'node:child_process'

export const PORT = 23230

export const WARMUP_ROUTES = [
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
]

export function nowMs() {
  return Number(process.hrtime.bigint() / 1_000_000n)
}

export function stripAnsi(s) {
  return s.replace(
    /[][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?|[A-Za-z\d/#&.:=?%@~_]*)/g,
    '',
  )
}

function getDescendantPids(rootPid) {
  try {
    const out = execSync('ps -ax -o pid=,ppid=', { encoding: 'utf8' })
    const edges = new Map()
    for (const line of out.split('\n')) {
      const m = line.trim().match(/^(\d+)\s+(\d+)$/)
      if (!m) continue
      const pid = Number(m[1])
      const ppid = Number(m[2])
      if (!edges.has(ppid)) edges.set(ppid, [])
      edges.get(ppid).push(pid)
    }
    const result = new Set([rootPid])
    const stack = [rootPid]
    while (stack.length) {
      const cur = stack.pop()
      const children = edges.get(cur) || []
      for (const c of children) {
        if (!result.has(c)) {
          result.add(c)
          stack.push(c)
        }
      }
    }
    return [...result]
  } catch {
    return [rootPid]
  }
}

export function sampleTreeRss(rootPid) {
  const pids = getDescendantPids(rootPid)
  let total = 0
  const breakdown = []
  for (const pid of pids) {
    try {
      const rss = execSync(`ps -p ${pid} -o rss=`, { encoding: 'utf8' })
        .trim()
      const rssKb = Number(rss)
      if (Number.isFinite(rssKb)) {
        total += rssKb
        let cmd = ''
        try {
          cmd = execSync(`ps -p ${pid} -o command=`, {
            encoding: 'utf8',
          })
            .trim()
            .slice(0, 120)
        } catch {}
        breakdown.push({ pid, rssKb, cmd })
      }
    } catch {}
  }
  return { totalKb: total, totalMb: +(total / 1024).toFixed(1), pids, breakdown }
}

export function bundlerEnv(bundler) {
  const e = { ...process.env, BENCH_BUNDLER: bundler, PORT: String(PORT) }
  if (bundler === 'rspack') {
    e.NEXT_RSPACK = 'true'
  } else {
    delete e.NEXT_RSPACK
  }
  return e
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function dirSizeKb(path) {
  try {
    const out = execSync(`du -sk ${JSON.stringify(path)}`, {
      encoding: 'utf8',
    }).trim()
    return Number(out.split(/\s+/)[0])
  } catch {
    return 0
  }
}

export function countFiles(path) {
  try {
    const out = execSync(`find ${JSON.stringify(path)} -type f | wc -l`, {
      encoding: 'utf8',
    }).trim()
    return Number(out)
  } catch {
    return 0
  }
}