/**
 * Derive the editable fields of a record form from a JSON Schema document.
 *
 * This is a pragmatic, primitive-first view: scalars map to native controls,
 * `enum` to a select, and nested objects/arrays to a JSON editor. F-12/F-13
 * expand the builder and live preview; keeping the shape here small means the
 * record form stays driven by the same schema + records model.
 */
export type RecordFieldKind =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'enum'
  | 'json'
  | 'null'

export interface RecordFieldDescriptor {
  name: string
  kind: RecordFieldKind
  required: boolean
  description?: string
  format?: string
  enumValues?: unknown[]
  /** Value of the `default` keyword, applied when a record is created. */
  defaultValue?: unknown
  schema: Record<string, unknown> | boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function kindFor(schema: Record<string, unknown>): RecordFieldKind {
  if (Array.isArray(schema.enum)) return 'enum'

  if (typeof schema.type === 'string') {
    switch (schema.type) {
      case 'string':
        return 'string'
      case 'number':
        return 'number'
      case 'integer':
        return 'integer'
      case 'boolean':
        return 'boolean'
      case 'null':
        return 'null'
      case 'object':
      case 'array':
        return 'json'
      default:
        return 'string'
    }
  }

  // No explicit `type`: infer from the constraint keywords the schema carries.
  if ('properties' in schema || 'items' in schema || 'additionalProperties' in schema) {
    return 'json'
  }
  if (
    'pattern' in schema ||
    'minLength' in schema ||
    'maxLength' in schema ||
    'format' in schema
  ) {
    return 'string'
  }
  if ('minimum' in schema || 'maximum' in schema || 'multipleOf' in schema) {
    return 'number'
  }
  return 'string'
}

function toDescriptor(
  name: string,
  rawSchema: unknown,
  required: Set<string>,
): RecordFieldDescriptor {
  const schema = isPlainObject(rawSchema) ? rawSchema : {}
  return {
    name,
    kind: kindFor(schema),
    required: required.has(name),
    description:
      typeof schema.description === 'string' ? schema.description : undefined,
    format: typeof schema.format === 'string' ? schema.format : undefined,
    enumValues: Array.isArray(schema.enum) ? schema.enum : undefined,
    defaultValue:
      isPlainObject(rawSchema) && 'default' in rawSchema
        ? rawSchema.default
        : undefined,
    schema: typeof rawSchema === 'boolean' ? rawSchema : schema,
  }
}

/** The editable fields of a record form, in schema property order. */
export function describeRecordFields(jsonSchema: unknown): RecordFieldDescriptor[] {
  if (!isPlainObject(jsonSchema)) return []
  const properties = isPlainObject(jsonSchema.properties)
    ? jsonSchema.properties
    : {}
  const required = new Set(
    Array.isArray(jsonSchema.required)
      ? jsonSchema.required.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [],
  )
  return Object.entries(properties).map(([name, rawSchema]) =>
    toDescriptor(name, rawSchema, required),
  )
}

/**
 * Default values for a new record, taken from the `default` keyword of each
 * property. Applied when the form opens and again at the storage boundary, so
 * they can never be lost by a raw import path either.
 */
export function recordDefaults(jsonSchema: unknown): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const field of describeRecordFields(jsonSchema)) {
    if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue
    }
  }
  return defaults
}
