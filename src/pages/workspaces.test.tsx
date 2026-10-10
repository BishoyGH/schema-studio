import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createIndexedDbStorage,
  DEFAULT_WORKSPACE_ID,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'
import { renderApp } from '@/test/render-app'

const trigger = (name: RegExp = /active workspace/i) =>
  screen.getByRole('button', { name })

type User = ReturnType<typeof userEvent.setup>

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

  async function openMenu(user: User) {
    await user.click(trigger())
  }

  async function switchTo(user: User, name: string) {
    await openMenu(user)
    await user.click(await screen.findByRole('menuitem', { name }))
  }

  async function createWorkspace(user: User, name: string) {
    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )
    await openMenu(user)
    await user.click(
      await screen.findByRole('menuitem', { name: /new workspace/i }),
    )
    await user.type(await screen.findByLabelText('Name'), name)
    await user.click(screen.getByRole('button', { name: /create workspace/i }))
  }

  it('starts in the default workspace', async () => {
    renderApp()

    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )
    expect(await screen.findByText('Start with a schema')).toBeInTheDocument()
  })

  it('creates a workspace and makes it active', async () => {
    const user = userEvent.setup()
    renderApp()

    await createWorkspace(user, 'Personal')

    await waitFor(() =>
      expect(trigger(/active workspace: personal/i)).toBeInTheDocument(),
    )

    const workspaces = await storages[0].listWorkspaces()
    expect(workspaces.map((w) => w.name)).toEqual([
      'Default workspace',
      'Personal',
    ])
  })

  it('scopes schemas to their workspace', async () => {
    const user = userEvent.setup()
    renderApp()

    // Create a schema inside a new workspace.
    await createWorkspace(user, 'Personal')

    await user.click(
      (await screen.findAllByRole('link', { name: /new schema/i }))[0],
    )
    await user.type(await screen.findByLabelText('Name'), 'Person')
    await user.click(screen.getByRole('button', { name: /create schema/i }))
    expect(await screen.findByText('Person')).toBeInTheDocument()

    // The default workspace must not see it.
    await switchTo(user, 'Default workspace')
    expect(await screen.findByText('Start with a schema')).toBeInTheDocument()
    expect(screen.queryByText('Person')).not.toBeInTheDocument()

    // Switching back restores it.
    await switchTo(user, 'Personal')
    expect(await screen.findByText('Person')).toBeInTheDocument()
  })

  it('renames the active workspace', async () => {
    const user = userEvent.setup()
    renderApp()

    await createWorkspace(user, 'Personal')

    await openMenu(user)
    await user.click(
      await screen.findByRole('menuitem', { name: /rename workspace/i }),
    )

    const nameInput = await screen.findByLabelText('Name')
    await waitFor(() => expect(nameInput).toHaveValue('Personal'))
    await user.clear(nameInput)
    await user.type(nameInput, 'Work')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(async () =>
      expect((await storages[0].listWorkspaces()).map((w) => w.name)).toContain(
        'Work',
      ),
    )
    await waitFor(() =>
      expect(trigger(/active workspace: work/i)).toBeInTheDocument(),
    )
  })

  it('deletes a workspace with confirmation and falls back to the default', async () => {
    const user = userEvent.setup()
    const storage = storages[0]
    renderApp()

    await createWorkspace(user, 'Personal')

    await openMenu(user)
    await user.click(
      await screen.findByRole('menuitem', { name: /delete workspace/i }),
    )
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
    const user = userEvent.setup()
    renderApp()

    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )

    await openMenu(user)
    expect(
      await screen.findByRole('menuitem', { name: /rename workspace/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: /delete workspace/i }),
    ).not.toBeInTheDocument()
  })

  it('recreates a usable default workspace if the stored selection is stale', async () => {
    await storages[0].setSetting('workspace.activeId', 'does-not-exist')

    renderApp()

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

  it('falls back to the default workspace when a deep link has an unknown id', async () => {
    renderApp('/w/does-not-exist')

    await waitFor(() =>
      expect(
        trigger(/active workspace: default workspace/i),
      ).toBeInTheDocument(),
    )
  })
})
