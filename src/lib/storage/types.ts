export type JsonSchemaDraft = '2020-12' | '2019-09' | 'draft-07'

/**
 * The id of the always-present default workspace. It is created lazily on first
 * use and cannot be deleted, so the app always has somewhere to put schemas.
 */
export const DEFAULT_WORKSPACE_ID = 'default'

export interface WorkspaceEntity {
  id: string
  name: string
  color?: string
  createdAt: string
  updatedAt: string
}

export interface SchemaEntity {
  id: string
  workspaceId: string
  name: string
  description: string
  draft: JsonSchemaDraft
  jsonSchema: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface RecordEntity {
  id: string
  workspaceId: string
  schemaId: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateWorkspaceInput {
  name: string
  color?: string
}

export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>

export interface CreateSchemaInput {
  workspaceId: string
  name: string
  description?: string
  draft?: JsonSchemaDraft
  jsonSchema: Record<string, unknown>
}

export type UpdateSchemaInput = Partial<Omit<CreateSchemaInput, 'workspaceId'>>

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
  listWorkspaces(): Promise<WorkspaceEntity[]>
  getWorkspace(id: string): Promise<WorkspaceEntity | undefined>
  createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceEntity>
  updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<WorkspaceEntity>
  deleteWorkspace(id: string): Promise<void>
  /** Returns the default workspace, creating it if it does not exist yet. */
  getDefaultWorkspace(): Promise<WorkspaceEntity>

  listSchemas(workspaceId: string): Promise<SchemaEntity[]>
  getSchema(id: string): Promise<SchemaEntity | undefined>
  createSchema(input: CreateSchemaInput): Promise<SchemaEntity>
  updateSchema(id: string, input: UpdateSchemaInput): Promise<SchemaEntity>
  deleteSchema(id: string): Promise<void>

  listRecords(schemaId: string): Promise<RecordEntity[]>
  listAllRecords(workspaceId?: string): Promise<RecordEntity[]>
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
