export const inputRoundedMap = {
  sm: 'rounded-xs',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  default: 'rounded-xl',
} as const

export const fieldBaseClassName = [
  'border bg-[var(--field-bg)] border-[var(--field-border)]',
  'shadow-[var(--field-shadow)]',
  '[background-image:var(--field-gradient)]',
  'duration-200',
].join(' ')
export const fieldWrapperBaseClassName = [
  'group relative h-full',
  fieldBaseClassName,
].join(' ')

export const fieldWrapperFocusClassName = [
  'focus-within:border-[var(--field-border-focus)]',
  'focus-within:shadow-[var(--field-ring)]',
].join(' ')
