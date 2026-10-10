import { lazy, Suspense, useMemo } from 'react'

import { normalizeRichTextDocument } from '@/lib/records/rich-text'

const LazyBlockNoteEditor = lazy(() =>
  import('./blocknote-editor').then((module) => ({
    default: module.BlockNoteEditorControl,
  })),
)

export interface RichTextFieldProps {
  value: unknown
  editable?: boolean
  /** Text direction; defaults to the document direction (F-20/F-21). */
  dir?: 'ltr' | 'rtl'
  onChange: (blocks: unknown[]) => void
  /** Accessible name for the editor region. */
  ariaLabel?: string
}

function resolveDir(dir?: 'ltr' | 'rtl'): 'ltr' | 'rtl' {
  if (dir) return dir
  if (typeof document !== 'undefined') {
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  }
  return 'ltr'
}

/**
 * The rich text / block content editor control (F-07b). Content is stored as a
 * BlockNote document (an array of blocks). The heavy BlockNote bundle is loaded
 * lazily and only when an editor actually mounts; storage and validation never
 * depend on it.
 */
export function RichTextField({
  value,
  editable = true,
  dir,
  onChange,
  ariaLabel = 'Rich text',
}: RichTextFieldProps) {
  const initialContent = useMemo(
    () => normalizeRichTextDocument(value),
    [value],
  )

  return (
    <Suspense
      fallback={
        <div
          role="status"
          data-testid="rich-text-loading"
          className="text-muted-foreground rounded-md border px-3 py-6 text-center text-sm"
        >
          Loading rich text editor…
        </div>
      }
    >
      <div role="group" aria-label={ariaLabel}>
        <LazyBlockNoteEditor
          initialContent={initialContent}
          editable={editable}
          dir={resolveDir(dir)}
          onChange={onChange}
        />
      </div>
    </Suspense>
  )
}
