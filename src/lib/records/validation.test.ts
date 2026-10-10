import { describe, expect, it } from 'vitest'

import { describeRecordFields, recordDefaults } from './fields'
import { recordZodSchema, validateRecordData } from './validation'

describe('validateRecordData', () => {
  const personSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      age: { type: 'integer', minimum: 0 },
      email: { type: 'string', format: 'email' },
      tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
      active: { type: 'boolean' },
      role: { enum: ['admin', 'user'] },
      status: { type: 'string', default: 'draft' },
    },
    required: ['name', 'age'],
  }

  it('accepts valid data and returns it unchanged', () => {
    const result = validateRecordData(personSchema, {
      name: 'Ada',
      age: 36,
      email: 'ada@example.com',
      tags: ['math'],
      active: true,
      role: 'admin',
      status: 'published',
    })

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      name: 'Ada',
      age: 36,
      email: 'ada@example.com',
      tags: ['math'],
      active: true,
      role: 'admin',
      status: 'published',
    })
    expect(result.fieldErrors).toHaveLength(0)
  })

  it('reports field-level errors with dot paths', () => {
    const result = validateRecordData(personSchema, {
      name: 'A',
      age: -1,
      email: 'not-an-email',
      tags: [],
      role: 'superuser',
    })

    expect(result.success).toBe(false)
    const paths = result.fieldErrors.map((error) => error.path)
    expect(paths).toContain('name')
    expect(paths).toContain('age')
    expect(paths).toContain('email')
    expect(paths).toContain('tags')
    expect(paths).toContain('role')
  })

  it('flags missing required fields', () => {
    const result = validateRecordData(personSchema, { name: 'Ada' })

    expect(result.success).toBe(false)
    expect(result.fieldErrors.map((error) => error.path)).toContain('age')
  })

  it('applies schema defaults on parse and returns the populated data', () => {
    const result = validateRecordData(personSchema, { name: 'Ada', age: 1 })

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('draft')
  })

  it('rejects a non-object data payload', () => {
    const result = validateRecordData(personSchema, 'nope')
    expect(result.success).toBe(false)
  })

  it('reports unsupported keywords without throwing', () => {
    const schema = {
      type: 'object',
      properties: {
        ref: { $ref: '#/$defs/thing' },
        name: { type: 'string' },
      },
      required: ['name'],
    }
    const result = validateRecordData(schema, { name: 'x', ref: 'y' })

    expect(result.success).toBe(true)
    expect(result.unsupported.length).toBeGreaterThan(0)
  })

  it('never throws for arbitrary data (best-effort schema)', () => {
    expect(() =>
      validateRecordData(
        { type: 'object', properties: {} },
        { anything: [1, { two: true }, null] },
      ),
    ).not.toThrow()
  })
})

describe('recordZodSchema', () => {
  it('returns a usable schema and an unsupported list', () => {
    const { schema, unsupported } = recordZodSchema({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    })

    expect(schema.safeParse({ name: 42 }).success).toBe(false)
    expect(schema.safeParse({ name: 'Ada' }).success).toBe(true)
    expect(Array.isArray(unsupported)).toBe(true)
  })
})

describe('describeRecordFields', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Full name' },
      age: { type: 'integer', minimum: 0 },
      active: { type: 'boolean' },
      role: { enum: ['admin', 'user'] },
      score: { type: 'number' },
      nested: { type: 'object', properties: { x: { type: 'string' } } },
      items: { type: 'array', items: { type: 'string' } },
      anything: true,
    },
    required: ['name', 'role'],
  }

  it('maps primitive types to controls and honors required order', () => {
    const names = describeRecordFields(schema).map((field) => field.name)
    expect(names).toEqual([
      'name',
      'age',
      'active',
      'role',
      'score',
      'nested',
      'items',
      'anything',
    ])

    const byName = Object.fromEntries(
      describeRecordFields(schema).map((field) => [field.name, field]),
    )
    expect(byName.name).toMatchObject({
      kind: 'string',
      required: true,
      description: 'Full name',
    })
    expect(byName.age.kind).toBe('integer')
    expect(byName.active.kind).toBe('boolean')
    expect(byName.role).toMatchObject({
      kind: 'enum',
      required: true,
      enumValues: ['admin', 'user'],
    })
    expect(byName.score.kind).toBe('number')
    expect(byName.nested.kind).toBe('json')
    expect(byName.items.kind).toBe('json')
  })

  it('falls back to string for a boolean/empty property schema', () => {
    const fields = describeRecordFields({
      type: 'object',
      properties: { anything: true },
    })
    expect(fields[0].kind).toBe('string')
  })

  it('returns an empty list for non-object schemas', () => {
    expect(describeRecordFields('nope')).toEqual([])
  })
})

describe('recordDefaults', () => {
  it('collects default keywords while ignoring fields without one', () => {
    const defaults = recordDefaults({
      type: 'object',
      properties: {
        name: { type: 'string' },
        status: { type: 'string', default: 'draft' },
        draft: { type: 'boolean', default: true },
        count: { type: 'integer', default: 0 },
      },
    })

    expect(defaults).toEqual({ status: 'draft', draft: true, count: 0 })
  })
})