import { z } from 'zod'

import { jsonSchemaToZod } from '@/lib/schemas/json-to-zod'

export interface RecordFieldError {
  /** Dot-joined path to the offending field (empty for a whole-record error). */
  path: string
  message: string
}

export interface RecordValidationResult {
  success: boolean
  /** Parsed data, with schema `default` keywords applied. */
  data: Record<string, unknown>
  fieldErrors: RecordFieldError[]
  /** Keywords the JSON→Zod bridge could not translate (best-effort). */
  unsupported: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Compile the record-level Zod schema for a JSON Schema document. Never throws —
 * unsupported keywords are reported in `unsupported` and validation stays
 * best-effort (see F-04).
 */
export function recordZodSchema(jsonSchema: unknown): {
  schema: z.ZodType
  unsupported: string[]
} {
  return jsonSchemaToZod(jsonSchema)
}

/**
 * Validate a record's `data` against its schema and return the parsed value
 * (with defaults applied) or the field-level errors. This is the single source
 * of truth used by both the UI form and the storage write path (F-07).
 */
export function validateRecordData(
  jsonSchema: unknown,
  data: unknown,
): RecordValidationResult {
  const { schema, unsupported } = jsonSchemaToZod(jsonSchema)
  const parsed = schema.safeParse(data)

  if (parsed.success) {
    return {
      success: true,
      data: isPlainObject(parsed.data) ? parsed.data : {},
      fieldErrors: [],
      unsupported,
    }
  }

  return {
    success: false,
    data: isPlainObject(data) ? data : {},
    fieldErrors: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
    unsupported,
  }
}
