'use client'

import type { FC } from 'react'
import { useState } from 'react'

import {
  NoticeCard,
  NoticeCardItem,
} from '~/components/modules/shared/NoticeCard'
import { Banner } from '~/components/ui/banner'
import { StyledButton } from '~/components/ui/button'
import { Collapse } from '~/components/ui/collapse'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { FloatPopover } from '~/components/ui/float-popover'
import { useModalStack } from '~/components/ui/modal'
import { ListPaginationNav } from '~/components/ui/pagination/ListPaginationNav'
import { PresentSheet } from '~/components/ui/sheet'
import { Tabs } from '~/components/ui/tabs'
import { toast } from '~/lib/toast'

import { Section, Specimen, SpecimenStack, Subsection } from './shared'

const SampleModalContent: FC<{ dismiss: () => void }> = ({ dismiss }) => (
  <div className="space-y-4">
    <p className="text-copy-13 leading-[1.8] text-neutral-8">
      此为模态对话框示例。点遮罩可关，或按 Esc。点下方按钮亦可。
    </p>
    <div className="flex justify-end gap-2">
      <StyledButton size="sm" variant="ghost" onClick={dismiss}>
        取消
      </StyledButton>
      <StyledButton
        size="sm"
        variant="primary"
        onClick={() => {
          toast.success('已确认')
          dismiss()
        }}
      >
        确认
      </StyledButton>
    </div>
  </div>
)

const ModalDemo: FC = () => {
  const { present } = useModalStack()
  return (
    <Specimen hint="useModalStack().present" label="Modal · stacked">
      <StyledButton
        variant="primary"
        onClick={() =>
          present({
            title: '关键洞察',
            content: SampleModalContent,
          })
        }
      >
        打开模态
      </StyledButton>
      <StyledButton
        variant="secondary"
        onClick={() =>
          present({
            title: '多层叠加',
            overlay: true,
            content: ({ dismiss }) => (
              <div className="space-y-3">
                <p className="text-copy-13 text-neutral-8">
                  叠加遮罩 · 点空白关。
                </p>
                <StyledButton size="sm" variant="secondary" onClick={dismiss}>
                  关闭
                </StyledButton>
              </div>
            ),
          })
        }
      >
        带遮罩
      </StyledButton>
    </Specimen>
  )
}

const SheetDemo: FC = () => (
  <Specimen hint="PresentSheet" label="Sheet · 底栏抽屉">
    <PresentSheet
      triggerAsChild
      title="抽屉标题"
      content={
        <div className="space-y-3">
          <p className="text-copy-13 leading-[1.8] text-neutral-8">
            底栏抽屉常用于移动端的二级操作，桌面亦可。下滑或点遮罩关闭。
          </p>
          <div className="rounded-lg bg-neutral-2 p-3 text-label-12 text-neutral-7">
            支持嵌入任意内容，含表单、列表、长文。
          </div>
        </div>
      }
    >
      <StyledButton variant="primary">打开 Sheet</StyledButton>
    </PresentSheet>
  </Specimen>
)

const FloatPopoverDemo: FC = () => (
  <SpecimenStack>
    <Specimen hint="hover 触发" label="FloatPopover · tooltip">
      <FloatPopover
        asChild
        trigger="hover"
        type="tooltip"
        triggerElement={
          <StyledButton variant="secondary">悬停查看</StyledButton>
        }
      >
        简注一行
      </FloatPopover>
      <FloatPopover
        asChild
        placement="top"
        trigger="hover"
        type="tooltip"
        triggerElement={
          <StyledButton variant="ghost">向上 placement</StyledButton>
        }
      >
        Tooltip · placement=top
      </FloatPopover>
    </Specimen>
    <Specimen hint="click 触发" label="FloatPopover · popover">
      <FloatPopover
        asChild
        trigger="click"
        triggerElement={<StyledButton variant="primary">点击展开</StyledButton>}
        type="popover"
      >
        <div className="w-60 space-y-2">
          <div className="text-copy-13 font-medium text-neutral-9">
            可承载更丰富内容
          </div>
          <div className="text-label-12 text-neutral-7">
            内含按钮、列表、表单。
          </div>
          <StyledButton size="sm" variant="ghost">
            内部动作
          </StyledButton>
        </div>
      </FloatPopover>
    </Specimen>
  </SpecimenStack>
)

const DropdownDemo: FC = () => (
  <Specimen label="DropdownMenu · base-ui menu">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <StyledButton variant="secondary">
          <i className="i-mingcute-more-2-line text-icon-md" />
          更多操作
        </StyledButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6}>
        <DropdownMenuLabel>条目</DropdownMenuLabel>
        <DropdownMenuItem
          icon={<i className="i-mingcute-edit-line text-icon-sm" />}
        >
          编辑
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<i className="i-mingcute-copy-line text-icon-sm" />}
        >
          复制
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={<i className="i-mingcute-delete-2-line text-icon-sm" />}
        >
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </Specimen>
)

const TabsDemo: FC = () => (
  <Specimen label="Tabs · base-ui" stack="col">
    <Tabs.Root defaultValue="overview">
      <Tabs.List className="border-b border-neutral-3 pb-2">
        <Tabs.Trigger value="overview">概览</Tabs.Trigger>
        <Tabs.Trigger value="detail">详情</Tabs.Trigger>
        <Tabs.Trigger
          value="changes"
          badge={
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-caption-10 text-neutral-1">
              3
            </span>
          }
        >
          变更
        </Tabs.Trigger>
      </Tabs.List>
      <div className="pt-4">
        <Tabs.Content value="overview">
          <p className="text-copy-13 text-neutral-8">第一栏 · 概览内容。</p>
        </Tabs.Content>
        <Tabs.Content value="detail">
          <p className="text-copy-13 text-neutral-8">第二栏 · 详细描述。</p>
        </Tabs.Content>
        <Tabs.Content value="changes">
          <p className="text-copy-13 text-neutral-8">第三栏 · 变更记录。</p>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  </Specimen>
)

const BannerDemo: FC = () => (
  <SpecimenStack>
    <Specimen label="Banner · info" stack="col">
      <Banner message="此为信息提示，用以传达常态消息。" type="info" />
    </Specimen>
    <Specimen label="Banner · success" stack="col">
      <Banner message="操作成功 · 已保存至云端。" type="success" />
    </Specimen>
    <Specimen label="Banner · warning" stack="col">
      <Banner
        message="注意：此操作不可撤销，请审慎。"
        placement="left"
        type="warning"
      />
    </Specimen>
    <Specimen label="Banner · error" stack="col">
      <Banner message="出现错误 · 请稍后再试。" placement="left" type="error" />
    </Specimen>
  </SpecimenStack>
)

const CollapseDemo: FC = () => (
  <Specimen label="Collapse · 折叠" stack="col">
    <div className="space-y-3">
      <Collapse title="点我展开 · 普通态">
        <div className="pt-3 text-copy-13 leading-[1.8] text-neutral-7">
          余白以待。Collapse 适合 FAQ、长内容分段、不常用动作。
        </div>
      </Collapse>
      <Collapse title="点我展开 · 第二条">
        <div className="pt-3 text-copy-13 leading-[1.8] text-neutral-7">
          子内容可自由组合。
        </div>
      </Collapse>
    </div>
  </Specimen>
)

const ToastDemo: FC = () => (
  <Specimen hint="sonner 之封装" label="Toast · ~/lib/toast">
    <StyledButton
      size="sm"
      variant="primary"
      onClick={() => toast.success('已保存')}
    >
      success
    </StyledButton>
    <StyledButton
      size="sm"
      variant="secondary"
      onClick={() => toast.info('有新版本可用')}
    >
      info
    </StyledButton>
    <StyledButton
      size="sm"
      variant="secondary"
      onClick={() => toast.warn('草稿未保存')}
    >
      warning
    </StyledButton>
    <StyledButton
      size="sm"
      variant="ghost"
      onClick={() => toast.error('请求失败')}
    >
      error
    </StyledButton>
  </Specimen>
)

const NoticeCardDemo: FC = () => (
  <Specimen label="NoticeCard · 多条堆叠" stack="col">
    <NoticeCard>
      <NoticeCardItem
        icon="i-mingcute-sparkles-line"
        title="关键洞察 · header only"
      />
      <NoticeCardItem
        icon="i-mingcute-alert-line"
        title="此文已逾 60 日未更新，部分内容或失时效。"
        tone="warning"
      />
      <NoticeCardItem
        icon="i-mingcute-globe-line"
        title="AI 翻译"
        tone="info"
        action={
          <button className="text-label-12 text-accent underline underline-offset-2">
            查看原文
          </button>
        }
      >
        <p className="text-copy-13 leading-[1.8] text-neutral-7">
          此文为机器翻译，可切换原文。
        </p>
      </NoticeCardItem>
    </NoticeCard>
  </Specimen>
)

const PaginationDemo: FC = () => {
  const [hasPrev, setHasPrev] = useState(true)
  const [hasNext, setHasNext] = useState(true)
  return (
    <Specimen label="Pagination" stack="col">
      <div className="mb-3 flex gap-3 text-label-12 text-neutral-7">
        <label className="flex items-center gap-1.5">
          <input
            checked={hasPrev}
            type="checkbox"
            onChange={(e) => setHasPrev(e.target.checked)}
          />
          hasPrev
        </label>
        <label className="flex items-center gap-1.5">
          <input
            checked={hasNext}
            type="checkbox"
            onChange={(e) => setHasNext(e.target.checked)}
          />
          hasNext
        </label>
      </div>
      <ListPaginationNav
        hasNext={hasNext}
        hasPrev={hasPrev}
        info={<span>第 1 / 12 页</span>}
        nextHref="#"
        nextLabel="下一页"
        prevHref="#"
        prevLabel="上一页"
      />
    </Specimen>
  )
}

export const CompositesSection: FC = () => (
  <Section
    id="composites"
    meta="组合型 UI：模态、抽屉、浮层、菜单、分页、提示。多依 base-ui。"
    title="04 · composites"
  >
    <Subsection title="Overlay · 模态 / 抽屉 / 浮层 / 菜单">
      <div className="space-y-4">
        <SpecimenStack>
          <ModalDemo />
          <SheetDemo />
          <DropdownDemo />
        </SpecimenStack>
        <FloatPopoverDemo />
      </div>
    </Subsection>

    <Subsection title="Navigation · Tabs / Pagination">
      <SpecimenStack>
        <TabsDemo />
        <PaginationDemo />
      </SpecimenStack>
    </Subsection>

    <Subsection title="Feedback · Banner / Toast / Collapse / NoticeCard">
      <div className="space-y-4">
        <BannerDemo />
        <SpecimenStack>
          <ToastDemo />
          <CollapseDemo />
        </SpecimenStack>
        <NoticeCardDemo />
      </div>
    </Subsection>
  </Section>
)
