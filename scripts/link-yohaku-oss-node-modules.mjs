#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `packages/design-system` → `yohaku-oss/design-system` is the same depth as
 * the logical path, so pnpm's `../../../node_modules/.pnpm` links land on
 * this repo root. `apps/mobile` → `yohaku-oss/apps/mobile` (and
 * `packages/{rich-content,dom-webview}`) are one level deeper, so the same
 * relative links would resolve inside `yohaku-oss/` and miss the store.
 *
 * Point `yohaku-oss/node_modules` at the closed workspace store so those
 * hops work. Always run `pnpm` from this repo root (`pnpm --filter …`),
 * never from inside the mobile symlink.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'yohaku-oss', 'node_modules')
const store = path.join(root, 'node_modules')
const rel = '../node_modules'

if (!fs.existsSync(path.join(root, 'yohaku-oss', '.git')) || !fs.existsSync(store)) {
  process.exit(0)
}

let storeLinked = false
try {
  const stat = fs.lstatSync(target)
  if (stat.isSymbolicLink() && fs.readlinkSync(target) === rel) {
    storeLinked = true
  } else {
    fs.rmSync(target, { recursive: true, force: true })
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

if (!storeLinked) fs.symlinkSync(rel, target)

/**
 * pnpm links a workspace dependency to its *workspace* path, so a member whose
 * directory is itself a symlink (`packages/rich-content` → `yohaku-oss/…`)
 * gets a consumer link that points at another symlink. Turbopack cannot
 * resolve a package through that chain — every subpath comes back as
 * "Can't resolve", while webpack and `next build` handle it — so collapse each
 * chained link onto the real directory. Upstream: vercel/next.js.
 */
function flattenChainedScopeLinks(logicalScopeDir) {
  // A relative link target resolves against the directory that physically
  // holds the link, and consumers under `apps/mobile` are themselves reached
  // through a symlink — so both the chain test and the replacement target have
  // to be computed from the real scope directory, never the logical one.
  let scopeDir
  let entries
  try {
    scopeDir = fs.realpathSync(logicalScopeDir)
    entries = fs.readdirSync(scopeDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue
    const link = path.join(scopeDir, entry.name)
    let real
    try {
      const hop = path.resolve(scopeDir, fs.readlinkSync(link))
      if (!fs.lstatSync(hop).isSymbolicLink()) continue
      real = fs.realpathSync(link)
    } catch {
      continue
    }
    fs.rmSync(link)
    fs.symlinkSync(path.relative(scopeDir, real), link)
  }
}

function memberDirs() {
  const groups = [
    path.join(root, 'apps'),
    path.join(root, 'packages'),
    path.join(root, 'yohaku-oss', 'apps'),
    path.join(root, 'yohaku-oss', 'packages'),
  ]
  const dirs = [root, path.join(root, 'yohaku-oss', 'design-system')]
  for (const group of groups) {
    let names
    try {
      names = fs.readdirSync(group)
    } catch {
      continue
    }
    for (const name of names) dirs.push(path.join(group, name))
  }
  return dirs
}

for (const dir of memberDirs()) {
  flattenChainedScopeLinks(path.join(dir, 'node_modules', '@yohaku'))
}
