import { describe, expect, it } from 'vitest'
import {
  addField,
  advancedRootKeys,
  applyFieldType,
  isDocEditable,
  moveField,
  readFields,
  readRequired,
  removeField,
  removeFields,
  renameField,
  reorderField,
  setAdditionalProperties,
  setFieldRequired,
  setRootTitle,
  toDocument,
  toggleRequired,
  uniqueFieldName,
  updateFieldSchema,
} from './builder-doc'

function objectDoc(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return { type: 'object', properties, required }
}

describe('builder-doc', () => {
  it('parses text into a document, falling back to {} when invalid', () => {
    expect(toDocument('{"type":"object"}')).toEqual({ type: 'object' })
    expect(toDocument('{ broken')).toEqual({})
  })

  it('reads fields with type, required and advanced flags', () => {
    const doc = objectDoc(
      {
        name: { type: 'string' },
        tags: { type: 'array' },
        body: { type: 'array', 'x-schema-studio': { kind: 'richText' } },
        weird: { type: 'string', pattern: '^a$' },
      },
      ['name'],
    )
    const fields = readFields(doc)
    expect(fields.map((field) => field.key)).toEqual([
      'name',
      'tags',
      'body',
      'weird',
    ])
    expect(fields[0].required).toBe(true)
    expect(fields[2].type).toBe('richText')
    expect(fields[2].hasAdvancedKeywords).toBe(false)
    expect(fields[3].hasAdvancedKeywords).toBe(true)
  })

  it('reports a non-object root as not editable', () => {
    expect(isDocEditable({ type: 'string' })).toBe(false)
    expect(isDocEditable({ type: 'object', properties: {} })).toBe(true)
  })

  it('adds fields with unique names', () => {
    const first = addField(objectDoc({}))
    expect(first.key).toBe('field')
    expect(first.doc.properties).toEqual({ field: { type: 'string' } })

    const second = addField(first.doc)
    expect(second.key).toBe('field1')
    expect(uniqueFieldName({ field: {}, field1: {} })).toBe('field2')
  })

  it('adds a typed field and uses applyFieldType defaults', () => {
    const numeric = addField(objectDoc({}), 'count', 'integer')
    expect(numeric.doc.properties).toEqual({ count: { type: 'integer' } })
    const rich = addField(objectDoc({}), 'body', 'richText')
    expect(rich.doc.properties).toEqual({
      body: { type: 'array', 'x-schema-studio': { kind: 'richText' } },
    })
  })

  it('removes several fields and their required entries at once', () => {
    const doc = objectDoc(
      { a: { type: 'string' }, b: {}, c: {} },
      ['a', 'b', 'c'],
    )
    const next = removeFields(doc, ['b', 'c'])
    expect(next.properties).toEqual({ a: { type: 'string' } })
    expect(next.required).toEqual(['a'])
    expect(removeFields(doc, [])).toBe(doc)
  })

  it('reorders a field to an absolute index (drag-and-drop)', () => {
    const doc = objectDoc({ a: {}, b: {}, c: {} })
    expect(
      Object.keys(reorderField(doc, 'c', 0).properties as object),
    ).toEqual(['c', 'a', 'b'])
    expect(
      Object.keys(reorderField(doc, 'a', 4).properties as object),
    ).toEqual(['b', 'c', 'a'])
    expect(reorderField(doc, 'b', 1)).toBe(doc)
    expect(reorderField(doc, 'missing', 0)).toBe(doc)
  })

  it('removes a field and its required entry', () => {
    const doc = objectDoc({ a: { type: 'string' }, b: {} }, ['a'])
    const next = removeField(doc, 'a')
    expect(next.properties).toEqual({ b: {} })
    expect(next.required).toEqual([])
  })

  it('renames a field and updates required', () => {
    const doc = objectDoc({ a: { type: 'string' } }, ['a'])
    const next = renameField(doc, 'a', 'b')
    expect(next.properties).toEqual({ b: { type: 'string' } })
    expect(next.required).toEqual(['b'])
  })

  it('never renames onto an existing name', () => {
    const doc = objectDoc({ a: {}, b: {} })
    expect(renameField(doc, 'a', 'b')).toBe(doc)
  })

  it('reorders fields within bounds', () => {
    const doc = objectDoc({ a: {}, b: {}, c: {} })
    expect(Object.keys(moveField(doc, 'c', -1).properties as object)).toEqual([
      'a',
      'c',
      'b',
    ])
    expect(moveField(doc, 'a', -1)).toBe(doc)
    expect(moveField(doc, 'c', 1)).toBe(doc)
  })

  it('toggles and sets required idempotently', () => {
    const doc = objectDoc({ a: {} })
    expect(readRequired(toggleRequired(doc, 'a'))).toEqual(['a'])
    expect(readRequired(toggleRequired(toggleRequired(doc, 'a'), 'a'))).toEqual([])
    expect(readRequired(setFieldRequired(doc, 'a', true))).toEqual(['a'])
    expect(setFieldRequired(doc, 'a', false)).toBe(doc)
  })

  it('updates a single field schema immutably', () => {
    const doc = objectDoc({ a: { type: 'string' } })
    const next = updateFieldSchema(doc, 'a', (schema) => {
      schema.description = 'hello'
    })
    expect(next.properties).toEqual({
      a: { type: 'string', description: 'hello' },
    })
    expect(doc.properties).toEqual({ a: { type: 'string' } })
  })

  it('applies core and rich text field types', () => {
    const schema: Record<string, unknown> = {}
    applyFieldType(schema, 'integer')
    expect(schema).toEqual({ type: 'integer' })
    applyFieldType(schema, 'richText')
    expect(schema).toEqual({
      type: 'array',
      'x-schema-studio': { kind: 'richText' },
    })
    applyFieldType(schema, 'boolean')
    expect(schema).toEqual({ type: 'boolean' })
    expect(schema['x-schema-studio']).toBeUndefined()
  })

  it('manages root settings (additionalProperties, title)', () => {
    const doc = objectDoc({})
    expect(setAdditionalProperties(doc, false).additionalProperties).toBe(false)
    expect(setRootTitle(doc, 'Person').title).toBe('Person')
    expect('title' in setRootTitle({ ...doc, title: 'x' }, '  ')).toBe(false)
    expect(advancedRootKeys(doc)).toEqual([])
    expect(advancedRootKeys({ ...doc, patternProperties: {} })).toEqual([
      'patternProperties',
    ])
  })
})
