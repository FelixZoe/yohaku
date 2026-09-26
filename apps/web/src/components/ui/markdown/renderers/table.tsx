import type { FC, JSX } from 'react'
import * as React from 'react'

import { clsxm } from '~/lib/helper'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'

export const MTable: FC<JSX.IntrinsicElements['table']> = (props) => {
  const { className, ...rest } = props
  return (
    <div className="rich-table-scroll my-5 w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <table
        {...rest}
        className={clsxm(
          'my-0 w-max min-w-full border-collapse text-[1em] [&_p]:my-1! [&_tr:last-child_td]:border-b-0',
          className,
        )}
      />
    </div>
  )
}

export const MTableHead: FC<JSX.IntrinsicElements['thead']> = (props) => {
  const { children, className, ...rest } = props
  return (
    <thead className={clsxm('border-b-0', className)} {...rest}>
      {children}
    </thead>
  )
}

export const MTableRow: FC<JSX.IntrinsicElements['tr']> = (props) => {
  const { children, className, ...rest } = props
  return (
    <tr className={clsxm('border-b-0', className)} {...rest}>
      {children}
    </tr>
  )
}

export const MTableBody: FC<JSX.IntrinsicElements['tbody']> = (props) => {
  const { children, ...rest } = props
  return <tbody {...rest}>{children}</tbody>
}

export const MTableTd: FC<JSX.IntrinsicElements['td']> = (props) => {
  const { children, className, ...rest } = props
  return (
    <WrappedElementProvider
      as="td"
      className={clsxm(
        'whitespace-nowrap border-b border-neutral-3/50 py-1.5 pr-4 pl-0 align-top text-neutral-9',
        className,
      )}
      {...rest}
    >
      {children}
    </WrappedElementProvider>
  )
}

export const MTableTh: FC<JSX.IntrinsicElements['th']> = (props) => {
  const { children, className, ...rest } = props
  return (
    <th
      className={clsxm(
        'whitespace-nowrap border-b border-neutral-3 pr-4 pb-1.5 pl-0 text-left align-bottom font-sans text-[0.82em] font-medium tracking-wider text-neutral-7',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}
