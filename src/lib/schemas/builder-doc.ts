import {
  isRichTextField,
  richTextFieldSchema,
  SCHEMA_STUDIO_KEY,
} from '@/lib/schemas/extension'
import { parseJsonSchema } from '@/lib/schemas/validation'

/**
 * Pure, side-effect-free operations over a JSON Schema document for the visual
 * builder (F-12) and the three-pane studio (F-54). Keeping the read/write logic
 * here (instead of inside a component) means the outline, the detail inspector,
 * and the legacy builder all mutate the document the same way, and the behavior
 * is unit-testable without rendering.
 */

export const FIELD_TYPE_IDS = [
  'string',
  'number',
  'integer',
  'boolean',
  'null',
  'object',
  'array',
  'richText',
] as const

export type FieldTypeId = (typeof FIELD_TYPE_IDS)[number]

/** Root keywords the builder manages directly; anything else is "advanced". */
export const MANAGED_ROOT_KEYS = new Set([
  '$schema',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'title',
])

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isFieldTypeId(value: unknown): value is FieldTypeId {
  return (
    typeof value === 'string' &&
    (FIELD_TYPE_IDS as readonly string[]).includes(value)
  )
}

/** Parse raw edit-tab text into a document, falling back to `{}`. */
export function toDocument(text: string): Record<string, unknown> {
  const result = parseJsonSchema(text)
  return result.ok ? result.value : {}
}

export interface FieldEntry {
  key: string
  schema: Record<string, unknown>
  booleanSchema: boolean
  type: FieldTypeId | null
  required: boolean
  hasAdvancedKeywords: boolean
}

export function readProperties(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  return isPlainObject(doc.properties) ? doc.properties : {}
}

export function readRequired(doc: Record<string, unknown>): string[] {
  return Array.isArray(doc.required)
    ? doc.required.filter((entry): entry is string => typeof entry === 'string')
    : []
}

/**
 * Whether the document is one the builder can render field rows for. This is
 * intentionally independent of raw-JSON validity so a last valid schema keeps
 * showing (read-only) while the Raw JSON tab has errors.
 */
export function isDocEditable(doc: Record<string, unknown>): boolean {
  return (
    (doc.type === undefined || doc.type === 'object') &&
    (doc.properties === undefined || isPlainObject(doc.properties))
  )
}

export function readFields(doc: Record<string, unknown>): FieldEntry[] {
  if (!isDocEditable(doc)) return []
  const properties = readProperties(doc)
  const required = readRequired(doc)
  return Object.entries(properties).map(([key, rawSchema]) => {
    const schema = isPlainObject(rawSchema) ? rawSchema : {}
    const richText = isRichTextField(schema)
    const advancedKeys = Object.keys(schema).filter((entry) => {
      if (entry === 'type' || entry === 'description') return false
      if (entry === SCHEMA_STUDIO_KEY && richText) return false
      return true
    })
    const type: FieldTypeId | null = richText
      ? 'richText'
      : isFieldTypeId(schema.type)
        ? schema.type
        : null
    return {
      key,
      schema,
      booleanSchema: typeof rawSchema === 'boolean',
      type,
      required: required.includes(key),
      hasAdvancedKeywords:
        typeof rawSchema === 'boolean' || advancedKeys.length > 0,
    }
  })
}

export function advancedRootKeys(doc: Record<string, unknown>): string[] {
  return Object.keys(doc).filter((key) => !MANAGED_ROOT_KEYS.has(key))
}

export function hasAdvancedAdditionalProperties(
  doc: Record<string, unknown>,
): boolean {
  return (
    doc.additionalProperties !== undefined &&
    typeof doc.additionalProperties !== 'boolean'
  )
}

/**
 * Write a picked type back into a field schema. Most types map 1:1 onto the
 * JSON Schema `type` keyword; `richText` is the F-07b `x-schema-studio` field
 * type, stored as an array of blocks.
 */
export function applyFieldType(
  schema: Record<string, unknown>,
  type: FieldTypeId,
): void {
  if (type === 'richText') {
    Object.assign(schema, richTextFieldSchema())
    return
  }
  schema.type = type
  if (isRichTextField(schema)) delete schema[SCHEMA_STUDIO_KEY]
}

/** Pick a unique field name that does not collide with existing properties. */
export function uniqueFieldName(
  properties: Record<string, unknown>,
  base = 'field',
): string {
  if (!(base in properties)) return base
  let counter = 1
  let name = `${base}${counter}`
  while (name in properties) {
    counter += 1
    name = `${base}${counter}`
  }
  return name
}

export function addField(
  doc: Record<string, unknown>,
  preferredName?: string,
  type: FieldTypeId = 'string',
): { doc: Record<string, unknown>; key: string } {
  const properties = readProperties(doc)
  const key = uniqueFieldName(properties, preferredName)
  const schema: Record<string, unknown> = {}
  applyFieldType(schema, type)
  const nextProperties = { ...properties, [key]: schema }
  return { doc: { ...doc, properties: nextProperties }, key }
}

export function removeFields(
  doc: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  if (keys.length === 0) return doc
  const nextProperties = { ...readProperties(doc) }
  for (const key of keys) delete nextProperties[key]
  const nextDoc: Record<string, unknown> = {
    ...doc,
    properties: nextProperties,
  }
  if (Array.isArray(doc.required)) {
    const removed = new Set(keys)
    nextDoc.required = readRequired(doc).filter((entry) => !removed.has(entry))
  }
  return nextDoc
}

export function removeField(
  doc: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return removeFields(doc, [key])
}

export function renameField(
  doc: Record<string, unknown>,
  oldKey: string,
  newKey: string,
): Record<string, unknown> {
  if (oldKey === newKey) return doc
  const properties = readProperties(doc)
  if (newKey in properties) return doc
  const nextProperties: Record<string, unknown> = {}
  for (const [key, schema] of Object.entries(properties)) {
    nextProperties[key === oldKey ? newKey : key] = schema
  }
  const nextDoc: Record<string, unknown> = {
    ...doc,
    properties: nextProperties,
  }
  const required = readRequired(doc)
  if (required.includes(oldKey)) {
    nextDoc.required = required.map((entry) =>
      entry === oldKey ? newKey : entry,
    )
  }
  return nextDoc
}

export function moveField(
  doc: Record<string, unknown>,
  key: string,
  delta: number,
): Record<string, unknown> {
  const entries = Object.entries(readProperties(doc))
  const index = entries.findIndex(([entryKey]) => entryKey === key)
  const target = index + delta
  if (index < 0 || target < 0 || target >= entries.length) return doc
  const reordered = [...entries]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(target, 0, moved)
  return { ...doc, properties: Object.fromEntries(reordered) }
}

/** Move a field to an absolute index (used by drag-and-drop reordering). */
export function reorderField(
  doc: Record<string, unknown>,
  key: string,
  toIndex: number,
): Record<string, unknown> {
  const entries = Object.entries(readProperties(doc))
  const from = entries.findIndex(([entryKey]) => entryKey === key)
  if (from < 0) return doc
  const target = Math.max(0, Math.min(toIndex, entries.length - 1))
  if (target === from) return doc
  const reordered = [...entries]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(target, 0, moved)
  return { ...doc, properties: Object.fromEntries(reordered) }
}

export function toggleRequired(
  doc: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const required = readRequired(doc)
  const nextRequired = required.includes(key)
    ? required.filter((entry) => entry !== key)
    : [...required, key]
  return { ...doc, required: nextRequired }
}

export function setFieldRequired(
  doc: Record<string, unknown>,
  key: string,
  required: boolean,
): Record<string, unknown> {
  const has = readRequired(doc).includes(key)
  if (has === required) return doc
  return toggleRequired(doc, key)
}

/** Apply a mutation to a single field's schema (creates it if missing). */
export function updateFieldSchema(
  doc: Record<string, unknown>,
  key: string,
  mutate: (schema: Record<string, unknown>) => void,
): Record<string, unknown> {
  const properties = readProperties(doc)
  const schema = isPlainObject(properties[key]) ? { ...properties[key] } : {}
  mutate(schema)
  return { ...doc, properties: { ...properties, [key]: schema } }
}

export function setAdditionalProperties(
  doc: Record<string, unknown>,
  allowed: boolean,
): Record<string, unknown> {
  return { ...doc, additionalProperties: allowed }
}

export function setRootTitle(
  doc: Record<string, unknown>,
  title: string,
): Record<string, unknown> {
  if (title.trim() === '') {
    const next = { ...doc }
    delete next.title
    return next
  }
  return { ...doc, title }
}
