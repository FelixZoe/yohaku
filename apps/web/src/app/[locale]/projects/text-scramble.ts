const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+?@'

export function buildScrambleFrame(
  text: string,
  random: () => number = Math.random,
): string {
  return text
    .split('')
    .map((char) => {
      if (/\s/.test(char)) {
        return char
      }

      const index = Math.floor(random() * SCRAMBLE_CHARS.length)
      return SCRAMBLE_CHARS[index] || char
    })
    .join('')
}
