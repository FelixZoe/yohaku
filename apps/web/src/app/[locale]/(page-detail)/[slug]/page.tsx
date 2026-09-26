import { PageActionAside } from '~/components/modules/page/PageActionAside'
import { ArticleRightAside } from '~/components/modules/shared/ArticleRightAside'
import { ReadIndicatorForMobile } from '~/components/modules/shared/ReadIndicator'
import { Signature } from '~/components/modules/shared/Signature'
import { LayoutRightSidePortal } from '~/providers/shared/LayoutRightSideProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'

import { getData } from './api'
import { EquipmentPage } from './EquipmentPage'
import { PageContent } from './PageContent'
import {
  FocusReadingEffect,
  MarkdownImageRecordProviderInternal,
  MarkdownSelection,
} from './pageExtra'

export default async function PageDetail({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  const { data } = await getData(slug, locale)

  return (
    <WrappedElementProvider eoaDetect>
      <ReadIndicatorForMobile />
      <FocusReadingEffect />
      <MarkdownImageRecordProviderInternal>
        <MarkdownSelection>
          {data.meta?.style === 'equipment' ? (
            <EquipmentPage />
          ) : (
            <PageContent contentFormat={data.contentFormat} />
          )}
        </MarkdownSelection>
      </MarkdownImageRecordProviderInternal>
      <Signature />
      <LayoutRightSidePortal>
        <div className="yohaku-fadeable sticky top-[120px] transition-[opacity,filter] duration-[var(--yohaku-side-fade-ms)] ease-out">
          <ArticleRightAside tocFooterSlot={<PageActionAside />} />
        </div>
      </LayoutRightSidePortal>
    </WrappedElementProvider>
  )
}
