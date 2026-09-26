'use client'

import { HostProvider } from '@yohaku/rich-content/host'
import { KLineCard } from '@yohaku/rich-content/src/lexical/biz/stock/kline-card.tsx'
import { StockKLineSkeleton } from '@yohaku/rich-content/src/lexical/biz/stock/shared.tsx'
import { SnapshotCard } from '@yohaku/rich-content/src/lexical/biz/stock/snapshot-renderer.tsx'

import { useWebHost } from '~/hooks/common/use-web-host'

import { mockBarsResult, mockQuote } from './_mock'

const RANGE_LABEL = 'Jun 24 – Jun 25, 2026'

export default function StockDemoPage() {
  const host = useWebHost()

  return (
    <HostProvider host={host}>
      <div className="min-h-screen">
        <div className="mx-auto max-w-3xl space-y-16 p-8 pt-16">
          <header className="space-y-2">
            <div className="text-neutral-7 text-[11px] tracking-[0.18em] uppercase">
              dev / stock-demo
            </div>
            <h1 className="text-neutral-9 text-2xl font-semibold">
              Stock Renderers Demo
            </h1>
            <p className="text-neutral-7 text-sm">
              Fixture data · no network · lightweight-charts
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="text-neutral-7 text-[13px] tracking-[0.06em] uppercase">
              Snapshot — AAPL
            </h2>
            <SnapshotCard quote={mockQuote} />
          </section>

          <section className="space-y-4">
            <h2 className="text-neutral-7 text-[13px] tracking-[0.06em] uppercase">
              Frozen K-line
            </h2>
            <KLineCard
              bars={mockBarsResult.bars}
              interval="1h"
              isDark={host.theme === 'dark'}
              locale={host.locale}
              meta={mockBarsResult.meta}
              rangeLabel={RANGE_LABEL}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-neutral-7 text-[13px] tracking-[0.06em] uppercase">
              Invalid symbol — NOTAREAL
            </h2>
            <StockKLineSkeleton message="Symbol not found" symbol="NOTAREAL" />
          </section>
        </div>
      </div>
    </HostProvider>
  )
}
