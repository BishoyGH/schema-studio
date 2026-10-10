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

describe('Dashboard (F-51)', () => {
  let dbName: string
  const storages: StorageAdapter[] = []

  beforeEach(async () => {
    dbName = `schema-studio-dashboard-test-${crypto.randomUUID()}`
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
    await storage.getDefaultWorkspace()
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  it('renders an empty-workspace state and quick actions navigate', async () => {
    const user = userEvent.setup()
    renderApp(`/w/${DEFAULT_WORKSPACE_ID}`)

    expect(await screen.findByText('Start with a schema')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: 'Default workspace',
        level: 1,
      }),
    ).toBeInTheDocument()

    await user.click(
      (await screen.findAllByRole('link', { name: /new schema/i }))[0],
    )
    expect(
      await screen.findByRole('heading', { name: 'New schema', level: 1 }),
    ).toBeInTheDocument()
  })

  it('shows counts and recent schemas reflecting stored data', async () => {
    const storage = storages[0]
    const schema = await storage.createSchema({
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Person',
      jsonSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    })
    for (const name of ['Alice', 'Bob']) {
      await storage.createRecord({ schemaId: schema.id, data: { name } })
    }

    renderApp(`/w/${DEFAULT_WORKSPACE_ID}`)

    const schemaLink = await screen.findByRole('link', { name: 'Person' })
    expect(schemaLink).toBeInTheDocument()
    expect(screen.getByText('2 records')).toBeInTheDocument()
    expect(screen.queryByText('Start with a schema')).not.toBeInTheDocument()
  })
})