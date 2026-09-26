'use client'
import clsx from 'clsx'
import Image from 'next/image'
import type { FC } from 'react'
import { memo, useEffect, useRef } from 'react'

import { LazyLoad } from '~/components/common/Lazyload'
import { isVideoExt } from '~/lib/mine-type'
import { getPhotoZoom } from '~/lib/photo-zoom'
import { useMarkdownImageRecord } from '~/providers/article/MarkdownImageRecordProvider'
import {
  useWrappedElementSize,
  WrappedElementProvider,
} from '~/providers/shared/WrappedElementProvider'

import { Divider } from '../../divider/Divider'
import { ImagePlaceholder } from '../../image/ImagePlaceholder'
import { FixedZoomedImage } from '../../image/ZoomedImage'
import { useZoomGroupId, ZoomGroup } from '../../image/ZoomGroup'
import { Video } from './video'

export const MarkdownImage = (props: { src: string; alt?: string }) => {
  const { src, alt } = props
  const nextProps = {
    ...props,
    alt: alt?.replace(/^[!¡]/, ''),
  }
  const { w } = useWrappedElementSize()

  const ext = src.split('.').pop()!
  const mediaInfo = useMarkdownImageRecord(src)

  if (isVideoExt(ext)) {
    const figcaption = alt?.replace(/^[!¡]/, '')
    return (
      <div className="flex flex-col items-center">
        <Video
          playsInline
          autoPlay={false}
          className={mediaInfo && 'fit'}
          src={src}
          style={
            {
              '--video-height': mediaInfo?.height,
              '--video-width': mediaInfo?.width,
            } as any
          }
        />

        {figcaption && (
          <p className="mt-1 flex flex-col items-center justify-center text-copy-13">
            <Divider className="w-[80px] opacity-80" />
            <span className="opacity-90">{figcaption}</span>
          </p>
        )}
      </div>
    )
  }

  return <FixedZoomedImage {...nextProps} containerWidth={w} />
}

export const GridMarkdownImage = (props: any) => (
  <WrappedElementProvider>
    <div className="relative flex min-w-0 grow">
      <MarkdownImage {...props} />
    </div>
  </WrappedElementProvider>
)

export const GridMarkdownImages: FC<{
  imagesSrc: string[]
  Wrapper: Component
  height: number
}> = ({ imagesSrc, Wrapper, height = 1 }) => (
  <div
    className="relative"
    style={{
      paddingBottom: `${height * 100}%`,
    }}
  >
    <ZoomGroup>
      <Wrapper className="absolute inset-0">
        {imagesSrc.map((src) => (
          <GridZoomImage key={src} src={src} />
        ))}
      </Wrapper>
    </ZoomGroup>
  </div>
)

const GridZoomImage: FC<{ src: string }> = memo(({ src }) => {
  const { accent, height, width, thumbhash } = useMarkdownImageRecord(src) || {}
  const imageEl = useRef<HTMLImageElement>(null)
  const wGreaterThanH = width && height ? width > height : true
  const groupId = useZoomGroupId()

  const ImageComponent = height && width ? Image : 'img'

  useEffect(() => {
    const $img = imageEl.current
    if (!$img) return
    const zoom = getPhotoZoom()
    if (groupId) {
      $img.dataset.zoomGroup = groupId
    }
    zoom.attach($img)
    return () => {
      zoom.detach($img)
      if (groupId) {
        delete $img.dataset.zoomGroup
      }
    }
  }, [groupId])

  return (
    <div
      className="center relative flex size-full overflow-hidden rounded-md bg-cover bg-center"
      style={{
        backgroundColor: accent,
      }}
    >
      {!!thumbhash && (
        <ImagePlaceholder
          className="absolute inset-0 size-full object-cover"
          thumbhash={thumbhash}
        />
      )}
      <LazyLoad offset={30}>
        <ImageComponent
          alt=""
          height={height}
          loading="lazy"
          ref={imageEl}
          src={src}
          width={width}
          className={clsx(
            'm-0! max-w-max object-cover',
            wGreaterThanH ? 'h-full' : 'w-full',
          )}
        />
      </LazyLoad>
    </div>
  )
})

GridZoomImage.displayName = 'GridZoomImage'
