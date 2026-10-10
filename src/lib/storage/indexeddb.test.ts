import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIndexedDbStorage } from './indexeddb'
import { DEFAULT_WORKSPACE_ID, StorageError, type StorageAdapter } from './types'

const uniqueName = () => `schema-studio-test-${crypto.randomUUID()}`

describe('IndexedDB storage', () => {
  let storage: StorageAdapter
  let workspaceId: string

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    storage = createIndexedDbStorage({ name: uniqueName() })
    workspaceId = (await storage.createWorkspace({ name: 'Projects' })).id
  })

  afterEach(async () => {
    await storage.destroy()
    vi.useRealTimers()
  })

  describe('workspaces', () => {
    it('creates, lists, and updates a workspace', async () => {
      const workspace = await storage.getWorkspace(workspaceId)
      expect(workspace).toMatchObject({ name: 'Projects' })
      expect(workspace?.createdAt).toBe('2024-01-01T00:00:00.000Z')

      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'))
      const updated = await storage.updateWorkspace(workspaceId, {
        name: 'Renamed',
      })
      expect(updated.name).toBe('Renamed')
      expect(updated.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(updated.updatedAt).toBe('2024-02-01T00:00:00.000Z')

      expect(await storage.listWorkspaces()).toHaveLength(1)
    })

    it('throws NOT_FOUND when updating a missing workspace', async () => {
      await expect(
        storage.updateWorkspace('missing', { name: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('returns the same default workspace on repeated calls, creating it on demand', async () => {
      const first = await storage.getDefaultWorkspace()
      const second = await storage.getDefaultWorkspace()
      expect(first.id).toBe(DEFAULT_WORKSPACE_ID)
      expect(second.id).toBe(DEFAULT_WORKSPACE_ID)
      expect(await storage.getWorkspace(DEFAULT_WORKSPACE_ID)).toBeDefined()
    })

    it('refuses to delete the default workspace', async () => {
      await storage.getDefaultWorkspace()
      await expect(storage.deleteWorkspace(DEFAULT_WORKSPACE_ID)).rejects.toMatchObject({
        code: 'CONFLICT',
      })
      expect(await storage.getWorkspace(DEFAULT_WORKSPACE_ID)).toBeDefined()
    })

    it('deletes a workspace and cascades its schemas and records atomically', async () => {
      const other = await storage.createWorkspace({ name: 'Other' })
      const schema = await storage.createSchema({
        workspaceId,
        name: 'Person',
        jsonSchema: {},
      })
      const record = await storage.createRecord({
        schemaId: schema.id,
        data: { a: 1 },
      })
      const kept = await storage.createSchema({
        workspaceId: other.id,
        name: 'Kept',
        jsonSchema: {},
      })

      await storage.deleteWorkspace(workspaceId)

      expect(await storage.getWorkspace(workspaceId)).toBeUndefined()
      expect(await storage.getSchema(schema.id)).toBeUndefined()
      expect(await storage.getRecord(record.id)).toBeUndefined()
      expect(await storage.getSchema(kept.id)).toBeDefined()
    })

    it('throws NOT_FOUND when deleting a missing workspace', async () => {
      await expect(storage.deleteWorkspace('missing')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })
  })

  describe('schemas', () => {
    it('creates and reads a schema', async () => {
      const schema = await storage.createSchema({
        workspaceId,
        name: 'Person',
        jsonSchema: { type: 'object', properties: { name: { type: 'string' } } },
      })

      expect(schema.id).toBeTruthy()
      expect(schema.workspaceId).toBe(workspaceId)
      expect(schema.draft).toBe('2020-12')
      expect(schema.description).toBe('')
      expect(schema.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(await storage.getSchema(schema.id)).toEqual(schema)
    })

    it('rejects creating a schema for a missing workspace', async () => {
      await expect(
        storage.createSchema({ workspaceId: 'missing', name: 'X', jsonSchema: {} }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('lists schemas most recently updated first', async () => {
      const first = await storage.createSchema({
        workspaceId,
        name: 'First',
        jsonSchema: {},
      })
      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'))
      const second = await storage.createSchema({
        workspaceId,
        name: 'Second',
        jsonSchema: {},
      })
      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'))
      await storage.updateSchema(first.id, { name: 'First updated' })

      const listed = await storage.listSchemas(workspaceId)
      expect(listed.map((s) => s.id)).toEqual([first.id, second.id])
    })

    it('isolates schemas by workspace', async () => {
      const other = await storage.createWorkspace({ name: 'Other' })
      await storage.createSchema({ workspaceId, name: 'Mine', jsonSchema: {} })
      await storage.createSchema({
        workspaceId: other.id,
        name: 'Theirs',
        jsonSchema: {},
      })

      const mine = await storage.listSchemas(workspaceId)
      const theirs = await storage.listSchemas(other.id)
      expect(mine.map((s) => s.name)).toEqual(['Mine'])
      expect(theirs.map((s) => s.name)).toEqual(['Theirs'])
    })

    it('updates a schema and preserves createdAt while bumping updatedAt', async () => {
      const schema = await storage.createSchema({
        workspaceId,
        name: 'Person',
        jsonSchema: {},
      })
      vi.setSystemTime(new Date('2024-05-01T00:00:00.000Z'))

      const updated = await storage.updateSchema(schema.id, { name: 'Human' })

      expect(updated.name).toBe('Human')
      expect(updated.workspaceId).toBe(workspaceId)
      expect(updated.createdAt).toBe(schema.createdAt)
      expect(updated.updatedAt).toBe('2024-05-01T00:00:00.000Z')
    })

    it('throws NOT_FOUND when updating a missing schema', async () => {
      await expect(storage.updateSchema('missing', { name: 'x' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
      await expect(storage.updateSchema('missing', { name: 'x' })).rejects.toBeInstanceOf(
        StorageError,
      )
    })

    it('deletes a schema and cascades its records', async () => {
      const schema = await storage.createSchema({
        workspaceId,
        name: 'Person',
        jsonSchema: {},
      })
      const record = await storage.createRecord({ schemaId: schema.id, data: { a: 1 } })

      await storage.deleteSchema(schema.id)

      expect(await storage.getSchema(schema.id)).toBeUndefined()
      expect(await storage.getRecord(record.id)).toBeUndefined()
    })
  })

  describe('records', () => {
    it('rejects creating a record for a missing schema', async () => {
      await expect(
        storage.createRecord({ schemaId: 'missing', data: { a: 1 } }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('creates and reads a record, deriving its workspace from the schema', async () => {
      const schema = await storage.createSchema({
        workspaceId,
        name: 'Person',
        jsonSchema: {},
      })
      const record = await storage.createRecord({ schemaId: schema.id, data: { name: 'Ada' } })

      expect(record.id).toBeTruthy()
      expect(record.schemaId).toBe(schema.id)
      expect(record.workspaceId).toBe(workspaceId)
      expect(record.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(await storage.getRecord(record.id)).toEqual(record)
    })

    it('lists only records for the given schema, ordered by createdAt', async () => {
      const a = await storage.createSchema({ workspaceId, name: 'A', jsonSchema: {} })
      const b = await storage.createSchema({ workspaceId, name: 'B', jsonSchema: {} })
      const a1 = await storage.createRecord({ schemaId: a.id, data: { n: 1 } })
      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'))
      const a2 = await storage.createRecord({ schemaId: a.id, data: { n: 2 } })
      await storage.createRecord({ schemaId: b.id, data: { n: 3 } })

      const listed = await storage.listRecords(a.id)
      expect(listed.map((r) => r.id)).toEqual([a1.id, a2.id])
      expect(await storage.listAllRecords()).toHaveLength(3)
      expect(await storage.listAllRecords(workspaceId)).toHaveLength(3)
    })

    it('isolates records by workspace', async () => {
      const other = await storage.createWorkspace({ name: 'Other' })
      const mine = await storage.createSchema({ workspaceId, name: 'Mine', jsonSchema: {} })
      const theirs = await storage.createSchema({
        workspaceId: other.id,
        name: 'Theirs',
        jsonSchema: {},
      })
      await storage.createRecord({ schemaId: mine.id, data: { mine: true } })
      await storage.createRecord({ schemaId: theirs.id, data: { mine: false } })

      const mineRecords = await storage.listAllRecords(workspaceId)
      const theirRecords = await storage.listAllRecords(other.id)
      expect(mineRecords).toHaveLength(1)
      expect(mineRecords[0].data).toEqual({ mine: true })
      expect(theirRecords).toHaveLength(1)
      expect(theirRecords[0].data).toEqual({ mine: false })
    })

    it('updates a record and preserves createdAt while bumping updatedAt', async () => {
      const schema = await storage.createSchema({ workspaceId, name: 'Person', jsonSchema: {} })
      const record = await storage.createRecord({ schemaId: schema.id, data: { name: 'Ada' } })
      vi.setSystemTime(new Date('2024-05-01T00:00:00.000Z'))

      const updated = await storage.updateRecord(record.id, { data: { name: 'Grace' } })

      expect(updated.data).toEqual({ name: 'Grace' })
      expect(updated.createdAt).toBe(record.createdAt)
      expect(updated.updatedAt).toBe('2024-05-01T00:00:00.000Z')
    })

    it('throws NOT_FOUND when updating a missing record', async () => {
      await expect(
        storage.updateRecord('missing', { data: {} }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('deletes a record', async () => {
      const schema = await storage.createSchema({ workspaceId, name: 'Person', jsonSchema: {} })
      const record = await storage.createRecord({ schemaId: schema.id, data: { a: 1 } })

      await storage.deleteRecord(record.id)

      expect(await storage.getRecord(record.id)).toBeUndefined()
    })
  })

  describe('settings', () => {
    it('stores, reads, overwrites, and deletes a setting', async () => {
      expect(await storage.getSetting('schemaEditor.defaultTab')).toBeUndefined()

      await storage.setSetting('schemaEditor.defaultTab', 'builder')
      expect(await storage.getSetting<string>('schemaEditor.defaultTab')).toBe(
        'builder',
      )

      await storage.setSetting('schemaEditor.defaultTab', 'raw')
      expect(await storage.getSetting<string>('schemaEditor.defaultTab')).toBe(
        'raw',
      )

      await storage.deleteSetting('schemaEditor.defaultTab')
      expect(await storage.getSetting('schemaEditor.defaultTab')).toBeUndefined()
    })
  })

  describe('migrations', () => {
    it('upgrades a v1 database to v2 and backfills timestamps', async () => {
      const name = uniqueName()
      const legacy = new Dexie(name)
      legacy.version(1).stores({ schemas: 'id, name', records: 'id, schemaId' })
      await legacy.open()
      await legacy.table('schemas').bulkAdd([
        { id: 's1', name: 'Legacy', description: '', draft: '2020-12', jsonSchema: {} },
      ])
      await legacy.table('records').bulkAdd([
        { id: 'r1', schemaId: 's1', data: { a: 1 }, createdAt: '2020-01-01T00:00:00.000Z' },
        {
          id: 'r2',
          schemaId: 's1',
          data: { b: 2 },
          createdAt: '2021-06-01T00:00:00.000Z',
          updatedAt: '2021-07-01T00:00:00.000Z',
        },
      ])
      legacy.close()

      const migrated = createIndexedDbStorage({ name })

      const backfilled = await migrated.getRecord('r1')
      expect(backfilled?.data).toEqual({ a: 1 })
      expect(backfilled?.updatedAt).toBe('2020-01-01T00:00:00.000Z')

      const untouched = await migrated.getRecord('r2')
      expect(untouched?.updatedAt).toBe('2021-07-01T00:00:00.000Z')

      // v2 indexes must be usable after upgrade; legacy rows get timestamps and
      // are backfilled into the default workspace by the later v4 migration.
      const schemas = await migrated.listSchemas(DEFAULT_WORKSPACE_ID)
      expect(schemas).toHaveLength(1)
      expect(schemas[0].updatedAt).toBeTruthy()
      expect(schemas[0].workspaceId).toBe(DEFAULT_WORKSPACE_ID)

      await migrated.destroy()
    })

    it('upgrades a v2 database to v3, preserving data and adding settings', async () => {
      const name = uniqueName()
      const legacy = new Dexie(name)
      legacy.version(1).stores({ schemas: 'id, name', records: 'id, schemaId' })
      legacy.version(2).stores({
        schemas: 'id, name, createdAt, updatedAt',
        records: 'id, schemaId, createdAt, updatedAt',
      })
      await legacy.open()
      await legacy.table('schemas').add({
        id: 's1',
        name: 'Kept',
        description: '',
        draft: '2020-12',
        jsonSchema: { type: 'object' },
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      })
      legacy.close()

      const migrated = createIndexedDbStorage({ name })

      const schemas = await migrated.listSchemas(DEFAULT_WORKSPACE_ID)
      expect(schemas.map((schema) => schema.name)).toEqual(['Kept'])

      // The new v3 settings store must exist and be usable after the upgrade.
      await migrated.setSetting('schemaEditor.defaultTab', 'raw')
      expect(await migrated.getSetting<string>('schemaEditor.defaultTab')).toBe(
        'raw',
      )

      await migrated.destroy()
    })

    it('upgrades a v3 database to v4, backfilling data into the default workspace', async () => {
      const name = uniqueName()
      const legacy = new Dexie(name)
      legacy.version(1).stores({ schemas: 'id, name', records: 'id, schemaId' })
      legacy.version(2).stores({
        schemas: 'id, name, createdAt, updatedAt',
        records: 'id, schemaId, createdAt, updatedAt',
      })
      legacy.version(3).stores({
        schemas: 'id, name, createdAt, updatedAt',
        records: 'id, schemaId, createdAt, updatedAt',
        settings: 'key',
      })
      await legacy.open()
      await legacy.table('schemas').add({
        id: 's1',
        name: 'Kept',
        description: '',
        draft: '2020-12',
        jsonSchema: { type: 'object' },
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      })
      await legacy.table('records').add({
        id: 'r1',
        schemaId: 's1',
        data: { a: 1 },
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      })
      legacy.close()

      const migrated = createIndexedDbStorage({ name })

      const workspaces = await migrated.listWorkspaces()
      expect(workspaces.map((w) => w.id)).toEqual([DEFAULT_WORKSPACE_ID])

      const schemas = await migrated.listSchemas(DEFAULT_WORKSPACE_ID)
      expect(schemas).toHaveLength(1)
      expect(schemas[0].workspaceId).toBe(DEFAULT_WORKSPACE_ID)

      const records = await migrated.listAllRecords(DEFAULT_WORKSPACE_ID)
      expect(records).toHaveLength(1)
      expect(records[0].workspaceId).toBe(DEFAULT_WORKSPACE_ID)

      await migrated.destroy()
    })
  })
})
