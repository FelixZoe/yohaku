'use client'

import { useTranslations } from 'next-intl'

import { toast } from '~/lib/toast'

export const CopyPromptButton = ({ name }: { name: string }) => {
  const t = useTranslations('post')

  const handleCopy = async () => {
    const url = `${location.origin}/skills/${encodeURIComponent(name)}/SKILL.md`
    const prompt = `${t('skill_prompt_text', { url })}\n\n`
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success(t('skill_copied'))
    } catch {
      toast.info(t('skill_copy_fallback'))
    }
  }

  return (
    <button
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-accent/30 px-3.5 py-1.5 text-label-12 text-accent transition-colors hover:border-accent/60 hover:bg-accent/10"
      type="button"
      onClick={handleCopy}
    >
      <i aria-hidden className="i-mingcute-magic-2-line text-copy-13" />
      {t('skill_copy_prompt')}
    </button>
  )
}
