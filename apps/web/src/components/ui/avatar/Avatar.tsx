'use client'

import { Avatar as BaseAvatar } from '@base-ui/react/avatar'
import type { FC, ImgHTMLAttributes } from 'react'
import { useMemo } from 'react'

import { useIsDark } from '~/hooks/common/use-is-dark'
import { getColorScheme, stringToHue } from '~/lib/color'
import { clsxm } from '~/lib/helper'

const SIZE_MAP = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 44,
  xl: 50,
} as const

type SizePreset = keyof typeof SIZE_MAP

interface AvatarProps {
  alt?: string
  className?: string
  imageClassName?: string
  lazy?: boolean
  randomColor?: boolean
  rounded?: 'full' | number
  size?: SizePreset | number
  src?: string | null
  text?: string
}

export const Avatar: FC<
  AvatarProps & Omit<ImgHTMLAttributes<HTMLImageElement>, keyof AvatarProps>
> = (props) => {
  const {
    src,
    text,
    size = 'md',
    rounded = 'full',
    randomColor,
    lazy = true,
    alt,
    className,
    imageClassName,
    ...imgProps
  } = props

  const px = typeof size === 'number' ? size : SIZE_MAP[size]
  const isDark = useIsDark()

  const bgColor = useMemo(() => {
    if (!randomColor) return undefined
    const seed = text || src
    if (!seed) return undefined
    const colors = getColorScheme(stringToHue(seed)) as any
    return isDark ? colors?.dark?.background : colors?.light?.background
  }, [randomColor, text, src, isDark])

  const borderRadius = rounded === 'full' ? '9999px' : `${rounded}px`
  const fontSize = `${px * 0.4}px`

  return (
    <BaseAvatar.Root
      className={clsxm(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
        className,
      )}
      style={{
        width: `${px}px`,
        height: `${px}px`,
        borderRadius,
        backgroundColor: bgColor,
      }}
    >
      {src && (
        <BaseAvatar.Image
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          src={src}
          className={clsxm(
            'size-full object-cover transition-opacity duration-200',
            imageClassName,
          )}
          {...imgProps}
        />
      )}
      <BaseAvatar.Fallback
        className="flex size-full items-center justify-center font-semibold text-white"
        style={{ fontSize }}
      >
        {text?.[0]?.toUpperCase()}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  )
}
