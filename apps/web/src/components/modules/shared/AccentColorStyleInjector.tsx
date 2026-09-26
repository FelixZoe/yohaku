import { generateAccentColorStyle } from '~/lib/accent-color'

const accentColorLight = [
  '#C56473', // 梅 ume — rose red (主)
  '#745399', // 江戸紫 edomurasaki — purple-blue
  '#76712C', // 鶯色 uguisuiro — olive
  '#9C5728', // 代赭 taisha — burnt sienna
  '#C87833', // 金茶 kincha — golden orange
]
const accentColorDark = [
  '#E095A4', // 梅淡 — light ume
  '#A088BB', // 江戸紫淡 — light edomurasaki
  '#ACA559', // 鶯色淡 — light uguisuiro
  '#C7864F', // 代赭淡 — light taisha
  '#E2A06A', // 金茶淡 — light kincha
]
const defaultAccentColor = { light: accentColorLight, dark: accentColorDark }

export async function AccentColorStyleInjector({
  color,
}: {
  color?: AccentColor
}) {
  const { light, dark } = color || defaultAccentColor

  const lightColors = light ?? accentColorLight
  const darkColors = dark ?? accentColorDark

  const Length = Math.max(lightColors.length ?? 0, darkColors.length ?? 0)
  const randomSeedRef = (Math.random() * Length) | 0
  const currentAccentColorLRef = lightColors[randomSeedRef]
  const currentAccentColorDRef = darkColors[randomSeedRef]

  const cssContent = await generateAccentColorStyle({
    colors: {
      light: currentAccentColorLRef,
      dark: currentAccentColorDRef,
    },
    useThemedClass: false,
  })

  return (
    <style
      data-dark={currentAccentColorDRef}
      data-light={currentAccentColorLRef}
      id="accent-color-style"
      dangerouslySetInnerHTML={{
        __html: cssContent,
      }}
    />
  )
}
