import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useState } from 'react'
import { ThemeProvider } from '@/components/app/theme-provider'
import { createAppRouter } from '@/router'

type AppRouter = ReturnType<typeof createAppRouter>

interface AppProps {
  /** Injectable for tests (e.g. a memory-history router). */
  router?: AppRouter
}

function App({ router: providedRouter }: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: false,
          },
        },
      }),
  )
  const [router] = useState(() => providedRouter ?? createAppRouter())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
