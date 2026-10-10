/**
 * Helpers for the rich text / block content field type (F-07b).
 *
 * Content is stored as a BlockNote document — an array of block objects — inside
 * the record's `data`. These helpers keep the record layer free of any direct
 * dependency on `@blocknote/*` (which is loaded lazily only when an editor is
 * actually rendered), so storage, validation, and labels stay lightweight.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A minimal, valid BlockNote document: one empty paragraph. */
export function emptyRichTextDocument(): unknown[] {
  return [{ type: 'paragraph', content: [] }]
}

/**
 * Coerce a stored value into a BlockNote `initialContent` array. Older/partial
 * data is repaired to an empty document rather than letting the editor crash.
 */
export function normalizeRichTextDocument(value: unknown): unknown[] {
  return Array.isArray(value) ? value : emptyRichTextDocument()
}

/** Whether a value is shaped like a rich text document (array of blocks). */
export function isRichTextDocument(value: unknown): boolean {
  return Array.isArray(value)
}

function inlineText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const node of content) {
    if (isPlainObject(node) && typeof node.text === 'string') text += node.text
  }
  return text
}

/** Flatten a rich text document to plain text, for record labels and previews. */
export function richTextPlainText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  const lines: string[] = []
  for (const block of value) {
    if (!isPlainObject(block)) continue
    const text = inlineText(block.content)
    if (text.trim()) lines.push(text.trim())
  }
  return lines.join(' ').trim()
}
