import { EmojiPicker } from '@ferrucc-io/emoji-picker'
import type { FC } from 'react'
import { memo } from 'react'

export const EmojiPickerComponent: FC<{
  onEmojiSelect: (emoji: string) => void
}> = memo(({ onEmojiSelect }) => {
  return (
    <EmojiPicker
      className="w-auto overflow-hidden rounded border-0 bg-neutral-1 shadow-none md:border-border md:w-[400px] md:shadow"
      emojiSize={28}
      emojisPerRow={12}
      onEmojiSelect={(e) => onEmojiSelect(e)}
    >
      <EmojiPicker.Group>
        <EmojiPicker.List />
      </EmojiPicker.Group>
    </EmojiPicker>
  )
})

export { EmojiPickerComponent as EmojiPicker }
