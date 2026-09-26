import type { SerializedEditorState } from 'lexical'

import {
  afilmoryPhoto,
  alertQuote,
  autoLink,
  banner,
  chat,
  checkList,
  codeBlock,
  codeSnippet,
  details,
  doc,
  dynamic,
  embed,
  excalidraw,
  file,
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

export interface NodeCase {
  category: 'builtin' | 'media' | 'callout' | 'rich-block' | 'interactive'
  description: string
  key: string
  label: string
  state: SerializedEditorState
}

const excalidrawSnapshot = {
  appState: {},
  elements: [
    {
      backgroundColor: '#c5f6fa',
      boundElements: null,
      fillStyle: 'solid',
      groupIds: [],
      height: 100,
      id: 'r',
      isDeleted: false,
      link: null,
      locked: false,
      opacity: 100,
      roughness: 1,
      seed: 1,
      strokeColor: '#0c8599',
      strokeStyle: 'solid',
      strokeWidth: 2,
      type: 'rectangle',
      updated: 1,
      version: 1,
      versionNonce: 1,
      width: 180,
      x: 60,
      y: 80,
    },
  ],
  files: {},
}

export const nodeCases: NodeCase[] = [
  {
    category: 'builtin',
    description: '行内排版：粗 / 斜 / 删 / 下划 / inline code',
    key: 'inline-format',
    label: 'Inline 格式',
    state: doc(
      paragraph(
        text('粗', FORMAT_BOLD),
        text(' · '),
        text('斜', FORMAT_ITALIC),
        text(' · '),
        text('删', FORMAT_STRIKETHROUGH),
        text(' · '),
        text('下划', FORMAT_UNDERLINE),
        text(' · '),
        text('inline-code', FORMAT_CODE),
      ),
    ),
  },
  {
    category: 'builtin',
    description: 'link / autolink 之 InlineLinkAnchor 渲染',
    key: 'link',
    label: 'Link',
    state: doc(
      paragraph(
        text('普通链接：'),
        link('https://innei.in', text('innei.in')),
        text('；autolink：'),
        autoLink('https://github.com/Innei/Yohaku'),
      ),
    ),
  },
  {
    category: 'builtin',
    description:
      '站内 link / link-card 唤出 Peek（inline 走 PeekLink 的 transform FLIP，link-card 经 interceptSelfLink 走中心缝）',
    key: 'peek-link',
    label: 'Peek Link',
    state: doc(
      paragraph(
        text('行内站内链接：'),
        link('/notes/1', text('第一篇 note')),
        text(
          '，点它应就地展开而不跳页；折行时动画从首行矩形出发，所以这句话写长一点好让 ',
        ),
        link('/notes/1', text('这个链接落到行尾并折到下一行继续延伸下去')),
        text(' 能被观察到。'),
      ),
      paragraph(
        text('不可 peek 的站内路径按普通链接走：'),
        link('/friends', text('/friends')),
        text('；外链仍是悬浮卡：'),
        link('https://innei.in', text('innei.in')),
        text('。'),
      ),
      linkCard('/notes/1'),
    ),
  },
  {
    category: 'builtin',
    description: 'h1 至 h3',
    key: 'headings',
    label: 'Headings',
    state: doc(
      heading('h1', text('Heading 1')),
      heading('h2', text('Heading 2')),
      heading('h3', text('Heading 3')),
      paragraph(text('—— 段落作对照 ——')),
    ),
  },
  {
    category: 'builtin',
    description: 'quote / blockquote override',
    key: 'quote',
    label: 'Quote',
    state: doc(
      quote(
        paragraph(text('引文：天地有大美而不言。')),
        paragraph(text('—— 庄子')),
      ),
    ),
  },
  {
    category: 'builtin',
    description: '无序 / 有序 / 任务三态',
    key: 'list',
    label: 'List',
    state: doc(
      list(
        'bullet',
        listItem(paragraph(text('一'))),
        listItem(
          paragraph(text('二（含嵌套）')),
          list(
            'bullet',
            listItem(paragraph(text('二·甲'))),
            listItem(paragraph(text('二·乙'))),
          ),
        ),
        listItem(paragraph(text('三'))),
      ),
      list(
        'number',
        listItem(paragraph(text('壹'))),
        listItem(paragraph(text('贰'))),
        listItem(paragraph(text('叁'))),
      ),
      checkList(
        { checked: true, children: [paragraph(text('已成'))] },
        { checked: false, children: [paragraph(text('未成'))] },
      ),
    ),
  },
  {
    category: 'builtin',
    description: '表格 + header row，窄屏横滑不换行',
    key: 'table',
    label: 'Table',
    state: doc(
      table(
        tableRow(
          tableCell(1, paragraph(text('键'))),
          tableCell(1, paragraph(text('作用'))),
        ),
        tableRow(
          tableCell(0, paragraph(text('NSZoomButtonMenuOption', FORMAT_CODE))),
          tableCell(0, paragraph(text('总开关, 置0禁用悬停菜单'))),
        ),
        tableRow(
          tableCell(
            0,
            paragraph(text('NSZoomButtonMenuHoverTimeout', FORMAT_CODE)),
          ),
          tableCell(0, paragraph(text('悬停多久弹出'))),
        ),
        tableRow(
          tableCell(
            0,
            paragraph(text('NSZoomButtonDragHandoffTimeout', FORMAT_CODE)),
          ),
          tableCell(0, paragraph(text('按住拖离按钮的交接延时'))),
        ),
        tableRow(
          tableCell(
            0,
            paragraph(text('NSZoomButtonMenuOutOfProcess', FORMAT_CODE)),
          ),
          tableCell(0, paragraph(text('切换进程外与进程内渲染'))),
        ),
        tableRow(
          tableCell(
            0,
            paragraph(text('NSZoomButtonServiceWarmUpDelay', FORMAT_CODE)),
          ),
          tableCell(0, paragraph(text('XPC 服务预热时机'))),
        ),
      ),
    ),
  },
  {
    category: 'builtin',
    description: 'details / collapsible',
    key: 'details',
    label: 'Details',
    state: doc(
      details(
        '展开看内',
        false,
        paragraph(text('详细内容若干。')),
        paragraph(text('可包多段。')),
      ),
    ),
  },
  {
    category: 'builtin',
    description: 'horizontal rule + code block',
    key: 'misc-builtin',
    label: 'HR + Code Block',
    state: doc(
      paragraph(text('上文')),
      horizontalRule(),
      paragraph(text('下文')),
      codeBlock(
        'typescript',
        `export const hello = (name: string) => \`Hello, \${name}\``,
      ),
    ),
  },
  {
    category: 'rich-block',
    description: '多文件 code snippet（tabbed）',
    key: 'code-snippet',
    label: 'Code Snippet',
    state: doc(
      codeSnippet([
        {
          code: `export const add = (a: number, b: number) => a + b`,
          filename: 'add.ts',
          language: 'ts',
        },
        {
          code: `import { add } from './add'\nconsole.log(add(1, 2))`,
          filename: 'main.ts',
          language: 'ts',
        },
      ]),
    ),
  },
  {
    category: 'rich-block',
    description: '超过 20 行的代码块（折叠态）',
    key: 'code-block-long',
    label: 'Code Block · Long',
    state: doc(
      codeBlock(
        'typescript',
        Array.from({ length: 40 }, (_, i) => `const value${i} = ${i} * 2`).join(
          '\n',
        ),
      ),
    ),
  },
  {
    category: 'rich-block',
    description: '四个文件的 code snippet（tabs 溢出 + 无 icon 语言）',
    key: 'code-snippet-overflow',
    label: 'Code Snippet · Overflow',
    state: doc(
      codeSnippet([
        {
          code: `export const renderer = create({ slots })`,
          filename: 'renderer.ts',
          language: 'typescript',
        },
        {
          code: `export function Host() {\n  return null\n}`,
          filename: 'Host.tsx',
          language: 'tsx',
        },
        {
          code: `module.exports = { preset: 'yohaku' }`,
          filename: 'setup.js',
          language: 'javascript',
        },
        {
          code: `location /api {\n  proxy_pass http://127.0.0.1:2333;\n}`,
          filename: 'nginx.conf',
          language: 'nginx',
        },
      ]),
    ),
  },
  {
    category: 'media',
    description: '单图 + caption + accent',
    key: 'image',
    label: 'Image',
    state: doc(
      image({
        accent: '#7ba8c4',
        altText: '海',
        caption: '海之蓝',
        height: 600,
        src: 'https://picsum.photos/seed/sea/1200/600',
        width: 1200,
      }),
    ),
  },
  {
    category: 'media',
    description: 'displayWidth 60% / 35%，居中（默认 layout）',
    key: 'image-display-width',
    label: 'Image (display width)',
    state: doc(
      image({
        altText: '山 60%',
        caption: 'displayWidth: 60',
        displayWidth: 60,
        height: 600,
        src: 'https://picsum.photos/seed/mountain/1200/600',
        width: 1200,
      }),
      image({
        altText: '山 35%',
        caption: 'displayWidth: 35',
        displayWidth: 35,
        height: 600,
        src: 'https://picsum.photos/seed/mountain/1200/600',
        width: 1200,
      }),
    ),
  },
  {
    category: 'media',
    description: 'layout = align-left / align-right，displayWidth 40%',
    key: 'image-align',
    label: 'Image (align)',
    state: doc(
      image({
        altText: '湖 左对齐',
        caption: 'align-left',
        displayWidth: 40,
        height: 500,
        layout: 'align-left',
        src: 'https://picsum.photos/seed/lake/1000/500',
        width: 1000,
      }),
      image({
        altText: '湖 右对齐',
        caption: 'align-right',
        displayWidth: 40,
        height: 500,
        layout: 'align-right',
        src: 'https://picsum.photos/seed/lake/1000/500',
        width: 1000,
      }),
    ),
  },
  {
    category: 'media',
    description:
      'layout = float-left / float-right，文字环绕；≤640px 自动解除浮动',
    key: 'image-float',
    label: 'Image (float)',
    state: doc(
      image({
        altText: '林 左浮动',
        caption: 'float-left · displayWidth: 40',
        displayWidth: 40,
        height: 600,
        layout: 'float-left',
        src: 'https://picsum.photos/seed/forest/900/600',
        width: 900,
      }),
      paragraph(
        text(
          '左浮动之图占行宽四成，正文自右侧环绕而下。环绕段落需有足够长度方能观察换行行为：当文字行数超过图片高度时，后续行自然回到全宽。余白之间，图文相生，版式因此而活。',
        ),
      ),
      paragraph(
        text(
          '此为第二段环绕文字，用以验证多段落连续环绕时的间距与对齐。浮动图与正文之间的水平间距由 haklex 样式内置（1.5rem），不应被站内样式覆盖。',
        ),
      ),
      image({
        altText: '海岸 右浮动',
        caption: 'float-right · 默认宽（50%）',
        height: 600,
        layout: 'float-right',
        src: 'https://picsum.photos/seed/coast/900/600',
        width: 900,
      }),
      paragraph(
        text(
          '右浮动未指定 displayWidth，回落至默认 50% 宽。正文自左侧环绕。窄屏（≤640px）下两种浮动皆解除，图片回到全宽居中，避免移动端文字被挤压成窄条。',
        ),
      ),
      paragraph(
        text(
          '文末再补一段，确认容器以 flow-root 收束浮动：本块之后的内容不应被浮动图侵入。',
        ),
      ),
    ),
  },
  {
    category: 'media',
    description: 'gallery layout = grid',
    key: 'gallery-grid',
    label: 'Gallery (grid)',
    state: doc(
      gallery({
        images: Array.from({ length: 4 }, (_, i) => ({
          alt: `Image ${i + 1}`,
          height: 300,
          src: `https://picsum.photos/seed/grid-${i}/600/400`,
          width: 400,
        })),
        layout: 'grid',
      }),
    ),
  },
  {
    category: 'media',
    description: 'gallery layout = carousel',
    key: 'gallery-carousel',
    label: 'Gallery (carousel)',
    state: doc(
      gallery({
        images: Array.from({ length: 3 }, (_, i) => ({
          alt: `Slide ${i + 1}`,
          height: 400,
          src: `https://picsum.photos/seed/carousel-${i}/800/400`,
          width: 800,
        })),
        layout: 'carousel',
      }),
    ),
  },
  {
    category: 'media',
    description:
      'afilmory photo node — schema 仅 id + baseUrl；运行时取 /api/manifest 解 EXIF。完整 cases 见 /dev-demos/lexical/afilmory',
    key: 'afilmory-photo',
    label: 'Afilmory Photo',
    state: doc(
      afilmoryPhoto({
        id: 'DSCF6094',
        baseUrl: 'https://innei.afilmory.art',
      }),
    ),
  },
  {
    category: 'media',
    description: 'video + poster',
    key: 'video',
    label: 'Video',
    state: doc(
      video({
        height: 720,
        poster: 'https://picsum.photos/seed/poster/1280/720',
        src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        width: 1280,
      }),
    ),
  },
  {
    category: 'media',
    description:
      'file 附件：block 行 + inline chip，md / code 可展开预览（Range 512KB），pdf 第一页 + Peek',
    key: 'file',
    label: 'File',
    state: doc(
      file({
        ext: 'md',
        mimeType: 'text/markdown',
        name: 'README.md',
        size: 4096,
        src: 'https://raw.githubusercontent.com/Innei/Yohaku/main/README.md',
      }),
      file({
        ext: 'pdf',
        mimeType: 'application/pdf',
        name: 'tracemonkey.pdf',
        size: 737_779,
        src: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
      }),
      paragraph(
        text('附件也可以内联：'),
        file({
          display: 'inline',
          ext: 'ts',
          name: 'vite.config.ts',
          src: 'https://cdn.example/file/vite.config.ts',
        }),
        text('、'),
        file({
          display: 'inline',
          ext: 'pdf',
          mimeType: 'application/pdf',
          name: 'tracemonkey.pdf',
          src: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
        }),
        text('，跟在正文里。'),
      ),
    ),
  },
  {
    category: 'media',
    description: 'embed (YouTube) iframe + link card enrichment',
    key: 'embed-linkcard',
    label: 'Embed & Link Card',
    state: doc(
      paragraph(text('Embed (YouTube):')),
      embed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'),
      paragraph(text('Link card:')),
      linkCard('https://github.com/Innei/Shiro'),
      linkCard('https://github.com/Innei/haklex'),
    ),
  },
  {
    category: 'media',
    description:
      'embed (Tweet) — verify TweetRenderer renders a card, not fallback link',
    key: 'embed-tweet',
    label: 'Embed - Tweet',
    state: doc(
      paragraph(text('Embed (Tweet):')),
      embed(
        'https://x.com/shirouzu_ref/status/2061673485056040980?s=20',
        'tweet',
      ),
    ),
  },
  {
    category: 'callout',
    description: 'alert 五型：note / tip / important / warning / caution',
    key: 'alerts',
    label: 'Alerts',
    state: doc(
      alertQuote('note', paragraph(text('Note：补充信息。'))),
      alertQuote('tip', paragraph(text('Tip：实用诀。'))),
      alertQuote('important', paragraph(text('Important：要紧事项。'))),
      alertQuote('warning', paragraph(text('Warning：警示。'))),
      alertQuote('caution', paragraph(text('Caution：凶险。'))),
    ),
  },
  {
    category: 'callout',
    description: 'banner 五型（与 alert 同 type 而 layout 异）',
    key: 'banners',
    label: 'Banners',
    state: doc(
      banner('note', paragraph(text('Banner note'))),
      banner('tip', paragraph(text('Banner tip'))),
      banner('important', paragraph(text('Banner important'))),
      banner('warning', paragraph(text('Banner warning'))),
      banner('caution', paragraph(text('Banner caution'))),
    ),
  },
  {
    category: 'rich-block',
    description: 'mermaid 流程图（应可 zoom）',
    key: 'mermaid-flow',
    label: 'Mermaid - flowchart',
    state: doc(
      mermaid(
        `graph TD
  A[Start] --> B{Branch}
  B -->|yes| C[Yes branch]
  B -->|no| D[No branch]
  C --> E[End]
  D --> E`,
      ),
    ),
  },
  {
    category: 'rich-block',
    description: 'mermaid 序列图',
    key: 'mermaid-sequence',
    label: 'Mermaid - sequence',
    state: doc(
      mermaid(
        `sequenceDiagram
  participant A
  participant B
  A->>B: hello
  B-->>A: hi`,
      ),
    ),
  },
  {
    category: 'rich-block',
    description: 'excalidraw 白板（expand 可全屏）',
    key: 'excalidraw',
    label: 'Excalidraw',
    state: doc(excalidraw(excalidrawSnapshot)),
  },
  {
    category: 'rich-block',
    description: '嵌套文档（点击展开 PeekModal）',
    key: 'nested-doc',
    label: 'Nested Doc',
    state: doc(
      nestedDoc(
        heading('h2', text('子文档之标题')),
        paragraph(text('子文档之段落，内可含任意 lexical node。')),
        list(
          'bullet',
          listItem(paragraph(text('子项一'))),
          listItem(paragraph(text('子项二'))),
        ),
      ),
    ),
  },
  {
    category: 'interactive',
    description:
      'dynamic 节点：远程 ESM widget（线上 S3 资产），import(url) 进 shadow root，URL 须在 /s/dynamic-widgets-catalog 清单内',
    key: 'dynamic-quiz',
    label: 'Dynamic - remote quiz',
    state: doc(
      dynamic({
        initialHeight: 272,
        props: {
          answer: 1,
          options: [
            '站点的 JS bundle',
            '对象存储上的独立 ESM 模块',
            'iframe 嵌的外部页面',
          ],
          question: '这个 quiz 组件本身是从哪里加载的？',
        },
        url: 'https://object.innei.in/mx-space/2026/0613/i8c9ymqd9ltmrnzaep.mjs',
      }),
    ),
  },
  {
    category: 'interactive',
    description: '单选 poll（mock adapter，无后端）',
    key: 'poll-single',
    label: 'Poll - single',
    state: doc(
      poll({
        mode: 'single',
        options: [
          { id: 'o_ragdoll', label: 'Ragdoll' },
          { id: 'o_amshort', label: 'American Shorthair' },
          { id: 'o_orange', label: 'Orange tabby' },
        ],
        pollId: 'p_demo_single',
        question: 'Which cat?',
      }),
    ),
  },
  {
    category: 'interactive',
    description: '多选 poll',
    key: 'poll-multi',
    label: 'Poll - multiple',
    state: doc(
      poll({
        mode: 'multiple',
        options: [
          { id: 'o_cat', label: 'Cat' },
          { id: 'o_dog', label: 'Dog' },
          { id: 'o_hamster', label: 'Hamster' },
          { id: 'o_fish', label: 'Fish' },
        ],
        pollId: 'p_demo_multi',
        question: 'Pets?',
      }),
    ),
  },
  {
    category: 'interactive',
    description: 'chat (user · agent)',
    key: 'chat-user-agent',
    label: 'Chat - user · agent',
    state: doc(
      chat({
        messages: [
          {
            content: '请解释 lexical DecoratorNode 与 ElementNode 之别。',
            id: 'm1',
            participantId: 'u',
          },
          {
            content:
              '**ElementNode** 容子节点；**DecoratorNode** 渲一 React component 作叶。',
            id: 'm2',
            participantId: 'a',
          },
        ],
        participants: [
          { id: 'u', kind: 'user', name: 'User' },
          { id: 'a', kind: 'agent', name: 'Agent' },
        ],
        variant: 'user-agent',
      }),
    ),
  },
  {
    category: 'interactive',
    description: 'chat (user · user)',
    key: 'chat-user-user',
    label: 'Chat - user · user',
    state: doc(
      chat({
        messages: [
          { content: '今晚约？', id: 'm1', participantId: 'a' },
          { content: '约。', id: 'm2', participantId: 'b' },
        ],
        participants: [
          { id: 'a', kind: 'user', name: 'Alice' },
          { id: 'b', kind: 'user', name: 'Bob' },
        ],
        variant: 'user-user',
      }),
    ),
  },
  {
    category: 'interactive',
    description:
      'chat (long markdown response — verifies sans override under note variant + user underline accent across multi-turn)',
    key: 'chat-user-agent-long',
    label: 'Chat - user · agent (long markdown)',
    state: doc(
      paragraph(text('以下为多轮对话之展示，用以验字款与下划之效：')),
      chat({
        messages: [
          {
            content:
              '请简述 Lexical 与 ProseMirror 之主要差异，并举三例典型用例。',
            id: 'm1',
            participantId: 'u',
          },
          {
            content: [
              '**Lexical** 偏 component-driven，节点皆经 `DecoratorNode` 与 `ElementNode` 派生；**ProseMirror** 则以 schema 描结构，节点为 immutable 之数据。',
              '',
              '三例典型用例：',
              '',
              '- 文档编辑器（如 Notion、Coda）多用 ProseMirror，重 schema 之严',
              '- 社交内容编辑（如 Meta、Threads）多用 Lexical，重 React 之合',
              '- AI 流式接入（如 chat UI）二者皆可，然 Lexical 之 update cycle 更近 React，集成略简',
              '',
              '可参 `lexical.dev` 与 `prosemirror.net` 之 docs。',
            ].join('\n'),
            id: 'm2',
            participantId: 'a',
          },
          {
            content: '那 Lexical 之 DecoratorNode 适合渲什么？',
            id: 'm3',
            participantId: 'u',
          },
          {
            content: [
              'DecoratorNode 适合**非文本叶节点**——其内容由 React 自管，编辑器不进入其 DOM：',
              '',
              '- 图片、视频、嵌入式 iframe',
              '- 投票、表格之复杂组件',
              '- 自定义 widget（如本 chat node）',
              '',
              '`decorate()` 之返回即所渲之 React element。',
            ].join('\n'),
            id: 'm4',
            participantId: 'a',
          },
          {
            content: '了解，谢。',
            id: 'm5',
            participantId: 'u',
          },
        ],
        participants: [
          { id: 'u', kind: 'user', name: 'User' },
          { id: 'a', kind: 'agent', name: 'Yohaku' },
        ],
        variant: 'user-agent',
      }),
      paragraph(
        text('以上 chat 之容当为 sans，纵 note variant 之父级用 serif。'),
      ),
    ),
  },
  {
    category: 'rich-block',
    description: 'mention（GH 与 X 之 favicon 渲染）',
    key: 'mention',
    label: 'Mention',
    state: doc(
      paragraph(
        text('GH: '),
        mention({ handle: 'innei', platform: 'GH' }),
        text(' / X: '),
        mention({ handle: 'innei', platform: 'X' }),
      ),
    ),
  },
  {
    category: 'rich-block',
    description: 'ruby 注音',
    key: 'ruby',
    label: 'Ruby',
    state: doc(
      paragraph(
        ruby('紅葉', 'もみじ'),
        text(' / '),
        ruby('東京', 'とうきょう'),
        text(' / '),
        ruby('未来', 'みらい'),
      ),
    ),
  },
]
