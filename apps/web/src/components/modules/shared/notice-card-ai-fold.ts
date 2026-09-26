export function aiNoticeChipLabel(label: string): string {
  return label.replace(/[:：·\s]+$/u, '')
}

export function aiNoticeTrail(chipLabels: string[]): string | null {
  if (chipLabels.length === 0) return null
  return chipLabels.join(' · ')
}
