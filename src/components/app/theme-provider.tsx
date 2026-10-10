import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useSetThemeMode,
  useThemeMode,
  type ThemeMode,
} from '@/lib/settings/queries'

const THEME_QUERY = '(prefers-color-scheme: dark)'

interface ThemeContextValue {
  mode: ThemeMode
  resolvedMode: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(THEME_QUERY).matches
}

/**
 * Applies the theme preference to `<html>` and keeps it in sync with the OS
 * when the mode is `system`. The preference itself is persisted in IndexedDB
 * (F-49, a slice of F-18).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeQuery = useThemeMode()
  const setTheme = useSetThemeMode()
  const mode: ThemeMode = themeQuery.data ?? 'system'

  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(THEME_QUERY)
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    setSystemDark(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const resolvedMode: 'light' | 'dark' =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedMode === 'dark')
    root.style.colorScheme = resolvedMode
  }, [resolvedMode])

  const setMode = useCallback(
    (next: ThemeMode) => {
      setTheme.mutate(next)
    },
    [setTheme],
  )

  const value = useMemo(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
