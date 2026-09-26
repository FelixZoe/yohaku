import { measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext'

const BORDER_X = 2
const PADDING_LEFT = 6
const PADDING_RIGHT = 8
const ICON_WIDTH = 32
const ICON_BODY_GAP = 8
const EYEBROW_GAP = 4
const INK_METER_WIDTH = 11
const SAFETY_PX = 1

const CHROME_WIDTH =
  BORDER_X + PADDING_LEFT + ICON_WIDTH + ICON_BODY_GAP + PADDING_RIGHT

const textWidth = (text: string, el: Element) => {
  if (!text) return 0
  const cs = getComputedStyle(el)
  return measureNaturalWidth(
    prepareWithSegments(
      text,
      `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      { letterSpacing: Number.parseFloat(cs.letterSpacing) || 0 },
    ),
  )
}

export const measureTicketWidth = ({
  hasMeter,
  stateEl,
  stateText,
  subEl,
  subtitle,
  title,
  titleEl,
}: {
  hasMeter: boolean
  stateEl: Element
  stateText: string
  subEl: Element | null
  subtitle: string
  title: string
  titleEl: Element
}) => {
  const eyebrowWidth =
    (hasMeter ? INK_METER_WIDTH + EYEBROW_GAP : 0) +
    textWidth(stateText.toUpperCase(), stateEl) +
    (subtitle && subEl
      ? EYEBROW_GAP +
        textWidth('·', subEl) +
        EYEBROW_GAP +
        textWidth(subtitle, subEl)
      : 0)
  const titleWidth = textWidth(title, titleEl)

  return (
    Math.ceil(CHROME_WIDTH + Math.max(eyebrowWidth, titleWidth)) + SAFETY_PX
  )
}
