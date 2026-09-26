import '../index.css'
import '../vendor/rich-editor/core/style'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AuthorApp } from './AuthorApp'

Object.assign(window, {
  global: window,
  process: { env: {} },
  module: { exports: {} },
})

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

createRoot(root).render(
  <StrictMode>
    <AuthorApp />
  </StrictMode>,
)
