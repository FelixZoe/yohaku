'use client'

import type { MouseEvent } from 'react'
import { useState } from 'react'

import type { PeekOrigin } from '~/components/modules/peek/peek-motion'
import { readPeekOrigin } from '~/components/modules/peek/peek-motion'
import { PeekModal } from '~/components/modules/peek/PeekModal'
import { usePeek } from '~/components/modules/peek/usePeek'
import { useModalStack } from '~/components/ui/modal'

import { FakeArticle, FakeReader, FakeSheet } from './_bodies'

const linkClass =
  'border-b border-neutral-4 pb-px text-neutral-10 transition-colors hover:border-accent hover:text-accent'

const buttonClass =
  'border border-neutral-4 px-4 py-2 text-copy-13 text-neutral-8 transition-colors hover:border-neutral-6 hover:text-neutral-10'

const articleModal = (origin?: PeekOrigin) =>
  function PeekArticleModal() {
    return (
      <PeekModal origin={origin}>
        <FakeArticle />
      </PeekModal>
    )
  }

const readerModal = (origin: PeekOrigin) =>
  function PeekReaderModal() {
    return (
      <PeekModal controls={false} origin={origin} size="max">
        <FakeReader />
      </PeekModal>
    )
  }

const baseProps = {
  clickOutsideToDismiss: true,
  overlay: true,
  content: () => null,
}

export default function PeekModalDemoPage() {
  const { present } = useModalStack()
  const peek = usePeek()
  const [path, setPath] = useState('/notes/1')
  const [note, setNote] = useState('')

  const openText = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    const origin = readPeekOrigin(event.currentTarget, 'text')
    present({
      ...baseProps,
      title: 'Peek · text origin',
      modalContainerClassName:
        'scrollbar-none flex justify-center overflow-hidden px-2 lg:p-0',
      CustomModalComponent: articleModal(origin),
    })
  }

  const openCard = (event: MouseEvent<HTMLElement>) => {
    const origin = readPeekOrigin(event.currentTarget, 'card')
    present({
      ...baseProps,
      title: 'Peek · card origin',
      modalContainerClassName:
        'scrollbar-none flex justify-center overflow-hidden',
      CustomModalComponent: readerModal(origin),
    })
  }

  const openSeam = () => {
    present({
      ...baseProps,
      title: 'Peek · no origin',
      modalContainerClassName:
        'scrollbar-none flex justify-center overflow-hidden px-2 lg:p-0',
      CustomModalComponent: articleModal(),
    })
  }

  return (
    <div className="mx-auto max-w-3xl pb-32">
      <p className="mb-2 text-caption-10 uppercase tracking-[0.2em] text-neutral-6">
        dev-demos
      </p>
      <h1 className="mb-3 text-title-28 font-semibold text-neutral-10">
        Peek modal
      </h1>
      <p className="mb-12 text-copy-14 text-neutral-7">
        三种入场机制各自的触发点。前三节用本地假内容，不走网络；最后一节打真实
        pipeline。开系统「减弱动态效果」后应全部退化为 160ms 淡入。
      </p>

      <section className="mb-14">
        <h2 className="mb-1 text-copy-16 font-medium text-neutral-9">
          甲 · 文字来源
        </h2>
        <p className="mb-5 text-copy-13 text-neutral-7">
          transform FLIP，无补偿。正文头 300ms 是横向拉伸态。
        </p>
        <p className="text-copy-15 leading-loose text-neutral-9">
          点这个{' '}
          <a className={linkClass} href="#" onClick={openText}>
            短链接
          </a>
          ，或者点这个刻意写得很长、长到一定会在某处折行的{' '}
          <a className={linkClass} href="#" onClick={openText}>
            跨行链接：动画必须从它第一行的矩形出发而不是横跨两行的联合矩形
          </a>
          ，两者的起点矩形应该都贴着文字本身。
        </p>
      </section>

      <section className="mb-14">
        <h2 className="mb-1 text-copy-16 font-medium text-neutral-9">
          乙 · 卡片来源
        </h2>
        <p className="mb-5 text-copy-13 text-neutral-7">
          第 1 页等比放大到位（零形变），外框裁开，顶栏 45% 落下，胶片轨 55%
          滑入到 0.45，其余页错峰浮起。size=max，控制钮交给内容自己出。
        </p>
        <button
          className="relative block w-full max-w-md overflow-hidden bg-neutral-2 text-left ring-1 ring-neutral-4"
          type="button"
          onClick={openCard}
        >
          <div className="max-h-96 overflow-hidden">
            <FakeSheet page={1} />
          </div>
          <div className="from-neutral-2 pointer-events-none absolute inset-x-0 bottom-0 flex h-28 items-end justify-center bg-gradient-to-t from-20% to-transparent pb-3">
            <span className="text-copy-13 font-medium text-neutral-7">
              查看更多
            </span>
          </div>
        </button>
      </section>

      <section className="mb-14">
        <h2 className="mb-1 text-copy-16 font-medium text-neutral-9">
          丙 · 无来源
        </h2>
        <p className="mb-5 text-copy-13 text-neutral-7">
          socket 推送走的路径。视口中心 240×2 短缝，先竖后横。
        </p>
        <button className={buttonClass} type="button" onClick={openSeam}>
          从中心展开
        </button>
      </section>

      <section>
        <h2 className="mb-1 text-copy-16 font-medium text-neutral-9">
          真实 pipeline
        </h2>
        <p className="mb-5 text-copy-13 text-neutral-7">
          走 usePeek，需要本地有对应内容。不可 peek 的路径会返回 false。
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-neutral-4 bg-transparent px-3 py-2 text-copy-13 text-neutral-9 outline-none focus:border-accent"
            value={path}
            onChange={(event) => setPath(event.target.value)}
          />
          <button
            className={buttonClass}
            type="button"
            onClick={(event) => {
              const origin = readPeekOrigin(event.currentTarget, 'text')
              setNote(peek(path, origin) ? '' : '这个路径不可 peek，会正常跳页')
            }}
          >
            peek
          </button>
        </div>
        {note && <p className="mt-3 text-copy-13 text-warning">{note}</p>}
      </section>
    </div>
  )
}
