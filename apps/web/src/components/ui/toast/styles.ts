import clsx from 'clsx'

export const toastStyles = {
  toast: clsx(
    'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3',
    // Glassmorphism background - light and airy
    'bg-neutral-1/75 backdrop-blur-xl',
    // Subtle border for definition
    'ring-1 ring-neutral-10/[0.05]',
    // Soft shadow
    'shadow-lg shadow-neutral-10/[0.08] dark:shadow-neutral-1/[0.15]',
    // Size
    'min-w-[280px] max-w-sm',
    // Sonner collapses back-stack toasts to the front toast's height. With `unstyled`,
    // sonner's own [data-styled=true]>* { opacity: 0 } rule no longer applies, so
    // taller back-stack content overflows the clamped box. Hide back-stack children
    // ourselves to restore the intended behavior.
    "[&[data-expanded='false'][data-front='false']>*]:opacity-0",
  ),
  title: clsx('text-copy-13 font-medium', 'text-neutral-9'),
  description: clsx('mt-0.5 text-label-12', 'text-neutral-7'),
  content: 'flex min-w-0 flex-1 flex-col justify-center',
  icon: clsx(
    'relative flex size-2 shrink-0 items-center justify-center rounded-full',
    // Pulse animation on mount
    'animate-[toast-dot-pulse_0.6s_ease-out]',
    // Success - Accent color
    '[li[data-type="success"]_&]:bg-accent',
    // Error - Red
    '[li[data-type="error"]_&]:bg-red-500',
    // Warning - Amber
    '[li[data-type="warning"]_&]:bg-amber-500',
    // Info - Accent color with opacity
    '[li[data-type="info"]_&]:bg-accent/80',
    // Loading - keep spinning icon behavior
    '[li[data-type="loading"]_&]:size-4 [li[data-type="loading"]_&]:bg-transparent',
    // Hide inner icon for dot types
    '[&>i]:hidden [li[data-type="loading"]_&_>i]:block [li[data-type="loading"]_&_>i]:text-accent',
  ),
  actionButton: clsx(
    'h-7 shrink-0 rounded-lg px-3 text-label-12 font-medium',
    'transition-all duration-200',
    'bg-neutral-9 text-neutral-1 hover:bg-neutral-8',
  ),
  cancelButton: clsx(
    'h-7 rounded-lg px-3 text-label-12 font-medium',
    'bg-neutral-2 text-neutral-7',
    'hover:bg-neutral-3',
    'transition-colors duration-200',
  ),
  closeButton: clsx(
    'absolute -right-2 -top-2 rounded-full p-0.5',
    'bg-neutral-2 text-neutral-7',
    'hover:bg-neutral-3 hover:text-neutral-8',
    'transition-all duration-200',
    'opacity-0 group-hover:opacity-100',
    'shadow-xs ring-1 ring-neutral-10/[0.05] dark:ring-neutral-1/[0.08]',
  ),
}
