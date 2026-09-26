'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Link } from '~/i18n/navigation'

const DEFAULT_404_DESCRIPTION = '' // Fallback only, should use i18n

interface NotFound404Props {
  children?: React.ReactNode
  description?: string
}

/**
 * 方向三：撕下的便笺 — 从笔记本撕下的一页，和纸胶带、便笺、轻微倾斜
 */
export const NotFound404: React.FC<NotFound404Props> = ({
  children,
  description,
}) => {
  const t = useTranslations('error')
  const [stage, setStage] = useState<'init' | 'note' | 'tape' | 'content'>(
    'init',
  )

  useEffect(() => {
    const t1 = setTimeout(() => setStage('note'), 150)
    const t2 = setTimeout(() => setStage('tape'), 400)
    const t3 = setTimeout(() => setStage('content'), 600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const useTornLines = description === undefined
  const singleParagraph =
    description !== undefined ? description || t('404_description') : null

  return (
    <section className="fill-content relative flex w-full flex-col items-center justify-center overflow-x-hidden overflow-y-visible px-4 py-10 sm:px-8 sm:py-14">
      <div
        className="relative mx-auto max-w-[min(100%,380px)] px-6 pb-14 pt-4 sm:px-8 sm:pb-16 sm:pt-6"
        style={{
          transform: stage !== 'init' ? 'rotate(-1.5deg)' : 'rotate(3deg)',
          transition: 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="absolute top-1 left-1/2 z-10 h-6 w-16 rounded-sm bg-gradient-to-r from-accent/25 via-accent/40 to-accent/25 text-neutral-6 md:top-2 md:h-7 md:w-20"
          style={{
            transform:
              stage === 'tape' || stage === 'content'
                ? 'translateX(-50%) translateY(0) rotate(2deg)'
                : 'translateX(-50%) translateY(-30px) rotate(-5deg)',
            opacity: stage === 'tape' || stage === 'content' ? 1 : 0,
            transition:
              'transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease',
            maskImage:
              'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
          }}
        >
          <div
            className="h-full w-full opacity-40"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 2px, currentColor 2px, currentColor 3px)',
            }}
          />
        </div>

        <div
          className="relative w-[280px] rounded-xl border border-neutral-9/10 bg-[#fefefb] p-6 dark:border-white/[0.08] dark:bg-neutral-2 md:w-[340px] md:p-8"
          style={{
            boxShadow:
              stage !== 'init'
                ? '0 4px 28px rgba(15,15,15,0.07), 0 18px 64px rgba(15,15,15,0.1)'
                : '0 24px 72px rgba(15,15,15,0.14)',
            transform: stage !== 'init' ? 'translateY(0)' : 'translateY(40px)',
            opacity: stage !== 'init' ? 1 : 0,
            transition:
              'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease, box-shadow 700ms ease',
          }}
        >
          <div className="pointer-events-none absolute top-16 right-6 left-6 space-y-6 opacity-[0.08]">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                className="h-px w-full bg-neutral-6/40 dark:bg-neutral-5/30"
                key={`notebook-rule-${i}`}
              />
            ))}
          </div>

          <div className="relative">
            <h1
              className="text-neutral-10 mb-3 font-sans text-display-48 font-semibold tracking-tight md:text-display-48"
              style={{
                transform:
                  stage === 'content' ? 'translateY(0)' : 'translateY(12px)',
                opacity: stage === 'content' ? 1 : 0,
                transition:
                  'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease',
                transitionDelay: '0ms',
              }}
            >
              404
            </h1>

            {useTornLines ? (
              <p
                className="mb-6 font-serif text-copy-14 leading-relaxed text-neutral-7 italic md:text-copy-16 dark:text-neutral-5"
                style={{
                  transform:
                    stage === 'content' ? 'translateY(0)' : 'translateY(12px)',
                  opacity: stage === 'content' ? 1 : 0,
                  transition:
                    'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease',
                  transitionDelay: '80ms',
                }}
              >
                {t('404_torn_line1')}
                <br />
                {t('404_torn_line2')}
              </p>
            ) : (
              <p
                className="mb-6 font-serif text-copy-14 leading-relaxed text-neutral-7 italic md:text-copy-16 dark:text-neutral-5"
                style={{
                  transform:
                    stage === 'content' ? 'translateY(0)' : 'translateY(12px)',
                  opacity: stage === 'content' ? 1 : 0,
                  transition:
                    'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease',
                  transitionDelay: '80ms',
                }}
              >
                {singleParagraph || DEFAULT_404_DESCRIPTION}
              </p>
            )}

            <div
              className="my-6 h-px w-12 bg-accent/45"
              style={{
                transform: stage === 'content' ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                transitionDelay: '200ms',
              }}
            />

            <div
              className="space-y-3"
              style={{
                transform:
                  stage === 'content' ? 'translateY(0)' : 'translateY(12px)',
                opacity: stage === 'content' ? 1 : 0,
                transition:
                  'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease',
                transitionDelay: '280ms',
              }}
            >
              <p className="mb-4 text-caption-10 tracking-[3px] text-neutral-6 uppercase dark:text-neutral-5">
                {t('404_torn_todo')}
              </p>

              <Link className="group flex items-center gap-3" href="/">
                <span className="flex h-4 w-4 items-center justify-center rounded border border-neutral-5 transition-all duration-200 group-hover:translate-y-px group-hover:border-accent group-hover:bg-accent/10 dark:border-neutral-4">
                  <svg
                    className="h-2.5 w-2.5 text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-copy-13 text-neutral-8 transition-all duration-200 group-hover:translate-y-px group-hover:text-neutral-10">
                  {t('404_backHome')}
                </span>
              </Link>

              {children ? (
                <div className="border-neutral-4/35 pt-4 dark:border-neutral-5/25">
                  {children}
                </div>
              ) : null}
            </div>

            <p
              className="mt-10 text-right font-serif text-label-12 text-neutral-7 italic dark:text-neutral-5"
              style={{
                transform:
                  stage === 'content' ? 'translateY(0)' : 'translateY(8px)',
                opacity: stage === 'content' ? 1 : 0,
                transition:
                  'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease',
                transitionDelay: '400ms',
              }}
            >
              {t('404_torn_signature')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
