import { describe, expect, it } from 'vitest'
import {
  describeJsonParseError,
  emptySchemaFormValues,
  findJsonSchemaError,
  parseJsonSchema,
  positionToLineColumn,
  schemaFormSchema,
} from './validation'

const validValues = {
  name: 'Person',
  description: 'A person record',
  draft: '2020-12' as const,
  jsonSchema: JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['name'],
  }),
}

function firstMessage(result: ReturnType<typeof schemaFormSchema.safeParse>) {
  return result.success
    ? undefined
    : result.error.issues.map((issue) => issue.message).join('; ')
}

describe('schemaFormSchema', () => {
  it('accepts a valid schema form', () => {
    const result = schemaFormSchema.safeParse(validValues)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Person')
      expect(result.data.draft).toBe('2020-12')
    }
  })

  it('trims whitespace around the name', () => {
    const result = schemaFormSchema.safeParse({
      ...validValues,
      name: '  Person  ',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Person')
  })

  it('rejects an empty name', () => {
    const result = schemaFormSchema.safeParse({ ...validValues, name: '   ' })

    expect(result.success).toBe(false)
    expect(firstMessage(result)).toMatch(/name is required/i)
  })

  it('rejects a name longer than 64 characters', () => {
    const result = schemaFormSchema.safeParse({
      ...validValues,
      name: 'x'.repeat(65),
    })

    expect(result.success).toBe(false)
    expect(firstMessage(result)).toMatch(/64 characters/i)
  })

  it('rejects malformed JSON', () => {
    const result = schemaFormSchema.safeParse({
      ...validValues,
      jsonSchema: '{ not valid json',
    })

    expect(result.success).toBe(false)
    expect(firstMessage(result)).toMatch(/invalid json/i)
  })

  it('rejects a JSON array as the schema document', () => {
    const result = schemaFormSchema.safeParse({
      ...validValues,
      jsonSchema: '[1, 2, 3]',
    })

    expect(result.success).toBe(false)
    expect(firstMessage(result)).toMatch(/must be an object/i)
  })

  it('rejects an unknown type keyword', () => {
    const result = schemaFormSchema.safeParse({
      ...validValues,
      jsonSchema: JSON.stringify({ type: 'text' }),
    })

    expect(result.success).toBe(false)
    expect(firstMessage(result)).toMatch(/\.type must be/i)
  })

  it('rejects required entries that are not strings', () => {
    const result = schemaFormSchema.safeParse({
      ...validValues,
      jsonSchema: JSON.stringify({ type: 'object', required: [1, 2] }),
    })

    expect(result.success).toBe(false)
    expect(firstMessage(result)).toMatch(/required must be an array of strings/i)
  })
})

describe('findJsonSchemaError', () => {
  it('returns null for a valid nested schema', () => {
    expect(
      findJsonSchemaError(
        {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: { city: { type: 'string' } },
            },
          },
        },
        'schema',
      ),
    ).toBeNull()
  })

  it('reports the path of an invalid nested property', () => {
    expect(
      findJsonSchemaError(
        { type: 'object', properties: { age: { type: 'numberr' } } },
        'schema',
      ),
    ).toMatch(/schema\.age\.type/)
  })

  it('rejects non-object input', () => {
    expect(findJsonSchemaError('nope', 'schema')).toMatch(/must be an object/i)
  })
})

describe('parseJsonSchema', () => {
  it('parses a valid schema object', () => {
    const result = parseJsonSchema('{"type":"string"}')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ type: 'string' })
  })

  it('fails on empty input', () => {
    const result = parseJsonSchema('   ')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/required/i)
  })

  it('reports the line and column of a JSON parse error', () => {
    const text = '{\n  "type": "object",\n  "properties": {\n}'
    const error = (() => {
      try {
        JSON.parse(text)
        return null
      } catch (caught) {
        return caught
      }
    })()

    const message = describeJsonParseError(text, error)
    expect(message).toMatch(/invalid json/i)
    expect(message).toMatch(/line \d+, column \d+/)
  })
})

describe('positionToLineColumn', () => {
  it('maps a position on the first line to column N', () => {
    expect(positionToLineColumn('abc', 0)).toEqual({ line: 1, column: 1 })
    expect(positionToLineColumn('abc', 2)).toEqual({ line: 1, column: 3 })
  })

  it('maps positions after newlines to the correct line', () => {
    expect(positionToLineColumn('a\nbc', 2)).toEqual({ line: 2, column: 1 })
    expect(positionToLineColumn('a\nbc', 3)).toEqual({ line: 2, column: 2 })
  })

  it('clamps out-of-range positions to the text length', () => {
    expect(positionToLineColumn('ab', 99)).toEqual({ line: 1, column: 3 })
  })
})

describe('emptySchemaFormValues', () => {
  it('prefills a draft-appropriate $schema', () => {
    const values = emptySchemaFormValues('draft-07')
    const parsed = JSON.parse(values.jsonSchema) as { $schema: string }

    expect(values.name).toBe('')
    expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#')
  })
})
