import '@blocknote/core/fonts/inter.css'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import type { PartialBlock } from '@blocknote/core'

/**
 * The heavy half of the rich text field (F-07b): it pulls in BlockNote and is
 * loaded lazily by `RichTextField` only when a rich text editor actually mounts,
 * so the app shell and non-rich-text forms stay lean.
 */
export interface BlockNoteEditorControlProps {
  initialContent: unknown[]
  editable: boolean
  dir?: 'ltr' | 'rtl'
  onChange: (blocks: unknown[]) => void
}

function currentTheme(): 'light' | 'dark' {
  if (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  ) {
    return 'dark'
  }
  return 'light'
}

export function BlockNoteEditorControl({
  initialContent,
  editable,
  dir,
  onChange,
}: BlockNoteEditorControlProps) {
  const editor = useCreateBlockNote(
    { initialContent: initialContent as PartialBlock[] },
    [],
  )

  return (
    <div dir={dir} data-testid="rich-text-editor" className="blocknote-wrapper">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={currentTheme()}
        onChange={() => onChange(editor.document as unknown[])}
      />
    </div>
  )
}
