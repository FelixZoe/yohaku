import { Slider } from '@base-ui/react/slider'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

export const VolumeSlider: FC<{
  volume: number
  onVolumeChange: (volume: number) => void
}> = ({ onVolumeChange, volume }) => {
  const t = useTranslations('common')
  return (
    <Slider.Root
      className="relative flex h-16 w-1 flex-col items-center rounded p-1"
      max={1}
      orientation="vertical"
      step={0.01}
      value={volume ?? 0.8}
      onValueChange={(value) => {
        onVolumeChange?.(value)
      }}
    >
      <Slider.Control className="relative flex h-full w-full grow items-center justify-center">
        <Slider.Track className="relative h-full w-1 grow rounded bg-neutral-6">
          <Slider.Indicator className="absolute bottom-0 w-full rounded bg-neutral-10" />
          <Slider.Thumb
            aria-label={t('aria_volume')}
            className="block size-3 rounded-full bg-neutral-10"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}
