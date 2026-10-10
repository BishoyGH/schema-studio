import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { SchemaManager } from '@/components/schemas/schema-manager'
import { WorkspaceSwitcher } from '@/components/workspaces/workspace-switcher'
import { useActiveWorkspace } from '@/lib/workspaces/queries'

function AppShell() {
  const {
    workspaces,
    activeWorkspace,
    isLoading,
    isError,
    setActiveWorkspace,
  } = useActiveWorkspace()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight">
            Schema Studio
          </h1>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onChange={setActiveWorkspace}
          />
        </div>
      </header>
      <main className="flex-1">
        {isError && (
          <p
            className="mx-auto max-w-3xl px-4 py-8 text-destructive text-sm"
            role="alert"
          >
            Could not load workspaces. Please try again.
          </p>
        )}
        {!isError && (isLoading || !activeWorkspace) && (
          <p
            className="mx-auto max-w-3xl px-4 py-8 text-muted-foreground text-sm"
            role="status"
          >
            Loading workspace…
          </p>
        )}
        {!isError && activeWorkspace && (
          <SchemaManager
            key={activeWorkspace.id}
            workspaceId={activeWorkspace.id}
          />
        )}
      </main>
    </div>
  )
}

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
      <AppShell />
    </QueryClientProvider>
  )
}

export default App
