import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app shell heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /schema studio/i }),
    ).toBeInTheDocument()
  })

  it('offers a way to create a schema once a workspace is ready', async () => {
    render(<App />)

    expect(
      (await screen.findAllByRole('button', { name: /new schema/i })).length,
    ).toBeGreaterThan(0)
  })
})
