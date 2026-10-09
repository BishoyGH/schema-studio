import { z } from 'zod'
import type { JsonSchemaDraft } from '@/lib/storage'

export const SCHEMA_DRAFT_VALUES = ['2020-12', '2019-09', 'draft-07'] as const

export interface SchemaDraftOption {
  value: JsonSchemaDraft
  label: string
  uri: string
}

export const SCHEMA_DRAFTS: readonly SchemaDraftOption[] = [
  {
    value: '2020-12',
    label: 'Draft 2020-12',
    uri: 'https://json-schema.org/draft/2020-12/schema',
  },
  {
    value: '2019-09',
    label: 'Draft 2019-09',
    uri: 'https://json-schema.org/draft/2019-09/schema',
  },
  {
    value: 'draft-07',
    label: 'Draft-07',
    uri: 'http://json-schema.org/draft-07/schema#',
  },
]

export const DEFAULT_SCHEMA_TEXT = JSON.stringify(
  {
    $schema: SCHEMA_DRAFTS[0].uri,
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  null,
  2,
)

const JSON_SCHEMA_TYPES = [
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
  'null',
] as const

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type ParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string }

/**
 * Parse raw text into a JSON schema object. Arrays, primitives, and `null` are
 * rejected because a JSON Schema document must be an object.
 */
export function parseJsonSchema(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: 'JSON Schema is required' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return { ok: false, error: `Invalid JSON: ${message}` }
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      error: 'JSON Schema must be an object (e.g. it cannot be an array)',
    }
  }

  const shapeError = findJsonSchemaError(parsed, '')
  if (shapeError) {
    return { ok: false, error: shapeError }
  }

  return { ok: true, value: parsed }
}

/**
 * Lightweight structural check for the most common JSON Schema keywords. This is
 * a pragmatic guard, not a full meta-schema validator (that arrives with the
 * JSON-to-Zod bridge in F-04).
 */
export function findJsonSchemaError(
  value: unknown,
  path: string,
): string | null {
  const label = path || 'schema'

  if (!isPlainObject(value)) {
    return `${label} must be an object`
  }

  const { type, properties, required, items, enum: enumValues } = value

  if (type !== undefined) {
    const valid =
      (typeof type === 'string' &&
        (JSON_SCHEMA_TYPES as readonly string[]).includes(type)) ||
      (Array.isArray(type) &&
        type.length > 0 &&
        type.every(
          (entry) =>
            typeof entry === 'string' &&
            (JSON_SCHEMA_TYPES as readonly string[]).includes(entry),
        ))
    if (!valid) {
      return `${label}.type must be a JSON type or a non-empty array of JSON types`
    }
  }

  if (properties !== undefined) {
    if (!isPlainObject(properties)) {
      return `${label}.properties must be an object`
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      const nestedError = propertySchemaError(propertySchema, `${label}.${key}`)
      if (nestedError) return nestedError
    }
  }

  if (required !== undefined) {
    if (
      !Array.isArray(required) ||
      !required.every((entry) => typeof entry === 'string')
    ) {
      return `${label}.required must be an array of strings`
    }
    if (new Set(required).size !== required.length) {
      return `${label}.required must not contain duplicates`
    }
  }

  if (items !== undefined && !isPlainObject(items) && typeof items !== 'boolean') {
    return `${label}.items must be an object or a boolean`
  }

  if (enumValues !== undefined && !Array.isArray(enumValues)) {
    return `${label}.enum must be an array`
  }

  return null
}

function propertySchemaError(value: unknown, path: string): string | null {
  if (typeof value === 'boolean') return null
  return findJsonSchemaError(value, path)
}

const jsonSchemaTextSchema = z.string().superRefine((text, ctx) => {
  const result = parseJsonSchema(text)
  if (!result.ok) {
    ctx.addIssue({ code: 'custom', message: result.error })
  }
})

export const schemaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(64, 'Name must be 64 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(280, 'Description must be 280 characters or fewer'),
  draft: z.enum(SCHEMA_DRAFT_VALUES),
  jsonSchema: jsonSchemaTextSchema,
})

export type SchemaFormValues = z.infer<typeof schemaFormSchema>

export function emptySchemaFormValues(
  draft: JsonSchemaDraft = '2020-12',
): SchemaFormValues {
  const option = SCHEMA_DRAFTS.find((entry) => entry.value === draft)
  return {
    name: '',
    description: '',
    draft,
    jsonSchema: JSON.stringify(
      {
        $schema: option?.uri,
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      null,
      2,
    ),
  }
}
