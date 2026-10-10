import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { compileJsonSchema, jsonSchemaToZod } from './json-to-zod'

function parseOk(schema: ReturnType<typeof jsonSchemaToZod>, value: unknown) {
  return schema.schema.safeParse(value).success
}

describe('jsonSchemaToZod - primitives', () => {
  it('maps string, number, integer, boolean and null', () => {
    expect(parseOk(jsonSchemaToZod({ type: 'string' }), 'hi')).toBe(true)
    expect(parseOk(jsonSchemaToZod({ type: 'string' }), 1)).toBe(false)
    expect(parseOk(jsonSchemaToZod({ type: 'number' }), 1.5)).toBe(true)
    expect(parseOk(jsonSchemaToZod({ type: 'integer' }), 1.5)).toBe(false)
    expect(parseOk(jsonSchemaToZod({ type: 'boolean' }), true)).toBe(true)
    expect(parseOk(jsonSchemaToZod({ type: 'null' }), null)).toBe(true)
    expect(parseOk(jsonSchemaToZod({ type: 'null' }), 0)).toBe(false)
  })

  it('treats boolean schemas true/false as any/never', () => {
    expect(parseOk(jsonSchemaToZod(true), 'anything')).toBe(true)
    expect(parseOk(jsonSchemaToZod(false), 'anything')).toBe(false)
  })

  it('supports a union type array (nullable string)', () => {
    const { schema } = jsonSchemaToZod({ type: ['string', 'null'] })
    expect(schema.safeParse('x').success).toBe(true)
    expect(schema.safeParse(null).success).toBe(true)
    expect(schema.safeParse(1).success).toBe(false)
  })
})

describe('jsonSchemaToZod - string constraints', () => {
  it('applies minLength, maxLength, pattern and format', () => {
    const { schema } = jsonSchemaToZod({
      type: 'string',
      minLength: 2,
      maxLength: 4,
      pattern: '^[a-z]+$',
    })
    expect(schema.safeParse('abc').success).toBe(true)
    expect(schema.safeParse('a').success).toBe(false)
    expect(schema.safeParse('abcde').success).toBe(false)
    expect(schema.safeParse('ABC').success).toBe(false)
  })

  it('validates known formats like email', () => {
    const { schema } = jsonSchemaToZod({ type: 'string', format: 'email' })
    expect(schema.safeParse('a@b.co').success).toBe(true)
    expect(schema.safeParse('not-an-email').success).toBe(false)
  })

  it('reports an invalid pattern instead of throwing', () => {
    const { schema, unsupported } = jsonSchemaToZod({
      type: 'string',
      pattern: '(',
    })
    expect(unsupported.some((message) => message.includes('.pattern'))).toBe(true)
    expect(schema.safeParse('anything').success).toBe(true)
  })
})

describe('jsonSchemaToZod - number constraints', () => {
  it('applies minimum, maximum, exclusive bounds and multipleOf', () => {
    const { schema } = jsonSchemaToZod({
      type: 'number',
      minimum: 0,
      maximum: 10,
      exclusiveMinimum: 1,
      exclusiveMaximum: 9,
      multipleOf: 2,
    })
    expect(schema.safeParse(2).success).toBe(true)
    expect(schema.safeParse(1).success).toBe(false)
    expect(schema.safeParse(10).success).toBe(false)
    expect(schema.safeParse(3).success).toBe(false)
  })
})

describe('jsonSchemaToZod - arrays', () => {
  it('maps items plus minItems/maxItems/uniqueItems', () => {
    const { schema } = jsonSchemaToZod({
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
    })
    expect(schema.safeParse(['a', 'b']).success).toBe(true)
    expect(schema.safeParse([]).success).toBe(false)
    expect(schema.safeParse(['a', 'a']).success).toBe(false)
    expect(schema.safeParse(['a', 'b', 'c', 'd']).success).toBe(false)
    expect(schema.safeParse([1]).success).toBe(false)
  })
})

describe('jsonSchemaToZod - objects', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer', minimum: 0 },
      address: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['name'],
  }

  it('requires only the declared required properties and validates nested values', () => {
    const { schema: zod } = jsonSchemaToZod(schema)
    expect(zod.safeParse({ name: 'Ada' }).success).toBe(true)
    expect(zod.safeParse({}).success).toBe(false)
    expect(
      zod.safeParse({ name: 'Ada', age: 36, address: { city: 'London' } }).success,
    ).toBe(true)
    expect(zod.safeParse({ name: 'Ada', address: {} }).success).toBe(false)
    expect(zod.safeParse({ name: 'Ada', tags: [1] }).success).toBe(false)
  })

  it('honours additionalProperties false (strict), true (passthrough) and a schema (catchall)', () => {
    const strict = jsonSchemaToZod({
      type: 'object',
      properties: { a: { type: 'string' } },
      additionalProperties: false,
    }).schema
    expect(strict.safeParse({ a: 'x', b: 1 }).success).toBe(false)

    const open = jsonSchemaToZod({
      type: 'object',
      properties: { a: { type: 'string' } },
    }).schema
    expect(open.safeParse({ a: 'x', b: 1 }).success).toBe(true)

    const catchall = jsonSchemaToZod({
      type: 'object',
      properties: { a: { type: 'string' } },
      additionalProperties: { type: 'number' },
    }).schema
    expect(catchall.safeParse({ a: 'x', b: 1 }).success).toBe(true)
    expect(catchall.safeParse({ a: 'x', b: 'no' }).success).toBe(false)
  })
})

describe('jsonSchemaToZod - enum and const', () => {
  it('maps enum to a literal union', () => {
    const { schema, unsupported } = jsonSchemaToZod({ enum: ['a', 'b', 3] })
    expect(unsupported).toEqual([])
    expect(schema.safeParse('a').success).toBe(true)
    expect(schema.safeParse(3).success).toBe(true)
    expect(schema.safeParse('c').success).toBe(false)
  })

  it('maps const to a single literal', () => {
    const { schema } = jsonSchemaToZod({ const: 'fixed' })
    expect(schema.safeParse('fixed').success).toBe(true)
    expect(schema.safeParse('other').success).toBe(false)
  })

  it('reports a non-primitive const as unsupported', () => {
    const { unsupported } = jsonSchemaToZod({ const: { a: 1 } })
    expect(unsupported.some((message) => message.includes('.const'))).toBe(true)
  })
})

describe('jsonSchemaToZod - combinators', () => {
  it('supports anyOf as a union', () => {
    const { schema } = jsonSchemaToZod({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    })
    expect(schema.safeParse('x').success).toBe(true)
    expect(schema.safeParse(1).success).toBe(true)
    expect(schema.safeParse(true).success).toBe(false)
  })

  it('supports oneOf requiring exactly one match', () => {
    const { schema } = jsonSchemaToZod({
      oneOf: [
        { type: 'number', minimum: 0 },
        { type: 'number', maximum: 100 },
      ],
    })
    expect(schema.safeParse(-5).success).toBe(true)
    expect(schema.safeParse(50).success).toBe(false)
    expect(schema.safeParse(200).success).toBe(true)
  })

  it('supports allOf as an intersection', () => {
    const { schema } = jsonSchemaToZod({
      allOf: [{ type: 'string', minLength: 2 }, { type: 'string', maxLength: 4 }],
    })
    expect(schema.safeParse('abc').success).toBe(true)
    expect(schema.safeParse('a').success).toBe(false)
    expect(schema.safeParse('abcde').success).toBe(false)
  })

  it('supports not', () => {
    const { schema } = jsonSchemaToZod({
      type: 'string',
      not: { const: 'forbidden' },
    })
    expect(schema.safeParse('ok').success).toBe(true)
    expect(schema.safeParse('forbidden').success).toBe(false)
  })

  it('applies defaults', () => {
    const { schema } = jsonSchemaToZod({
      type: 'object',
      properties: { role: { type: 'string', default: 'viewer' } },
    })
    const result = schema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ role: 'viewer' })
  })
})

describe('jsonSchemaToZod - unsupported keyword fallback', () => {
  it('reports unsupported keywords but keeps the rest of the schema', () => {
    const { schema, unsupported } = jsonSchemaToZod({
      type: 'string',
      minLength: 3,
      $ref: '#/defs/name',
      if: { type: 'string' },
      then: { maxLength: 5 },
    })
    expect(unsupported).toEqual(
      expect.arrayContaining([
        expect.stringContaining('$ref'),
        expect.stringContaining('if'),
        expect.stringContaining('then'),
      ]),
    )
    expect(schema.safeParse('abc').success).toBe(true)
    expect(schema.safeParse('ab').success).toBe(false)
  })

  it('reports an unknown type and falls back to unknown', () => {
    const { schema, unsupported } = jsonSchemaToZod({ type: 'text' })
    expect(unsupported.some((message) => message.includes('.type'))).toBe(true)
    expect(schema.safeParse('anything').success).toBe(true)
  })

  it('does not report annotations as unsupported', () => {
    const { unsupported } = jsonSchemaToZod({
      type: 'string',
      title: 'Name',
      description: 'A name',
      examples: ['a'],
      $schema: 'https://json-schema.org/draft/2020-12/schema',
    })
    expect(unsupported).toEqual([])
  })
})

describe('compileJsonSchema', () => {
  it('throws when the document is not a valid JSON Schema object', () => {
    expect(() => compileJsonSchema('nope')).toThrow(/must be an object/i)
    expect(() => compileJsonSchema({ type: 'nope' })).toThrow(/type must be/i)
  })

  it('compiles a valid document', () => {
    const { schema } = compileJsonSchema({ type: 'string' })
    expect(schema.safeParse('x').success).toBe(true)
  })
})

describe('jsonSchemaToZod - property based', () => {
  const numRuns = 200
  const arbPrimitive = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
  )

  it('accepts a string iff its length is within [minLength, maxLength]', () => {
    fc.assert(
      fc.property(
        fc.nat(6),
        fc.nat(6),
        fc.string({ maxLength: 12 }),
        (a, b, value) => {
          const minLength = Math.min(a, b)
          const maxLength = Math.max(a, b)
          const { schema, unsupported } = jsonSchemaToZod({
            type: 'string',
            minLength,
            maxLength,
          })
          expect(unsupported).toEqual([])
          const expected =
            value.length >= minLength && value.length <= maxLength
          expect(schema.safeParse(value).success).toBe(expected)
        },
      ),
      { numRuns },
    )
  })

  it('accepts a number iff it is within [minimum, maximum]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -25, max: 25 }),
        (a, b, value) => {
          const minimum = Math.min(a, b)
          const maximum = Math.max(a, b)
          const { schema } = jsonSchemaToZod({ type: 'number', minimum, maximum })
          const expected = value >= minimum && value <= maximum
          expect(schema.safeParse(value).success).toBe(expected)
        },
      ),
      { numRuns },
    )
  })

  it('accepts a value iff it is a member of the enum', () => {
    const arbEnum = fc.uniqueArray(
      fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
      { maxLength: 6, selector: (value) => JSON.stringify(value) },
    )
    fc.assert(
      fc.property(arbEnum, arbPrimitive, (values, candidate) => {
        const { schema } = jsonSchemaToZod({ enum: values })
        const expected = values.some((value) => Object.is(value, candidate))
        expect(schema.safeParse(candidate).success).toBe(expected)
      }),
      { numRuns },
    )
  })

  it('accepts an object iff every required key is present', () => {
    const keys = ['a', 'b', 'c', 'd']
    const properties = Object.fromEntries(
      keys.map((key) => [key, { type: 'string' }]),
    )
    fc.assert(
      fc.property(fc.subarray(keys), fc.subarray(keys), (required, present) => {
        const { schema } = jsonSchemaToZod({
          type: 'object',
          properties,
          required,
          additionalProperties: false,
        })
        const value = Object.fromEntries(present.map((key) => [key, 'x']))
        const expected = required.every((key) => present.includes(key))
        expect(schema.safeParse(value).success).toBe(expected)
      }),
      { numRuns },
    )
  })

  it('always reports unsupported keywords and never throws', () => {
    const keywords = [
      '$ref',
      'if',
      'then',
      'else',
      'patternProperties',
      'dependentRequired',
      'unevaluatedProperties',
    ]
    fc.assert(
      fc.property(fc.constantFrom(...keywords), (keyword) => {
        const { schema, unsupported } = jsonSchemaToZod({
          type: 'string',
          [keyword]: { type: 'string' },
        })
        expect(unsupported.some((message) => message.includes(keyword))).toBe(true)
        expect(schema.safeParse('x').success).toBe(true)
      }),
      { numRuns },
    )
  })
})

describe('jsonSchemaToZod - x-schema-studio extension (F-07b)', () => {
  it('validates a rich text field as an array of blocks without flagging the keyword', () => {
    const { schema, unsupported } = jsonSchemaToZod({
      type: 'array',
      'x-schema-studio': { kind: 'richText' },
    })

    expect(schema.safeParse([{ type: 'paragraph' }]).success).toBe(true)
    expect(schema.safeParse([]).success).toBe(true)
    expect(schema.safeParse('plain text').success).toBe(false)
    expect(unsupported).toHaveLength(0)
  })

  it('maps a rich text field nested in an object', () => {
    const { schema, unsupported } = jsonSchemaToZod({
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'array', 'x-schema-studio': { kind: 'richText' } },
      },
      required: ['title', 'body'],
    })

    expect(
      schema.safeParse({ title: 't', body: [{ type: 'paragraph' }] }).success,
    ).toBe(true)
    expect(schema.safeParse({ title: 't', body: 'nope' }).success).toBe(false)
    expect(unsupported).toHaveLength(0)
  })

  it('flags an unknown x-schema-studio kind as unsupported', () => {
    const { unsupported } = jsonSchemaToZod({
      type: 'string',
      'x-schema-studio': { kind: 'futureThing' },
    })

    expect(
      unsupported.some(
        (message) =>
          message.includes('x-schema-studio') && message.includes('futureThing'),
      ),
    ).toBe(true)
  })
})
