'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'

import { NothingFound } from '~/components/modules/shared/NothingFound'
import { FullPageLoading } from '~/components/ui/loading'
import { apiClient } from '~/lib/request'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { buildScrambleFrame } from './text-scramble'

interface ProjectItem {
  createdAt?: string
  description?: string
  id: string
  name: string
  projectUrl?: string
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}.${m}`
}

const SCRAMBLE_FRAME_COUNT = 6
const SCRAMBLE_FRAME_INTERVAL_MS = 50

const ScrambleText: FC<{ text: string; delay?: number }> = ({
  text,
  delay = 0,
}) => {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          timer = setTimeout(() => setStarted(true), delay)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [delay])

  useEffect(() => {
    if (!started) return

    if (!text) {
      setDisplayed('')
      return
    }

    let frame = 1
    setDisplayed(buildScrambleFrame(text))

    const interval = setInterval(() => {
      if (frame >= SCRAMBLE_FRAME_COUNT) {
        setDisplayed(text)
        clearInterval(interval)
        return
      }

      frame += 1
      setDisplayed(buildScrambleFrame(text))
    }, SCRAMBLE_FRAME_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [started, text])

  return (
    <span className="text-copy-14 font-medium text-neutral-9" ref={ref}>
      {started ? displayed : <span className="invisible">{text}</span>}
    </span>
  )
}

export default function Page() {
  const t = useTranslations('projects')
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      return await apiClient.project.getAll()
    },
  })

  const githubUsername = useAggregationSelector(
    (state) => state.user?.socialIds?.github,
  )

  if (isLoading) {
    return <FullPageLoading />
  }

  if (!data || data.length === 0) return <NothingFound />

  const projects = data as ProjectItem[]
  const mid = Math.ceil(projects.length / 2)
  const leftCol = projects.slice(0, mid)
  const rightCol = projects.slice(mid)

  return (
    <div className="mt-10 font-mono">
      <header className="mb-8 flex items-baseline gap-3">
        <span className="text-label-12 tracking-[2px] text-neutral-6">
          {t('page_title').toUpperCase()}
        </span>
        {githubUsername && (
          <>
            <span className="text-label-12 text-neutral-6">—</span>
            <a
              className="text-label-12 text-neutral-6 transition-colors hover:text-accent"
              href={`https://github.com/${githubUsername}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              github.com/{githubUsername} ↗
            </a>
          </>
        )}
      </header>

      <main>
        {/* Desktop: 2 columns */}
        <div className="hidden gap-14 lg:grid lg:grid-cols-2">
          <ProjectColumn baseDelay={0} items={leftCol} />
          <ProjectColumn baseDelay={leftCol.length * 80} items={rightCol} />
        </div>

        {/* Mobile: 1 column */}
        <div className="lg:hidden">
          <ProjectColumn baseDelay={0} items={projects} />
        </div>
      </main>

      <footer className="mt-7 border-t border-neutral-2 pt-3 text-right text-label-12 text-neutral-6">
        {projects.length} projects
      </footer>
    </div>
  )
}

const ProjectColumn: FC<{
  items: ProjectItem[]
  baseDelay: number
}> = ({ items, baseDelay }) => (
  <div>
    {items.map((project, i) => (
      <ProjectRow
        delay={baseDelay + i * 80}
        isLast={i === items.length - 1}
        key={project.id}
        project={project}
      />
    ))}
  </div>
)

const ProjectRow: FC<{
  project: ProjectItem
  delay: number
  isLast: boolean
}> = ({ project, delay, isLast }) => {
  const handleClick = () => {
    if (project.projectUrl) {
      window.open(project.projectUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className={`group -mx-3 rounded-md px-3 py-3 transition-colors hover:bg-accent/6 ${!isLast ? 'mb-4 border-b border-neutral-2' : ''} ${project.projectUrl ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <ScrambleText delay={delay} text={project.name} />
        <span className="ml-auto shrink-0 text-label-12 text-neutral-6">
          {formatDate(project.createdAt)}
        </span>
      </div>
      {project.description && (
        <p className="mt-1.5 text-copy-13 leading-relaxed text-neutral-7 transition-colors group-hover:text-neutral-8">
          {project.description}
        </p>
      )}
    </div>
  )
}
