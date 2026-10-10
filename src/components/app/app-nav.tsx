import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Settings, Table2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  to: string
  params?: Record<string, string>
  icon: LucideIcon
  exact?: boolean
}

interface AppNavProps {
  workspaceId: string
  onNavigate?: () => void
}

/** Primary navigation, shared by the desktop sidebar and the mobile sheet. */
export function AppNav({ workspaceId, onNavigate }: AppNavProps) {
  const items: NavItem[] = [
    {
      label: 'Dashboard',
      to: '/w/$workspaceId',
      params: { workspaceId },
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Schemas',
      to: '/w/$workspaceId/schemas',
      params: { workspaceId },
      icon: Table2,
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: Settings,
    },
  ]

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          params={item.params}
          activeOptions={{ exact: item.exact }}
          onClick={onNavigate}
          className={cn(
            'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-transparent hover:bg-accent hover:text-accent-foreground md:min-h-9',
          )}
          activeProps={{
            className:
              'bg-accent text-accent-foreground before:bg-primary',
          }}
        >
          <item.icon aria-hidden="true" className="size-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
