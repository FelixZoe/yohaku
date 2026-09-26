'use client'

import '@yohaku/rich-content/module-imports'
import 'katex/dist/katex.min.css'

import type { PollDataAdapter } from '@haklex/rich-compose/modules/poll'
import { PollDataProvider } from '@haklex/rich-compose/modules/poll'
import type { RichEditorVariant } from '@haklex/rich-editor'
import { type HostCapabilities, HostProvider } from '@yohaku/rich-content/host'
import {
  createYohakuLexicalRenderer,
  imageClickCaptureHolder,
  nestedDocExpandHolder,
  REGISTERED_NODE_TYPES,
} from '@yohaku/rich-content/lexical'
import { useMarkInk } from '@yohaku/rich-content/src/lexical/portable/ink.ts'
import { sanitizeEditorState } from '@yohaku/rich-content/src/lexical/sanitize.ts'
import {
  baseFontVarStyle,
  createYohakuThemeStyle,
} from '@yohaku/rich-content/src/lexical/theme.ts'
import clsx from 'clsx'
import type { SerializedEditorState } from 'lexical'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { Paper } from '~/components/layout/container/Paper'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { PeekModal } from '~/components/modules/peek/PeekModal'
import { CodeBlockRender } from '~/components/modules/shared/CodeBlock'
import { InlineLinkAnchor } from '~/components/ui/link-card/InlineLinkAnchor'
import { BlockLinkRenderer } from '~/components/ui/markdown/renderers/LinkRenderer'
import { useModalStack } from '~/components/ui/modal/stacked/provider'
import { Favicon } from '~/components/ui/rich-link/Favicon'
import { useSelectionInk } from '~/hooks/common/use-selection-ink'
import {
  setLastImageClickTarget,
  useWebHost,
} from '~/hooks/common/use-web-host'

import { YohakuMapRenderer } from './map/YohakuMapRenderer'
import { yohakuPollAdapter } from './poll-adapter'
import { YohakuFileCard } from './YohakuFileCard'

const richContentSlots: HostCapabilities['slots'] = {
  BlockLinkCard: ({ fallback, url }) => (
    <BlockLinkRenderer fallback={fallback} href={url} />
  ),
  FileCard: (props) => <YohakuFileCard {...props} />,
  CodeBlock: ({ code, fold, language }) => (
    <CodeBlockRender content={code} fold={fold} lang={language} />
  ),
  InlineLink: ({ children, className, href, rel, target }) =>
    href.startsWith('/') ? (
      <PeekLink className={className} href={href}>
        {children}
      </PeekLink>
    ) : (
      <InlineLinkAnchor
        className={className}
        href={href}
        rel={rel}
        target={target}
      >
        <Favicon href={href} />
        {children}
      </InlineLinkAnchor>
    ),
  MapBlock: YohakuMapRenderer,
}

const RichContent = createYohakuLexicalRenderer()

function PeekDialogModal({ content }: { content: ReactNode }) {
  return (
    <PeekModal>
      <Paper
        as="div"
        className="[&_.rich-content]:max-w-full! [&_.rich-content]:w-full! [&_.rich-content_table]:overflow-x-auto!"
      >
        {content}
      </Paper>
    </PeekModal>
  )
}

export interface LexicalContentProps {
  className?: string
  content: string
  pollAdapter?: PollDataAdapter
  variant?: RichEditorVariant
}

interface RichContentBodyProps {
  baseVarStyle: React.CSSProperties
  className?: string
  content: string
  editorOverrideStyle: React.CSSProperties
  editorState: SerializedEditorState
  pollAdapter: PollDataAdapter
  theme: HostCapabilities['theme']
  variant: RichEditorVariant | undefined
}

function RichContentBody({
  className,
  content,
  editorState,
  editorOverrideStyle,
  baseVarStyle,
  pollAdapter,
  theme,
  variant,
}: RichContentBodyProps) {
  const inkContainerRef = useRef<HTMLDivElement>(null)
  useMarkInk(inkContainerRef, content)
  useSelectionInk(inkContainerRef)

  return (
    <PollDataProvider adapter={pollAdapter}>
      <div ref={inkContainerRef} style={{ display: 'contents' }}>
        <RichContent
          className={clsx(className, 'bg-transparent!')}
          style={{ ...baseVarStyle, ...editorOverrideStyle }}
          theme={theme}
          value={editorState}
          variant={variant}
        />
      </div>
    </PollDataProvider>
  )
}

export function LexicalContent({
  content,
  variant,
  className,
  pollAdapter = yohakuPollAdapter,
}: LexicalContentProps) {
  const editorState = useMemo<SerializedEditorState | null>(() => {
    try {
      return sanitizeEditorState(JSON.parse(content), REGISTERED_NODE_TYPES)
    } catch {
      return null
    }
  }, [content])

  const isMobile = useIsMobile()
  const { present } = useModalStack()

  const webHost = useWebHost({
    nestedDocPresentation: 'modal',
    slots: richContentSlots,
  })

  useEffect(() => {
    imageClickCaptureHolder.current = setLastImageClickTarget
    return () => {
      imageClickCaptureHolder.current = null
    }
  }, [])

  useEffect(() => {
    nestedDocExpandHolder.current = ({ content: nestedContent, title }) => {
      // present() defers rendering to a global modal stack mounted outside
      // this subtree, so nestedContent needs its own HostProvider ancestor —
      // the one above in this component's return tree isn't in scope there.
      const hostedContent = (
        <HostProvider host={webHost}>{nestedContent}</HostProvider>
      )
      if (isMobile) {
        present({
          title: title || ' ',
          content: () => <>{hostedContent}</>,
          clickOutsideToDismiss: true,
          contentClassName: 'p-0 -mx-2',
        })
        return
      }
      present({
        clickOutsideToDismiss: true,
        overlay: true,
        title: title || 'Preview',
        modalClassName:
          'relative mx-auto mt-[10vh] scrollbar-none max-w-full overflow-auto px-2 lg:max-w-[65rem] lg:p-0',
        // eslint-disable-next-line @eslint-react/no-nested-component-definitions
        CustomModalComponent: () => <PeekDialogModal content={hostedContent} />,
        content: () => null,
      })
    }
    return () => {
      nestedDocExpandHolder.current = null
    }
  }, [isMobile, present, webHost])

  const editorOverrideStyle = useMemo(
    () => createYohakuThemeStyle(variant),
    [variant],
  )

  if (!editorState) return null

  return (
    <HostProvider host={webHost}>
      <RichContentBody
        baseVarStyle={baseFontVarStyle}
        className={className}
        content={content}
        editorOverrideStyle={editorOverrideStyle}
        editorState={editorState}
        pollAdapter={pollAdapter}
        theme={webHost.theme}
        variant={variant}
      />
    </HostProvider>
  )
}
