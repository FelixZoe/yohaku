import { DrawerLab, FadeLab, IconLab, PopoverLab, WaitLab } from './_enter'
import { findings, verdictLabel } from './_findings'
import { BracketLab, HeightLab, ListLab, PathLab, WidthLab } from './_layout'

export default function AnimateViewDemoPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-10">
        <p className="mb-3 font-mono text-caption-10 uppercase tracking-[0.3em] text-neutral-6">
          motion/react-animate-view
        </p>
        <h1 className="text-display-36 font-medium tracking-tight text-neutral-10">
          AnimateView
        </h1>
        <p className="mt-4 max-w-prose text-copy-14 leading-[1.8] text-neutral-7">
          左边是业务里的 AnimatePresence，右边用 AnimateView
          走同一次触发，状态更新包在 startTransition
          里。节点在视口内才会有自己的层。UserAuth
          那层一直挂着，子节点不卸载，没有进出场可换。
        </p>
      </header>

      <ol className="mb-4">
        {findings.map((item) => (
          <li className="border-b border-neutral-3" key={item.id}>
            <a
              className="flex items-baseline gap-x-6 py-3"
              href={`#${item.id}`}
            >
              <span className="w-12 shrink-0 font-mono text-caption-10 uppercase tracking-[0.16em] text-neutral-5">
                {verdictLabel[item.verdict]}
              </span>
              <span className="min-w-0">
                <span className="text-copy-14 text-neutral-9">
                  {item.title}
                </span>
                <span className="mt-1 block truncate text-copy-13 text-neutral-6">
                  {item.source}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>

      <FadeLab />
      <PopoverLab />
      <DrawerLab />
      <HeightLab />
      <WidthLab />
      <WaitLab />
      <IconLab />
      <PathLab />
      <ListLab />
      <BracketLab />
    </div>
  )
}
