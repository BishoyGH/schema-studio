const JSON_SCHEMA_TYPES = [
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
  'null',
] as const

const SAMPLE_FORMAT_VALUES: Record<string, string> = {
  email: 'user@example.com',
  uri: 'https://example.com',
  url: 'https://example.com',
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  'date-time': '2026-01-01T00:00:00Z',
  date: '2026-01-01',
  time: '00:00:00',
  ipv4: '127.0.0.1',
  ipv6: '::1',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTypes(schema: Record<string, unknown>): string[] {
  if (typeof schema.type === 'string') {
    return (JSON_SCHEMA_TYPES as readonly string[]).includes(schema.type)
      ? [schema.type]
      : []
  }
  if (Array.isArray(schema.type)) {
    return schema.type.filter(
      (entry): entry is string =>
        typeof entry === 'string' &&
        (JSON_SCHEMA_TYPES as readonly string[]).includes(entry),
    )
  }
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

function pickString(schema: Record<string, unknown>): string {
  const formatted =
    typeof schema.format === 'string' ? SAMPLE_FORMAT_VALUES[schema.format] : undefined
  const min = typeof schema.minLength === 'number' ? schema.minLength : 0
  const max = typeof schema.maxLength === 'number' ? schema.maxLength : undefined

  let candidate = (formatted ?? 'sample')
    .slice(0, max ?? Number.MAX_SAFE_INTEGER)
  while (candidate.length < min) candidate += 'x'

  const pattern = typeof schema.pattern === 'string' ? schema.pattern : undefined
  if (pattern) {
    try {
      const regex = new RegExp(pattern)
      const fallbacks = [
        candidate,
        formatted ?? 'sample',
        'sample',
        'test',
        '12345',
        'a',
        'user@example.com',
        'https://example.com',
      ]
      for (const fallback of fallbacks) {
        const sized = fallback.slice(0, max ?? fallback.length)
        if (sized.length >= min && regex.test(sized)) {
          candidate = sized
          break
        }
      }
    } catch {
      // An unparseable pattern is flagged by the F-04 bridge, not here.
    }
  }
  return candidate
}

function pickNumber(schema: Record<string, unknown>, integer: boolean): number {
  let value = 0
  if (typeof schema.exclusiveMinimum === 'number') {
    value = schema.exclusiveMinimum + 1
  } else if (typeof schema.minimum === 'number') {
    value = schema.minimum
  }
  if (typeof schema.multipleOf === 'number' && schema.multipleOf > 0) {
    value = Math.ceil(value / schema.multipleOf) * schema.multipleOf
  }
  if (integer) value = Math.ceil(value)

  if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
    value = schema.exclusiveMaximum - 1
  }
  if (typeof schema.maximum === 'number' && value > schema.maximum) {
    value = schema.maximum
  }
  if (integer) value = Math.ceil(value)
  return value
}

function buildObject(properties: unknown): Record<string, unknown> {
  if (!isPlainObject(properties)) return {}
  const result: Record<string, unknown> = {}
  for (const [key, rawSchema] of Object.entries(properties)) {
    const value = sampleValue(rawSchema)
    if (value !== undefined) result[key] = value
  }
  return result
}

function buildArray(schema: Record<string, unknown>): unknown[] {
  if (Array.isArray(schema.items)) {
    return schema.items.map((item) => sampleValue(item)).filter((v) => v !== undefined)
  }
  const min = typeof schema.minItems === 'number' ? schema.minItems : 0
  const max = typeof schema.maxItems === 'number' ? schema.maxItems : undefined
  if (max === 0) return []
  let count = Math.max(min, 1)
  if (max !== undefined) count = Math.min(count, max)
  const item = sampleValue(schema.items)
  return Array.from({ length: count }, () => item)
}

function valueForType(type: string, schema: Record<string, unknown>): unknown {
  switch (type) {
    case 'string':
      return pickString(schema)
    case 'number':
      return pickNumber(schema, false)
    case 'integer':
      return pickNumber(schema, true)
    case 'boolean':
      return true
    case 'null':
      return null
    case 'object':
      return buildObject(schema.properties)
    case 'array':
      return buildArray(schema)
    default:
      return 'sample'
  }
}

function sampleValue(raw: unknown): unknown {
  if (raw === true) return 'sample'
  if (raw === false) return undefined
  if (!isPlainObject(raw)) return undefined
  const schema = raw
  if (Object.prototype.hasOwnProperty.call(schema, 'default')) return schema.default
  if (Object.prototype.hasOwnProperty.call(schema, 'const')) return schema.const
  if (Array.isArray(schema.enum)) {
    return schema.enum.length > 0 ? schema.enum[0] : undefined
  }
  const types = normalizeTypes(schema)
  if (types.length > 1) {
    const pick = types.find((type) => type !== 'null') ?? 'null'
    return valueForType(pick, schema)
  }
  if (types.length === 1) return valueForType(types[0], schema)
  const inferred = inferType(schema)
  if (inferred) return valueForType(inferred, schema)
  return 'sample'
}

/**
 * Generate a record sample that (best-effort) satisfies a JSON Schema document,
 * used by the F-07a auto-fill. Constraints on supported keywords are respected;
 * `default` values win so authors see what records will really contain.
 */
export function generateSampleData(jsonSchema: unknown): Record<string, unknown> {
  if (!isPlainObject(jsonSchema)) return {}
  return buildObject(jsonSchema.properties)
}

function pickInvalidString(schema: Record<string, unknown>): unknown {
  if (typeof schema.maxLength === 'number') {
    return `x`.repeat(Math.max(schema.maxLength + 1, 1))
  }
  if (typeof schema.pattern === 'string') {
    const regex = new RegExp(schema.pattern)
    if (regex.test('___no_match___') === false) return '___no_match___'
  }
  return 12345
}

function pickInvalidNumber(schema: Record<string, unknown>): unknown {
  if (typeof schema.maximum === 'number') return schema.maximum + 1
  if (typeof schema.exclusiveMaximum === 'number') return schema.exclusiveMaximum
  if (typeof schema.maxLength === 'number') return 'x'.repeat(schema.maxLength + 1)
  return 'not-a-number'
}

function invalidValueForType(type: string, schema: Record<string, unknown>): unknown {
  switch (type) {
    case 'string':
      return pickInvalidString(schema)
    case 'number':
    case 'integer':
      return pickInvalidNumber(schema)
    case 'boolean':
      return 'not-a-boolean'
    case 'null':
      return 'not-null'
    case 'object':
      return 'not-an-object'
    case 'array':
      return 'not-an-array'
    default:
      return 12345
  }
}

function invalidValue(raw: unknown): unknown {
  if (raw === true || raw === false) return 12345
  if (!isPlainObject(raw)) return 12345
  const schema = raw
  if (Array.isArray(schema.enum)) return '__not-a-member__'
  if (Object.prototype.hasOwnProperty.call(schema, 'const')) return '__not-const__'
  const types = normalizeTypes(schema)
  if (types.length > 0) return invalidValueForType(types[0], schema)
  const inferred = inferType(schema)
  if (inferred) return invalidValueForType(inferred, schema)
  return 12345
}

/**
 * Generate a deliberately invalid record sample: every top-level property gets a
 * value that violates its schema, so the F-07a preview lights up field errors.
 */
export function generateInvalidSampleData(jsonSchema: unknown): Record<string, unknown> {
  if (!isPlainObject(jsonSchema)) return {}
  const properties = isPlainObject(jsonSchema.properties) ? jsonSchema.properties : {}
  const result: Record<string, unknown> = {}
  for (const [key, rawSchema] of Object.entries(properties)) {
    result[key] = invalidValue(rawSchema)
  }
  return result
}

