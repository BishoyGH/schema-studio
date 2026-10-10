import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_WORKSPACE_ID } from '@/lib/storage'
import {
  createIndexedDbStorage,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'
import { renderApp } from '@/test/render-app'

let schemaId: string

describe('Record pages', () => {
  let dbName: string
  const storages: StorageAdapter[] = []

  beforeEach(async () => {
    dbName = `schema-studio-records-test-${crypto.randomUUID()}`
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
    await storage.getDefaultWorkspace()
    schemaId = (
      await storage.createSchema({
        workspaceId: DEFAULT_WORKSPACE_ID,
        name: 'Person',
        jsonSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
      })
    ).id
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  it('creates a record and persists it', async () => {
    const user = userEvent.setup()
    renderApp(`/w/${DEFAULT_WORKSPACE_ID}/schemas/${schemaId}/records/new`)

    await user.type(await screen.findByLabelText(/^name/), 'Alice')
    await user.click(screen.getByRole('button', { name: /create record/i }))

    expect(await screen.findByText('Alice')).toBeInTheDocument()

    const records = await storages[0].listRecords(schemaId)
    expect(records).toHaveLength(1)
    expect(records[0].data).toEqual({ name: 'Alice' })
  })

  it('shows "no records" and drills back to the schema list', async () => {
    renderApp(`/w/${DEFAULT_WORKSPACE_ID}/schemas/${schemaId}/records`)

    expect(await screen.findByText('No records yet')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('link', { name: /back to schemas/i }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Schemas', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Person')).toBeInTheDocument()
  })
})