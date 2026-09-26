export type Verdict = 'holds' | 'partial' | 'no'

export const verdictLabel: Record<Verdict, string> = {
  holds: '可换',
  partial: '只像',
  no: '不换',
}

export interface Finding {
  id: string
  note: string
  source: string
  title: string
  verdict: Verdict
}

export const findings = [
  {
    id: 'fade',
    title: '淡入位移',
    source:
      'LocaleSuggestionPill · TtsFloatingPlayer · ActionBar · Activity · AuthFooter · ReadIndicator',
    verdict: 'holds',
    note: '快照上能走 translate 和 scale，单次开关和左边接近。连点不会从中间反向。节点在视口外时没有单独的层，只剩整页淡出。',
  },
  {
    id: 'popover',
    title: '浮层',
    source:
      'FloatPopover · FloatPanel · InlineLinkAnchor · 评论槽 · 选区工具条 · AutoCompletion · MapBlock',
    verdict: 'partial',
    note: 'scaleY 写在快照上，活节点自己的 transform 不动。悬停中途离开不会反向。',
  },
  {
    id: 'drawer',
    title: '遮罩加面板',
    source: 'HeaderDrawerButton · SearchPanel · AsideDonateButton · 模态遮罩',
    verdict: 'holds',
    note: '遮罩只淡出，面板快照从 translateY(-110%) 回到原位。再点一次要等这一轮结束。',
  },
  {
    id: 'height',
    title: '高度折叠',
    source: 'Collapse · NoteTopicInfo · 移动端子菜单 · PostListActions',
    verdict: 'no',
    note: '左边下文跟着高度收，大约 240ms 才到位。右边第一帧空位就没了。',
  },
  {
    id: 'width',
    title: '宽度展开',
    source: 'FABContainer',
    verdict: 'no',
    note: '左边是盒子宽度从 0 收到 48。右边快照做 scaleX，布局宽度一开始就是满的。',
  },
  {
    id: 'wait',
    title: '等退出再进入',
    source: 'TocStringView · LiveDeskActivity · HeaderDrawerContent',
    verdict: 'partial',
    note: '左边旧标题留着约 240ms。右边文档立刻换成新标题，两张快照叠在一起。',
  },
  {
    id: 'icon',
    title: '图标交换',
    source: 'IconScaleTransition',
    verdict: 'partial',
    note: 'blur 和 scale 分别写进新旧两层快照，格子固定时看起来接近。不能从中间反向。',
  },
  {
    id: 'path',
    title: '笔画',
    source: 'CheckBox',
    verdict: 'no',
    note: '左边勾是 pathLength 画出来的。右边 50ms 时已经是整勾，快照只能淡入整张图。',
  },
  {
    id: 'list',
    title: '列表进出',
    source: 'NoteTimeline · activity Presence',
    verdict: 'partial',
    note: '左边退出行留到动画结束。右边马上抽走，留下的行靠 group 层挪位。连续挤动不能中途改方向。',
  },
  {
    id: 'bracket',
    title: '共享括号',
    source: 'NoteTimeline layoutId',
    verdict: 'partial',
    note: '同名会生成 old / new / group，括号沿快照滑过去。连着点不同行会丢掉中间几步。',
  },
] as const satisfies readonly Finding[]
