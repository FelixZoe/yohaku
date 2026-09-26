import clsx from 'clsx'
import type { FC } from 'react'
import { tv } from 'tailwind-variants'

import { Spinner } from '~/components/ui/loading/Spinner'

import { MotionButtonBase } from './MotionButton'

const variantStyles = tv({
  base: clsx(
    'inline-flex select-none cursor-default items-center justify-center outline-offset-2',
    'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'active:translate-y-px',
  ),
  variants: {
    variant: {
      primary: clsx(
        'bg-accent/8 border border-accent/30 text-accent font-medium',
        'hover:bg-accent/12 hover:border-accent/45',
        'active:bg-accent/16 active:border-accent/50',
        'disabled:bg-accent/4 disabled:border-accent/15 disabled:text-accent/40 disabled:cursor-not-allowed disabled:translate-y-0',
      ),
      secondary: clsx(
        'bg-transparent border border-black/10 text-neutral-9 dark:border-white/10',
        'hover:bg-black/[0.02] hover:border-black/15 dark:hover:bg-white/4 dark:hover:border-white/15',
        'active:bg-black/[0.04] active:border-black/[0.18] dark:active:bg-white/6 dark:active:border-white/[0.18]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0',
      ),
      ghost: clsx(
        'bg-transparent border border-transparent text-neutral-7',
        'hover:bg-black/[0.03] hover:text-neutral-9 dark:hover:bg-white/4',
        'active:bg-black/[0.06] dark:active:bg-white/6',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0',
      ),
    },
    size: {
      sm: 'gap-1.5 rounded-md px-2.5 py-0.5 text-label-12',
      md: 'gap-2 rounded-lg px-3.5 py-1.5 text-copy-13',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})
type NativeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string
}

type SharedProps = {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  className?: string
  isLoading?: boolean
}
type ButtonProps = SharedProps & NativeButtonProps

export const StyledButton: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  isLoading,
  href: _href,
  children,

  ...props
}) => {
  return (
    <MotionButtonBase
      className={clsx(variantStyles({ variant, size, className }), 'relative')}
      {...(props as any)}
    >
      <span className={clsx('contents', isLoading && 'invisible')}>
        {children}
      </span>
      {isLoading && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
        >
          <Spinner size={size === 'sm' ? 14 : 16} />
        </span>
      )}
    </MotionButtonBase>
  )
}
