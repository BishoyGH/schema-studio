/**
 * The `x-schema-studio` extension namespace.
 *
 * JSON Schema on its own cannot express Schema Studio's richer field types, so
 * they are carried on a single custom keyword: `x-schema-studio: { kind }`.
 * This module is the one place that knows how to read and write it, so the raw
 * JSON tab, the structural validator, and the JSON→Zod bridge all agree.
 *
 * F-07b introduces the namespace with `kind: "richText"`; F-14 reuses the same
 * namespace for `id` / `reference` fields.
 */
export const SCHEMA_STUDIO_KEY = 'x-schema-studio'

export const RICH_TEXT_KIND = 'richText'

export type SchemaStudioKind = 'richText'

export interface SchemaStudioExtension {
  kind: SchemaStudioKind
}

/** Recognised `kind` values. Unknown kinds are preserved but not interpreted. */
const KNOWN_KINDS: readonly string[] = [RICH_TEXT_KIND]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read the extension object off a field schema, or `null` when absent. */
export function readSchemaStudioExtension(
  schema: unknown,
): SchemaStudioExtension | null {
  if (!isPlainObject(schema)) return null
  const extension = schema[SCHEMA_STUDIO_KEY]
  if (!isPlainObject(extension)) return null
  if (typeof extension.kind !== 'string') return null
  if (!KNOWN_KINDS.includes(extension.kind)) return null
  return { kind: extension.kind as SchemaStudioKind }
}

/**
 * The raw `kind` string on a field schema, even when it is not one this build
 * understands. Used to report unknown constructs through `unsupported[]` rather
 * than silently ignoring them.
 */
export function readUnknownExtensionKind(schema: unknown): string | null {
  if (!isPlainObject(schema)) return null
  const extension = schema[SCHEMA_STUDIO_KEY]
  if (!isPlainObject(extension)) return null
  if (typeof extension.kind !== 'string') return null
  return KNOWN_KINDS.includes(extension.kind) ? null : extension.kind
}

export function isRichTextField(schema: unknown): boolean {
  return readSchemaStudioExtension(schema)?.kind === RICH_TEXT_KIND
}

/** The JSON Schema a fresh rich text field is authored with. */
export function richTextFieldSchema(): Record<string, unknown> {
  return {
    type: 'array',
    [SCHEMA_STUDIO_KEY]: { kind: RICH_TEXT_KIND },
  }
}
