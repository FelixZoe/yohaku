const YOHAKU_IOS_APP_ID = 'KAMM5N88X3.in.innei'

export const appleAppSiteAssociation = {
  applinks: {
    details: [
      {
        appIDs: [YOHAKU_IOS_APP_ID],
        components: [
          { '/': '/posts/*' },
          { '/': '/notes/*' },
          { '/': '/*/posts/*' },
          { '/': '/*/notes/*' },
        ],
      },
    ],
  },
} as const

export function appleAppSiteAssociationResponse(): Response {
  return new Response(JSON.stringify(appleAppSiteAssociation), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
