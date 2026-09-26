'use client'

import { AnimatePresence, LayoutGroup, m } from 'motion/react'
import { AnimateView } from 'motion/react-animate-view'
import { startTransition, useState } from 'react'

import { Column, easeOut, Lab, Toggle, viewTransition } from './_chrome'

const notes = ['潮汐', '纸边', '夜航', '留白']
const rows = ['岸边', '余白', '航线', '札记']

export function HeightLab() {
  return (
    <Lab id="height">
      <PresenceHeight />
      <ViewHeight />
    </Lab>
  )
}

function Body() {
  return (
    <p className="py-2 text-copy-13 leading-[1.7] text-neutral-8">
      折叠正文。高度跟着内容走，下文等它收完再上来。
    </p>
  )
}

function PresenceHeight() {
  const [on, setOn] = useState(true)

  return (
    <Column
      action={<Toggle onClick={() => setOn((value) => !value)}>折叠</Toggle>}
      title="AnimatePresence"
    >
      <AnimatePresence initial={false}>
        {on && (
          <m.div
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <Body />
          </m.div>
        )}
      </AnimatePresence>
      <p className="text-copy-13 text-neutral-5">下文</p>
    </Column>
  )
}

function ViewHeight() {
  const [on, setOn] = useState(true)

  return (
    <Column
      title="AnimateView"
      action={
        <Toggle onClick={() => startTransition(() => setOn((value) => !value))}>
          折叠
        </Toggle>
      }
    >
      {on && (
        <AnimateView
          enter={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={viewTransition}
        >
          <Body />
        </AnimateView>
      )}
      <p className="text-copy-13 text-neutral-5">下文</p>
    </Column>
  )
}

export function WidthLab() {
  return (
    <Lab id="width">
      <PresenceWidth />
      <ViewWidth />
    </Lab>
  )
}

function PresenceWidth() {
  const [on, setOn] = useState(false)

  return (
    <Column
      action={<Toggle onClick={() => setOn((value) => !value)}>展开</Toggle>}
      title="AnimatePresence"
    >
      <div className="flex justify-end">
        <AnimatePresence initial={false}>
          {on && (
            <m.div
              animate={{ opacity: 1, width: 48 }}
              className="overflow-hidden"
              exit={{ opacity: 0, width: 0 }}
              initial={{ opacity: 0, width: 0 }}
              style={{ transformOrigin: 'right center' }}
              transition={{ duration: 0.28, ease: easeOut }}
            >
              <Chip />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </Column>
  )
}

function ViewWidth() {
  const [on, setOn] = useState(false)

  return (
    <Column
      title="AnimateView"
      action={
        <Toggle onClick={() => startTransition(() => setOn((value) => !value))}>
          展开
        </Toggle>
      }
    >
      <div className="flex justify-end">
        {on && (
          <AnimateView
            transition={viewTransition}
            enter={{
              opacity: 1,
              transform: ['scaleX(0)', 'scaleX(1)'],
              transformOrigin: 'right center',
            }}
            exit={{
              opacity: 0,
              transform: ['scaleX(1)', 'scaleX(0)'],
              transformOrigin: 'right center',
            }}
          >
            <Chip />
          </AnimateView>
        )}
      </div>
    </Column>
  )
}

function Chip() {
  return (
    <div className="grid h-8 w-12 place-items-center rounded-md bg-neutral-3 text-copy-13 text-neutral-8">
      顶
    </div>
  )
}

export function PathLab() {
  return (
    <Lab id="path">
      <PresencePath />
      <ViewPath />
    </Lab>
  )
}

function Check() {
  return (
    <svg
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.5 12.75l6 6 9-13.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PresencePath() {
  const [on, setOn] = useState(false)

  return (
    <Column
      action={<Toggle onClick={() => setOn((value) => !value)}>勾选</Toggle>}
      title="AnimatePresence"
    >
      <button
        className="grid size-5 place-items-center rounded border border-neutral-4 text-neutral-9"
        type="button"
        onClick={() => setOn((value) => !value)}
      >
        <AnimatePresence mode="wait">
          {on && (
            <m.svg
              animate="checked"
              className="size-3"
              exit="unchecked"
              fill="none"
              initial="unchecked"
              stroke="currentColor"
              strokeWidth="3.5"
              viewBox="0 0 24 24"
            >
              <m.path
                d="M4.5 12.75l6 6 9-13.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                transition={{ duration: 0.2 }}
                variants={{
                  checked: { pathLength: 1, opacity: 1 },
                  unchecked: { pathLength: 0, opacity: 0 },
                }}
              />
            </m.svg>
          )}
        </AnimatePresence>
      </button>
    </Column>
  )
}

function ViewPath() {
  const [on, setOn] = useState(false)

  return (
    <Column
      title="AnimateView"
      action={
        <Toggle onClick={() => startTransition(() => setOn((value) => !value))}>
          勾选
        </Toggle>
      }
    >
      <button
        className="grid size-5 place-items-center rounded border border-neutral-4 text-neutral-9"
        type="button"
        onClick={() => startTransition(() => setOn((value) => !value))}
      >
        {on && (
          <AnimateView
            enter={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Check />
          </AnimateView>
        )}
      </button>
    </Column>
  )
}

export function ListLab() {
  return (
    <Lab id="list">
      <PresenceList />
      <ViewList />
    </Lab>
  )
}

function PresenceList() {
  const [items, setItems] = useState(rows)

  return (
    <Column
      title="AnimatePresence"
      action={
        <>
          <Toggle onClick={() => setItems((value) => value.slice(1))}>
            去掉
          </Toggle>
          <Toggle onClick={() => setItems(rows)}>恢复</Toggle>
        </>
      }
    >
      <ul>
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <m.li
              layout
              animate={{ opacity: 1, y: 0 }}
              className="border-b border-neutral-3 py-2 text-copy-13 text-neutral-8"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              key={item}
              transition={{ duration: 0.28, ease: easeOut }}
            >
              {item}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </Column>
  )
}

function ViewList() {
  const [items, setItems] = useState(rows)

  return (
    <Column
      title="AnimateView"
      action={
        <>
          <Toggle
            onClick={() =>
              startTransition(() => setItems((value) => value.slice(1)))
            }
          >
            去掉
          </Toggle>
          <Toggle onClick={() => startTransition(() => setItems(rows))}>
            恢复
          </Toggle>
        </>
      }
    >
      <ul>
        {items.map((item) => (
          <AnimateView
            key={item}
            transition={viewTransition}
            enter={{
              opacity: 1,
              transform: ['translateY(6px)', 'translateY(0px)'],
            }}
            exit={{
              opacity: 0,
              transform: ['translateY(0px)', 'translateY(-6px)'],
            }}
          >
            <li className="border-b border-neutral-3 py-2 text-copy-13 text-neutral-8">
              {item}
            </li>
          </AnimateView>
        ))}
      </ul>
    </Column>
  )
}

export function BracketLab() {
  return (
    <Lab id="bracket">
      <PresenceBracket />
      <ViewBracket />
    </Lab>
  )
}

function PresenceBracket() {
  const [active, setActive] = useState(0)

  return (
    <Column title="AnimatePresence">
      <LayoutGroup id="presence-brackets">
        <div>
          {notes.map((note, index) => (
            <button
              className="flex h-8 w-full items-center text-copy-13 text-neutral-8"
              key={note}
              type="button"
              onClick={() => setActive(index)}
            >
              {active === index && (
                <m.span className="text-accent" layoutId="presence-bracket-l">
                  「
                </m.span>
              )}
              <span>{note}</span>
              {active === index && (
                <m.span className="text-accent" layoutId="presence-bracket-r">
                  」
                </m.span>
              )}
            </button>
          ))}
        </div>
      </LayoutGroup>
    </Column>
  )
}

function ViewBracket() {
  const [active, setActive] = useState(0)

  return (
    <Column title="AnimateView">
      <div>
        {notes.map((note, index) => (
          <button
            className="flex h-8 w-full items-center text-copy-13 text-neutral-8"
            key={note}
            type="button"
            onClick={() => startTransition(() => setActive(index))}
          >
            {active === index && (
              <AnimateView name="demo-bracket-l" transition={viewTransition}>
                <span className="text-accent">「</span>
              </AnimateView>
            )}
            <span>{note}</span>
            {active === index && (
              <AnimateView name="demo-bracket-r" transition={viewTransition}>
                <span className="text-accent">」</span>
              </AnimateView>
            )}
          </button>
        ))}
      </div>
    </Column>
  )
}
