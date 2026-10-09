export type JsonSchemaDraft = '2020-12' | '2019-09' | 'draft-07'

export interface SchemaEntity {
  id: string
  name: string
  description: string
  draft: JsonSchemaDraft
  jsonSchema: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface RecordEntity {
  id: string
  schemaId: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateSchemaInput {
  name: string
  description?: string
  draft?: JsonSchemaDraft
  jsonSchema: Record<string, unknown>
}

export type UpdateSchemaInput = Partial<CreateSchemaInput>

export interface CreateRecordInput {
  schemaId: string
  data: Record<string, unknown>
}

export interface UpdateRecordInput {
  data: Record<string, unknown>
}

export interface SettingRecord {
  key: string
  value: unknown
  updatedAt: string
}

/**
 * Storage contract the app depends on. IndexedDB is the current implementation;
 * any future engine only needs to satisfy this interface to be swapped in.
 */
export interface StorageAdapter {
  listSchemas(): Promise<SchemaEntity[]>
  getSchema(id: string): Promise<SchemaEntity | undefined>
  createSchema(input: CreateSchemaInput): Promise<SchemaEntity>
  updateSchema(id: string, input: UpdateSchemaInput): Promise<SchemaEntity>
  deleteSchema(id: string): Promise<void>

  listRecords(schemaId: string): Promise<RecordEntity[]>
  listAllRecords(): Promise<RecordEntity[]>
  getRecord(id: string): Promise<RecordEntity | undefined>
  createRecord(input: CreateRecordInput): Promise<RecordEntity>
  updateRecord(id: string, input: UpdateRecordInput): Promise<RecordEntity>
  deleteRecord(id: string): Promise<void>

  getSetting<T = unknown>(key: string): Promise<T | undefined>
  setSetting(key: string, value: unknown): Promise<void>
  deleteSetting(key: string): Promise<void>

  close(): void
  destroy(): Promise<void>
}

export class StorageError extends Error {
  readonly code: 'NOT_FOUND' | 'CONFLICT' | 'UNAVAILABLE'

  constructor(code: StorageError['code'], message: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}
