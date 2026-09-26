'use client'

import { useEffect, useState } from 'react'
import { SlotText as RawSlotText } from 'slot-text/react'

import { SlotText } from '~/components/ui/slot-text'

const btn =
  'rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4'

const Row = ({ label, text }: { label: string; text: string }) => (
  <div className="grid grid-cols-[6rem_1fr_1fr] items-baseline gap-x-6 border-b border-neutral-3 py-4">
    <span className="font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
      {label}
    </span>
    <span className="text-2xl tabular-nums">
      <SlotText text={text} />
    </span>
    <span className="text-2xl tabular-nums text-neutral-6">
      <RawSlotText text={text} />
    </span>
  </div>
)

export default function SlotTextDemoPage() {
  const [count, setCount] = useState(1024)
  const [copied, setCopied] = useState(false)
  const [ticking, setTicking] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!ticking) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [ticking])

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">SlotText</h1>
      <p className="mb-8 text-sm text-neutral-7">
        左列为 numericText 风（无回弹、按数值定向、淡入淡出），右列为 slot-text
        原版。
      </p>

      <Row label="counter" text={String(count)} />
      <Row label="price" text={`¥${(count / 100).toFixed(2)}`} />
      <Row label="clock" text={clock} />
      <Row label="label" text={copied ? 'Copied' : 'Copy'} />

      <div className="mt-8 flex flex-wrap gap-2">
        <button className={btn} onClick={() => setCount((c) => c + 1)}>
          +1
        </button>
        <button className={btn} onClick={() => setCount((c) => c - 1)}>
          −1
        </button>
        <button className={btn} onClick={() => setCount((c) => c + 137)}>
          +137
        </button>
        <button className={btn} onClick={() => setCount((c) => c * 10)}>
          ×10
        </button>
        <button
          className={btn}
          onClick={() => setCount(Math.floor(Math.random() * 100_000))}
        >
          random
        </button>
        <button className={btn} onClick={() => setTicking((t) => !t)}>
          {ticking ? 'stop clock' : 'start clock'}
        </button>
        <button className={btn} onClick={() => setCopied((c) => !c)}>
          toggle label
        </button>
      </div>
    </div>
  )
}
