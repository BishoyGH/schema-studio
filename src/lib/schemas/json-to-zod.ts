import { z } from 'zod'

import { findJsonSchemaError } from './validation'

/**
 * A runtime JSON Schema -> Zod bridge.
 *
 * It converts the common JSON Schema keywords into an equivalent Zod schema so
 * records can be validated against the schema a user authored (see F-05). The
 * conversion is intentionally pragmatic: any keyword we do not map is reported
 * through `unsupported` instead of silently changing the meaning of the schema.
 */
export interface JsonToZodResult {
  /** Best-effort Zod schema derived from the JSON Schema. */
  schema: z.ZodType
  /** Human-readable notes about keywords/properties that were ignored. */
  unsupported: string[]
}

const JSON_SCHEMA_TYPES = [
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
  'null',
] as const

/** Keywords this bridge knows how to translate into Zod. */
const SUPPORTED_KEYWORDS = new Set([
  'type',
  'enum',
  'const',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'anyOf',
  'oneOf',
  'allOf',
  'not',
  'default',
])

/** Keywords that only carry metadata (never assertions) and are safely ignored. */
const ANNOTATION_KEYWORDS = new Set([
  '$schema',
  '$id',
  'id',
  'title',
  'description',
  'examples',
  '$comment',
  'readOnly',
  'writeOnly',
  'deprecated',
])

const FORMAT_FACTORIES: Record<string, () => z.ZodType> = {
  email: () => z.email(),
  uri: () => z.url(),
  url: () => z.url(),
  uuid: () => z.uuid(),
  'date-time': () => z.iso.datetime(),
  date: () => z.iso.date(),
  time: () => z.iso.time(),
  ipv4: () => z.ipv4(),
  ipv6: () => z.ipv6(),
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function labelFor(path: string): string {
  return path || 'schema'
}

function flagUnsupportedKeys(
  schema: Record<string, unknown>,
  path: string,
  unsupported: string[],
): void {
  for (const key of Object.keys(schema)) {
    if (SUPPORTED_KEYWORDS.has(key) || ANNOTATION_KEYWORDS.has(key)) continue
    unsupported.push(`${labelFor(path)}.${key} is not supported and was ignored`)
  }
}

function unionOf(schemas: z.ZodType[]): z.ZodType {
  if (schemas.length === 0) return z.never()
  if (schemas.length === 1) return schemas[0]
  return z.union(schemas as [z.ZodType, z.ZodType, ...z.ZodType[]])
}

function literalSchema(value: unknown): z.ZodType {
  if (value === null) return z.null()
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return z.literal(value)
  }
  return z.never()
}

function buildEnum(
  values: unknown[],
  path: string,
  unsupported: string[],
): z.ZodType {
  const literals: z.ZodType[] = []
  for (const value of values) {
    if (!isPrimitive(value)) {
      unsupported.push(
        `${labelFor(path)}.enum contains a non-primitive value that was ignored`,
      )
      continue
    }
    literals.push(literalSchema(value))
  }
  return unionOf(literals)
}

function buildString(
  schema: Record<string, unknown>,
  path: string,
  unsupported: string[],
): z.ZodType {
  let text = z.string()
  if (typeof schema.minLength === 'number') text = text.min(schema.minLength)
  if (typeof schema.maxLength === 'number') text = text.max(schema.maxLength)
  if (typeof schema.pattern === 'string') {
    try {
      text = text.regex(new RegExp(schema.pattern))
    } catch {
      unsupported.push(
        `${labelFor(path)}.pattern is not a valid regular expression and was ignored`,
      )
    }
  }

  let result: z.ZodType = text
  if (typeof schema.format === 'string') {
    const factory = FORMAT_FACTORIES[schema.format]
    if (factory) {
      const validator = factory()
      result = result.refine((value) => validator.safeParse(value).success, {
        message: `Invalid ${schema.format} format`,
      })
    }
  }
  return result
}

function buildNumber(
  schema: Record<string, unknown>,
  integer: boolean,
): z.ZodType {
  let num = z.number()
  if (integer) num = num.int()
  if (typeof schema.minimum === 'number') num = num.min(schema.minimum)
  if (typeof schema.maximum === 'number') num = num.max(schema.maximum)
  if (typeof schema.exclusiveMinimum === 'number') {
    num = num.gt(schema.exclusiveMinimum)
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    num = num.lt(schema.exclusiveMaximum)
  }
  if (typeof schema.multipleOf === 'number') {
    num = num.multipleOf(schema.multipleOf)
  }
  return num
}

function buildArray(
  schema: Record<string, unknown>,
  path: string,
  unsupported: string[],
): z.ZodType {
  const items =
    schema.items === undefined
      ? z.unknown()
      : convert(schema.items, `${path}.items`, unsupported)

  let array = z.array(items)
  if (typeof schema.minItems === 'number') array = array.min(schema.minItems)
  if (typeof schema.maxItems === 'number') array = array.max(schema.maxItems)

  let result: z.ZodType = array
  if (schema.uniqueItems === true) {
    result = result.refine(
      (value) => new Set(value as unknown[]).size === (value as unknown[]).length,
      { message: `${labelFor(path)} must contain unique items` },
    )
  }
  return result
}

function buildObject(
  schema: Record<string, unknown>,
  path: string,
  unsupported: string[],
): z.ZodType {
  const properties = isPlainObject(schema.properties) ? schema.properties : {}
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((entry): entry is string => typeof entry === 'string')
      : [],
  )

  const shape: Record<string, z.ZodType> = {}
  for (const [key, value] of Object.entries(properties)) {
    let child = convert(value, `${path}.${key}`, unsupported)
    const hasDefault = isPlainObject(value) && 'default' in value
    if (!required.has(key) && !hasDefault) child = child.optional()
    shape[key] = child
  }

  const additional = schema.additionalProperties
  if (additional === false) {
    return z.object(shape).strict()
  }
  if (isPlainObject(additional)) {
    return z
      .object(shape)
      .catchall(convert(additional, `${path}.additionalProperties`, unsupported))
  }
  return z.object(shape).passthrough()
}

function buildSingle(
  type: string,
  schema: Record<string, unknown>,
  path: string,
  unsupported: string[],
): z.ZodType {
  switch (type) {
    case 'string':
      return buildString(schema, path, unsupported)
    case 'number':
      return buildNumber(schema, false)
    case 'integer':
      return buildNumber(schema, true)
    case 'boolean':
      return z.boolean()
    case 'null':
      return z.null()
    case 'object':
      return buildObject(schema, path, unsupported)
    case 'array':
      return buildArray(schema, path, unsupported)
    default:
      unsupported.push(
        `${labelFor(path)}.type "${type}" is not a known JSON type and was ignored`,
      )
      return z.unknown()
  }
}

function normalizeTypes(
  type: unknown,
  path: string,
  unsupported: string[],
): string[] | undefined {
  if (type === undefined) return undefined
  if (typeof type === 'string') {
    if ((JSON_SCHEMA_TYPES as readonly string[]).includes(type)) return [type]
    unsupported.push(
      `${labelFor(path)}.type "${type}" is not a known JSON type and was ignored`,
    )
    return []
  }
  if (Array.isArray(type)) {
    const valid = type.filter(
      (entry): entry is string =>
        typeof entry === 'string' &&
        (JSON_SCHEMA_TYPES as readonly string[]).includes(entry),
    )
    if (valid.length !== type.length) {
      unsupported.push(
        `${labelFor(path)}.type contains unknown JSON types that were ignored`,
      )
    }
    return valid
  }
  unsupported.push(
    `${labelFor(path)}.type must be a string or array of strings and was ignored`,
  )
  return []
}

function inferType(schema: Record<string, unknown>): string | undefined {
  if (
    'properties' in schema ||
    'required' in schema ||
    'additionalProperties' in schema
  ) {
    return 'object'
  }
  if (
    'items' in schema ||
    'minItems' in schema ||
    'maxItems' in schema ||
    'uniqueItems' in schema
  ) {
    return 'array'
  }
  if (
    'pattern' in schema ||
    'minLength' in schema ||
    'maxLength' in schema ||
    'format' in schema
  ) {
    return 'string'
  }
  if (
    'minimum' in schema ||
    'maximum' in schema ||
    'exclusiveMinimum' in schema ||
    'exclusiveMaximum' in schema ||
    'multipleOf' in schema
  ) {
    return 'number'
  }
  return undefined
}

function convert(
  input: unknown,
  path: string,
  unsupported: string[],
): z.ZodType {
  if (input === true) return z.unknown()
  if (input === false) return z.never()
  if (!isPlainObject(input)) {
    unsupported.push(
      `${labelFor(path)} is not an object or boolean schema and was ignored`,
    )
    return z.unknown()
  }

  flagUnsupportedKeys(input, path, unsupported)

  let result: z.ZodType | null = null

  if ('const' in input) {
    if (isPrimitive(input.const)) {
      result = literalSchema(input.const)
    } else {
      unsupported.push(
        `${labelFor(path)}.const with a non-primitive value is not supported and was ignored`,
      )
    }
  } else if (Array.isArray(input.enum)) {
    result = buildEnum(input.enum, path, unsupported)
  } else {
    const types = normalizeTypes(input.type, path, unsupported)
    if (types && types.length > 0) {
      result = unionOf(types.map((type) => buildSingle(type, input, path, unsupported)))
    } else if (input.type === undefined) {
      const inferred = inferType(input)
      if (inferred) result = buildSingle(inferred, input, path, unsupported)
    }
  }

  if (Array.isArray(input.allOf)) {
    input.allOf.forEach((sub, index) => {
      const branch = convert(sub, `${path}.allOf[${index}]`, unsupported)
      result = result ? result.and(branch) : branch
    })
  }

  if (Array.isArray(input.anyOf)) {
    const union = unionOf(
      input.anyOf.map((sub, index) =>
        convert(sub, `${path}.anyOf[${index}]`, unsupported),
      ),
    )
    result = result ? result.and(union) : union
  }

  if (Array.isArray(input.oneOf)) {
    const branches = input.oneOf.map((sub, index) =>
      convert(sub, `${path}.oneOf[${index}]`, unsupported),
    )
    const union = unionOf(branches).refine(
      (value) =>
        branches.filter((branch) => branch.safeParse(value).success).length === 1,
      { message: `${labelFor(path)} must match exactly one schema in "oneOf"` },
    )
    result = result ? result.and(union) : union
  }

  if (input.not !== undefined) {
    const notSchema = convert(input.not, `${path}.not`, unsupported)
    const base = result ?? z.unknown()
    result = base.refine((value) => !notSchema.safeParse(value).success, {
      message: `${labelFor(path)} must not match the "not" schema`,
    })
  }

  if (result === null) result = z.unknown()

  if ('default' in input) {
    result = result.default(input.default as never)
  }

  return result
}

/**
 * Convert a JSON Schema document into a runtime Zod schema.
 *
 * Always returns a usable schema (falling back to `z.unknown()` for parts it
 * cannot express) plus a list of `unsupported` notes describing anything that
 * was ignored, so callers can warn the user rather than mis-validate silently.
 */
export function jsonSchemaToZod(input: unknown): JsonToZodResult {
  const unsupported: string[] = []
  const schema = convert(input, '', unsupported)
  return { schema, unsupported }
}

/**
 * Compile a JSON Schema document, throwing if the document itself is not a
 * valid JSON Schema object (checked with the structural guard from F-03).
 */
export function compileJsonSchema(input: unknown): JsonToZodResult {
  const error = findJsonSchemaError(input, '')
  if (error) throw new Error(error)
  return jsonSchemaToZod(input)
}
