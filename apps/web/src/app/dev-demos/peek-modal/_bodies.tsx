'use client'

import { clsx } from 'clsx'

const lineWidths = [
  '96%',
  '88%',
  '92%',
  '74%',
  '90%',
  '85%',
  '61%',
  '94%',
  '89%',
  '78%',
]

export const Lines = ({ count, dense }: { count: number; dense?: boolean }) => (
  <div className={clsx('flex flex-col', dense ? 'gap-1.5' : 'gap-2.5')}>
    {Array.from({ length: count }, (_, index) => (
      <div
        className="h-1.5 rounded-full bg-neutral-3"
        key={index}
        style={{ width: lineWidths[index % lineWidths.length] }}
      />
    ))}
  </div>
)

export const FakeSheet = ({ page }: { page: number }) => (
  <div className="aspect-[1/1.414] bg-neutral-1 p-[8%]">
    {page === 1 && (
      <p className="mb-[6%] text-title-20 font-semibold text-neutral-10">
        缝隙生长：为什么不是缩放
      </p>
    )}
    <Lines dense count={page === 1 ? 12 : 16} />
    <p className="mt-[5%] text-center text-caption-10 text-neutral-5">{page}</p>
  </div>
)

export const FakeArticle = () => (
  <div className="bg-paper mx-auto max-w-[42rem] px-8 py-14">
    <p className="mb-2 text-caption-10 uppercase tracking-[0.2em] text-neutral-6">
      2026-08-25 · 随便想想
    </p>
    <h2 className="mb-8 text-display-36 font-semibold leading-tight text-neutral-10">
      动的是裁切框，不是内容
    </h2>
    <div className="flex flex-col gap-8">
      <Lines count={9} />
      <Lines count={7} />
      <div className="border-l-2 border-accent/45 py-1 pl-5">
        <Lines count={3} />
      </div>
      <Lines count={11} />
      <Lines count={8} />
      <Lines count={13} />
    </div>
  </div>
)

export const FakeReader = ({ pages = 8 }: { pages?: number }) => (
  <div className="bg-paper flex h-full min-h-0 flex-col">
    <header
      className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-2.5"
      data-peek-chrome="head"
    >
      <span className="min-w-0 flex-1 truncate text-copy-13 text-neutral-8">
        年度技术选型回顾.pdf
      </span>
      <span className="shrink-0 text-label-12 tabular-nums text-neutral-6">
        1 / {pages}
      </span>
    </header>

    <div className="flex min-h-0 flex-1">
      <div
        className="scrollbar-none flex w-[84px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-neutral-3 px-2.5 pb-10 pt-3.5 opacity-45"
        data-peek-chrome="rail"
      >
        {Array.from({ length: pages }, (_, index) => (
          <div key={index}>
            <div
              className={clsx(
                'overflow-hidden ring-1',
                index === 0 ? 'ring-accent' : 'ring-neutral-4',
              )}
            >
              <FakeSheet page={index + 1} />
            </div>
            <span
              className={clsx(
                'mt-1 block text-caption-10 tabular-nums',
                index === 0 ? 'text-accent' : 'text-neutral-6',
              )}
            >
              {index + 1}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-14 pt-6">
        <div className="mx-auto flex max-w-[44rem] flex-col gap-5">
          {Array.from({ length: pages }, (_, index) => (
            <div
              className="overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-neutral-4"
              data-peek-hero={index === 0 ? '' : undefined}
              data-peek-stagger=""
              key={index}
            >
              <FakeSheet page={index + 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)
