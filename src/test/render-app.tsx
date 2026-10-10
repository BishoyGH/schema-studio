import { render } from '@testing-library/react'
import { createMemoryHistory } from '@tanstack/react-router'
import App from '@/App'
import { createAppRouter } from '@/router'

/**
 * Render the full app (providers + router) with deterministic memory history.
 * Pass an initial path to deep-link a route; defaults to the index, which
 * redirects to the active/default workspace.
 */
export function renderApp(initialPath = '/') {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [initialPath] }),
  )
  return { router, ...render(<App router={router} />) }
}
