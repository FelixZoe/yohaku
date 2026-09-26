import { describe, expect, it } from 'vitest'

import { clsxm, cn } from './helper'

describe('clsxm and cn', () => {
  it('merges tailwind classes and removes conflicts', () => {
    expect(clsxm('p-4', 'p-2')).toBe('p-2')
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(clsxm('px-2 py-1', 'p-4')).toBe('p-4')
  })
  it('handles conditional classes, booleans, and undefined', () => {
    const isLarge = false
    const isSmall = true
    expect(clsxm('text-base', isLarge && 'text-lg', isSmall && 'text-sm')).toBe(
      'text-sm',
    )
    expect(cn('text-base', null, undefined, '', 'font-bold')).toBe(
      'text-base font-bold',
    )
  })

  it('handles array and object structures', () => {
    expect(
      clsxm(['px-2', 'py-1'], { 'bg-red-500': true, 'bg-blue-500': false }),
    ).toBe('px-2 py-1 bg-red-500')
  })

  it('handles custom font-size classes configured in extendTailwindMerge', () => {
    expect(clsxm('text-caption-10', 'text-label-12')).toBe('text-label-12')
    expect(cn('text-caption-10', 'text-label-12')).toBe('text-label-12')
    expect(clsxm('text-copy-13', 'text-title-20')).toBe('text-title-20')
    expect(clsxm('text-display-36', 'text-display-48')).toBe('text-display-48')
    expect(clsxm('text-icon-sm', 'text-icon-lg')).toBe('text-icon-lg')
  })

  it('resolves conflicts between standard Tailwind text sizes and custom sizes', () => {
    expect(cn('text-copy-14', 'text-sm')).toBe('text-sm')
    expect(cn('text-sm', 'text-copy-14')).toBe('text-copy-14')
    expect(cn('text-base', 'text-title-24')).toBe('text-title-24')
  })

  it('resolves prefixed modifiers correctly', () => {
    expect(cn('md:text-caption-10', 'md:text-copy-14')).toBe('md:text-copy-14')
    expect(cn('dark:text-caption-10', 'dark:text-copy-14')).toBe(
      'dark:text-copy-14',
    )
  })

  it('does not conflate font-size with text-color', () => {
    expect(cn('text-red-500', 'text-caption-10')).toBe(
      'text-red-500 text-caption-10',
    )
    expect(cn('text-caption-10', 'text-red-500')).toBe(
      'text-caption-10 text-red-500',
    )
  })
})
