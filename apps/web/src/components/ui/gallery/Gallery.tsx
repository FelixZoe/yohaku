'use client'

import './Gallery.css'

import clsx from 'clsx'
import type { CSSProperties, FC, UIEventHandler } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'

import { SlotText } from '~/components/ui/slot-text'
import { useStateToRef } from '~/hooks/common/use-state-ref'
import { calculateDimensions } from '~/lib/image'
import { throttle } from '~/lib/lodash'
import {
  useMarkdownImageList,
  useMarkdownImageRecord,
} from '~/providers/article/MarkdownImageRecordProvider'
import { useWrappedElementSize } from '~/providers/shared/WrappedElementProvider'

import { MotionButtonBase } from '../button'
import { FixedZoomedImage } from '../image'
import { ZoomGroup } from '../image/ZoomGroup'
import { MarkdownImage } from '../markdown/renderers/image'

const IMAGE_CONTAINER_MARGIN_INSET = 60
const CHILD_GAP = 15
const AUTOPLAY_DURATION = 5000

interface GalleryImageType {
  footnote?: string
  name?: string
  url: string
}
interface GalleryProps {
  images: GalleryImageType[]
}

const getImageCaption = (image: GalleryImageType) => {
  const { footnote, name } = image
  return (
    footnote || (['!', '¡'].includes(name?.[0]) ? name?.slice(1) : '') || ''
  )
}

export const Gallery: FC<GalleryProps> = (props) => {
  const { images } = props

  const imageMetaList = useMarkdownImageList()
  const { w } = useWrappedElementSize()
  const containerWidth = w - IMAGE_CONTAINER_MARGIN_INSET

  const fixedHeight = useMemo(() => {
    if (containerWidth <= 0) return
    const heights = images.map((image) => {
      const meta = imageMetaList.find((item) => item?.src === image.url)
      if (!meta?.width || !meta?.height) return 0
      return calculateDimensions({
        width: meta.width,
        height: meta.height,
        max: { width: containerWidth, height: Infinity },
      }).height
    })
    if (!heights.every(Boolean)) return
    return Math.min(...heights)
  }, [images, imageMetaList, containerWidth])

  const captions = images.map(getImageCaption)

  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null)

  const [, setUpdated] = useState({})
  const memoedChildContainerWidthRef = useRef(0)

  useEffect(() => {
    if (!containerRef) {
      return
    }

    const ob = new ResizeObserver(() => {
      setUpdated({})
      calChild(containerRef)
    })
    function calChild(containerRef: HTMLDivElement) {
      const $child = containerRef.children.item(0)
      if ($child) {
        memoedChildContainerWidthRef.current = $child.clientWidth
      }
    }

    calChild(containerRef)

    ob.observe(containerRef)
    return () => {
      ob.disconnect()
    }
  }, [containerRef])

  const [currentIndex, setCurrentIndex] = useState(0)

  const handleOnScroll: UIEventHandler<HTMLDivElement> = useMemo(
    () =>
      throttle<UIEventHandler<HTMLDivElement>>((e) => {
        const $ = e.target as HTMLDivElement

        const index = Math.floor(
          ($.scrollLeft + IMAGE_CONTAINER_MARGIN_INSET + 15) /
            memoedChildContainerWidthRef.current,
        )
        setCurrentIndex(index)
      }, 60),
    [],
  )
  const handleScrollTo = useCallback(
    (i: number) => {
      if (!containerRef) {
        return
      }

      containerRef.scrollTo({
        left: memoedChildContainerWidthRef.current * i,
        behavior: 'smooth',
      })
    },
    [containerRef],
  )

  const autoplayTimerRef = useRef(null as any)

  const currentIndexRef = useStateToRef(currentIndex)
  const totalImageLengthRef = useStateToRef(images.length)

  // 向后翻页状态
  const isForward = useRef(true)

  const autoplayRef = useRef(true)
  const handleCancelAutoplay = useCallback(() => {
    if (!autoplayRef.current) {
      return
    }

    autoplayRef.current = false
    clearInterval(autoplayTimerRef.current)
  }, [])

  const { ref } = useInView({
    initialInView: false,
    triggerOnce: images.length < 2,
    onChange(inView) {
      if (totalImageLengthRef.current < 2 || !autoplayRef.current) {
        return
      }
      if (inView) {
        autoplayTimerRef.current = setInterval(() => {
          if (
            currentIndexRef.current + 1 > totalImageLengthRef.current - 1 &&
            isForward.current
          ) {
            isForward.current = false
          }
          if (currentIndexRef.current - 1 < 0 && !isForward.current) {
            isForward.current = true
          }

          const index = currentIndexRef.current + (isForward.current ? 1 : -1)
          handleScrollTo(index)
        }, AUTOPLAY_DURATION)
      } else {
        autoplayTimerRef.current = clearInterval(autoplayTimerRef.current)
      }
    },
  })

  useEffect(
    () => () => {
      clearInterval(autoplayTimerRef.current)
    },
    [],
  )

  if (images.length === 0) {
    return null
  }
  if (images.length === 1) {
    const image = images[0]
    return <MarkdownImage alt={image.footnote} src={image.url} />
  }

  return (
    <ZoomGroup>
      <div
        className={clsx('w-full', 'gallery-root')}
        ref={ref}
        onTouchMove={handleCancelAutoplay}
        onWheel={handleCancelAutoplay}
      >
        <div className="relative">
          <div
            ref={setContainerRef}
            className={clsx(
              'w-full overflow-auto whitespace-nowrap',
              'gallery-container',
            )}
            onScroll={handleOnScroll}
            onTouchMove={handleCancelAutoplay}
            onTouchStart={handleCancelAutoplay}
            onWheel={handleCancelAutoplay}
          >
            {images.map((image) => (
              <GalleryItem
                fixedHeight={fixedHeight}
                image={image}
                key={image.url}
              />
            ))}
          </div>

          {currentIndex > 0 && (
            <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center [&_*]:duration-200">
              <MotionButtonBase
                className="border-border center pointer-events-auto flex size-8 rounded-full border bg-neutral-1 p-1 opacity-60 hover:opacity-100"
                onClick={() => {
                  handleScrollTo(currentIndex - 1)
                }}
              >
                <i className="i-mingcute-left-fill" />
              </MotionButtonBase>
            </div>
          )}
          {currentIndex < images.length - 1 && (
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center [&_*]:duration-200">
              <MotionButtonBase
                className="border-border center pointer-events-auto flex size-8 rounded-full border bg-neutral-1 p-1 opacity-60 hover:opacity-100"
                onClick={() => {
                  handleScrollTo(currentIndex + 1)
                }}
              >
                <i className="i-mingcute-right-fill" />
              </MotionButtonBase>
            </div>
          )}
        </div>

        <div className="gallery-folio">
          <span aria-hidden className="gallery-folio__caption">
            {captions[currentIndex]}
          </span>
          <span className="gallery-folio__count">
            <SlotText text={String(currentIndex + 1).padStart(2, '0')} />
            <span className="opacity-50">/</span>
            {String(images.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </ZoomGroup>
  )
}
const childStyle = {
  width: `calc(100% - ${IMAGE_CONTAINER_MARGIN_INSET}px)`,
  marginRight: `${CHILD_GAP}px`,
}

const GalleryItem: FC<{
  image: GalleryImageType
  fixedHeight?: number
}> = memo(({ image, fixedHeight }) => {
  const info = useMarkdownImageRecord(image.url)

  const imageCaption = getImageCaption(image)
  const { w } = useWrappedElementSize()

  const fixedWidth =
    fixedHeight && info?.width && info?.height
      ? (fixedHeight * info.width) / info.height
      : undefined

  return (
    <div
      className={clsx('gallery-child', 'inline-block self-center')}
      key={`${image.url}-${image.name || ''}`}
      style={
        {
          ...childStyle,
          '--gallery-image-h': fixedHeight ? `${fixedHeight}px` : undefined,
        } as CSSProperties
      }
    >
      <FixedZoomedImage
        accent={info?.accent}
        alt={imageCaption}
        containerWidth={w - IMAGE_CONTAINER_MARGIN_INSET}
        height={fixedHeight}
        src={image.url}
        width={fixedWidth}
      />
    </div>
  )
})

GalleryItem.displayName = 'GalleryItem'
