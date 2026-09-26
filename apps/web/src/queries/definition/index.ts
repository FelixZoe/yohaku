import { activity } from './activity'
import type { NoteWrappedPayloadWithMeta } from './note'
import { note } from './note'
import { page } from './page'
import type { PostWithTranslation, SkillBundleView } from './post'
import { post } from './post'
import { tts } from './tts'

export type { NoteWrappedPayloadWithMeta, PostWithTranslation, SkillBundleView }

export const queries = {
  note,
  post,
  page,
  activity,
  tts,
}
