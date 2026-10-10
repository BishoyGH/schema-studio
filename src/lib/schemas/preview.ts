import { jsonSchemaToZod } from './json-to-zod'

export interface AdvancedFieldNote {
  name: string
  notes: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Unsupported-keyword notes for the whole document (root-level and nested),
 * surfaced by the F-07a preview as "advanced — not validated" notices.
 */
export function schemaUnsupportedNotes(jsonSchema: unknown): string[] {
  if (!isPlainObject(jsonSchema)) return []
  return jsonSchemaToZod(jsonSchema).unsupported
}

/**
 * Per-top-level-property unsupported notes. Fields whose schema the F-04 bridge
 * could not translate are flagged in the preview as "advanced — not validated"
 * instead of being silently mis-validated.
 */
export function fieldAdvancedNotes(jsonSchema: unknown): AdvancedFieldNote[] {
  if (!isPlainObject(jsonSchema)) return []
  const properties = isPlainObject(jsonSchema.properties) ? jsonSchema.properties : {}
  const notes: AdvancedFieldNote[] = []
  for (const [name, rawSchema] of Object.entries(properties)) {
    if (typeof rawSchema !== 'object' || rawSchema === null || Array.isArray(rawSchema)) {
      continue
    }
    const unsupported = jsonSchemaToZod(rawSchema).unsupported
    if (unsupported.length > 0) notes.push({ name, notes: unsupported })
  }
  return notes
}