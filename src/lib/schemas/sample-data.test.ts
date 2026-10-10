import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  generateInvalidSampleData,
  generateSampleData,
} from './sample-data'
import { validateRecordData } from '@/lib/records/validation'

const BASE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 3 },
    age: { type: 'integer', minimum: 0 },
    active: { type: 'boolean' },
    score: { type: 'number', minimum: 1, maximum: 10, multipleOf: 0.5 },
    kind: { type: 'string', enum: ['person', 'company', 'group'] },
    email: { type: 'string', format: 'email' },
    notes: { type: 'string' },
    tag: { type: 'string', default: 'general' },
    meta: {
      type: 'object',
      properties: { city: { type: 'string' }, rank: { type: 'integer' } },
    },
    tags: { type: 'array', items: { type: 'string' }, minItems: 2 },
  },
  required: [
    'name',
    'age',
    'active',
    'kind',
    'notes',
    'meta',
    'tags',
  ],
  additionalProperties: false,
}

describe('generateSampleData', () => {
  it('produces a record that validates against the schema', () => {
    const sample = generateSampleData(BASE_SCHEMA)
    const result = validateRecordData(BASE_SCHEMA, sample)
    expect(result.success).toBe(true)
  })

  it('respects string length and format constraints', () => {
    const sample = generateSampleData(BASE_SCHEMA)
    expect((sample.name as string).length).toBeGreaterThanOrEqual(3)
    expect(sample.email).toBe('user@example.com')
  })

  it('respects number bounds and multipleOf', () => {
    const sample = generateSampleData(BASE_SCHEMA)
    expect(sample.age).toBeGreaterThanOrEqual(0)
    const score = sample.score as number
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(10)
    expect((score * 2) % 1).toBe(0)
  })

  it('picks a member of an enum and a default value', () => {
    const sample = generateSampleData(BASE_SCHEMA)
    expect(sample.kind).toBe('person')
    expect(sample.tag).toBe('general')
  })

  it('nests objects and fills arrays to minItems', () => {
    const sample = generateSampleData(BASE_SCHEMA)
    expect(sample.meta).toEqual({ city: 'sample', rank: 0 })
    expect(sample.tags).toEqual(['sample', 'sample'])
  })

  it('handles unions, const, null and booleans', () => {
    const schema = {
      type: 'object',
      properties: {
        maybe: { type: ['string', 'null'] },
        fixed: { const: 'locked' },
        empty: { type: 'null' },
        flag: { type: 'boolean' },
      },
      required: ['maybe', 'fixed', 'empty', 'flag'],
    }
    const sample = generateSampleData(schema)
    expect(sample.maybe).toBe('sample')
    expect(sample.fixed).toBe('locked')
    expect(sample.empty).toBeNull()
    expect(sample.flag).toBe(true)
    expect(validateRecordData(schema, sample).success).toBe(true)
  })

  it('returns only known properties', () => {
    const sample = generateSampleData(BASE_SCHEMA)
    expect(Object.keys(sample).sort()).toEqual(
      Object.keys(BASE_SCHEMA.properties).sort(),
    )
  })

  it('property-based: samples for constrained schemas always validate', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom('string', 'integer', 'boolean', 'null'),
            min: fc.nat({ max: 6 }),
          }),
          { maxLength: 8 },
        ),
        (fields) => {
          const properties: Record<string, unknown> = {}
          for (const field of fields) {
            if (field.type === 'string') {
              properties[field.name] = { type: 'string', minLength: field.min }
            } else if (field.type === 'integer') {
              properties[field.name] = { type: 'integer', minimum: field.min }
            } else {
              properties[field.name] = { type: field.type }
            }
          }
          const schema = {
            type: 'object',
            required: Object.keys(properties),
            properties,
          }
          const sample = generateSampleData(schema)
          return validateRecordData(schema, sample).success
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('generateInvalidSampleData', () => {
  it('produces a record that fails validation', () => {
    const invalid = generateInvalidSampleData(BASE_SCHEMA)
    const result = validateRecordData(BASE_SCHEMA, invalid)
    expect(result.success).toBe(false)
    expect(Object.keys(invalid).length).toBeGreaterThan(0)
  })

  it('violates specific constraints per field', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 5 },
        amount: { type: 'number', maximum: 100 },
        on: { type: 'boolean' },
      },
    }
    const invalid = generateInvalidSampleData(schema)
    expect((invalid.title as string).length).toBeGreaterThan(5)
    expect(invalid.amount).toBeGreaterThan(100)
    expect(invalid.on).toBe('not-a-boolean')
  })

  it('flags unknown enum members and broken consts', () => {
    const schema = {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['a', 'b'] },
        fixed: { const: 7 },
      },
    }
    const invalid = generateInvalidSampleData(schema)
    expect(invalid.kind).toBe('__not-a-member__')
    expect(invalid.fixed).toBe('__not-const__')
  })

  it('degrades gracefully for wildcard and boolean schemas', () => {
    const schema = { type: 'object', properties: { anything: {} } }
    const invalid = generateInvalidSampleData(schema)
    expect(invalid.anything).toBe(12345)
  })
})
describe('rich text samples (F-07b)', () => {
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'array', 'x-schema-studio': { kind: 'richText' } },
    },
    required: ['title', 'body'],
    additionalProperties: false,
  }

  it('auto-fills a valid rich text document that validates', () => {
    const sample = generateSampleData(schema)
    expect(Array.isArray(sample.body)).toBe(true)
    expect(validateRecordData(schema, sample).success).toBe(true)
  })

  it('invalid sample makes the rich text field fail validation', () => {
    const invalid = generateInvalidSampleData(schema)
    const result = validateRecordData(schema, invalid)
    expect(result.success).toBe(false)
    expect(result.fieldErrors.map((error) => error.path)).toContain('body')
  })
})
