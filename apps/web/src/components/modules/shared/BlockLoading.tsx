import { clsxm } from '~/lib/helper'

export const BlockLoading: Component<{
  style?: React.CSSProperties
}> = (props) => (
  <div
    style={props.style}
    className={clsxm(
      'flex h-[500px] items-center justify-center rounded-lg bg-neutral-2 text-copy-13',
      props.className,
    )}
  >
    {props.children}
  </div>
)
