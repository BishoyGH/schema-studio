import { validateRecordData, type RecordFieldError } from '@/lib/records/validation'

import {
  StorageError,
  type CreateRecordInput,
  type RecordEntity,
  type StorageAdapter,
  type UpdateRecordInput,
} from './types'

function describeErrors(errors: RecordFieldError[]): string {
  if (errors.length === 0) return 'Record does not match its schema'
  const details = errors
    .map((error) => (error.path ? `${error.path}: ${error.message}` : error.message))
    .join('; ')
  return `Record does not match its schema: ${details}`
}

/**
 * Wrap a `StorageAdapter` so every record write is validated against its schema
 * at the storage boundary, not only in the UI. Raw paths (imports once F-26/F-27
 * land, or any future backend) therefore cannot persist invalid records, and
 * schema `default` keywords are filled in on the way in.
 *
 * The wrapper delegates all other calls to the underlying adapter unchanged, so
 * the storage engine stays swappable.
 */
export function withRecordValidation(adapter: StorageAdapter): StorageAdapter {
  return {
    ...adapter,

    async createRecord(input: CreateRecordInput): Promise<RecordEntity> {
      const schema = await adapter.getSchema(input.schemaId)
      if (!schema) {
        throw new StorageError(
          'NOT_FOUND',
          `Cannot create record: schema ${input.schemaId} not found`,
        )
      }
      const result = validateRecordData(schema.jsonSchema, input.data)
      if (!result.success) {
        throw new StorageError('VALIDATION', describeErrors(result.fieldErrors))
      }
      return adapter.createRecord({ ...input, data: result.data })
    },

    async updateRecord(id: string, input: UpdateRecordInput): Promise<RecordEntity> {
      const existing = await adapter.getRecord(id)
      if (!existing) {
        throw new StorageError('NOT_FOUND', `Record ${id} not found`)
      }
      const schema = await adapter.getSchema(existing.schemaId)
      if (!schema) {
        throw new StorageError(
          'VALIDATION',
          `Record ${id} has no schema and cannot be validated`,
        )
      }
      const result = validateRecordData(schema.jsonSchema, input.data)
      if (!result.success) {
        throw new StorageError('VALIDATION', describeErrors(result.fieldErrors))
      }
      return adapter.updateRecord(id, { data: result.data })
    },
  }
}
