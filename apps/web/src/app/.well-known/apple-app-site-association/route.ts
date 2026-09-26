import { appleAppSiteAssociationResponse } from '~/lib/apple-app-site-association'

export const dynamic = 'force-static'

export function GET() {
  return appleAppSiteAssociationResponse()
}
