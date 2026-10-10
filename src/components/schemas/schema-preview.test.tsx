import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SchemaPreview } from './schema-preview'
import { validateRecordData } from '@/lib/records/validation'

const BASE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 3 },
    age: { type: 'integer', minimum: 0 },
    active: { type: 'boolean' },
    kind: { type: 'string', enum: ['person', 'company'] },
    email: { type: 'string', format: 'email' },
    meta: {
      type: 'object',
      properties: { city: { type: 'string' } },
    },
    tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
  required: ['name', 'age', 'active', 'kind', 'email'],
  additionalProperties: false,
}

function renderPreview(text: string) {
  const view = render(<SchemaPreview jsonSchemaText={text} />)
  return {
    ...view,
    rerender: (next: string) =>
      view.rerender(<SchemaPreview jsonSchemaText={next} />),
  }
}

describe('SchemaPreview', () => {
  it('renders a form for all supported field types plus the JSON mirror', () => {
    renderPreview(JSON.stringify(BASE_SCHEMA, null, 2))

    expect(screen.getByLabelText(/name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/age/)).toBeInTheDocument()
    expect(screen.getByLabelText(/active/)).toBeInTheDocument()
    expect(screen.getByLabelText(/kind/)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/)).toBeInTheDocument()
    expect(screen.getByLabelText('meta')).toBeInTheDocument()
    expect(screen.getByLabelText('tags')).toBeInTheDocument()

    const mirror = screen.getByTestId('schema-mirror')
    expect(mirror.textContent).toContain('"type": "object"')
    expect(mirror.textContent).toContain('"email"')
  })

  it('updates the rendered form when the schema text changes', async () => {
    const { rerender } = renderPreview(JSON.stringify(BASE_SCHEMA, null, 2))
    expect(screen.queryByLabelText('website')).not.toBeInTheDocument()

    rerender(
      JSON.stringify(
        {
          ...BASE_SCHEMA,
          properties: { ...BASE_SCHEMA.properties, website: { type: 'string' } },
        },
        null,
        2,
      ),
    )

    await waitFor(() => expect(screen.getByLabelText('website')).toBeInTheDocument())
  })

  it('shows the same field errors as the write path for the same bad value', async () => {
    const schema = {
      type: 'object',
      properties: { note: { type: 'string', maxLength: 2 } },
      required: ['note'],
    }
    renderPreview(JSON.stringify(schema, null, 2))

    const expected = validateRecordData(schema, { note: 'way too long' })
    expect(expected.success).toBe(false)
    const firstError = expected.fieldErrors[0]

    await userEvent.type(screen.getByLabelText(/note/), 'way too long')

    await waitFor(() => expect(screen.getByText(firstError.message)).toBeVisible())
  })

  it('auto-fills a valid sample that passes check-validity', async () => {
    const user = userEvent.setup()
    renderPreview(JSON.stringify(BASE_SCHEMA, null, 2))

    await user.click(screen.getByRole('button', { name: /fill sample data/i }))
    await user.click(screen.getByRole('button', { name: /check validity/i }))

    const result = await screen.findByTestId('preview-result')
    expect(result.textContent).toMatch(/valid/i)
    expect(
      within(screen.getByTestId('schema-preview')).queryAllByRole('alert'),
    ).toHaveLength(0)
  })

  it('auto-fills an invalid sample that lights up field errors', async () => {
    const user = userEvent.setup()
    renderPreview(JSON.stringify(BASE_SCHEMA, null, 2))

    await user.click(screen.getByRole('button', { name: /fill invalid sample/i }))

    await waitFor(() =>
      expect(
        within(screen.getByTestId('schema-preview')).getAllByRole('alert').length,
      ).toBeGreaterThan(0),
    )

    await user.click(screen.getByRole('button', { name: /check validity/i }))
    const result = await screen.findByTestId('preview-result')
    expect(result.textContent).toMatch(/fields? with errors/i)
  })

  it('validates pasted data and maps errors to fields, flagging advanced keywords', async () => {
    const user = userEvent.setup()
    const schema = {
      type: 'object',
      properties: {
        content: { type: 'object', 'x-schema-studio': { kind: 'richText' } },
        note: { type: 'string', maxLength: 2 },
      },
    }
    renderPreview(JSON.stringify(schema, null, 2))

    const pasted = { note: 'way too long' }
    const expected = validateRecordData(schema, pasted)
    expect(expected.success).toBe(false)

    fireEvent.change(screen.getByLabelText('Validate pasted data'), {
      target: { value: JSON.stringify(pasted) },
    })
    await user.click(
      screen.getByRole('button', { name: /^validate pasted data$/i }),
    )

    await waitFor(() =>
      expect(screen.getByText(expected.fieldErrors[0].message)).toBeVisible(),
    )

    const advanced = screen.getByTestId('preview-advanced-fields')
    expect(advanced.textContent).toContain('content')
    expect(advanced.textContent).toContain('advanced — not validated')
  })

  it('reports pasted data that is not an object', async () => {
    const user = userEvent.setup()
    renderPreview(JSON.stringify(BASE_SCHEMA, null, 2))

    fireEvent.change(screen.getByLabelText('Validate pasted data'), {
      target: { value: '[1, 2, 3]' },
    })
    await user.click(
      screen.getByRole('button', { name: /^validate pasted data$/i }),
    )

    expect(await screen.findByText(/must be a JSON object/)).toBeInTheDocument()
  })

  it('disables cleanly when the schema is invalid without blocking editing', () => {
    renderPreview('{\n  "type": "object",\n  "properties": {\n}')

    expect(screen.getByRole('alert')).toHaveTextContent(/preview.*unavailable/i)
    expect(screen.queryByRole('button', { name: /check validity/i })).not.toBeInTheDocument()
  })
})