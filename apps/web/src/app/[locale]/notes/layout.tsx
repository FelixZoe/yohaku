import type { PropsWithChildren } from 'react'

export default async (props: PropsWithChildren) => (
  <div className="relative">{props.children}</div>
)
