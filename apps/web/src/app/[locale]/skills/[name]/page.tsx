import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MainMarkdown } from '~/components/ui/markdown'
import type { Locale } from '~/i18n/config'
import { computeSkillOgVersion, getSkillOgUrl } from '~/lib/helper.server'
import { buildPageMetadata } from '~/lib/seo/metadata.server'
import { fetchSkill } from '~/lib/skill.server'
import { stripLeadingHeading } from '~/lib/skill-frontmatter'

import { CopyPromptButton } from './CopyPromptButton'

interface PageProps {
  params: Promise<{ name: string; locale: string }>
}

const REWRITABLE_LINK =
  /(\[[^\]]*\]\(\s*)((?![a-z][\d+.a-z-]*:|[#/<])[^\s)]+)/gi
const REWRITABLE_IMAGE =
  /(!\[[^\]]*\]\(\s*)((?![a-z][\d+.a-z-]*:|[#/<])[^\s)]+)/gi

const rewriteRelativeAssets = (body: string, name: string) => {
  const base = `/skills/${encodeURIComponent(name)}/`
  const resolve = (target: string) => {
    const cleaned = target.replace(/^\.\//, '')
    const parts = cleaned.split('/').filter(Boolean)
    return base + parts.map(encodeURIComponent).join('/')
  }
  return body
    .replaceAll(
      REWRITABLE_IMAGE,
      (_m, head, target) => `${head}${resolve(target)}`,
    )
    .replaceAll(
      REWRITABLE_LINK,
      (_m, head, target) => `${head}${resolve(target)}`,
    )
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name, locale } = await params
  const skill = await fetchSkill(name)
  if (!skill) return { title: name }

  const title = skill.name ?? name
  // Skills are never translated, so every locale route serves the same body.
  // Pinning canonical to the unprefixed path keeps the five variants from
  // competing as duplicate content.
  const path = `/skills/${encodeURIComponent(name)}`
  const ogImage = await getSkillOgUrl(
    name,
    computeSkillOgVersion(title, skill.description),
  )

  const metadata = await buildPageMetadata({
    locale: locale as Locale,
    path,
    title,
    description: skill.description,
    og: { image: ogImage.toString(), type: 'article' },
  })

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: path,
      languages: { 'x-default': path },
    },
  }
}

export default async function SkillPage({ params }: PageProps) {
  const { name } = await params
  const skill = await fetchSkill(name)
  if (!skill) notFound()

  const title = skill.name ?? name
  const renderedBody = rewriteRelativeAssets(
    stripLeadingHeading(skill.body),
    name,
  )

  return (
    <div className="relative m-auto mt-[120px] min-h-[300px] w-full max-w-5xl px-2 md:px-6 lg:p-0">
      <header className="mb-10 px-4 md:px-0">
        <div className="mb-3 text-label-12 uppercase tracking-wide text-accent">
          AI Skill
        </div>
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 md:text-display-36">
          {title}
        </h1>
        {skill.description && (
          <p className="mt-4 text-copy-16 leading-relaxed text-neutral-8">
            {skill.description}
          </p>
        )}
        <div className="mt-6">
          <CopyPromptButton name={name} />
        </div>
      </header>

      <article className="prose">
        <MainMarkdown
          allowsScript
          className="min-w-0 overflow-hidden"
          value={renderedBody}
        />
      </article>

      <footer className="mt-16 border-t border-neutral-4 px-4 pt-6 text-label-12 text-neutral-7 md:px-0">
        <a
          className="hover:text-accent"
          href={`/skills/${encodeURIComponent(name)}/SKILL.md`}
          rel="noopener noreferrer"
          target="_blank"
        >
          View raw markdown →
        </a>
      </footer>
    </div>
  )
}
