import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import {
  createIndexedDbStorage,
  DEFAULT_WORKSPACE_ID,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'

const trigger = (name: RegExp = /active workspace/i) =>
  screen.getByRole('combobox', { name })

describe('Workspaces', () => {
  let dbName: string
  const storages: StorageAdapter[] = []

  function newStorage() {
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
    return storage
  }

  beforeEach(() => {
    dbName = `schema-studio-test-${crypto.randomUUID()}`
    newStorage()
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  async function switchTo(
    user: ReturnType<typeof userEvent.setup>,
    name: string,
  ) {
    await user.click(trigger())
    await user.click(await screen.findByRole('option', { name }))
  }

  it('starts in the default workspace', async () => {
    render(<App />)

    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )
    expect(await screen.findByText('No schemas yet')).toBeInTheDocument()
  })

  it('creates a workspace and makes it active', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /new workspace/i }))
    await user.type(screen.getByLabelText('Name'), 'Personal')
    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    await waitFor(() =>
      expect(
        trigger(/active workspace: personal/i),
      ).toBeInTheDocument(),
    )

    const workspaces = await storages[0].listWorkspaces()
    expect(workspaces.map((w) => w.name)).toEqual([
      'Default workspace',
      'Personal',
    ])
  })

  it('scopes schemas to their workspace', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Create a schema inside a new workspace.
    await user.click(await screen.findByRole('button', { name: /new workspace/i }))
    await user.type(screen.getByLabelText('Name'), 'Personal')
    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    await user.click(await screen.findByRole('button', { name: /new schema/i }))
    await user.type(screen.getByLabelText('Name'), 'Person')
    await user.click(screen.getByRole('button', { name: /create schema/i }))
    expect(await screen.findByText('Person')).toBeInTheDocument()

    // The default workspace must not see it.
    await switchTo(user, 'Default workspace')
    expect(await screen.findByText('No schemas yet')).toBeInTheDocument()
    expect(screen.queryByText('Person')).not.toBeInTheDocument()

    // Switching back restores it.
    await switchTo(user, 'Personal')
    expect(await screen.findByText('Person')).toBeInTheDocument()
  })

  it('renames the active workspace', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /new workspace/i }))
    await user.type(screen.getByLabelText('Name'), 'Personal')
    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    await user.click(await screen.findByRole('button', { name: /rename workspace/i }))
    const nameInput = screen.getByLabelText('Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Work')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(async () =>
      expect((await storages[0].listWorkspaces()).map((w) => w.name)).toContain(
        'Work',
      ),
    )
    expect(trigger(/active workspace: work/i)).toBeInTheDocument()
  })

  it('deletes a workspace with confirmation and falls back to the default', async () => {
    const user = userEvent.setup()
    const storage = storages[0]
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /new workspace/i }))
    await user.type(screen.getByLabelText('Name'), 'Personal')
    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    await user.click(await screen.findByRole('button', { name: /delete workspace/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )
    expect((await storage.listWorkspaces()).map((w) => w.name)).toEqual([
      'Default workspace',
    ])
  })

  it('never offers to delete the default workspace', async () => {
    render(<App />)

    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('button', { name: /delete workspace/i }),
    ).not.toBeInTheDocument()
  })

  it('recreates a usable default workspace if the stored selection is stale', async () => {
    await storages[0].setSetting('workspace.activeId', 'does-not-exist')

    render(<App />)

    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )

    await waitFor(async () =>
      expect(await storages[0].getSetting('workspace.activeId')).toBe(
        DEFAULT_WORKSPACE_ID,
      ),
    )
  })
})
