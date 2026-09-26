'use client'

import { useTranslations } from 'next-intl'

import { Loading } from '~/components/ui/loading'
import { PresentSheet } from '~/components/ui/sheet'

import { useYohakuLayout } from './hooks/useYohakuLayout'
import { YohakuContent } from './YohakuContent'
import { YohakuMetaHeader } from './YohakuMetaHeader'
import {
  useYohakuActions,
  useYohakuData,
  useYohakuError,
  useYohakuLoading,
  useYohakuMeta,
  useYohakuState,
} from './YohakuProvider'

export function YohakuSheet({ paperW }: { paperW: number }) {
  const state = useYohakuState()
  const data = useYohakuData()
  const meta = useYohakuMeta()
  const loading = useYohakuLoading()
  const error = useYohakuError()
  const { close, reload } = useYohakuActions()
  const t = useTranslations('common')
  const layout = useYohakuLayout(paperW)
  if (layout.mode !== 'sheet') return null
  if (state === 'idle') return null

  const hasRealContent = data.length >= 20
  const showSkeleton = loading && !hasRealContent

  return (
    <PresentSheet
      open
      title={t('yohaku_ribbon')}
      content={
        <div aria-label={t('yohaku_paper_aria')} data-yohaku-sheet="">
          <YohakuMetaHeader className="mb-3" meta={meta} />
          {showSkeleton && <Loading useDefaultLoadingText />}
          {error && !loading && (
            <div className="yohaku-error">
              <p>
                {t('yohaku_error')}：{error.message}
              </p>
              <button type="button" onClick={() => reload()}>
                {t('yohaku_reload')}
              </button>
            </div>
          )}
          {!error && hasRealContent && <YohakuContent markdown={data} />}
        </div>
      }
      onOpenChange={(o) => {
        if (!o) close()
      }}
    />
  )
}
