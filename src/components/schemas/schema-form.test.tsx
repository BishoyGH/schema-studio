import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SchemaForm } from './schema-form'
import { SCHEMA_EDITOR_TAB_SETTING } from '@/lib/settings/queries'
import { emptySchemaFormValues } from '@/lib/schemas/validation'
import {
  createIndexedDbStorage,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onSubmit = vi.fn()
  const view = render(
    <QueryClientProvider client={client}>
      <SchemaForm
        defaultValues={emptySchemaFormValues()}
        submitLabel="Create schema"
        onSubmit={onSubmit}
      />
    </QueryClientProvider>,
  )
  return { ...view, onSubmit, client }
}

describe('SchemaForm tabbed editor', () => {
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

  it('defaults to the Builder tab for new users', async () => {
    renderForm()

    expect(screen.getByRole('tab', { name: /builder/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /raw json/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(
      await screen.findByRole('button', { name: /add field/i }),
    ).toBeInTheDocument()
  })

  it('honors a persisted Raw JSON tab preference on reopen', async () => {
    await storages[0].setSetting(SCHEMA_EDITOR_TAB_SETTING, 'raw')

    renderForm()

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /raw json/i })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
    expect(screen.getByLabelText('Schema JSON')).toBeInTheDocument()
  })

  it('persists the tab preference when the user switches tabs', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('tab', { name: /raw json/i }))

    await waitFor(async () =>
      expect(
        await storages[0].getSetting(SCHEMA_EDITOR_TAB_SETTING),
      ).toBe('raw'),
    )
  })

  it('shows Builder edits in the Raw JSON tab', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /add field/i }))
    await user.click(screen.getByRole('tab', { name: /raw json/i }))

    const textarea = screen.getByLabelText('Schema JSON') as HTMLTextAreaElement
    expect(textarea.value).toContain('"field"')
  })

  it('shows Raw JSON edits in the Builder tab', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: {
        value: JSON.stringify({
          type: 'object',
          properties: { email: { type: 'string' } },
          required: ['email'],
        }),
      },
    })
    await user.click(screen.getByRole('tab', { name: /builder/i }))

    expect(screen.getByLabelText('Field name email')).toBeInTheDocument()
    expect(screen.getByLabelText('Required email')).toBeChecked()
  })

  it('explains field types, including object and array', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: {
        value: JSON.stringify({
          type: 'object',
          properties: {
            name: { type: 'string' },
            meta: { type: 'object' },
            tags: { type: 'array' },
          },
        }),
      },
    })
    await user.click(screen.getByRole('tab', { name: /builder/i }))

    expect(screen.getByText('Text value.')).toBeInTheDocument()
    expect(
      screen.getByText(/Nested group of named fields \(a sub-record\)/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Ordered list of values/)).toBeInTheDocument()
    expect(screen.getAllByText(/available in the Raw JSON tab/).length).toBe(2)
  })

  it('blocks saving invalid Raw JSON with line/column and keeps Builder state', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    // Seed the Builder with a real field first.
    await user.click(screen.getByRole('button', { name: /add field/i }))

    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: { value: '{\n  "type": "object",\n  "properties": {\n}' },
    })
    await user.click(screen.getByRole('button', { name: /create schema/i }))

    const alert = await screen.findByText(/invalid json/i)
    expect(alert.textContent).toMatch(/line \d+, column \d+/)
    expect(onSubmit).not.toHaveBeenCalled()

    // The Builder must still show the last valid schema (nothing corrupted).
    await user.click(screen.getByRole('tab', { name: /builder/i }))
    expect(screen.getByLabelText('Field name field')).toBeInTheDocument()
    expect(
      screen.getAllByText(/last valid schema/i).length,
    ).toBeGreaterThan(0)
  })

  it('supports keyboard tab navigation (arrows + Home)', async () => {
    const user = userEvent.setup()
    renderForm()

    screen.getByRole('tab', { name: /builder/i }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /raw json/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: /builder/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('previews the diff before saving', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /add field/i }))
    await user.click(screen.getByRole('button', { name: /preview changes/i }))

    const diff = screen.getByTestId('schema-diff')
    expect(diff.textContent).toContain('"field"')
  })

  it(
    'round-trips arbitrary schema JSON through tab switches (property-based)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.dictionary(fc.string(), fc.jsonValue()),
          async (doc) => {
            const text = JSON.stringify(doc, null, 2)
            const { unmount } = renderForm()
            const user = userEvent.setup()

            await user.click(screen.getByRole('tab', { name: /raw json/i }))
            fireEvent.change(screen.getByLabelText('Schema JSON'), {
              target: { value: text },
            })

            await user.click(screen.getByRole('tab', { name: /builder/i }))
            await user.click(screen.getByRole('tab', { name: /raw json/i }))

            expect(
              (screen.getByLabelText('Schema JSON') as HTMLTextAreaElement).value,
            ).toBe(text)

            unmount()
          },
        ),
        { numRuns: 20 },
      )
    },
    15_000,
  )
})

describe('SchemaForm form preview (F-07a)', () => {
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

  it('toggles the live preview panel with keyboard and keeps it visible on both tabs', async () => {
    const user = userEvent.setup()
    renderForm()

    const toggle = screen.getByRole('button', { name: /preview form/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'schema-preview-panel')

    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const preview = screen.getByTestId('schema-preview')
    expect(preview).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    expect(screen.getByLabelText('Schema JSON')).toBeInTheDocument()
    expect(screen.getByTestId('schema-preview')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /builder/i }))
    expect(screen.getByTestId('schema-preview')).toBeInTheDocument()
  })

  it('updates the preview live as the schema is edited (debounced re-render)', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /preview form/i }))
    expect(screen.getByText(/no editable fields/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: {
        value: JSON.stringify(
          {
            type: 'object',
            properties: { email: { type: 'string', format: 'email' } },
            required: ['email'],
            additionalProperties: false,
          },
          null,
          2,
        ),
      },
    })

    await waitFor(() =>
      expect(
        within(screen.getByTestId('schema-preview')).getByLabelText(/email/),
      ).toBeInTheDocument(),
    )
  })

  it('disables the preview cleanly while the schema has a raw parse error', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /preview form/i }))

    await user.click(screen.getByRole('tab', { name: /raw json/i }))
    fireEvent.change(screen.getByLabelText('Schema JSON'), {
      target: { value: '{\n  "type": "object",\n  "properties": {\n}' },
    })

    await waitFor(
      () =>
        expect(screen.getByTestId('schema-preview').textContent).toMatch(
          /preview.*unavailable/i,
        ),
      { timeout: 3000 },
    )
  })
})
