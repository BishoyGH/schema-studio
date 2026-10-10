import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RichTextField } from './rich-text-field'

// The real editor pulls in BlockNote; stub the lazily-loaded module so we can
// assert the wrapper's contract (initial content, direction, change plumbing).
vi.mock('@/components/records/blocknote-editor', () => ({
  BlockNoteEditorControl: (props: {
    initialContent: unknown[]
    editable: boolean
    dir?: string
    onChange: (blocks: unknown[]) => void
  }) => (
    <div
      data-testid="rich-text-editor"
      data-dir={props.dir}
      data-editable={String(props.editable)}
      data-content={JSON.stringify(props.initialContent)}
    >
      <button
        type="button"
        onClick={() =>
          props.onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }])
        }
      >
        edit
      </button>
    </div>
  ),
}))

afterEach(() => {
  document.documentElement.dir = ''
})

describe('RichTextField', () => {
  it('lazily renders the editor with the stored document', async () => {
    const doc = [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
    render(<RichTextField value={doc} onChange={() => {}} />)

    const editor = await screen.findByTestId('rich-text-editor')
    expect(editor).toHaveAttribute('data-content', JSON.stringify(doc))
    expect(editor).toHaveAttribute('data-editable', 'true')
    expect(editor).toHaveAttribute('data-dir', 'ltr')
  })

  it('repairs an undefined value to an empty document', async () => {
    render(<RichTextField value={undefined} onChange={() => {}} />)

    const editor = await screen.findByTestId('rich-text-editor')
    expect(editor.getAttribute('data-content')).toContain('paragraph')
  })

  it('propagates editor changes through onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RichTextField value={undefined} onChange={onChange} />)

    await user.click(await screen.findByRole('button', { name: /edit/i }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ type: 'paragraph' })
  })

  it('follows the document direction and honors an explicit override', async () => {
    const { unmount } = render(<RichTextField value={[]} onChange={() => {}} />)
    expect(await screen.findByTestId('rich-text-editor')).toHaveAttribute(
      'data-dir',
      'ltr',
    )
    unmount()

    document.documentElement.dir = 'rtl'
    const rtl = render(<RichTextField value={[]} onChange={() => {}} />)
    expect(await screen.findByTestId('rich-text-editor')).toHaveAttribute(
      'data-dir',
      'rtl',
    )
    rtl.unmount()

    render(<RichTextField value={[]} dir="ltr" onChange={() => {}} />)
    expect(await screen.findByTestId('rich-text-editor')).toHaveAttribute(
      'data-dir',
      'ltr',
    )
  })
})
