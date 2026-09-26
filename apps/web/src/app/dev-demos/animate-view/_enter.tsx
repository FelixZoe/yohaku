'use client'

import { AnimatePresence, m } from 'motion/react'
import { AnimateView } from 'motion/react-animate-view'
import { type ReactNode, startTransition, useState } from 'react'

import { Column, easeOut, Lab, Toggle, viewTransition } from './_chrome'

const titles = ['序 · 纸边', '航线', '余白']

export function FadeLab() {
  return (
    <Lab id="fade">
      <PresenceFade />
      <ViewFade />
    </Lab>
  )
}

function PresenceFade() {
  const [on, setOn] = useState(false)

  return (
    <Column
      title="AnimatePresence"
      action={
        <>
          <Toggle onClick={() => setOn((value) => !value)}>开关</Toggle>
          <Toggle
            onClick={() => {
              setOn((value) => !value)
              window.setTimeout(() => setOn((value) => !value), 70)
            }}
          >
            连点
          </Toggle>
        </>
      }
    >
      <AnimatePresence>
        {on && (
          <m.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            <Pill />
          </m.div>
        )}
      </AnimatePresence>
    </Column>
  )
}

function ViewFade() {
  const [on, setOn] = useState(false)

  return (
    <Column
      title="AnimateView"
      action={
        <>
          <Toggle
            onClick={() => startTransition(() => setOn((value) => !value))}
          >
            开关
          </Toggle>
          <Toggle
            onClick={() => {
              startTransition(() => setOn((value) => !value))
              window.setTimeout(
                () => startTransition(() => setOn((value) => !value)),
                70,
              )
            }}
          >
            连点
          </Toggle>
        </>
      }
    >
      {on && (
        <AnimateView
          transition={viewTransition}
          enter={{
            opacity: 1,
            transform: [
              'translateY(8px) scale(0.96)',
              'translateY(0px) scale(1)',
            ],
          }}
          exit={{
            opacity: 0,
            transform: [
              'translateY(0px) scale(1)',
              'translateY(8px) scale(0.98)',
            ],
          }}
        >
          <Pill />
        </AnimateView>
      )}
    </Column>
  )
}

function Pill() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-neutral-3 bg-paper px-4 py-2 text-copy-13 text-neutral-9">
      切换到中文
      <span className="text-neutral-5">发送</span>
    </div>
  )
}

export function PopoverLab() {
  return (
    <Lab id="popover">
      <PresencePopover />
      <ViewPopover />
    </Lab>
  )
}

function PresencePopover() {
  const [on, setOn] = useState(false)

  return (
    <Column
      action={<Toggle onClick={() => setOn((value) => !value)}>开关</Toggle>}
      title="AnimatePresence"
    >
      <div className="relative h-28">
        <span className="text-copy-13 text-neutral-7">锚点</span>
        <AnimatePresence>
          {on && (
            <m.div
              animate={{ opacity: 1, scaleY: 1 }}
              className="absolute left-0 top-8 w-44 origin-top rounded-xl border border-neutral-3 bg-paper p-3 text-copy-13 text-neutral-8 shadow"
              exit={{ opacity: 0, scaleY: 0.8 }}
              initial={{ opacity: 0, scaleY: 0.8 }}
              transition={{ duration: 0.25, ease: easeOut }}
            >
              选区工具条
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </Column>
  )
}

function ViewPopover() {
  const [on, setOn] = useState(false)

  return (
    <Column
      title="AnimateView"
      action={
        <Toggle onClick={() => startTransition(() => setOn((value) => !value))}>
          开关
        </Toggle>
      }
    >
      <div className="relative h-28">
        <span className="text-copy-13 text-neutral-7">锚点</span>
        {on && (
          <AnimateView
            transition={{ duration: 0.25, ease: easeOut }}
            enter={{
              opacity: 1,
              transform: ['scaleY(0.8)', 'scaleY(1)'],
              transformOrigin: 'center top',
            }}
            exit={{
              opacity: 0,
              transform: ['scaleY(1)', 'scaleY(0.8)'],
              transformOrigin: 'center top',
            }}
          >
            <div className="absolute left-0 top-8 w-44 origin-top rounded-xl border border-neutral-3 bg-paper p-3 text-copy-13 text-neutral-8 shadow">
              选区工具条
            </div>
          </AnimateView>
        )}
      </div>
    </Column>
  )
}

export function DrawerLab() {
  return (
    <Lab id="drawer">
      <PresenceDrawer />
      <ViewDrawer />
    </Lab>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-52 overflow-hidden rounded-lg border border-neutral-3 bg-neutral-2">
      <p className="p-3 text-copy-13 text-neutral-6">页内</p>
      {children}
    </div>
  )
}

function PresenceDrawer() {
  const [on, setOn] = useState(false)

  return (
    <Column
      action={<Toggle onClick={() => setOn((value) => !value)}>开关</Toggle>}
      title="AnimatePresence"
    >
      <Frame>
        <AnimatePresence>
          {on && (
            <div key="drawer">
              <m.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/25"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-x-2 top-2 rounded-lg bg-paper p-4 text-copy-13 text-neutral-9 shadow"
                exit={{ opacity: 0, y: '-110%' }}
                initial={{ opacity: 0, y: '-110%' }}
                transition={{ duration: 0.28, ease: easeOut }}
              >
                菜单
              </m.div>
            </div>
          )}
        </AnimatePresence>
      </Frame>
    </Column>
  )
}

function ViewDrawer() {
  const [on, setOn] = useState(false)

  return (
    <Column
      title="AnimateView"
      action={
        <Toggle onClick={() => startTransition(() => setOn((value) => !value))}>
          开关
        </Toggle>
      }
    >
      <Frame>
        {on && (
          <>
            <AnimateView
              enter={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 bg-black/25" />
            </AnimateView>
            <AnimateView
              transition={viewTransition}
              enter={{
                opacity: 1,
                transform: ['translateY(-110%)', 'translateY(0px)'],
              }}
              exit={{
                opacity: 0,
                transform: ['translateY(0px)', 'translateY(-110%)'],
              }}
            >
              <div className="absolute inset-x-2 top-2 rounded-lg bg-paper p-4 text-copy-13 text-neutral-9 shadow">
                菜单
              </div>
            </AnimateView>
          </>
        )}
      </Frame>
    </Column>
  )
}

export function WaitLab() {
  return (
    <Lab id="wait">
      <PresenceWait />
      <ViewWait />
    </Lab>
  )
}

function PresenceWait() {
  const [index, setIndex] = useState(0)

  return (
    <Column
      title="AnimatePresence"
      action={
        <Toggle
          onClick={() => setIndex((value) => (value + 1) % titles.length)}
        >
          下一条
        </Toggle>
      }
    >
      <div className="relative h-5 overflow-hidden text-copy-13 text-neutral-8">
        <AnimatePresence initial={false} mode="wait">
          <m.span
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 truncate"
            exit={{ opacity: 0, y: -3 }}
            initial={{ opacity: 0, y: 3 }}
            key={titles[index]}
            transition={{ duration: 0.25, ease: easeOut }}
          >
            {titles[index]}
          </m.span>
        </AnimatePresence>
      </div>
    </Column>
  )
}

function ViewWait() {
  const [index, setIndex] = useState(0)

  return (
    <Column
      title="AnimateView"
      action={
        <Toggle
          onClick={() =>
            startTransition(() =>
              setIndex((value) => (value + 1) % titles.length),
            )
          }
        >
          下一条
        </Toggle>
      }
    >
      <div className="relative h-5 overflow-hidden text-copy-13 text-neutral-8">
        <AnimateView
          key={titles[index]}
          transition={{ duration: 0.25, ease: easeOut }}
          enter={{
            opacity: 1,
            transform: ['translateY(3px)', 'translateY(0px)'],
          }}
          exit={{
            opacity: 0,
            transform: ['translateY(0px)', 'translateY(-3px)'],
          }}
        >
          <span className="absolute inset-0 truncate">{titles[index]}</span>
        </AnimateView>
      </div>
    </Column>
  )
}

export function IconLab() {
  return (
    <Lab id="icon">
      <PresenceIcon />
      <ViewIcon />
    </Lab>
  )
}

function PresenceIcon() {
  const [on, setOn] = useState(false)

  return (
    <Column
      action={<Toggle onClick={() => setOn((value) => !value)}>交换</Toggle>}
      title="AnimatePresence"
    >
      <div className="grid size-7 place-items-center text-neutral-8">
        <AnimatePresence mode="popLayout">
          <m.i
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(2px)', scale: 0.97 }}
            initial={{ opacity: 0, filter: 'blur(2px)', scale: 0.97 }}
            key={on ? 'close' : 'menu'}
            className={
              on
                ? 'i-mingcute-close-line text-icon-md'
                : 'i-mingcute-menu-line text-icon-md'
            }
          />
        </AnimatePresence>
      </div>
    </Column>
  )
}

function ViewIcon() {
  const [on, setOn] = useState(false)

  return (
    <Column
      title="AnimateView"
      action={
        <Toggle onClick={() => startTransition(() => setOn((value) => !value))}>
          交换
        </Toggle>
      }
    >
      <div className="grid size-7 place-items-center text-neutral-8">
        <AnimateView
          key={on ? 'close' : 'menu'}
          transition={{ duration: 0.22 }}
          enter={{
            opacity: 1,
            filter: ['blur(2px)', 'blur(0px)'],
            transform: ['scale(0.97)', 'scale(1)'],
          }}
          exit={{
            opacity: 0,
            filter: ['blur(0px)', 'blur(2px)'],
            transform: ['scale(1)', 'scale(0.97)'],
          }}
        >
          <i
            className={
              on
                ? 'i-mingcute-close-line text-icon-md'
                : 'i-mingcute-menu-line text-icon-md'
            }
          />
        </AnimateView>
      </div>
    </Column>
  )
}
