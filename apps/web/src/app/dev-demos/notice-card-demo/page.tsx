'use client'

import type { FC, ReactNode } from 'react'

import {
  NoticeCard,
  NoticeCardAiFold,
  NoticeCardItem,
  type NoticeCardTone,
} from '~/components/modules/shared/NoticeCard'

const Section: FC<{ title: string; children: ReactNode }> = ({
  title,
  children,
}) => (
  <section className="mb-12">
    <h2 className="mb-1 text-label-12 font-mono uppercase tracking-wider text-neutral-7">
      {title}
    </h2>
    <p className="mb-4 text-copy-13 text-neutral-6">{description(title)}</p>
    <div className="space-y-6">{children}</div>
  </section>
)

const description = (title: string): string => {
  const map: Record<string, string> = {
    '01 · header only': 'icon + title, no body, no action.',
    '02 · header + action': 'icon + title with a right-aligned action chip.',
    '03 · header + body': 'icon + title with body content underneath.',
    '04 · header + action + body': 'full combo — header with action and body.',
    '05 · body only': 'no header, just body content. e.g. translation banner.',
    '06 · tones': 'tone-tinted overlay + tone-colored icon.',
    '07 · multi-row stack':
      'multiple items stacked in one NoticeCard with dividers. Narrow screens fold the AI rows.',
  }
  return map[title] ?? ''
}

const SampleAction = () => (
  <button
    className="inline-flex items-center gap-1 text-label-12 text-accent underline underline-offset-2 transition-opacity hover:opacity-80"
    type="button"
  >
    <i aria-hidden className="i-mingcute-book-2-line text-copy-13" />
    此文有余白
  </button>
)

const SampleBody = () => (
  <p className="text-copy-13 leading-[1.9] text-neutral-7">
    在大型单页应用中，代码分割会引入二级页面首次进入时的串行等待问题。方案将预热分为两类：首屏关键路径通过{' '}
    <code className="rounded bg-neutral-3/60 px-1 py-0.5 font-mono text-copy-12">
      modulepreload
    </code>{' '}
    注入克制版本；二级路由则在页面加载后的空闲期通过运行时脚本分批预热。
  </p>
)

const tones: NoticeCardTone[] = [
  'info',
  'success',
  'warning',
  'error',
  'secondary',
]

const toneIcon: Record<NoticeCardTone, string> = {
  info: 'i-mingcute-information-line',
  success: 'i-mingcute-check-circle-line',
  warning: 'i-mingcute-alert-line',
  error: 'i-mingcute-close-circle-line',
  secondary: 'i-mingcute-quote-left-line',
}

const toneLabel: Record<NoticeCardTone, string> = {
  info: 'info — 提示信息',
  success: 'success — 操作完成',
  warning: 'warning — 注意事项',
  error: 'error — 出现问题',
  secondary: 'secondary — 引用片段',
}

export default function NoticeCardDemoPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-10">
        <h1 className="mb-2 text-display-24 font-bold">NoticeCard demo</h1>
        <p className="text-copy-13 text-neutral-7">
          所有 NoticeCardItem 组合预览。变量已去除 —— 容器统一渐染，items 仅靠
          icon / title / action / tone props 拼装。
        </p>
      </header>

      <Section title="01 · header only">
        <NoticeCard>
          <NoticeCardItem icon="i-mingcute-sparkles-line" title="关键洞察" />
        </NoticeCard>
      </Section>

      <Section title="02 · header + action">
        <NoticeCard>
          <NoticeCardItem
            action={<SampleAction />}
            icon="i-mingcute-sparkles-line"
            title="关键洞察"
          />
        </NoticeCard>
      </Section>

      <Section title="03 · header + body">
        <NoticeCard>
          <NoticeCardItem icon="i-mingcute-sparkles-line" title="关键洞察">
            <SampleBody />
          </NoticeCardItem>
        </NoticeCard>
      </Section>

      <Section title="04 · header + action + body">
        <NoticeCard>
          <NoticeCardItem
            action={<SampleAction />}
            icon="i-mingcute-sparkles-line"
            title="关键洞察"
          >
            <SampleBody />
          </NoticeCardItem>
        </NoticeCard>
      </Section>

      <Section title="05 · body only">
        <NoticeCard>
          <NoticeCardItem>
            <div className="flex items-center justify-between text-label-12 text-neutral-7">
              <div className="flex items-center gap-2">
                <span className="opacity-60">
                  <i className="i-mingcute-globe-line text-copy-14" />
                </span>
                <span>此文为 AI 翻译，可切换原文。</span>
              </div>
              <button className="text-accent underline underline-offset-2">
                查看原文
              </button>
            </div>
          </NoticeCardItem>
        </NoticeCard>
      </Section>

      <Section title="06 · tones">
        {tones.map((tone) => (
          <NoticeCard key={tone}>
            <NoticeCardItem
              icon={toneIcon[tone]}
              title={toneLabel[tone]}
              tone={tone}
            />
          </NoticeCard>
        ))}
      </Section>

      <Section title="07 · multi-row stack">
        <NoticeCard>
          <NoticeCardItem
            icon="i-mingcute-alert-line"
            title="此文已逾 60 日未更新，部分内容或失时效。"
            tone="warning"
          />
          <NoticeCardItem icon="i-mingcute-link-2-line" title="相关文章">
            <div className="space-y-1.5">
              {['Rspack 集成实录', 'Next.js 16 升级笔记'].map((t) => (
                <div className="flex items-center gap-1.5" key={t}>
                  <span className="text-neutral-5">
                    <i className="i-mingcute-corner-down-left-line scale-x-[-1] text-copy-13" />
                  </span>
                  <a
                    className="text-copy-13 text-neutral-8 transition-colors hover:text-accent"
                    href="#"
                  >
                    {t}
                  </a>
                </div>
              ))}
            </div>
          </NoticeCardItem>
          <NoticeCardItem>
            <div className="flex items-center justify-between text-label-12 text-neutral-7">
              <div className="flex items-center gap-2">
                <span className="opacity-60">
                  <i className="i-mingcute-globe-line text-copy-14" />
                </span>
                <span>此文为 AI 翻译，可切换原文。</span>
              </div>
              <button className="text-accent underline underline-offset-2">
                查看原文
              </button>
            </div>
          </NoticeCardItem>
          <NoticeCardAiFold chips={['关键洞察', 'AI 技能']}>
            <NoticeCardItem
              action={<SampleAction />}
              icon="i-mingcute-sparkles-line"
              title="关键洞察"
            >
              <SampleBody />
            </NoticeCardItem>
            <NoticeCardItem icon="i-mingcute-sparkles-line" title="AI 技能">
              <p className="mb-2.5 text-label-12 leading-relaxed text-neutral-6">
                把下方 Skill 交给 AI，即可让它复现这篇文章所描述的方案。
              </p>
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 text-neutral-5">
                  <i className="i-mingcute-corner-down-left-line scale-x-[-1] text-copy-13" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-copy-13 text-neutral-9">
                      vite-route-prewarm
                    </span>
                    <button className="inline-flex shrink-0 items-center gap-1 text-label-12 text-accent underline underline-offset-2">
                      <i
                        aria-hidden
                        className="i-mingcute-magic-2-line text-copy-13"
                      />
                      让 AI 帮我做
                    </button>
                  </div>
                  <div className="mt-0.5 text-label-12 leading-relaxed text-neutral-7">
                    Use when a large Vite SPA finishes first paint fast but hot
                    secondary-route navigation still pays a serial chunk
                    request.
                  </div>
                </div>
              </div>
            </NoticeCardItem>
          </NoticeCardAiFold>
        </NoticeCard>
      </Section>
    </div>
  )
}
