import { Toaster as Sonner } from 'sonner'

import { useIsDark } from '~/hooks/common/use-is-dark'

import { toastStyles } from './styles'

type ToasterProps = React.ComponentProps<typeof Sonner>

export const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = useIsDark()

  return (
    <div suppressHydrationWarning data-theme={isDark ? 'dark' : 'light'}>
      <Sonner
        gap={12}
        theme={isDark ? 'dark' : 'light'}
        icons={{
          success: <i className="i-mingcute-check-circle-line" />,
          error: <i className="i-mingcute-close-circle-line" />,
          warning: <i className="i-mingcute-warning-line" />,
          info: <i className="i-mingcute-information-line" />,
          loading: <i className="i-mingcute-loading-3-line animate-spin" />,
        }}
        toastOptions={{
          unstyled: true,
          classNames: toastStyles,
        }}
        {...props}
      />
    </div>
  )
}
