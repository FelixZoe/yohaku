import { defineConfig } from 'taze'

export default defineConfig({
  // ignore packages from bumping
  exclude: [
    'tailwindcss',
    'crossbell',
    '@excalidraw/excalidraw',
    'eslint-plugin-react-hooks',
    'eslint-plugin-react-refresh',
    'react-native-gesture-handler',
    'react-native-screens',
    'react-native-safe-area-context',
  ],
  // fetch latest package info from registry without cache
  force: true,
  // write to package.json
  write: true,
  // run `npm install` or `yarn install` right after bumping
  install: true,
  // ignore paths for looking for package.json in monorepo
  ignorePaths: ['**/node_modules/**', '**/test/**'],
  // override with different bumping mode for each package
  packageMode: {
    typescript: 'major',
  },
  // disable checking for "overrides" package.json field
  depFields: {
    overrides: false,
  },
  recursive: true,
  mode: 'latest',
})
