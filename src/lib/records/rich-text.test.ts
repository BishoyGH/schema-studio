import { describe, expect, it } from 'vitest'

import {
  emptyRichTextDocument,
  isRichTextDocument,
  normalizeRichTextDocument,
  richTextPlainText,
} from './rich-text'

describe('rich text helpers', () => {
  it('provides a valid empty document', () => {
    expect(emptyRichTextDocument()).toEqual([{ type: 'paragraph', content: [] }])
    expect(isRichTextDocument(emptyRichTextDocument())).toBe(true)
  })

  it('normalizes missing or malformed values to an empty document', () => {
    expect(normalizeRichTextDocument(undefined)).toEqual(emptyRichTextDocument())
    expect(normalizeRichTextDocument('nope')).toEqual(emptyRichTextDocument())
    const doc = [{ type: 'paragraph' }]
    expect(normalizeRichTextDocument(doc)).toBe(doc)
  })

  it('flattens a document to plain text for labels', () => {
    const doc = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello' , styles: {} }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'world', styles: {} },
          { type: 'text', text: '!', styles: {} },
        ],
      },
    ]
    expect(richTextPlainText(doc)).toBe('Hello world!')
  })

  it('ignores non-block entries and empty documents', () => {
    expect(richTextPlainText(undefined)).toBe('')
    expect(richTextPlainText([{ type: 'paragraph', content: [] }])).toBe('')
    expect(richTextPlainText([1, 'x', null])).toBe('')
  })
})
