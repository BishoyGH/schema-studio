import { describe, expect, it } from 'vitest'

import {
  isRichTextField,
  readSchemaStudioExtension,
  readUnknownExtensionKind,
  richTextFieldSchema,
  RICH_TEXT_KIND,
  SCHEMA_STUDIO_KEY,
} from './extension'

describe('x-schema-studio extension', () => {
  it('reads the rich text kind', () => {
    const schema = { type: 'array', [SCHEMA_STUDIO_KEY]: { kind: RICH_TEXT_KIND } }
    expect(readSchemaStudioExtension(schema)).toEqual({ kind: 'richText' })
    expect(isRichTextField(schema)).toBe(true)
  })

  it('returns null when the namespace is absent or malformed', () => {
    expect(readSchemaStudioExtension({ type: 'string' })).toBeNull()
    expect(readSchemaStudioExtension({ [SCHEMA_STUDIO_KEY]: 'nope' })).toBeNull()
    expect(
      readSchemaStudioExtension({ [SCHEMA_STUDIO_KEY]: { kind: 42 } }),
    ).toBeNull()
    expect(isRichTextField(null)).toBe(false)
  })

  it('reports unknown kinds (preserved but not interpreted)', () => {
    const schema = { [SCHEMA_STUDIO_KEY]: { kind: 'reference' } }
    expect(readSchemaStudioExtension(schema)).toBeNull()
    expect(isRichTextField(schema)).toBe(false)
    expect(readUnknownExtensionKind(schema)).toBe('reference')
  })

  it('does not report a known kind as unknown', () => {
    expect(
      readUnknownExtensionKind({ [SCHEMA_STUDIO_KEY]: { kind: RICH_TEXT_KIND } }),
    ).toBeNull()
  })

  it('builds a rich text field schema the reader recognises', () => {
    const schema = richTextFieldSchema()
    expect(schema.type).toBe('array')
    expect(isRichTextField(schema)).toBe(true)
  })
})
