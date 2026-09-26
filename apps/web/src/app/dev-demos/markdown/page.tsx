import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
// eslint-disable-next-line unicorn/import-style
import { resolve } from 'node:path'

import { MarkdownDemoClient } from './client'

export default function Page() {
  const markdownPath = resolve(homedir(), 'test-text.md')
  const scratch = existsSync(markdownPath)
    ? readFileSync(markdownPath, 'utf8')
    : null
  return <MarkdownDemoClient scratch={scratch} />
}
