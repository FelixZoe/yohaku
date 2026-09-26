import { ClientOnly } from '~/components/common/ClientOnly'
import { ScrollTop } from '~/components/common/ScrollTop'
import { FABContainer } from '~/components/ui/fab'

import { Content } from '../content/Content'
import { Footer } from '../footer'
import type { FooterConfig } from '../footer/config'
import { Header } from '../header'
import { RootDataAttributeBinder } from './RootDataAttributeBinder'

export const Root: Component<{ footerConfig?: FooterConfig }> = ({
  children,
  footerConfig,
}) => (
  <>
    <Header />
    <Content>{children}</Content>

    <Footer footerConfig={footerConfig} />
    <ClientOnly>
      <ScrollTop />
      <FABContainer />
      <RootDataAttributeBinder />
    </ClientOnly>
  </>
)
