import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_WORKSPACE_ID } from '@/lib/storage'
import {
  createIndexedDbStorage,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'
import { renderApp } from '@/test/render-app'

const workspacePath = `/w/${DEFAULT_WORKSPACE_ID}/schemas`

function personJson() {
  return JSON.stringify({
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  })
}

describe('Schema pages', () => {
  let dbName: string
  const storages: StorageAdapter[] = []

  beforeEach(async () => {
    dbName = `schema-studio-schemas-test-${crypto.randomUUID()}`
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
    await storage.getDefaultWorkspace()
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  it('creates a schema and persists it', async () => {
    const user = userEvent.setup()
    renderApp(workspacePath)

    await user.click(
      (await screen.findAllByRole('link', { name: /new schema/i }))[0],
    )
    await user.type(await screen.findByLabelText('Name'), 'Person')
    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: { value: personJson() },
    })
    await user.click(screen.getByRole('button', { name: /create schema/i }))

    expect(await screen.findByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Draft 2020-12')).toBeInTheDocument()

    const persisted = await storages[0].listSchemas(DEFAULT_WORKSPACE_ID)
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
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Temporary',
      jsonSchema: {},
    })

    const user = userEvent.setup()
    renderApp(workspacePath)

    await user.click(
      await screen.findByRole('button', { name: /delete temporary/i }),
    )
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() =>
      expect(screen.queryByText('Temporary')).not.toBeInTheDocument(),
    )
    expect(await storage.listSchemas(DEFAULT_WORKSPACE_ID)).toHaveLength(0)
  })

  it('deep-links into an existing schema for editing', async () => {
    const storage = storages[0]
    const schema = await storage.createSchema({
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Person',
      jsonSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    })

    renderApp(`/w/${DEFAULT_WORKSPACE_ID}/schemas/${schema.id}/edit`)

    const nameInput = await screen.findByLabelText('Name')
    expect(nameInput).toHaveValue('Person')
    expect(
      screen.getByRole('heading', { name: 'Edit schema', level: 1 }),
    ).toBeInTheDocument()
  })

  it('supports browser back and forward between routes', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(workspacePath)

    await user.click(
      (await screen.findAllByRole('link', { name: /new schema/i }))[0],
    )
    expect(
      await screen.findByRole('heading', { name: 'New schema', level: 1 }),
    ).toBeInTheDocument()

    router.history.back()
    expect(
      await screen.findByRole('heading', { name: 'Schemas', level: 1 }),
    ).toBeInTheDocument()

    router.history.forward()
    expect(
      await screen.findByRole('heading', { name: 'New schema', level: 1 }),
    ).toBeInTheDocument()
  })

  it('shows validation errors and does not save invalid input', async () => {
    const storage = storages[0]
    const user = userEvent.setup()
    renderApp(workspacePath)

    await user.click(
      (await screen.findAllByRole('link', { name: /new schema/i }))[0],
    )
    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: { value: '{ broken' },
    })
    await user.click(screen.getByRole('button', { name: /create schema/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(
      (await screen.findAllByText(/invalid json/i)).length,
    ).toBeGreaterThan(0)
    expect(await storage.listSchemas(DEFAULT_WORKSPACE_ID)).toHaveLength(0)
  })
})