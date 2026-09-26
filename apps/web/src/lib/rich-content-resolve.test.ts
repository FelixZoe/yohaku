import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const webRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const monorepoRoot = path.resolve(webRoot, '../..')
const requireFromWeb = createRequire(path.join(webRoot, 'package.json'))

const siteImportSpecifiers = [
  '@yohaku/rich-content/host',
  '@yohaku/rich-content/lexical',
  '@yohaku/rich-content/block-styles.css',
  '@yohaku/rich-content/src/lexical/theme.ts',
] as const

describe('@yohaku/rich-content site imports', () => {
  it.each(siteImportSpecifiers)('resolves %s from apps/web', (specifier) => {
    const resolved = requireFromWeb.resolve(specifier)
    expect(existsSync(resolved)).toBe(true)
    expect(realpathSync(resolved).startsWith(path.join(monorepoRoot, 'yohaku-oss'))).toBe(
      true,
    )
  })

  it('keeps Next compiling and tracing the yohaku-oss realpath', () => {
    const nextConfig = readFileSync(path.join(webRoot, 'next.config.mjs'), 'utf8')
    expect(nextConfig).toContain("'@yohaku/rich-content'")
    expect(nextConfig).toMatch(/transpilePackages:\s*\[/)
    expect(nextConfig).toContain('outputFileTracingRoot: monorepoRoot')
    expect(nextConfig).toContain('root: monorepoRoot')
  })
})
