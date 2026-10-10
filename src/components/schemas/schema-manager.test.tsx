import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SchemaManager } from './schema-manager'
import {
  createIndexedDbStorage,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'

function renderManager(workspaceId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <SchemaManager workspaceId={workspaceId} />
    </QueryClientProvider>,
  )
}

describe('SchemaManager', () => {
  let dbName: string
  let workspaceId: string
  const storages: StorageAdapter[] = []

  function newStorage() {
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
    return storage
  }

  beforeEach(async () => {
    dbName = `schema-studio-test-${crypto.randomUUID()}`
    const storage = newStorage()
    workspaceId = (await storage.createWorkspace({ name: 'Projects' })).id
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  it('creates a schema and persists it across a reload', async () => {
    const user = userEvent.setup()
    const first = renderManager(workspaceId)

    await user.click(await screen.findByRole('button', { name: /new schema/i }))
    await user.type(screen.getByLabelText('Name'), 'Person')
    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: {
        value: JSON.stringify({
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        }),
      },
    })
    await user.click(screen.getByRole('button', { name: /create schema/i }))

    expect(await screen.findByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Draft 2020-12')).toBeInTheDocument()

    first.unmount()

    newStorage()
    renderManager(workspaceId)

    await waitFor(() =>
      expect(screen.getByText('Person')).toBeInTheDocument(),
    )

    const persisted = await storages[1].listSchemas(workspaceId)
    expect(persisted).toHaveLength(1)
    expect(persisted[0].jsonSchema).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    })
  })

  it('deletes a schema after confirmation', async () => {
    const storage = storages[0]
    await storage.createSchema({
      workspaceId,
      name: 'Temporary',
      jsonSchema: {},
    })

    const user = userEvent.setup()
    renderManager(workspaceId)

    await user.click(await screen.findByRole('button', { name: /delete temporary/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() =>
      expect(screen.queryByText('Temporary')).not.toBeInTheDocument(),
    )
    expect(await storage.listSchemas(workspaceId)).toHaveLength(0)
  })

  it('shows validation errors and does not save invalid input', async () => {
    const storage = storages[0]
    const user = userEvent.setup()
    renderManager(workspaceId)

    await user.click(await screen.findByRole('button', { name: /new schema/i }))
    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: { value: '{ broken' },
    })
    await user.click(screen.getByRole('button', { name: /create schema/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/invalid json/i)).toBeInTheDocument()
    expect(await storage.listSchemas(workspaceId)).toHaveLength(0)
  })

  it('drills into records for a schema and returns to the schema list', async () => {
    const storage = storages[0]
    await storage.createSchema({
      workspaceId,
      name: 'Person',
      jsonSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    })

    const user = userEvent.setup()
    renderManager(workspaceId)

    await user.click(await screen.findByRole('button', { name: /records/i }))

    expect(
      await screen.findByRole('heading', { name: 'Person', level: 1 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('No records yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to schemas/i }))
    expect(
      await screen.findByRole('heading', { name: 'Schemas', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Person')).toBeInTheDocument()
  })
})
