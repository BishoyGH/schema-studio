import { Outlet, useParams } from '@tanstack/react-router'
import { Menu, Search, Waypoints } from 'lucide-react'
import { useState } from 'react'
import { AppNav } from '@/components/app/app-nav'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { WorkspaceMenu } from '@/components/app/workspace-menu'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useActiveWorkspace } from '@/lib/workspaces/queries'

function Brand() {
  return (
    <span className="flex items-center gap-2 px-2 text-sm font-semibold tracking-tight">
      <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
        <Waypoints aria-hidden="true" className="size-4" />
      </span>
      Schema Studio
    </span>
  )
}

/**
 * The persistent app shell: sidebar + top bar on desktop, a slide-over nav on
 * mobile. Route content renders into the `<Outlet />`.
 */
export function AppShell() {
  const { activeWorkspace } = useActiveWorkspace()
  const params = useParams({ strict: false }) as { workspaceId?: string }
  const workspaceId = params.workspaceId ?? activeWorkspace?.id ?? ''
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col gap-3 border-e bg-background p-3 md:flex">
        <Brand />
        <AppNav workspaceId={workspaceId} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-3">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <AppNav
                workspaceId={workspaceId}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <WorkspaceMenu />

          <div className="flex-1" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="hidden gap-2 text-muted-foreground sm:flex"
            aria-label="Search (coming soon)"
          >
            <Search aria-hidden="true" className="size-4" />
            Search
          </Button>
          <ThemeToggle />
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
