import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app shell heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /json schema crud/i }),
    ).toBeInTheDocument()
  })

  it('renders the primary call to action', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })
})
