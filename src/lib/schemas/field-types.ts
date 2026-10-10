import {
  Ban,
  Braces,
  Hash,
  List,
  Pilcrow,
  ToggleLeft,
  Type,
  type LucideIcon,
} from 'lucide-react'
import {
  applyFieldType,
  type FieldTypeId,
  isPlainObject,
} from '@/lib/schemas/builder-doc'

/**
 * The field-type registry (F-12 / F-54).
 *
 * Each field type declares its presentation (label, icon, group) and a fresh
 * `defaultSchema`. Constraint editing is described by `OptionDescriptor`s so the
 * detail inspector renders controls generically — adding a type or an option
 * never requires touching the inspector layout. This is the single source of
 * truth shared by the type palette, the outline icons, and the detail form.
 */

export type FieldTypeGroup = 'core' | 'structured' | 'content'

export interface FieldTypeDefinition {
  id: FieldTypeId
  label: string
  icon: LucideIcon
  group: FieldTypeGroup
  help: string
  /** A fresh `{ type }` (or extension) object for a newly added field. */
  defaultSchema: () => Record<string, unknown>
}

export const FIELD_TYPES: readonly FieldTypeDefinition[] = [
  {
    id: 'string',
    label: 'Text',
    icon: Type,
    group: 'core',
    help: 'Text value.',
    defaultSchema: () => ({ type: 'string' }),
  },
  {
    id: 'number',
    label: 'Number',
    icon: Hash,
    group: 'core',
    help: 'Decimal number.',
    defaultSchema: () => ({ type: 'number' }),
  },
  {
    id: 'integer',
    label: 'Integer',
    icon: Hash,
    group: 'core',
    help: 'Whole number.',
    defaultSchema: () => ({ type: 'integer' }),
  },
  {
    id: 'boolean',
    label: 'Boolean',
    icon: ToggleLeft,
    group: 'core',
    help: 'True/false toggle.',
    defaultSchema: () => ({ type: 'boolean' }),
  },
  {
    id: 'null',
    label: 'Null',
    icon: Ban,
    group: 'core',
    help: 'Always empty (null).',
    defaultSchema: () => ({ type: 'null' }),
  },
  {
    id: 'object',
    label: 'Object',
    icon: Braces,
    group: 'structured',
    help: 'Nested group of named fields (a sub-record).',
    defaultSchema: () => ({ type: 'object', properties: {} }),
  },
  {
    id: 'array',
    label: 'Array',
    icon: List,
    group: 'structured',
    help: 'Ordered list of values.',
    defaultSchema: () => ({ type: 'array' }),
  },
  {
    id: 'richText',
    label: 'Rich text',
    icon: Pilcrow,
    group: 'content',
    help: 'Rich text / block content edited with the block editor.',
    defaultSchema: () => {
      const schema: Record<string, unknown> = {}
      applyFieldType(schema, 'richText')
      return schema
    },
  },
]

const FIELD_TYPE_MAP = new Map(FIELD_TYPES.map((entry) => [entry.id, entry]))

export function getFieldType(id: FieldTypeId): FieldTypeDefinition {
  const found = FIELD_TYPE_MAP.get(id)
  if (!found) throw new Error(`Unknown field type: ${id}`)
  return found
}

/** The icon for a field entry, falling back to a generic type icon. */
export function fieldTypeIcon(id: FieldTypeId | null): LucideIcon {
  return id ? getFieldType(id).icon : Type
}

export type OptionGroup = 'basics' | 'validation' | 'advanced'

export type OptionValue = string | number | boolean

export interface OptionDescriptor {
  /** The JSON Schema keyword this option reads/writes. */
  key: string
  label: string
  group: OptionGroup
  control: 'text' | 'number' | 'checkbox'
  help?: string
  /** Which field types expose this option. */
  appliesTo: readonly FieldTypeId[]
  /** Read the current value off a field schema. */
  read: (schema: Record<string, unknown>) => OptionValue | undefined
  /** Write the value (or remove it when `undefined`). */
  write: (schema: Record<string, unknown>, value: OptionValue | undefined) => void
}

function numericOption(
  key: string,
  label: string,
  appliesTo: readonly FieldTypeId[],
  group: OptionGroup = 'validation',
  help?: string,
): OptionDescriptor {
  return {
    key,
    label,
    group,
    control: 'number',
    help,
    appliesTo,
    read: (schema) =>
      typeof schema[key] === 'number' ? (schema[key] as number) : undefined,
    write: (schema, value) => {
      if (value === undefined || value === '') delete schema[key]
      else schema[key] = value
    },
  }
}

function textOption(
  key: string,
  label: string,
  appliesTo: readonly FieldTypeId[],
  group: OptionGroup = 'validation',
  help?: string,
): OptionDescriptor {
  return {
    key,
    label,
    group,
    control: 'text',
    help,
    appliesTo,
    read: (schema) =>
      typeof schema[key] === 'string' ? (schema[key] as string) : undefined,
    write: (schema, value) => {
      if (value === undefined || value === '') delete schema[key]
      else schema[key] = value
    },
  }
}

function booleanOption(
  key: string,
  label: string,
  appliesTo: readonly FieldTypeId[],
  group: OptionGroup = 'validation',
  help?: string,
): OptionDescriptor {
  return {
    key,
    label,
    group,
    control: 'checkbox',
    help,
    appliesTo,
    read: (schema) =>
      typeof schema[key] === 'boolean' ? (schema[key] as boolean) : undefined,
    write: (schema, value) => {
      if (value === undefined) delete schema[key]
      else schema[key] = value
    },
  }
}

const STRINGS: readonly FieldTypeId[] = ['string']
const NUMBERS: readonly FieldTypeId[] = ['number', 'integer']
const ARRAYS: readonly FieldTypeId[] = ['array']
const ALL: readonly FieldTypeId[] = [...FIELD_TYPES.map((entry) => entry.id)]

export const FIELD_OPTIONS: readonly OptionDescriptor[] = [
  {
    key: 'description',
    label: 'Description',
    group: 'basics',
    control: 'text',
    help: 'Help text shown under the field in the record form.',
    appliesTo: ALL,
    read: (schema) =>
      typeof schema.description === 'string'
        ? (schema.description as string)
        : undefined,
    write: (schema, value) => {
      if (value === undefined || value === '') delete schema.description
      else schema.description = value
    },
  },
  textOption('format', 'Format', STRINGS, 'validation', 'e.g. email, uri, date-time'),
  numericOption('minLength', 'Min length', STRINGS),
  numericOption('maxLength', 'Max length', STRINGS),
  textOption('pattern', 'Pattern', STRINGS, 'validation', 'A regular expression.'),
  numericOption('minimum', 'Minimum', NUMBERS),
  numericOption('maximum', 'Maximum', NUMBERS),
  numericOption('exclusiveMinimum', 'Exclusive minimum', NUMBERS),
  numericOption('exclusiveMaximum', 'Exclusive maximum', NUMBERS),
  numericOption('multipleOf', 'Multiple of', NUMBERS),
  numericOption('minItems', 'Min items', ARRAYS),
  numericOption('maxItems', 'Max items', ARRAYS),
  booleanOption('uniqueItems', 'Unique items', ARRAYS),
  {
    key: 'default',
    label: 'Default value',
    group: 'advanced',
    control: 'text',
    help: 'Prefilled value when a record form opens (JSON literal).',
    appliesTo: ALL,
    read: (schema) =>
      schema.default === undefined ? undefined : JSON.stringify(schema.default),
    write: (schema, value) => {
      if (value === undefined || value === '') {
        delete schema.default
        return
      }
      try {
        schema.default = JSON.parse(String(value))
      } catch {
        schema.default = value
      }
    },
  },
]

export function fieldOptionsFor(type: FieldTypeId): OptionDescriptor[] {
  return FIELD_OPTIONS.filter((option) => option.appliesTo.includes(type))
}

export function isFieldSchemaObject(
  schema: unknown,
): schema is Record<string, unknown> {
  return isPlainObject(schema)
}
