'use client'

import type { FC } from 'react'
import { useState } from 'react'

import { Avatar } from '~/components/ui/avatar'
import { RoundedIconButton, StyledButton } from '~/components/ui/button'
import { Checkbox, CheckBoxLabel } from '~/components/ui/checkbox'
import { Divider, DividerVertical } from '~/components/ui/divider'
import { Input } from '~/components/ui/input/Input'
import { TextArea } from '~/components/ui/input/TextArea'
import { Label } from '~/components/ui/label/Label'
import { Loading } from '~/components/ui/loading'
import { Segmented } from '~/components/ui/segmented'
import { Select } from '~/components/ui/select'
import { LabelSwitch } from '~/components/ui/switch'
import { Tag } from '~/components/ui/tag/Tag'

import { Section, Specimen, SpecimenStack, Subsection } from './shared'

export const AtomsSection: FC = () => (
  <Section
    id="atoms"
    meta="单原子组件：交互态、变体、尺寸全列。"
    title="03 · atoms"
  >
    <Subsection hint="variant × size × state" title="Button · StyledButton">
      <SpecimenStack>
        <Specimen hint="primary / secondary / ghost" label="variant">
          <StyledButton variant="primary">Primary</StyledButton>
          <StyledButton variant="secondary">Secondary</StyledButton>
          <StyledButton variant="ghost">Ghost</StyledButton>
        </Specimen>
        <Specimen hint="sm / md" label="size">
          <StyledButton size="sm" variant="primary">
            Small
          </StyledButton>
          <StyledButton size="md" variant="primary">
            Medium
          </StyledButton>
          <StyledButton size="sm" variant="secondary">
            Small
          </StyledButton>
          <StyledButton size="md" variant="secondary">
            Medium
          </StyledButton>
        </Specimen>
        <Specimen hint="loading / disabled" label="state">
          <StyledButton isLoading variant="primary">
            Loading
          </StyledButton>
          <StyledButton disabled variant="primary">
            Disabled
          </StyledButton>
          <StyledButton disabled variant="secondary">
            Disabled
          </StyledButton>
        </Specimen>
        <Specimen hint="MotionButton 派生" label="rounded icon">
          <RoundedIconButton aria-label="settings">
            <i className="i-mingcute-settings-3-line text-icon-md" />
          </RoundedIconButton>
          <RoundedIconButton aria-label="search">
            <i className="i-mingcute-search-line text-icon-md" />
          </RoundedIconButton>
          <RoundedIconButton aria-label="more">
            <i className="i-mingcute-more-2-line text-icon-md" />
          </RoundedIconButton>
        </Specimen>
      </SpecimenStack>
    </Subsection>

    <Subsection hint="rounded sm → 3xl" title="Input / TextArea">
      <SpecimenStack>
        <Specimen label="Input · rounded">
          <div className="flex w-full flex-col gap-3">
            <Input placeholder="rounded sm" rounded="sm" />
            <Input placeholder="rounded md" rounded="md" />
            <Input placeholder="rounded xl · default" />
          </div>
        </Specimen>
        <Specimen label="Input · types">
          <div className="flex w-full flex-col gap-3">
            <Input placeholder="text" type="text" />
            <Input placeholder="password" type="password" />
            <Input disabled defaultValue="not editable" />
          </div>
        </Specimen>
        <Specimen className="sm:col-span-2" label="TextArea">
          <TextArea
            className="min-h-24 w-full"
            placeholder="此处书余白……"
            rows={4}
          />
        </Specimen>
      </SpecimenStack>
    </Subsection>

    <Subsection hint="base-ui · 受控/非受控" title="Checkbox · Switch">
      <SpecimenStack>
        <CheckboxDemo />
        <SwitchDemo />
      </SpecimenStack>
    </Subsection>

    <Subsection hint="单选 + 分段" title="Select · Segmented">
      <SpecimenStack>
        <SelectDemo />
        <SegmentedDemo />
      </SpecimenStack>
    </Subsection>

    <Subsection hint="基础展示原子" title="Avatar · Tag · Label">
      <SpecimenStack>
        <Specimen label="Avatar · size preset">
          <Avatar size="xs" text="X" />
          <Avatar size="sm" text="S" />
          <Avatar size="md" text="M" />
          <Avatar size="lg" text="L" />
          <Avatar size="xl" text="XL" />
        </Specimen>
        <Specimen label="Avatar · randomColor + image">
          <Avatar randomColor size="md" text="Innei" />
          <Avatar randomColor size="md" text="余白" />
          <Avatar randomColor size="md" text="Yohaku" />
          <Avatar rounded={6} size="md" text="□" />
        </Specimen>
        <Specimen label="Tag · 由文本派生色">
          <Tag text="Rspack" />
          <Tag count={12} text="Next.js" />
          <Tag text="可点击" onClick={() => undefined} />
        </Specimen>
        <Specimen label="Label">
          <Label htmlFor="demo-input">表单标签</Label>
        </Specimen>
      </SpecimenStack>
    </Subsection>

    <Subsection hint="结构 / 加载" title="Divider · Loading">
      <SpecimenStack>
        <Specimen label="Divider · 横/纵">
          <div className="flex w-full flex-col">
            <span className="text-copy-13 text-neutral-7">其上</span>
            <Divider />
            <span className="text-copy-13 text-neutral-7">其下</span>
          </div>
          <div className="mt-4 flex h-6 items-center">
            <span className="text-copy-13 text-neutral-7">左</span>
            <DividerVertical />
            <span className="text-copy-13 text-neutral-7">右</span>
          </div>
        </Specimen>
        <Specimen
          hint="ink mark + 随机文案"
          label="Loading · inline"
          stack="col"
        >
          <Loading useDefaultLoadingText />
        </Specimen>
      </SpecimenStack>
    </Subsection>
  </Section>
)

const CheckboxDemo: FC = () => {
  const [a, setA] = useState<boolean>(true)
  const [b, setB] = useState<boolean>(false)
  return (
    <Specimen hint="boolean | indeterminate" label="Checkbox · 三态">
      <div className="flex flex-col gap-3">
        <CheckBoxLabel checked={a} label="已选中" onCheckChange={setA} />
        <CheckBoxLabel checked={b} label="未选中" onCheckChange={setB} />
        <CheckBoxLabel checked disabled label="禁用 · 选中" />
        <div className="flex items-center gap-2">
          <Checkbox checked="indeterminate" />
          <span className="text-copy-13 text-neutral-7">indeterminate</span>
        </div>
      </div>
    </Specimen>
  )
}

const SwitchDemo: FC = () => {
  const [on, setOn] = useState(true)
  return (
    <Specimen label="Switch · LabelSwitch">
      <div className="flex flex-col gap-3">
        <LabelSwitch
          checked={on}
          label="开启自动归档"
          placement="left"
          onCheckedChange={setOn}
        />
        <LabelSwitch
          checked={!on}
          label="标签在右"
          placement="right"
          onCheckedChange={(v) => setOn(!v)}
        />
        <LabelSwitch checked disabled label="禁用 · 开启" />
      </div>
    </Specimen>
  )
}

const SelectDemo: FC = () => {
  const [v, setV] = useState<'newest' | 'oldest' | 'random'>('newest')
  return (
    <Specimen label="Select · 单选下拉">
      <div className="w-full max-w-[260px]">
        <Select
          placeholder="排序方式"
          value={v}
          values={[
            { label: '最新优先', value: 'newest' },
            { label: '最早优先', value: 'oldest' },
            { label: '随机', value: 'random' },
          ]}
          onChange={setV}
        />
      </div>
    </Specimen>
  )
}

const SegmentedDemo: FC = () => {
  const [v, setV] = useState<'card' | 'list' | 'grid'>('card')
  return (
    <Specimen label="Segmented · 分段选择">
      <Segmented
        ariaLabel="layout"
        value={v}
        options={[
          { icon: 'i-mingcute-grid-line', label: '卡片', value: 'card' },
          { icon: 'i-mingcute-list-check-line', label: '列表', value: 'list' },
          { icon: 'i-mingcute-grid-2-line', label: '密网', value: 'grid' },
        ]}
        onChange={setV}
      />
    </Specimen>
  )
}
