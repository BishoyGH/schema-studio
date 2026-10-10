import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/app/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ThemeMode } from '@/lib/settings/queries'

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle() {
  const { mode, resolvedMode, setMode } = useTheme()
  const CurrentIcon = resolvedMode === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Theme: ${mode}`}
        >
          <CurrentIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setMode(option.value)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <option.icon aria-hidden="true" className="size-4" />
              {option.label}
            </span>
            {mode === option.value && (
              <span className="text-muted-foreground text-xs">Active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
