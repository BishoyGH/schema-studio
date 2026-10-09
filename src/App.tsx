import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { SchemaManager } from '@/components/schemas/schema-manager'

function App() {
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-svh flex-col">
        <header className="border-b">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4">
            <h1 className="text-lg font-semibold tracking-tight">
              Schema Studio
            </h1>
          </div>
        </header>
        <main className="flex-1">
          <SchemaManager />
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
