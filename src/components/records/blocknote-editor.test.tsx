import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BlockNoteEditorControl } from './blocknote-editor'

// A real BlockNote integration smoke test: proves the editor mounts in our app
// (jsdom here, real browsers in e2e) and renders stored block content. The
// wrapper contract (initial content, direction, onChange) is covered by
// `rich-text-field.test.tsx`.
describe('BlockNoteEditorControl', () => {
  it('mounts and renders the stored block document', () => {
    render(
      <BlockNoteEditorControl
        initialContent={[
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello editor', styles: {} }],
          },
        ]}
        editable
        onChange={() => {}}
      />,
    )

    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
    expect(screen.getByText('Hello editor')).toBeInTheDocument()
  })
})
