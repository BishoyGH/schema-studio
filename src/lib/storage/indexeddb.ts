import Dexie, { type Table } from 'dexie'
import {
  StorageError,
  type CreateRecordInput,
  type CreateSchemaInput,
  type RecordEntity,
  type SchemaEntity,
  type SettingRecord,
  type StorageAdapter,
  type UpdateRecordInput,
  type UpdateSchemaInput,
} from './types'

const DEFAULT_DB_NAME = 'schema-studio'
const DEFAULT_DRAFT = '2020-12'

export const DB_VERSION = 3

function nowIso(): string {
  return new Date().toISOString()
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Versioned IndexedDB schema.
 *
 * v1 -> v2 adds audit-timestamp indexes and backfills missing `createdAt` /
 * `updatedAt` on legacy records (e.g. data imported before timestamps existed).
 * v2 -> v3 adds the key/value `settings` store (no backfill needed).
 */
class SchemaStudioDatabase extends Dexie {
  schemas!: Table<SchemaEntity, string>
  records!: Table<RecordEntity, string>
  settings!: Table<SettingRecord, string>

  constructor(name: string) {
    super(name)

    this.version(1).stores({
      schemas: 'id, name',
      records: 'id, schemaId',
    })

    this.version(2)
      .stores({
        schemas: 'id, name, createdAt, updatedAt',
        records: 'id, schemaId, createdAt, updatedAt',
      })
      .upgrade(async (tx) => {
        const createdAt = nowIso()
        await tx
          .table<SchemaEntity, string>('schemas')
          .toCollection()
          .modify((schema) => {
            if (!schema.createdAt) schema.createdAt = createdAt
            if (!schema.updatedAt) schema.updatedAt = schema.createdAt
          })
        await tx
          .table<RecordEntity, string>('records')
          .toCollection()
          .modify((record) => {
            if (!record.createdAt) record.createdAt = createdAt
            if (!record.updatedAt) record.updatedAt = record.createdAt
          })
      })

    this.version(3).stores({
      schemas: 'id, name, createdAt, updatedAt',
      records: 'id, schemaId, createdAt, updatedAt',
      settings: 'key',
    })
  }
}

export function createIndexedDbStorage(
  options: { name?: string } = {},
): StorageAdapter {
  const db = new SchemaStudioDatabase(options.name ?? DEFAULT_DB_NAME)

  return {
    async listSchemas() {
      return db.schemas.orderBy('updatedAt').reverse().toArray()
    },

    async getSchema(id) {
      return db.schemas.get(id)
    },

    async createSchema(input: CreateSchemaInput) {
      const timestamp = nowIso()
      const schema: SchemaEntity = {
        id: createId(),
        name: input.name,
        description: input.description ?? '',
        draft: input.draft ?? DEFAULT_DRAFT,
        jsonSchema: input.jsonSchema,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await db.schemas.add(schema)
      return schema
    },

    async updateSchema(id, input: UpdateSchemaInput) {
      return db.transaction('rw', db.schemas, async () => {
        const existing = await db.schemas.get(id)
        if (!existing) {
          throw new StorageError('NOT_FOUND', `Schema ${id} not found`)
        }
        const updated: SchemaEntity = {
          ...existing,
          ...input,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: nowIso(),
        }
        await db.schemas.put(updated)
        return updated
      })
    },

    async deleteSchema(id) {
      await db.transaction('rw', db.schemas, db.records, async () => {
        await db.schemas.delete(id)
        await db.records.where('schemaId').equals(id).delete()
      })
    },

    async listRecords(schemaId) {
      const records = await db.records.where('schemaId').equals(schemaId).toArray()
      return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },

    async listAllRecords() {
      return db.records.toArray()
    },

    async getRecord(id) {
      return db.records.get(id)
    },

    async createRecord(input: CreateRecordInput) {
      return db.transaction('rw', db.schemas, db.records, async () => {
        const schema = await db.schemas.get(input.schemaId)
        if (!schema) {
          throw new StorageError(
            'NOT_FOUND',
            `Cannot create record: schema ${input.schemaId} not found`,
          )
        }
        const timestamp = nowIso()
        const record: RecordEntity = {
          id: createId(),
          schemaId: input.schemaId,
          data: input.data,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        await db.records.add(record)
        return record
      })
    },

    async updateRecord(id, input: UpdateRecordInput) {
      return db.transaction('rw', db.records, async () => {
        const existing = await db.records.get(id)
        if (!existing) {
          throw new StorageError('NOT_FOUND', `Record ${id} not found`)
        }
        const updated: RecordEntity = {
          ...existing,
          data: input.data,
          updatedAt: nowIso(),
        }
        await db.records.put(updated)
        return updated
      })
    },

    async deleteRecord(id) {
      await db.records.delete(id)
    },

    async getSetting<T = unknown>(key: string) {
      const row = await db.settings.get(key)
      return row?.value as T | undefined
    },

    async setSetting(key, value) {
      const row: SettingRecord = { key, value, updatedAt: nowIso() }
      await db.settings.put(row)
    },

    async deleteSetting(key) {
      await db.settings.delete(key)
    },

    close() {
      db.close()
    },

    async destroy() {
      await db.delete()
    },
  }
}
