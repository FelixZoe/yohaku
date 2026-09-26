import type { GenericEvent, RequestWithJSONBody } from '@mx-space/webhook'
import {
  BusinessEvents,
  InvalidSignatureError,
  readDataFromRequest,
} from '@mx-space/webhook'
import type { NextRequest } from 'next/server'

import { NextServerResponse } from '~/lib/edge-function.server'

import {
  revalidateAggregatePaths,
  revalidateContentPaths,
} from './revalidate-aggregate'

const aggregateRevalidateEvents = new Set([
  BusinessEvents.NOTE_CREATE,
  BusinessEvents.NOTE_DELETE,
  BusinessEvents.NOTE_UPDATE,
  'note.republish',
  'note.unpublish',
  BusinessEvents.POST_CREATE,
  BusinessEvents.POST_UPDATE,
  BusinessEvents.POST_DELETE,
  'post.republish',
  'post.unpublish',
  BusinessEvents.PAGE_CREATE,
  BusinessEvents.PAGE_UPDATE,
  BusinessEvents.PAGE_DELETE,
  BusinessEvents.SAY_CREATE,
  BusinessEvents.SAY_UPDATE,
  BusinessEvents.SAY_DELETE,
  BusinessEvents.RECENTLY_CREATE,
  BusinessEvents.RECENTLY_UPDATE,
  BusinessEvents.RECENTLY_DELETE,
  BusinessEvents.AGGREGATE_UPDATE,
])

export const POST = async (nextreq: NextRequest) => {
  const secret = process.env.WEBHOOK_SECRET
  const res = new NextServerResponse()
  if (!secret) return res.status(500).send('WEBHOOK_SECRET is not set')
  const req: RequestWithJSONBody = nextreq.clone() as any
  const headers = {} as Record<string, string>
  for (const [key, value] of req.headers.entries()) {
    headers[key] = value
  }

  try {
    const event = await readDataFromRequest({
      req: {
        ...req,
        headers: headers as any,
        body: await req.json(),
      } as any,
      secret,
    })

    const { type } = event

    switch (type) {
      case 'health_check': {
        return res.status(200).send('OK')
      }
      default: {
        if (aggregateRevalidateEvents.has(type)) {
          // Revalidate listing pages (home, /posts, /notes, etc.)
          const aggregateResult = await revalidateAggregatePaths()

          // Also revalidate the specific content detail page
          const contentResult = await revalidateContentPaths(
            event as GenericEvent,
          )

          const allRevalidated = [
            ...aggregateResult.revalidated,
            ...contentResult.revalidated,
          ]
          const allFailed = [...aggregateResult.failed, ...contentResult.failed]

          return res.status(200).json({
            ok: allFailed.length === 0,
            event: type,
            revalidated: allRevalidated,
            failed: allFailed,
            count: allRevalidated.length,
          })
        }

        return res.status(200).send('MISS')
      }
    }
  } catch (err) {
    if (err instanceof InvalidSignatureError) {
      return res.status(400).send(err.message)
    } else {
      console.error(err)
      return res
        .status(500)
        .send('An error occurred while processing the request')
    }
  }
}
