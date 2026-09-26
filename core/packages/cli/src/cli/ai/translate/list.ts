import { Command, Options } from '@effect/cli'
import { Effect, Option } from 'effect'

import { Ai } from '../../../services/Ai'
import { Renderer } from '../../../services/Renderer'

const page = Options.integer('page').pipe(Options.optional)
const size = Options.integer('size').pipe(Options.optional)
const search = Options.text('search').pipe(
  Options.optional,
  Options.withDescription('filter by article title'),
)

const unwrap = <A>(value: Option.Option<A>): A | undefined =>
  Option.getOrUndefined(value)

export const list = Command.make(
  'list',
  { page, size, search },
  ({ page, size, search }) =>
    Effect.gen(function* () {
      const ai = yield* Ai
      const renderer = yield* Renderer
      const res = yield* ai.listTranslations({
        page: unwrap(page),
        size: unwrap(size),
        grouped: true,
        search: unwrap(search),
      })
      yield* renderer.emitSuccess(res)
    }),
).pipe(Command.withDescription('list AI translations (grouped by article)'))
