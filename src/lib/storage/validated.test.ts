import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createIndexedDbStorage } from './indexeddb'
import { StorageError, type StorageAdapter } from './types'
import { withRecordValidation } from './validated'

const uniqueName = () => `schema-studio-test-${crypto.randomUUID()}`

describe('withRecordValidation (write-path validation)', () => {
  let raw: StorageAdapter
  let storage: StorageAdapter

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    raw = createIndexedDbStorage({ name: uniqueName() })
    storage = withRecordValidation(raw)
  })

  afterEach(async () => {
    await storage.destroy()
    vi.useRealTimers()
  })

  const personSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      age: { type: 'integer' },
      status: { type: 'string', default: 'draft' },
    },
    required: ['name'],
  }

  async function createSchema() {
    const workspace = await storage.createWorkspace({ name: 'Projects' })
    return storage.createSchema({
      workspaceId: workspace.id,
      name: 'Person',
      jsonSchema: personSchema,
    })
  }

  it('persists valid data and applies schema defaults on create', async () => {
    const schema = await createSchema()

    const record = await storage.createRecord({
      schemaId: schema.id,
      data: { name: 'Ada', age: 36 },
    })

    expect(record.data).toEqual({ name: 'Ada', age: 36, status: 'draft' })

    const persisted = await storage.getRecord(record.id)
    expect(persisted?.data.status).toBe('draft')
  })

  it('rejects a record that does not match its schema at the write path', async () => {
    const schema = await createSchema()

    await expect(
      storage.createRecord({ schemaId: schema.id, data: { name: 'A', age: 36 } }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })

    // Nothing is persisted: records cannot validate against a missing schema.
    expect(await storage.listRecords(schema.id)).toHaveLength(0)
  })

  it('rejects updates that would leave a record invalid', async () => {
    const schema = await createSchema()
    const record = await storage.createRecord({
      schemaId: schema.id,
      data: { name: 'Ada' },
    })

    await expect(
      storage.updateRecord(record.id, { data: { name: 'B' } }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(await storage.getRecord(record.id)).toEqual(record)

    const updated = await storage.updateRecord(record.id, {
      data: { name: 'Grace Hopper', age: 85 },
    })
    expect(updated.data.status).toBe('draft')
  })

  it('throws NOT_FOUND for a missing schema and validates schema-referenced records', async () => {
    await expect(
      storage.createRecord({ schemaId: 'missing', data: {} }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      storage.updateRecord('missing', { data: {} }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('lets non-record calls pass through unchanged', async () => {
    const workspace = await storage.createWorkspace({ name: 'Other' })
    expect(await storage.listWorkspaces()).toHaveLength(1)
    expect(workspace.name).toBe('Other')
    await storage.setSetting('k', 'v')
    expect(await storage.getSetting('k')).toBe('v')
  })

  it('throws a StorageError instance carrying the offending field details', async () => {
    const schema = await createSchema()

    try {
      await storage.createRecord({ schemaId: schema.id, data: { name: 'X' } })
    } catch (error) {
      expect(error).toBeInstanceOf(StorageError)
      const storageError = error as StorageError
      expect(storageError.code).toBe('VALIDATION')
      expect(storageError.message).toMatch(/name/)
    }
  })
})