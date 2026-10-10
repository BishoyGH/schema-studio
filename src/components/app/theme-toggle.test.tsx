import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/app/theme-provider'
import { ThemeToggle } from '@/components/app/theme-toggle'
import {
  createIndexedDbStorage,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'

function renderToggle() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

interface MatchMediaListener {
  (event: { matches: boolean }): void
}

/** A controllable matchMedia so the `system` mode can react to OS changes. */
function installMatchMedia(initialDark = false) {
  let dark = initialDark
  const listeners = new Set<MatchMediaListener>()
  const media = {
    get matches() {
      return dark
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: MatchMediaListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: MatchMediaListener) => {
      listeners.delete(listener)
    },
  }
  vi.stubGlobal('matchMedia', () => media)
  return {
    setDark(next: boolean) {
      dark = next
      for (const listener of listeners) listener({ matches: next })
    },
  }
}

const trigger = () => screen.getByRole('button', { name: /^theme:/i })

describe('Theme toggle (F-49)', () => {
  let dbName: string
  const storages: StorageAdapter[] = []

  beforeEach(() => {
    dbName = `schema-studio-theme-test-${crypto.randomUUID()}`
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  it('cycles light → dark → system, persists across a reload', async () => {
    installMatchMedia(false)
    const user = userEvent.setup()

    const first = renderToggle()
    expect(await screen.findByRole('button', { name: 'Theme: system' }))
      .toBeInTheDocument()

    await user.click(trigger())
    await user.click(await screen.findByRole('menuitem', { name: 'Dark' }))
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(true),
    )

    await user.click(trigger())
    await user.click(await screen.findByRole('menuitem', { name: 'Light' }))
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(false),
    )

    await user.click(trigger())
    await user.click(await screen.findByRole('menuitem', { name: 'System' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Theme: system' }))
        .toBeInTheDocument(),
    )

    expect(await storages[0].getSetting('appearance.theme')).toBe('system')

    first.unmount()
    renderToggle()
    expect(
      await screen.findByRole('button', { name: 'Theme: system' }),
    ).toBeInTheDocument()
  })

  it('follows the OS preference while in system mode', async () => {
    const os = installMatchMedia(false)
    const user = userEvent.setup()
    renderToggle()

    // Default mode is `system`; light OS → light theme.
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(false),
    )

    os.setDark(true)
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(true),
    )

    os.setDark(false)
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(false),
    )

    // A manual mode stops following the OS.
    await user.click(trigger())
    await user.click(await screen.findByRole('menuitem', { name: 'Dark' }))
    os.setDark(false)
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(true),
    )
  })
})