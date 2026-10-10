import { describeRecordFields } from '@/lib/records/fields'
import { richTextPlainText } from '@/lib/records/rich-text'
import type { RecordEntity, SchemaEntity } from '@/lib/storage'

function describeRecordValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

/** A human label for a record: the first scalar property value, else its id. */
export function recordLabel(
  schema: SchemaEntity,
  record: RecordEntity,
): string | undefined {
  for (const field of describeRecordFields(schema.jsonSchema)) {
    const value = record.data[field.name]
    if (field.kind === 'richText') {
      const text = richTextPlainText(value)
      if (text) return text
      continue
    }
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
  }
  return undefined
}

export function recordSummary(schema: SchemaEntity, record: RecordEntity): string {
  const fields = describeRecordFields(schema.jsonSchema)
  const parts: string[] = []
  for (const field of fields) {
    const value = record.data[field.name]
    if (value === undefined) continue
    if (field.kind === 'richText') {
      const text = richTextPlainText(value)
      if (text) parts.push(`${field.name}: ${text}`)
      continue
    }
    parts.push(`${field.name}: ${describeRecordValue(value)}`)
  }
  if (parts.length === 0) return 'Empty record'
  return parts.join('  ·  ')
}
