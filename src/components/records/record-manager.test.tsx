import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordManager } from './record-manager'
import {
  createIndexedDbStorage,
  getStorage,
  setStorage,
  type SchemaEntity,
  type StorageAdapter,
} from '@/lib/storage'

// Stub the lazily-loaded BlockNote module so the record form's rich text field
// is driveable from a test. The real editor is covered by its own suite.
vi.mock('@/components/records/blocknote-editor', () => ({
  BlockNoteEditorControl: (props: {
    initialContent: unknown[]
    onChange: (blocks: unknown[]) => void
  }) => (
    <div
      data-testid="rich-text-editor"
      data-content={JSON.stringify(props.initialContent)}
    >
      <button
        type="button"
        onClick={() =>
          props.onChange([
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Hello rich world', styles: {} }],
            },
          ])
        }
      >
        insert text
      </button>
    </div>
  ),
}))

const personSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2 },
    age: { type: 'integer', minimum: 0 },
    status: { type: 'string', default: 'draft' },
  },
  required: ['name'],
}

function renderManager(schema: SchemaEntity) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <RecordManager schema={schema} onBack={() => {}} />
    </QueryClientProvider>,
  )
}

describe('RecordManager', () => {
  let dbName: string
  let schema: SchemaEntity
  const storages: StorageAdapter[] = []

  function newStorage() {
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
    return storage
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    dbName = `schema-studio-test-${crypto.randomUUID()}`
    const storage = newStorage()
    const workspace = await storage.createWorkspace({ name: 'Projects' })
    schema = await storage.createSchema({
      workspaceId: workspace.id,
      name: 'Person',
      jsonSchema: personSchema,
    })
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
    vi.useRealTimers()
  })

  it('shows an empty state when the schema has no records', async () => {
    renderManager(schema)
    expect(await screen.findByText('No records yet')).toBeInTheDocument()
  })

  it('creates a record through the form (with defaults applied) and lists it', async () => {
    const user = userEvent.setup()
    renderManager(schema)

    await user.click(await screen.findByRole('button', { name: /new record/i }))
    await user.type(screen.getByRole('textbox', { name: /name/ }), 'Ada Lovelace')
    await user.click(screen.getByRole('button', { name: /create record/i }))

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText(/name: Ada Lovelace/)).toBeInTheDocument()

    const records = await storages[0].listRecords(schema.id)
    expect(records).toHaveLength(1)
    expect(records[0].data).toEqual({ name: 'Ada Lovelace', status: 'draft' })
  })

  it('shows live field validation and blocks saving an invalid record', async () => {
    const user = userEvent.setup()
    renderManager(schema)

    await user.click(await screen.findByRole('button', { name: /new record/i }))
    await user.type(screen.getByRole('textbox', { name: /name/ }), 'A')
    await user.click(screen.getByRole('button', { name: /create record/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/too small/i)
    expect(await storages[0].listRecords(schema.id)).toHaveLength(0)
  })

  it('rejects a raw invalid write at the storage boundary', async () => {
    await expect(
      getStorage().createRecord({
        schemaId: schema.id,
        data: { name: 'A' },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(await getStorage().listRecords(schema.id)).toHaveLength(0)
  })

  it('edits a record and shows the updated value', async () => {
    const user = userEvent.setup()
    const persisted = await storages[0].createRecord({
      schemaId: schema.id,
      data: { name: 'Ada' },
    })
    renderManager(schema)

    await user.click(await screen.findByRole('button', { name: /edit record/i }))
    const nameInput = screen.getByRole('textbox', { name: /name/ })
    await user.clear(nameInput)
    await user.type(nameInput, 'Ada Lovelace')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    const updated = await storages[0].getRecord(persisted.id)
    expect(updated?.data.name).toBe('Ada Lovelace')
  })

  it('deletes a record after confirmation', async () => {
    const user = userEvent.setup()
    await storages[0].createRecord({
      schemaId: schema.id,
      data: { name: 'Temporary' },
    })
    renderManager(schema)

    await user.click(await screen.findByRole('button', { name: /delete record/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() =>
      expect(screen.queryByText('Temporary')).not.toBeInTheDocument(),
    )
    expect(await storages[0].listRecords(schema.id)).toHaveLength(0)
  })

  it('round-trips rich text content create → save → reload (F-07b)', async () => {
    const user = userEvent.setup()
    const workspace = await storages[0].createWorkspace({ name: 'Docs' })
    const richSchema = await storages[0].createSchema({
      workspaceId: workspace.id,
      name: 'Article',
      jsonSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 2 },
          body: { type: 'array', 'x-schema-studio': { kind: 'richText' } },
        },
        required: ['title', 'body'],
      },
    })

    const first = renderManager(richSchema)

    await user.click(await screen.findByRole('button', { name: /new record/i }))
    await user.type(screen.getByRole('textbox', { name: /title/ }), 'Post')
    await user.click(await screen.findByRole('button', { name: /insert text/i }))
    await user.click(screen.getByRole('button', { name: /create record/i }))

    // The list labels the record from the first scalar field and shows the rich
    // text content in the summary.
    expect(await screen.findByText('Post')).toBeInTheDocument()
    expect(screen.getByText(/Hello rich world/)).toBeInTheDocument()

    const records = await storages[0].listRecords(richSchema.id)
    expect(records).toHaveLength(1)
    expect(records[0].data.title).toBe('Post')
    expect(records[0].data.body).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello rich world', styles: {} }],
      },
    ])

    // "Reload": a fresh view reads the persisted document back into the editor.
    first.unmount()
    renderManager(richSchema)
    await user.click(await screen.findByRole('button', { name: /edit record/i }))
    const reopened = await screen.findByTestId('rich-text-editor')
    expect(reopened.getAttribute('data-content')).toContain('Hello rich world')
  })
})