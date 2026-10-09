import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIndexedDbStorage } from './indexeddb'
import { StorageError, type StorageAdapter } from './types'

const uniqueName = () => `schema-studio-test-${crypto.randomUUID()}`

describe('IndexedDB storage', () => {
  let storage: StorageAdapter

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    storage = createIndexedDbStorage({ name: uniqueName() })
  })

  afterEach(async () => {
    await storage.destroy()
    vi.useRealTimers()
  })

  describe('schemas', () => {
    it('creates and reads a schema', async () => {
      const schema = await storage.createSchema({
        name: 'Person',
        jsonSchema: { type: 'object', properties: { name: { type: 'string' } } },
      })

      expect(schema.id).toBeTruthy()
      expect(schema.draft).toBe('2020-12')
      expect(schema.description).toBe('')
      expect(schema.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(await storage.getSchema(schema.id)).toEqual(schema)
    })

    it('lists schemas most recently updated first', async () => {
      const first = await storage.createSchema({ name: 'First', jsonSchema: {} })
      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'))
      const second = await storage.createSchema({ name: 'Second', jsonSchema: {} })
      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'))
      await storage.updateSchema(first.id, { name: 'First updated' })

      const listed = await storage.listSchemas()
      expect(listed.map((s) => s.id)).toEqual([first.id, second.id])
    })

    it('updates a schema and preserves createdAt while bumping updatedAt', async () => {
      const schema = await storage.createSchema({ name: 'Person', jsonSchema: {} })
      vi.setSystemTime(new Date('2024-05-01T00:00:00.000Z'))

      const updated = await storage.updateSchema(schema.id, { name: 'Human' })

      expect(updated.name).toBe('Human')
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
      const schema = await storage.createSchema({ name: 'Person', jsonSchema: {} })
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

    it('creates and reads a record', async () => {
      const schema = await storage.createSchema({ name: 'Person', jsonSchema: {} })
      const record = await storage.createRecord({ schemaId: schema.id, data: { name: 'Ada' } })

      expect(record.id).toBeTruthy()
      expect(record.schemaId).toBe(schema.id)
      expect(record.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(await storage.getRecord(record.id)).toEqual(record)
    })

    it('lists only records for the given schema, ordered by createdAt', async () => {
      const a = await storage.createSchema({ name: 'A', jsonSchema: {} })
      const b = await storage.createSchema({ name: 'B', jsonSchema: {} })
      const a1 = await storage.createRecord({ schemaId: a.id, data: { n: 1 } })
      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'))
      const a2 = await storage.createRecord({ schemaId: a.id, data: { n: 2 } })
      await storage.createRecord({ schemaId: b.id, data: { n: 3 } })

      const listed = await storage.listRecords(a.id)
      expect(listed.map((r) => r.id)).toEqual([a1.id, a2.id])
      expect(await storage.listAllRecords()).toHaveLength(3)
    })

    it('updates a record and preserves createdAt while bumping updatedAt', async () => {
      const schema = await storage.createSchema({ name: 'Person', jsonSchema: {} })
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
      const schema = await storage.createSchema({ name: 'Person', jsonSchema: {} })
      const record = await storage.createRecord({ schemaId: schema.id, data: { a: 1 } })

      await storage.deleteRecord(record.id)

      expect(await storage.getRecord(record.id)).toBeUndefined()
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

      // v2 indexes must be usable after upgrade; legacy rows get timestamps.
      const schemas = await migrated.listSchemas()
      expect(schemas).toHaveLength(1)
      expect(schemas[0].updatedAt).toBeTruthy()

      await migrated.destroy()
    })
  })
})
