import type { CSSProperties, FC } from 'react'

import { Favicon } from '~/components/ui/rich-link/Favicon'
import type { EnrichmentResult } from '~/models/enrichment'

import { WideOgMedia } from './variants/atoms/WideOgMedia'

interface Props {
  data: EnrichmentResult
}

const HEX_RE = /^#[\da-f]{6}$/i

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export const HoverLinkCard: FC<Props> = ({ data }) => {
  const host = hostOf(data.url)

  const paletteDominant = data.captureImage?.palette?.dominant
  const accent =
    typeof data.color === 'string' && HEX_RE.test(data.color)
      ? data.color
      : typeof paletteDominant === 'string' && HEX_RE.test(paletteDominant)
        ? paletteDominant
        : null
  const anchorStyle: CSSProperties | undefined = accent
    ? ({ '--color-accent': accent } as CSSProperties)
    : undefined

  const mediaAlt =
    data.previewImage?.alt ?? data.thumbnailImage?.alt ?? data.title

  return (
    <a
      className="block w-[360px] max-w-[400px] overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-neutral-3/50 dark:bg-[var(--surface-paper)]"
      href={data.url}
      rel="noopener"
      style={anchorStyle}
      target="_blank"
    >
      <WideOgMedia
        alt={mediaAlt}
        captureImage={data.captureImage}
        previewImage={data.previewImage}
        thumbnailImage={data.thumbnailImage}
      />
      <div className="p-3">
        <div className="line-clamp-2 text-copy-15 font-medium text-neutral-10">
          {data.title}
        </div>
        {data.description && (
          <div className="mt-1 line-clamp-3 text-copy-13 text-neutral-7">
            {data.description}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2 font-mono text-[0.75rem] text-neutral-7">
          <Favicon
            className="mr-0 inline-flex size-[14px] shrink-0 items-center justify-center [&_svg]:h-[14px]! [&_svg]:w-[14px]!"
            href={data.url}
          />
          <span className="truncate">{host}</span>
          {data.subtype && (
            <>
              <span className="text-neutral-5">·</span>
              <span className="truncate">{data.subtype}</span>
            </>
          )}
        </div>
      </div>
    </a>
  )
}
