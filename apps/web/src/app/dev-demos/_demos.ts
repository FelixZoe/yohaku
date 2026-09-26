export type DevDemoGroup = 'contract' | 'content' | 'ambient' | 'data'

export interface DevDemo {
  group: DevDemoGroup
  href: string
  meta: string
  name: string
  tags: string[]
}

export const devDemoGroups: {
  hint: string
  id: DevDemoGroup
  label: string
}[] = [
  { id: 'contract', label: 'contract', hint: '设计契约' },
  { id: 'content', label: 'content', hint: '内容渲染' },
  { id: 'ambient', label: 'ambient', hint: '氛围与交互' },
  { id: 'data', label: 'data', hint: '数据可视' },
]

export const devDemos: DevDemo[] = [
  {
    group: 'contract',
    href: '/dev-demos/design',
    name: 'Design specimens',
    meta: '色板 · 字阶 · 原子 · 组合，一页尽览 tokens 契约',
    tags: ['token', 'color', 'typography', 'button', 'input'],
  },
  {
    group: 'content',
    href: '/dev-demos/lexical',
    name: 'Lexical renderer',
    meta: '全量节点用例 · 长文排版 · 富文本降级',
    tags: ['editor', 'rich', 'node'],
  },
  {
    group: 'content',
    href: '/dev-demos/lexical/afilmory',
    name: 'Lexical · afilmory',
    meta: '相册节点 · manifest 拉取与网格布局',
    tags: ['editor', 'photo', 'gallery'],
  },
  {
    group: 'content',
    href: '/dev-demos/markdown',
    name: 'Markdown renderer',
    meta: '语法覆盖矩阵 · 长文 · 本机 scratch 文件',
    tags: ['md', 'syntax', 'prose'],
  },
  {
    group: 'content',
    href: '/dev-demos/excalidraw-static',
    name: 'Excalidraw static',
    meta: '静态白板场景 · 无编辑器的只读渲染',
    tags: ['draw', 'canvas', 'diagram'],
  },
  {
    group: 'content',
    href: '/dev-demos/link-cards',
    name: 'Link cards',
    meta: '全变体形录 · 骨架态 · fixtures 不走网络',
    tags: ['link', 'card', 'github', 'skeleton'],
  },
  {
    group: 'content',
    href: '/dev-demos/gallery',
    name: 'Gallery',
    meta: '多图轮播 · 统一高度基准 · caption 预留行',
    tags: ['gallery', 'image', 'carousel'],
  },
  {
    group: 'content',
    href: '/dev-demos/stock-demo',
    name: 'Stock cards',
    meta: 'K 线 · 快照 · 无效标的降级',
    tags: ['stock', 'chart', 'kline'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/backgrounds',
    name: 'Backgrounds',
    meta: '粒子氛围层全录 · tweakpane 实时调参',
    tags: ['particle', 'sakura', 'snow', 'tweakpane'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/page-bleed',
    name: 'Page bleed',
    meta: 'WebGL 天头场线 · 划线进场 · seed / accent 实时换',
    tags: ['webgl', 'shader', 'bleed', 'header'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/ambient-sides',
    name: 'Ambient sides',
    meta: '两侧环境色 · 生产组件调参台（染纸纹）',
    tags: ['scroll', 'image', 'ambient'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/peek-modal',
    name: 'Peek modal',
    meta: '三种入场机制 · 文字 FLIP / 卡片页 FLIP / 中心缝 · 假内容不走网络',
    tags: ['peek', 'modal', 'flip', 'motion'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/photo-viewer',
    name: 'Photo viewer',
    meta: '缩放 · 手势 · ZoomGroup 联动',
    tags: ['photo', 'zoom', 'gesture'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/toast-demo',
    name: 'Toast playground',
    meta: 'sonner 全量变体 · 类型 · 动作 · 持续态',
    tags: ['toast', 'sonner', 'feedback'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/slot-text',
    name: 'SlotText',
    meta: '数字翻牌 · numericText 风与原版并排 · 计数 / 价格 / 时钟 / 标签',
    tags: ['slot', 'number', 'motion', 'swiftui'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/notice-card-demo',
    name: 'NoticeCard',
    meta: '提示卡片各语义色与折叠态',
    tags: ['notice', 'banner', 'callout'],
  },
  {
    group: 'ambient',
    href: '/dev-demos/animate-view',
    name: 'AnimateView',
    meta: '业务动效对照 · 哪些 AnimatePresence 换得过 View Transition',
    tags: ['motion', 'enter', 'exit', 'view', 'presence'],
  },
  {
    group: 'data',
    href: '/dev-demos/gps-track',
    name: 'GPS track',
    meta: 'GPX 解析 · 轨迹地图 · 本地文件上传预览',
    tags: ['gpx', 'map', 'track'],
  },
]
