'use client'

import { Dialog } from '@base-ui/react/dialog'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import type { HTMLMotionProps } from 'motion/react'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { ImpressionView } from '~/components/common/ImpressionTracker'
import { MotionButtonBase } from '~/components/ui/button'
import { ModalOverlay } from '~/components/ui/modal/stacked/overlay'
import { PresentSheet } from '~/components/ui/sheet'
import { TrackerAction } from '~/constants/tracker'
import { useIsClient } from '~/hooks/common/use-is-client'
import { clsxm } from '~/lib/helper'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

const positionAtom = atom({
  x: 0,
  y: 0,
})
const overlayShowAtom = atom(false)

export const AsideDonateButton = () => {
  const isClient = useIsClient()
  const donate = useAppConfigSelector((config) => config.module?.donate)

  const overlayOpen = useAtomValue(overlayShowAtom)

  if (!isClient) return null
  if (!donate || !donate.enable) return null

  return (
    <>
      <DonateButtonBelow />
      <Dialog.Root open={overlayOpen}>
        <Dialog.Portal keepMounted>
          <div>
            <AnimatePresence>
              {overlayOpen && (
                <>
                  <ModalOverlay />
                  <Dialog.Popup className="center fixed inset-0 z-[999] flex flex-col">
                    <DonateContent />

                    <DonateButtonTop />
                  </Dialog.Popup>
                </>
              )}
            </AnimatePresence>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

const DonateButtonBelow = () => {
  const setPosition = useSetAtom(positionAtom)
  const setOverlayShow = useSetAtom(overlayShowAtom)

  const [sheetOpen, setSheetOpen] = useState(false)
  const isMobile = useIsMobile()

  return (
    <>
      <DonateButtonInternal
        onClick={() => {
          setSheetOpen(true)
        }}
        onMouseEnter={(e) => {
          if (isMobile) return
          const $el = e.target as HTMLButtonElement
          const rect = $el.getBoundingClientRect()
          setPosition({
            x: rect.left,
            y: rect.top,
          })

          setOverlayShow(true)
        }}
      />
      {isMobile && (
        <PresentSheet
          dismissible
          content={DonateContent}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}

const DonateButtonTop = () => {
  const setOverlayShow = useSetAtom(overlayShowAtom)
  const buttonPos = useAtomValue(positionAtom)
  return (
    <ImpressionView
      action={TrackerAction.Impression}
      trackerMessage="Donate Show"
    >
      <DonateButtonInternal
        className="text-red-400 focus-visible:shadow-none!"
        exit={{
          opacity: 0,
        }}
        style={{
          position: 'fixed',
          left: buttonPos.x,
          top: buttonPos.y,
          zIndex: 999,
          margin: 0,
        }}
        onMouseLeave={() => {
          setOverlayShow(false)
        }}
      />
    </ImpressionView>
  )
}

const DonateButtonInternal: Component<HTMLMotionProps<'button'>> = ({
  className,

  ...props
}) => {
  const t = useTranslations('common')
  const donate = useAppConfigSelector((config) => config.module.donate)
  if (!donate) return null
  return (
    <MotionButtonBase
      aria-label={t('aria_donate')}
      className={clsxm('flex flex-col space-y-2', className)}
      onClick={() => {
        window.open(donate.link, '_blank')
      }}
      {...props}
    >
      <i className="i-mingcute-gift-line text-title-24 opacity-80 duration-200 hover:opacity-100 hover:text-red-400" />
    </MotionButtonBase>
  )
}

export const DonateContent = () => {
  const t = useTranslations('donate')
  const donate = useAppConfigSelector((config) => config.module?.donate)

  return (
    <>
      <m.h2 className="mb-6 text-copy-16 font-medium" exit={{ opacity: 0 }}>
        {t('thanks')}
      </m.h2>
      <m.div
        className="flex flex-nowrap items-start gap-3"
        exit={{ opacity: 0 }}
      >
        {donate?.qrcode?.map((src) => (
          <img
            alt="donate"
            className="h-[220px] w-auto rounded-lg border border-black/5 bg-white/80 object-contain p-2 shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-white/8 dark:bg-neutral-1"
            key={src}
            src={src}
          />
        ))}
      </m.div>
    </>
  )
}
