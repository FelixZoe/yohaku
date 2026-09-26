import {
  alertQuote,
  autoLink,
  banner,
  chat,
  checkList,
  codeBlock,
  codeSnippet,
  details,
  doc,
  embed,
  excalidraw,
  FORMAT_BOLD,
  FORMAT_CODE,
  FORMAT_ITALIC,
  FORMAT_STRIKETHROUGH,
  FORMAT_UNDERLINE,
  gallery,
  heading,
  horizontalRule,
  image,
  link,
  linkCard,
  list,
  listItem,
  mention,
  mermaid,
  nestedDoc,
  paragraph,
  poll,
  quote,
  ruby,
  table,
  tableCell,
  tableRow,
  text,
  video,
} from './helpers'

const demoExcalidrawSnapshot = {
  appState: {},
  elements: [
    {
      backgroundColor: '#a5d8ff',
      boundElements: null,
      fillStyle: 'solid',
      groupIds: [],
      height: 120,
      id: 'rect1',
      isDeleted: false,
      link: null,
      locked: false,
      opacity: 100,
      roughness: 1,
      seed: 1,
      strokeColor: '#1971c2',
      strokeStyle: 'solid',
      strokeWidth: 2,
      type: 'rectangle',
      updated: 1,
      version: 1,
      versionNonce: 1,
      width: 200,
      x: 100,
      y: 100,
    },
    {
      backgroundColor: '#ffc078',
      boundElements: null,
      fillStyle: 'solid',
      groupIds: [],
      height: 80,
      id: 'ellipse1',
      isDeleted: false,
      link: null,
      locked: false,
      opacity: 100,
      roughness: 1,
      seed: 2,
      strokeColor: '#e8590c',
      strokeStyle: 'solid',
      strokeWidth: 2,
      type: 'ellipse',
      updated: 1,
      version: 1,
      versionNonce: 2,
      width: 160,
      x: 350,
      y: 140,
    },
  ],
  files: {},
}

export const longFormState = doc(
  heading('h1', text('Lexical 节点览图')),

  paragraph(
    text(
      '此页汇 Yohaku 所注册之全部 Lexical 节点，凡 builtin 与 module 皆列焉。意在校 ',
    ),
    text('LexicalContent', FORMAT_CODE),
    text(' 之渲染、'),
    text('overrides', FORMAT_CODE),
    text(' 之命中、与 image-zoomer / expand modal 等交互之活路。'),
  ),

  alertQuote(
    'note',
    paragraph(
      text(
        '本页之 poll / nested-doc / excalidraw 数据皆 inline mock，不走后端。',
      ),
    ),
  ),

  heading('h2', text('一、行内排版')),

  paragraph(
    text('行内可施 '),
    text('粗体', FORMAT_BOLD),
    text('、'),
    text('斜体', FORMAT_ITALIC),
    text('、'),
    text('删除线', FORMAT_STRIKETHROUGH),
    text('、'),
    text('下划线', FORMAT_UNDERLINE),
    text('、'),
    text('inline code', FORMAT_CODE),
    text('；可缀链接如 '),
    link('https://innei.in', text('innei.in')),
    text('，或 autolink: '),
    autoLink('https://github.com/Innei/Yohaku'),
    text('。'),
  ),

  paragraph(
    text('日语之 ruby 标音示例：'),
    ruby('紅葉', 'もみじ'),
    text('、'),
    ruby('東京', 'とうきょう'),
    text('。'),
  ),

  paragraph(
    text('社交平台 mention：'),
    mention({ handle: 'innei', platform: 'GH' }),
    text(' 与 '),
    mention({ handle: 'innei', platform: 'X' }),
    text('。'),
  ),

  heading('h2', text('二、标题与段落')),
  heading('h3', text('h3 子标题')),
  paragraph(text('段落数行散布。')),

  quote(
    paragraph(text('引文一则：天地有大美而不言。')),
    paragraph(text('—— 庄子，《知北游》')),
  ),

  heading('h2', text('三、列表与任务')),

  list(
    'bullet',
    listItem(paragraph(text('无序首项'))),
    listItem(
      paragraph(text('嵌套：')),
      list(
        'bullet',
        listItem(paragraph(text('子项 A'))),
        listItem(paragraph(text('子项 B'))),
      ),
    ),
    listItem(paragraph(text('末项'))),
  ),

  list(
    'number',
    listItem(paragraph(text('有序首项'))),
    listItem(paragraph(text('有序次项'))),
    listItem(paragraph(text('有序末项'))),
  ),

  checkList(
    { checked: true, children: [paragraph(text('已成：写 fixture'))] },
    { checked: true, children: [paragraph(text('已成：接 mock adapter'))] },
    { checked: false, children: [paragraph(text('待办：覆盖 edge cases'))] },
  ),

  heading('h2', text('四、代码')),

  codeBlock(
    'typescript',
    `import type { LexicalContentProps } from '~/components/ui/rich-content/LexicalContent'

export function renderArticle(props: LexicalContentProps) {
  return <LexicalContent {...props} />
}`,
  ),

  codeSnippet([
    {
      code: `import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
}`,
      filename: 'counter.tsx',
      language: 'tsx',
    },
    {
      code: `import { createRoot } from 'react-dom/client'
import { Counter } from './counter'

createRoot(document.getElementById('root')!).render(<Counter />)`,
      filename: 'main.ts',
      language: 'ts',
    },
  ]),

  heading('h2', text('五、引用与提示')),

  alertQuote('tip', paragraph(text('提示：pnpm 较 npm 为速。'))),
  alertQuote('important', paragraph(text('要紧：此功能须先登入方可一用。'))),
  alertQuote('warning', paragraph(text('警：此操作不可还原。'))),
  alertQuote('caution', paragraph(text('凶险：修改之恐废系统。'))),

  banner('note', paragraph(text('Banner（note）：仅以醒目装饰示之。'))),
  banner(
    'tip',
    paragraph(text('Banner（tip）：与 alert 同 type 而 layout 异。')),
  ),
  banner('important', paragraph(text('Banner（important）：重要事项专用。'))),
  banner('warning', paragraph(text('Banner（warning）：警示意。'))),
  banner('caution', paragraph(text('Banner（caution）：凶险意。'))),

  heading('h2', text('六、媒体')),

  paragraph(text('单图：')),
  image({
    altText: '随机配图',
    height: 600,
    src: 'https://picsum.photos/seed/yohaku-lexical-demo/1200/600',
    width: 1200,
  }),

  paragraph(text('图集（grid）：')),
  gallery({
    images: [
      {
        alt: '一',
        height: 300,
        src: 'https://picsum.photos/seed/g1/600/400',
        width: 400,
      },
      {
        alt: '二',
        height: 300,
        src: 'https://picsum.photos/seed/g2/600/400',
        width: 400,
      },
      {
        alt: '三',
        height: 300,
        src: 'https://picsum.photos/seed/g3/600/400',
        width: 400,
      },
      {
        alt: '四',
        height: 300,
        src: 'https://picsum.photos/seed/g4/600/400',
        width: 400,
      },
    ],
    layout: 'grid',
  }),

  paragraph(text('视频：')),
  video({
    height: 720,
    poster: 'https://picsum.photos/seed/poster/1280/720',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    width: 1280,
  }),

  paragraph(text('Embed（YouTube）：')),
  embed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'),

  paragraph(text('Link card：')),
  linkCard('https://github.com/Innei/Shiro'),

  heading('h2', text('七、表格与折叠')),

  table(
    tableRow(
      tableCell(1, paragraph(text('节点'))),
      tableCell(1, paragraph(text('类别'))),
      tableCell(1, paragraph(text('备注'))),
    ),
    tableRow(
      tableCell(0, paragraph(text('mermaid'))),
      tableCell(0, paragraph(text('block / decorator'))),
      tableCell(0, paragraph(text('已接 photo-viewer zoom'))),
    ),
    tableRow(
      tableCell(0, paragraph(text('excalidraw'))),
      tableCell(0, paragraph(text('block / decorator'))),
      tableCell(0, paragraph(text('expand 走 PeekModal'))),
    ),
    tableRow(
      tableCell(0, paragraph(text('nested-doc'))),
      tableCell(0, paragraph(text('block / decorator'))),
      tableCell(0, paragraph(text('内嵌一份 SerializedEditorState'))),
    ),
  ),

  details(
    '点击展开：本节点之内部资料',
    false,
    paragraph(text('折叠节点用于隐次要内容，初始 open=false。')),
    paragraph(text('内部可置任何块级节点。')),
  ),

  heading('h2', text('八、图与图灵机')),

  paragraph(text('Mermaid 流程图：')),
  mermaid(
    `graph TD
  A[读 Lexical JSON] --> B{有 override?}
  B -->|是| C[render override]
  B -->|否| D[fallback lazy renderer]
  C --> E[output]
  D --> E`,
  ),

  paragraph(text('Mermaid 序列图：')),
  mermaid(
    `sequenceDiagram
  participant Reader
  participant LexicalContent
  participant Mermaid
  Reader->>LexicalContent: hydrate
  LexicalContent->>Mermaid: render <img>
  Mermaid-->>LexicalContent: data URL
  Reader-->>Mermaid: click (zoom)`,
  ),

  paragraph(text('Excalidraw 白板：')),
  excalidraw(demoExcalidrawSnapshot),

  heading('h2', text('九、Chat 与投票')),

  paragraph(text('User · Agent 对话：')),
  chat({
    messages: [
      {
        content: '为何 Lexical 之 DecoratorNode 与 ElementNode 有别？',
        id: 'm1',
        participantId: 'p_user',
      },
      {
        content:
          '**ElementNode** 容他节点（段落、标题、列表）；**DecoratorNode** 渲一 React component 为叶（poll、embed、chart）。当其内容非 text-editable 时用 decorator。',
        id: 'm2',
        participantId: 'p_agent',
      },
    ],
    participants: [
      { id: 'p_user', kind: 'user', name: 'Innei' },
      { id: 'p_agent', kind: 'agent', name: 'Claude' },
    ],
    variant: 'user-agent',
  }),

  paragraph(text('单选 poll：')),
  poll({
    mode: 'single',
    options: [
      { id: 'o_ragdoll', label: '布偶' },
      { id: 'o_amshort', label: '美短' },
      { id: 'o_orange', label: '橘猫' },
    ],
    pollId: 'p_demo_single',
    question: '汝最爱何猫？',
  }),

  paragraph(text('多选 poll：')),
  poll({
    mode: 'multiple',
    options: [
      { id: 'o_cat', label: '猫' },
      { id: 'o_dog', label: '狗' },
      { id: 'o_hamster', label: '仓鼠' },
      { id: 'o_fish', label: '鱼' },
    ],
    pollId: 'p_demo_multi',
    question: '汝曾养何宠？（可多选）',
  }),

  heading('h2', text('十、嵌套文档')),

  paragraph(
    text('Nested doc 是一独立 SerializedEditorState 之块，点击展开可见全文。'),
  ),
  nestedDoc(
    heading('h2', text('嵌套之子文档')),
    paragraph(
      text(
        '此子文档本身亦是一份 lexical state，含 paragraph、code、image 之属。',
      ),
    ),
    codeBlock(
      'json',
      `{
  "type": "nested-doc",
  "content": { "root": { /* ... */ } }
}`,
    ),
    paragraph(text('嵌套之内可再嵌，但默认渲 6 节点上限。')),
  ),

  horizontalRule(),

  paragraph(text('---')),
  paragraph(text('此页之文与节点皆为 demo，无关 production 数据。')),
)
