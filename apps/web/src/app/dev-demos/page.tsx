import { DemoIndex } from './_components/demo-index'

export default function DevIndexPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-12">
        <p className="mb-3 flex items-center gap-x-2 font-mono text-caption-10 uppercase tracking-[0.3em] text-neutral-6">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-accent"
          />
          yohaku · /dev-demos
        </p>
        <h1 className="text-display-36 font-medium tracking-tight text-neutral-10">
          Demo index
        </h1>
        <p className="mt-4 max-w-prose text-copy-14 leading-[1.8] text-neutral-7">
          离线演示区。此段不挂任何业务 provider，不读 aggregation， 断开 mx-core
          也能整段跑通 —— 组件在这里只对着 fixtures 说话。
        </p>
      </header>

      <DemoIndex />
    </div>
  )
}
