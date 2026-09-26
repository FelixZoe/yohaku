import { rename, writeFile } from 'node:fs/promises'

import type { AuthorFs } from './document'

export const nodeAuthorFs: AuthorFs = {
  writeFile: (path, data) => writeFile(path, data, 'utf8'),
  rename: (from, to) => rename(from, to),
}
