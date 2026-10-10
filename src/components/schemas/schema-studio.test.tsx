import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SchemaStudio } from './schema-studio'
import { emptySchemaFormValues } from '@/lib/schemas/validation'
import {
  createIndexedDbStorage,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'

function renderStudio(onSubmit = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <SchemaStudio
        defaultValues={emptySchemaFormValues()}
        submitLabel="Create schema"
        onSubmit={onSubmit}
      />
    </QueryClientProvider>,
  )
  return { ...view, onSubmit }
}

/** Replace the Raw JSON document, then return to the Builder tab. */
async function seedJson(user: ReturnType<typeof userEvent.setup>, doc: unknown) {
  await user.click(screen.getByRole('tab', { name: /raw json/i }))
  fireEvent.change(screen.getByLabelText('Schema JSON'), {
    target: { value: JSON.stringify(doc, null, 2) },
  })
  await user.click(screen.getByRole('tab', { name: /builder/i }))
}

function rawJson(): string {
  return (screen.getByLabelText('Schema JSON') as HTMLTextAreaElement).value
}

async function openRaw(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: /raw json/i }))
}

describe('SchemaStudio (F-54 three-pane editor)', () => {
  let dbName: string
  const storages: StorageAdapter[] = []

  beforeEach(() => {
    dbName = `schema-studio-test-${crypto.randomUUID()}`
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  it('starts on the Builder with the outline, detail and inspector visible', () => {
    renderStudio()
    expect(screen.getByTestId('schema-outline')).toBeInTheDocument()
    expect(screen.getByTestId('schema-detail')).toBeInTheDocument()
    expect(screen.getByTestId('schema-preview')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /schema settings/i }),
    ).toBeInTheDocument()
  })

  it('adds a field from the outline and reflects it in the JSON', async () => {
    const user = userEvent.setup()
    renderStudio()

    await user.click(screen.getByRole('button', { name: /add field/i }))

    const outline = screen.getByTestId('schema-outline')
    expect(within(outline).getByRole('button', { name: 'field' })).toBeInTheDocument()

    await openRaw(user)
    expect(rawJson()).toContain('"field"')
  })

  it('selects a field and edits its type through the detail pane', async () => {
    const user = userEvent.setup()
    renderStudio()
    await user.click(screen.getByRole('button', { name: /add field/i }))

    expect(
      within(screen.getByTestId('schema-detail')).getByText('Field details'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /field type/i }))
    await user.click(await screen.findByRole('option', { name: 'Number' }))

    await openRaw(user)
    expect(rawJson()).toContain('"type": "number"')
  })

  it('renames, reorders and removes fields through the row menu', async () => {
    const user = userEvent.setup()
    renderStudio()
    await seedJson(user, {
      type: 'object',
      properties: { alpha: { type: 'string' }, beta: { type: 'string' } },
    })

    // Rename beta -> gamma.
    await user.click(
      screen.getByRole('button', { name: /field actions for beta/i }),
    )
    await user.click(await screen.findByRole('menuitem', { name: /rename/i }))
    const renameInput = screen.getByLabelText(/rename field beta/i)
    await user.clear(renameInput)
    await user.type(renameInput, 'gamma{Enter}')

    await openRaw(user)
    expect(rawJson()).toContain('"gamma"')
    expect(rawJson()).not.toContain('"beta"')

    await user.click(screen.getByRole('tab', { name: /builder/i }))

    // Move gamma above alpha.
    await user.click(
      screen.getByRole('button', { name: /field actions for gamma/i }),
    )
    await user.click(await screen.findByRole('menuitem', { name: /move up/i }))

    await openRaw(user)
    expect(rawJson().indexOf('"gamma"')).toBeLessThan(rawJson().indexOf('"alpha"'))

    await user.click(screen.getByRole('tab', { name: /builder/i }))

    // Remove alpha.
    await user.click(
      screen.getByRole('button', { name: /field actions for alpha/i }),
    )
    await user.click(await screen.findByRole('menuitem', { name: /remove/i }))

    await openRaw(user)
    expect(rawJson()).not.toContain('"alpha"')
  })

  it('edits root schema settings (title + additional properties)', async () => {
    const user = userEvent.setup()
    renderStudio()

    await user.type(screen.getByLabelText('Title'), 'Person')
    await user.click(
      screen.getByRole('checkbox', { name: /allow additional properties/i }),
    )

    await openRaw(user)
    const json = JSON.parse(rawJson())
    expect(json.title).toBe('Person')
    expect(json.additionalProperties).toBe(true)
  })

  it('opens the diff overlay from Review changes', async () => {
    const user = userEvent.setup()
    renderStudio()

    await user.click(screen.getByRole('button', { name: /add field/i }))
    await user.click(screen.getByRole('button', { name: /review changes/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByTestId('schema-diff').textContent).toContain(
      '"field"',
    )
  })

  it('adds a typed field from the type palette', async () => {
    const user = userEvent.setup()
    renderStudio()

    expect(
      within(screen.getByTestId('schema-detail')).getByRole('group', {
        name: 'Add a field',
      }),
    ).toBeInTheDocument()

    await user.click(
      within(screen.getByTestId('schema-detail')).getByRole('button', {
        name: 'Number',
      }),
    )

    await openRaw(user)
    expect(rawJson()).toContain('"type": "number"')
    expect(rawJson()).toContain('"field"')
  })

  it('bulk-deletes selected fields', async () => {
    const user = userEvent.setup()
    renderStudio()
    await seedJson(user, {
      type: 'object',
      properties: {
        alpha: { type: 'string' },
        beta: { type: 'string' },
        gamma: { type: 'string' },
      },
    })

    await user.click(
      within(screen.getByTestId('schema-outline')).getByLabelText('Select alpha'),
    )
    await user.click(
      within(screen.getByTestId('schema-outline')).getByLabelText('Select gamma'),
    )
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /delete selected/i }),
    )

    await openRaw(user)
    const json = JSON.parse(rawJson())
    expect(Object.keys(json.properties)).toEqual(['beta'])
  })

  it('reorders fields from the keyboard (Alt+ArrowDown)', async () => {
    const user = userEvent.setup()
    renderStudio()
    await seedJson(user, {
      type: 'object',
      properties: {
        alpha: { type: 'string' },
        beta: { type: 'string' },
      },
    })

    const alphaRow = screen.getByRole('button', { name: 'alpha' })
    await user.click(alphaRow)
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    await openRaw(user)
    expect(rawJson().indexOf('"beta"')).toBeLessThan(rawJson().indexOf('"alpha"'))
  })

  it('reorders fields by drag-and-drop', async () => {
    const user = userEvent.setup()
    renderStudio()
    await seedJson(user, {
      type: 'object',
      properties: {
        alpha: { type: 'string' },
        beta: { type: 'string' },
        gamma: { type: 'string' },
      },
    })

    class DragData {
      effectAllowed = 'move'
      private values = new Map<string, string>()
      setData(key: string, value: string) {
        this.values.set(key, value)
      }
      getData(key: string) {
        return this.values.get(key) ?? ''
      }
    }
    const transfer = new DragData() as unknown as DataTransfer
    fireEvent.dragStart(screen.getByTestId('field-row-alpha'), {
      dataTransfer: transfer,
    })
    fireEvent.dragOver(screen.getByTestId('field-row-gamma'), {
      dataTransfer: transfer,
    })
    fireEvent.drop(screen.getByTestId('field-row-gamma'), {
      dataTransfer: transfer,
    })
    fireEvent.dragEnd(screen.getByTestId('field-row-alpha'))

    await openRaw(user)
    const json = JSON.parse(rawJson())
    expect(Object.keys(json.properties)).toEqual(['beta', 'gamma', 'alpha'])
  })

  it('switches inspector tabs between Preview, JSON and Notes', async () => {
    const user = userEvent.setup()
    renderStudio()

    expect(screen.getByTestId('schema-preview')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^json$/i }))
    expect(screen.getByTestId('studio-json-mirror')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /notes/i }))
    expect(
      screen.getByText(/same document as the Raw JSON tab/i),
    ).toBeInTheDocument()
  })

  it('shows Raw JSON edits in the Builder panes', async () => {
    const user = userEvent.setup()
    renderStudio()

    await seedJson(user, {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: ['email'],
    })

    const outline = screen.getByTestId('schema-outline')
    expect(within(outline).getByRole('button', { name: 'email' })).toBeInTheDocument()
    expect(within(outline).getByText('Required')).toBeInTheDocument()
  })

  it('keeps a large field list usable and searchable (canon UI-06)', async () => {
    const user = userEvent.setup()
    const properties: Record<string, unknown> = {}
    for (let index = 0; index < 60; index += 1) {
      properties[`field${index}`] = { type: 'string' }
    }
    renderStudio()
    await seedJson(user, { type: 'object', properties })

    const outline = screen.getByTestId('schema-outline')
    expect(within(outline).getAllByRole('listitem')).toHaveLength(60)

    await user.type(screen.getByLabelText('Search fields'), 'field12')
    await waitFor(() =>
      expect(within(outline).getAllByRole('listitem')).toHaveLength(1),
    )
    expect(
      within(outline).getByRole('button', { name: 'field12' }),
    ).toBeInTheDocument()
  })

  it('blocks saving invalid Raw JSON and keeps the last valid builder state', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderStudio()

    await user.click(screen.getByRole('button', { name: /add field/i }))
    await openRaw(user)
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: { value: '{\n  "type": "object",\n  "properties": {\n}' },
    })
    await user.click(screen.getByRole('button', { name: /create schema/i }))

    expect(await screen.findByText(/invalid json/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('tab', { name: /builder/i }))
    expect(
      within(screen.getByTestId('schema-outline')).getByRole('button', {
        name: 'field',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/showing your last valid schema/i)).toBeInTheDocument()
  })
})
