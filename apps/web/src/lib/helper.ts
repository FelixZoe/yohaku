import { createCn } from 'cn/config'

export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'caption-10',
            'label-12',
            'copy-13',
            'copy-14',
            'copy-15',
            'copy-16',
            'title-20',
            'title-24',
            'title-28',
            'display-36',
            'display-48',
            'icon-sm',
            'icon-md',
            'icon-lg',
          ],
        },
      ],
    },
  },
})

export const clsxm = cn
export const clsx = cn
export const safeJsonParse = (str: string) => {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}
