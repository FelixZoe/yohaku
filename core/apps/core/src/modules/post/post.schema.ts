import { z } from 'zod'

import {
  zArrayUnique,
  zCoerceDate,
  zCoerceInt,
  zEntityId,
  zLang,
  zNonEmptyString,
  zOptionalBoolean,
  zPinDate,
  zPrefer,
} from '~/common/zod'
import { MarkdownToLexicalMigrationDescriptorSchema } from '~/modules/content-migration/content-migration.schema'
import { createPagerSchema } from '~/shared/dto/pager.dto'
import {
  PartialWriteBaseSchema,
  validateLexicalCreateContentPair,
  validateLexicalPartialContentPair,
  WriteBaseSchema,
} from '~/shared/schema'
import { ImageArraySchema } from '~/shared/schema/image.schema'

/**
 * Post schema for API validation
 */
const PostBaseSchema = WriteBaseSchema.extend({
  slug: zNonEmptyString,
  summary: z
    .preprocess((val) => (val === '' ? null : val), z.string().nullable())
    .optional(),
  categoryId: zEntityId,
  copyright: z.boolean().default(true).optional(),
  isPublished: z.boolean().default(true).optional(),
  tags: zArrayUnique(z.string().min(1)).optional(),
  pin: zPinDate,
  pinOrder: z.preprocess(
    (val) => (val === null ? undefined : val),
    zCoerceInt.min(0).optional(),
  ),
  relatedId: z.array(zEntityId).optional(),
  images: ImageArraySchema.optional(),
  isPremium: z.boolean().optional(),
  migration: MarkdownToLexicalMigrationDescriptorSchema.optional(),
})

export const PostSchema = PostBaseSchema.superRefine(
  validateLexicalCreateContentPair,
)

/**
 * Partial post schema for PATCH operations
 * Override fields with .default() to prevent defaults from being applied during partial updates
 *
 * Self-host patch: upstream trimmed this to { categoryId, pinAt } when editing
 * moved to the draft-publish flow, which strips `content`/`text`/`migration`
 * and makes direct PATCH migration commits a silent no-op. Accept the
 * editorial field set that `PostService.updateById` already understands.
 */
export const PartialPostSchema = PartialWriteBaseSchema.extend({
  categoryId: zEntityId.optional(),
  summary: z
    .preprocess((val) => (val === '' ? null : val), z.string().nullable())
    .optional(),
  copyright: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  tags: zArrayUnique(z.string().min(1)).optional(),
  pinAt: zPinDate,
  pinOrder: z.preprocess(
    (val) => (val === null ? undefined : val),
    zCoerceInt.min(0).optional(),
  ),
  isPremium: z.boolean().optional(),
  modifiedAt: zCoerceDate.optional(),
  migration: MarkdownToLexicalMigrationDescriptorSchema.optional(),
}).superRefine(validateLexicalPartialContentPair)

export type PartialPostDto = z.infer<typeof PartialPostSchema>

/**
 * Category and slug params schema
 */
export const CategoryAndSlugSchema = z.object({
  category: z.string(),
  slug: z.preprocess((val) => {
    if (typeof val === 'string') {
      return decodeURI(val)
    }
    return val
  }, z.string()),
})

export type CategoryAndSlugDto = z.infer<typeof CategoryAndSlugSchema>

/**
 * Post detail query schema
 */
export const PostDetailQuerySchema = z.object({
  lang: zLang,
  prefer: zPrefer,
})

export type PostDetailQueryDto = z.infer<typeof PostDetailQuerySchema>

/**
 * Post pager schema
 */
export const PostPagerSchema = createPagerSchema([
  'createdAt',
  'modifiedAt',
  'pinAt',
]).extend({
  truncate: zCoerceInt.optional(),
  categoryIds: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.split(',') : val),
      z.array(zEntityId),
    )
    .optional(),
  excludeAiWritten: zOptionalBoolean,
  lang: zLang,
})

export type PostPagerDto = z.infer<typeof PostPagerSchema>

/**
 * Set post publish status schema
 */
export const SetPostPublishStatusSchema = z.object({
  isPublished: z.boolean(),
})

export type SetPostPublishStatusDto = z.infer<typeof SetPostPublishStatusSchema>
