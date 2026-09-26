'use client'

import './ZoomedImage.css'

import { ImageExifOverlay } from '@yohaku/rich-content/src/lexical/portable/exif-overlay.tsx'
import clsx from 'clsx'
import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { Zoom } from 'lumeo'
import Image from 'next/image'
import type {
  AnimationEventHandler,
  DetailedHTMLProps,
  FC,
  ImgHTMLAttributes,
  ReactNode,
} from 'react'
import {
  cloneElement,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { tv } from 'tailwind-variants'

import { LazyLoad } from '~/components/common/Lazyload'
import { useIsUnMounted } from '~/hooks/common/use-is-unmounted'
import { isDev, isServerSide } from '~/lib/env'
import { clsxm } from '~/lib/helper'
import { calculateDimensions } from '~/lib/image'
import { getPhotoZoom } from '~/lib/photo-zoom'
import { useMarkdownImageRecord } from '~/providers/article/MarkdownImageRecordProvider'

import { Divider } from '../divider'
import { ImagePlaceholder } from './ImagePlaceholder'
import { useZoomGroupId } from './ZoomGroup'

type TImageProps = {
  src: string
  alt?: string
  title?: string
  accent?: string
}

type BaseImageProps = {
  zoom?: boolean
  placeholder?: ReactNode

  height?: number
  width?: number

  onClick?: () => void
}

export enum ImageLoadStatus {
  Error = 'error',
  Loaded = 'loaded',
  Loading = 'loading',
}

const zoomedImageStatusClassNames = {
  [ImageLoadStatus.Loading]: 'zoomed-image--loading',
  [ImageLoadStatus.Loaded]: 'zoomed-image--loaded',
  [ImageLoadStatus.Error]: 'zoomed-image--error',
} as const

const styles = tv({
  base: 'overflow-hidden text-center inline-flex items-center justify-center duration-200',
  variants: {
    status: {
      loading: 'hidden opacity-0',
      loaded: 'opacity-100 block',
      error: 'hidden opacity-0',
    },
  },
})

const ImageLazy: Component<
  TImageProps &
    BaseImageProps & {
      ref?: React.RefObject<HTMLImageElement | null>
    }
> = ({
  alt,
  src,
  title,
  zoom,
  accent,

  placeholder,
  height,
  width,
  className,
  onClick,

  ref,
}) => {
  const [zoomer_] = useState<Zoom>(() =>
    isServerSide ? null! : getPhotoZoom(),
  )

  const imageMeta = useMarkdownImageRecord(src)
  const accentColor = accent || imageMeta?.accent

  const isDarkBackground = useMemo(() => {
    const color = accentColor
    if (!color) return false
    const hex = color.replace('#', '')
    if (hex.length !== 6) return false
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.5
  }, [accentColor])

  const figcaption = title || alt
  const [imageLoadStatus, setImageLoadStatus] = useState(
    ImageLoadStatus.Loading,
  )
  const isUnmount = useIsUnMounted()
  const setImageLoadStatusSafe = useCallback(
    (status: ImageLoadStatus) => {
      if (!isUnmount.current) {
        setImageLoadStatus(status)
      }
    },
    [isUnmount],
  )
  const imageRef = useRef<HTMLImageElement>(null)
  useImperativeHandle(ref, () => imageRef.current!)
  const zoomGroupId = useZoomGroupId()
  useIsomorphicLayoutEffect(() => {
    if (imageLoadStatus !== ImageLoadStatus.Loaded) {
      return
    }
    if (!zoom || !zoomer_) {
      return
    }
    const $image = imageRef.current
    if (!$image) return
    if (onClick) return

    if (zoomGroupId) {
      $image.dataset.zoomGroup = zoomGroupId
    }
    zoomer_.attach($image)
    return () => {
      zoomer_.detach($image)
      if (zoomGroupId) {
        delete $image.dataset.zoomGroup
      }
    }
  }, [zoom, zoomer_, imageLoadStatus, onClick, zoomGroupId])

  const handleOnLoad = useCallback(() => {
    setImageLoadStatusSafe(ImageLoadStatus.Loaded)
  }, [setImageLoadStatusSafe])
  const handleError = useCallback(
    () => setImageLoadStatusSafe(ImageLoadStatus.Error),
    [setImageLoadStatusSafe],
  )
  const handleOnAnimationEnd: AnimationEventHandler<HTMLImageElement> =
    useCallback((e) => {
      if (ImageLoadStatus.Loaded) {
        ;(e.target as HTMLElement).classList.remove(
          zoomedImageStatusClassNames[ImageLoadStatus.Loaded],
        )
      }
    }, [])
  const imageClassName = useMemo(
    () =>
      styles({
        status: imageLoadStatus,
        className: clsx(
          zoomedImageStatusClassNames[ImageLoadStatus.Loaded],
          className,
        ),
      }),
    [className, imageLoadStatus],
  )
  return (
    <figure>
      <span
        data-hide-print
        className="group/image relative flex justify-center overflow-hidden rounded-xl"
      >
        <LazyLoad offset={30} placeholder={placeholder}>
          <span>
            {imageLoadStatus !== ImageLoadStatus.Loaded && placeholder}
          </span>
          {/* <div className="absolute top-0 opacity-30">{placeholder}</div> */}
          {imageLoadStatus === ImageLoadStatus.Error && (
            <div
              className={clsx(
                'absolute inset-x-0 bottom-0 z-[1] flex items-center justify-between gap-3 rounded-b-xl px-4 py-2.5 text-copy-13 backdrop-blur-xs',
                isDarkBackground
                  ? 'bg-black/50 text-white/90'
                  : 'bg-white/70 text-[#404040]',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <i className="i-mingcute-close-line shrink-0 text-copy-14 text-red-500" />
                <span className="truncate">加载失败</span>
              </span>
              <a
                href={src}
                rel="noreferrer"
                target="_blank"
                className={clsx(
                  'inline-flex shrink-0 items-center transition-colors',
                  isDarkBackground
                    ? 'text-white/70 hover:text-white'
                    : 'text-[#737373] hover:text-[#262626]',
                )}
              >
                原图
                <i className="i-mingcute-arrow-right-line ml-0.5 text-label-12" />
              </a>
            </div>
          )}
          <OptimizedImage
            alt={alt || title || ''}
            className={imageClassName}
            height={height}
            ref={imageRef}
            src={src}
            title={title}
            width={width}
            onAnimationEnd={handleOnAnimationEnd}
            onClick={onClick}
            onError={handleError}
            onLoad={handleOnLoad}
          />
        </LazyLoad>
      </span>

      <img alt={alt || title} className="hidden! print:block!" src={src} />

      {!!figcaption && (
        <figcaption className="mt-1 flex flex-col items-center justify-center">
          <Divider className="w-[80px] opacity-80" />
          <span>{figcaption}</span>
        </figcaption>
      )}
    </figure>
  )
}

interface FixedImageProps extends TImageProps {
  containerWidth: number

  height?: number
  onClick?: () => void

  width?: number
}
export const FixedZoomedImage: Component<
  FixedImageProps & {
    ref?: React.RefObject<HTMLImageElement | null>
  }
> = ({ ref, ...props }) => {
  const placeholder = useMemo(() => <Placeholder {...props} />, [props])
  return <ImageLazy zoom placeholder={placeholder} {...props} ref={ref} />
}
const Placeholder: FC<
  Pick<
    FixedImageProps,
    'src' | 'containerWidth' | 'height' | 'width' | 'accent'
  >
> = ({
  src,
  containerWidth,
  height: manualHeight,
  width: manualWidth,
  accent,
}) => {
  const imageMeta = useMarkdownImageRecord(src)
  const accentColor = accent || imageMeta?.accent

  const scaledSize = useMemo(() => {
    let nextHeight = manualHeight
    let nextWidth = manualWidth

    if (!nextHeight || !nextWidth) {
      if (!imageMeta) {
        return
      }
      nextHeight = imageMeta.height
      nextWidth = imageMeta.width
    }

    if (containerWidth <= 0) return
    const { height: scaleHeight, width: scaleWidth } = calculateDimensions({
      width: nextWidth,
      height: nextHeight,
      max: {
        width: containerWidth,
        height: Infinity,
      },
    })

    return {
      scaleHeight,
      scaleWidth,
    }
  }, [manualHeight, manualWidth, containerWidth, imageMeta])

  if (!scaledSize) return <NoFixedPlaceholder accent={accentColor} />

  return (
    <span
      className={`image-placeholder relative rounded-xl ${styles.base}`}
      data-from-record-height={imageMeta?.height}
      data-from-record-width={imageMeta?.width}
      data-height={scaledSize.scaleHeight}
      data-src={src}
      data-width={scaledSize.scaleWidth}
      style={{
        height: scaledSize.scaleHeight,
        width: scaledSize.scaleWidth,
        backgroundColor: accentColor,
      }}
    >
      {imageMeta?.thumbhash && (
        <ImagePlaceholder
          height={scaledSize.scaleHeight}
          thumbhash={imageMeta.thumbhash}
          width={scaledSize.scaleWidth}
        />
      )}
    </span>
  )
}

const NoFixedPlaceholder = ({ accent }: { accent?: string }) => (
  <span
    className={clsxm(
      'image-placeholder',
      styles.base,
      'h-[300px] w-full bg-neutral-4 rounded-xl',
    )}
    style={{
      backgroundColor: accent,
      outline: isDev ? '4px solid red' : undefined,
    }}
  />
)

const OptimizedImage = memo(
  ({
    ref,
    src,
    alt,
    onClick,
    ...rest
  }: Omit<
    DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>,
    'src'
  > & {
    ref?: React.RefObject<HTMLImageElement | null>
    src?: string
  }) => {
    const { height, width } = useMarkdownImageRecord(src!) || rest

    const isGif = src!.endsWith('.gif')
    const useOptimize = !!(height && width) && !isGif

    const placeholderImageRef = useRef<HTMLImageElement>(null)
    const ImageEl = (
      <img
        alt={alt}
        data-zoom-src={src}
        ref={placeholderImageRef}
        src={src}
        onClick={onClick}
        {...rest}
      />
    )

    useImperativeHandle(ref, () => placeholderImageRef.current!)

    const optimizedImageRef = useRef<HTMLImageElement>(null)

    useIsomorphicLayoutEffect(() => {
      const $renderImage = optimizedImageRef.current
      if (!$renderImage) return
      if (!placeholderImageRef.current) return
      placeholderImageRef.current.src = $renderImage.src
    }, [src])

    return (
      <>
        {useOptimize ? (
          <>
            <Image
              priority
              alt={alt || ''}
              fetchPriority="high"
              src={src!}
              {...rest}
              height={+height}
              ref={optimizedImageRef}
              width={+width}
            />
            <div className="absolute inset-0 flex justify-center opacity-0">
              {cloneElement(ImageEl, {
                src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // blank src
              })}
            </div>
          </>
        ) : (
          <>{ImageEl}</>
        )}

        <ImageExifOverlay src={src} />
      </>
    )
  },
)

OptimizedImage.displayName = 'OptimizedImage'
