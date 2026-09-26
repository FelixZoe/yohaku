import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import NextBundleAnalyzer from '@next/bundle-analyzer'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { config } from 'dotenv'
import createNextIntlPlugin from 'next-intl/plugin'

import { buildHeadersConfig } from './src/lib/cache-policy.mjs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

process.title = 'Yohaku (NextJS)'

const env = config().parsed || {}
const configDir = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(configDir, '../..')
const isProd = process.env.NODE_ENV === 'production'
const shikiTraceConfig = getShikiTraceConfig()
const ogTraceConfig = getOgTraceConfig()

let commitHash = ''
let commitUrl = ''
const repoInfo = getRepoInfo()

if (repoInfo) {
  commitHash = repoInfo.hash
  commitUrl = repoInfo.url
}

/** @type {import('next').NextConfig} */

function buildTurbopackRules() {
  const rules = codeInspectorPlugin({
    bundler: 'turbopack',
    hotKeys: ['altKey'],
  })
  const scoped = {}
  for (const value of Object.values(rules)) {
    scoped['**/src/**/*.{jsx,tsx}'] = value
  }
  return scoped
}

function getShikiTraceConfig() {
  const lockfile = readFileSync(
    path.resolve(monorepoRoot, 'pnpm-lock.yaml'),
    'utf8',
  )
  const packages = parsePnpmLock(lockfile)
  const seedEntries = getShikiSeedEntries(packages)
  const closure = getPnpmLockClosure(
    packages,
    seedEntries.map(({ key }) => key),
  )

  const outputFileTracingIncludes = toPnpmPackageGlobs(closure)
  if (!outputFileTracingIncludes.length) {
    throw new Error('No shiki packages found in pnpm-lock.yaml')
  }

  return {
    packageNames: getUniquePackageNames(closure),
    outputFileTracingIncludes,
  }
}

// Only the two files invisible to require-graph tracing: the resvg wasm blob
// and the fallback font. A broad **/*.{js,...} glob here breaks the build —
// satori depends on a package literally named `@shuding/opentype.js`, whose
// directory symlink matches *.js and Turbopack dies reading it as a file.
function getOgTraceConfig() {
  const lockfile = readFileSync(
    path.resolve(monorepoRoot, 'pnpm-lock.yaml'),
    'utf8',
  )
  const packages = parsePnpmLock(lockfile)
  const resvgKeys = Object.keys(packages).filter(
    (key) => getPackageName(key) === '@resvg/resvg-wasm',
  )
  if (!resvgKeys.length) {
    throw new Error('No @resvg/resvg-wasm package found in pnpm-lock.yaml')
  }

  const outputFileTracingIncludes = [
    ...resvgKeys.map(
      (key) =>
        `../../node_modules/.pnpm/${toPnpmPackageDir(key)}/node_modules/**/*.wasm`,
    ),
    './node_modules/next/dist/compiled/@vercel/og/*.ttf',
  ]

  return { outputFileTracingIncludes }
}

function getShikiSeedEntries(packages) {
  const packageJson = JSON.parse(
    readFileSync(path.resolve(configDir, 'package.json'), 'utf8'),
  )
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  return ['shiki', '@shikijs/transformers'].flatMap((name) => {
    const specifier = dependencies[name]
    const exactKey = `${name}@${specifier}`
    const keys = packages[exactKey]
      ? [exactKey]
      : Object.keys(packages).filter((key) => getPackageName(key) === name)

    return keys.map((key) => ({ key }))
  })
}

function parsePnpmLock(text) {
  // pnpm 12 writes a two-document lockfile when packageManager is pinned: the
  // first document describes the pinned package manager, the last one is the
  // workspace lockfile. Parse the last document (single-document lockfiles
  // from pnpm 11 split into one part).
  const workspaceLockfile = text.split(/^---$/m).at(-1)

  const snapshots = parsePnpmLockSection(workspaceLockfile, 'snapshots')
  if (Object.keys(snapshots).length) return snapshots

  return parsePnpmLockSection(workspaceLockfile, 'packages')
}

function parsePnpmLockSection(text, sectionName) {
  const packages = {}
  let inSection = false
  let currentKey = null
  let inDependencies = false

  for (const line of text.split('\n')) {
    if (line === `${sectionName}:`) {
      inSection = true
      continue
    }

    if (!inSection) continue
    if (line && !line.startsWith(' ')) break

    const packageEntry = parsePnpmMapLine(line, 2)

    if (packageEntry && (!packageEntry.value || packageEntry.value === '{}')) {
      currentKey = normalizePnpmLockKey(packageEntry.key)
      packages[currentKey] ??= []
      inDependencies = false
      continue
    }

    const blockEntry = parsePnpmMapLine(line, 4)
    if (blockEntry && !blockEntry.value) {
      inDependencies = [
        'dependencies',
        'optionalDependencies',
        'peerDependencies',
      ].includes(blockEntry.key)
      continue
    }

    if (line.startsWith('    ') && !line.startsWith('      ')) {
      inDependencies = false
    }

    if (!inDependencies || !currentKey) continue

    const dependencyEntry = parsePnpmMapLine(line, 6)

    if (!dependencyEntry) continue

    const version = normalizePnpmLockVersion(dependencyEntry.value)
    if (!version) continue

    packages[currentKey].push(`${dependencyEntry.key}@${version}`)
  }

  return packages
}

function parsePnpmMapLine(line, indent) {
  if (!hasExactIndent(line, indent)) return null

  const body = line.slice(indent)
  const separator = body.indexOf(':')

  if (separator === -1) return null

  return {
    key: stripQuotes(body.slice(0, separator).trim()),
    value: body.slice(separator + 1).trim(),
  }
}

function hasExactIndent(line, indent) {
  return line.startsWith(' '.repeat(indent)) && line[indent] !== ' '
}

function stripQuotes(value) {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function normalizePnpmLockKey(key) {
  return key.trim().split('(')[0]
}

function normalizePnpmLockVersion(version) {
  const normalized = stripQuotes(version.trim()).split('(')[0]

  if (
    !normalized ||
    normalized.startsWith('{') ||
    normalized.startsWith('catalog:') ||
    normalized.startsWith('file:') ||
    normalized.startsWith('link:') ||
    normalized.startsWith('workspace:')
  ) {
    return ''
  }

  return normalized
}

function getPnpmLockClosure(packages, seedKeys) {
  const visited = new Set()
  const queue = [...seedKeys]

  while (queue.length) {
    const key = queue.shift()

    if (visited.has(key) || !packages[key]) continue

    visited.add(key)

    for (const dependency of packages[key]) {
      if (!visited.has(dependency) && packages[dependency]) {
        queue.push(dependency)
      }
    }
  }

  return visited
}

function toPnpmPackageGlobs(packageKeys) {
  return [...packageKeys]
    .map(
      (key) =>
        `../../node_modules/.pnpm/${toPnpmPackageDir(key)}/node_modules/**/*.{js,mjs,cjs,json,wasm}`,
    )
    .sort()
}

function getUniquePackageNames(packageKeys) {
  return [...new Set([...packageKeys].map((key) => getPackageName(key)))].sort()
}

function getPackageName(packageKey) {
  const versionSeparator = packageKey.lastIndexOf('@')
  return versionSeparator > 0
    ? packageKey.slice(0, versionSeparator)
    : packageKey
}

function toPnpmPackageDir(packageKey) {
  const name = getPackageName(packageKey)
  const version = packageKey.slice(name.length + 1)

  return `${name.replaceAll('/', '+')}@${version}`
}

let nextConfig = {
  env: {
    COMMIT_HASH: commitHash,
    COMMIT_URL: commitUrl,
    BUILD_TIME: new Date().toISOString(),
  },

  // Source-only workspace package. After #173 it realpaths through
  // packages/rich-content → yohaku-oss/packages/rich-content, so Next
  // no longer auto-compiles the .tsx / .ts export targets unless listed.
  transpilePackages: [
    '@chenglou/pretext',
    '@mx-space/ws-client',
    '@yohaku/rich-content',
    ...shikiTraceConfig.packageNames,
  ],
  // yohaku-oss/ ships its own pnpm-lock.yaml. Pin both roots to this
  // monorepo so Turbopack / standalone tracing keep the realpathed
  // rich-content tree inside the project instead of "Can't resolve".
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ['@resvg/resvg-wasm', 'satori'],
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  output: 'standalone',
  outputFileTracingIncludes: {
    '/[locale]/og': ['./node_modules/next/dist/compiled/@vercel/og/**/*'],
    '/**/*': [
      ...shikiTraceConfig.outputFileTracingIncludes,
      ...ogTraceConfig.outputFileTracingIncludes,
    ],
  },
  assetPrefix: isProd ? env.ASSETPREFIX || undefined : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    // reactRemoveProperties: { properties: ['^data-id$', '^data-(\\w+)-id$'] },
  },
  turbopack: {
    root: monorepoRoot,
    rules: buildTurbopackRules(),
  },
  experimental: {
    serverMinification: true,
    webpackBuildWorker: true,
    globalNotFound: true,
    optimizePackageImports: [
      '@haklex/rich-editor',
      '@haklex/rich-compose',
      '@haklex/rich-ext-code-snippet',
      '@haklex/rich-ext-embed',
      '@haklex/rich-ext-nested-doc',
      '@haklex/rich-ext-poll',
      '@haklex/rich-renderer-codeblock',
      '@haklex/rich-renderer-katex',
      '@haklex/rich-renderer-mermaid',
      '@haklex/rich-style-token',
      '@lexical/react',
      '@lexical/code-core',
      '@lexical/markdown',
      '@lexical/list',
      '@lexical/rich-text',
      '@lexical/table',
      '@lexical/link',
      'lucide-react',
      'es-toolkit',
      'date-fns',
      '@iconify-json/material-symbols',
      '@iconify-json/mingcute',
      '@iconify-json/octicon',
    ],
  },
  images: {
    unoptimized:
      // Squoosh has memory leak issue, but it will remove in next.js 14.3.0
      // !process.env.VERCEL && isProd && eval('!process.env.NEXT_SHARP_PATH'),
      process.env.NODE_ENV !== 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox; style-src 'unsafe-inline';",
  },

  async headers() {
    return buildHeadersConfig()
  },

  async redirects() {
    return [
      {
        source: '/notes/topics',
        destination: '/notes/series',
        permanent: true,
      },
      {
        source: '/notes/topics/:slug',
        destination: '/notes/series/:slug',
        permanent: true,
      },
      {
        source: '/:locale/notes/topics',
        destination: '/:locale/notes/series',
        permanent: true,
      },
      {
        source: '/:locale/notes/topics/:slug',
        destination: '/:locale/notes/series/:slug',
        permanent: true,
      },
    ]
  },

  async rewrites() {
    return {
      beforeFiles: [
        { source: '/atom.xml', destination: '/feed' },
        { source: '/feed.xml', destination: '/feed' },
        { source: '/sitemap.xml', destination: '/sitemap' },
      ],
    }
  },
}

if (process.env.ANALYZE === 'true') {
  nextConfig = NextBundleAnalyzer({
    enabled: true,
  })(nextConfig)
}

export default withNextIntl(nextConfig)

function getRepoInfo() {
  if (process.env.VERCEL) {
    const { VERCEL_GIT_PROVIDER, VERCEL_GIT_REPO_SLUG, VERCEL_GIT_REPO_OWNER } =
      process.env

    switch (VERCEL_GIT_PROVIDER) {
      case 'github': {
        return {
          hash: process.env.VERCEL_GIT_COMMIT_SHA,
          url: `https://github.com/${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}/commit/${process.env.VERCEL_GIT_COMMIT_SHA}`,
        }
      }
    }
  } else {
    return getRepoInfoFromGit()
  }
}

function getRepoInfoFromGit() {
  try {
    // 获取最新的 commit hash
    // 获取当前分支名称
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim()
    // 获取当前分支跟踪的远程仓库名称
    const remoteName = execSync(`git config branch.${currentBranch}.remote`)
      .toString()
      .trim()
    // 获取当前分支跟踪的远程仓库的 URL
    let remoteUrl = execSync(`git remote get-url ${remoteName}`)
      .toString()
      .trim()

    // 获取最新的 commit hash
    const hash = execSync('git rev-parse HEAD').toString().trim()
    // 转换 git@ 格式的 URL 为 https:// 格式
    if (remoteUrl.startsWith('git@')) {
      remoteUrl = remoteUrl
        .replace(':', '/')
        .replace('git@', 'https://')
        .replace('.git', '')
    } else if (remoteUrl.endsWith('.git')) {
      // 对于以 .git 结尾的 https URL，移除 .git
      remoteUrl = remoteUrl.slice(0, -4)
    }

    // 根据不同的 Git 托管服务自定义 URL 生成规则
    let webUrl
    if (remoteUrl.includes('github.com')) {
      webUrl = `${remoteUrl}/commit/${hash}`
    } else if (remoteUrl.includes('gitlab.com')) {
      webUrl = `${remoteUrl}/-/commit/${hash}`
    } else if (remoteUrl.includes('bitbucket.org')) {
      webUrl = `${remoteUrl}/commits/${hash}`
    } else {
      // 对于未知的托管服务，可以返回 null 或一个默认格式
      webUrl = `${remoteUrl}/commits/${hash}`
    }

    return { hash, url: webUrl }
  } catch (error) {
    console.error('Error fetching repo info:', error?.stderr?.toString())
    return null
  }
}
