import { Monitor, Moon, Sun } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/app/page'
import { useTheme } from '@/components/app/theme-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ThemeMode } from '@/lib/settings/queries'

const THEME_OPTIONS: {
  value: ThemeMode
  label: string
  description: string
  icon: typeof Sun
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright background with dark text.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dim background that is easy on the eyes.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device appearance setting.',
    icon: Monitor,
  },
]

export function SettingsPage() {
  const { mode, setMode } = useTheme()

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title="Settings"
        description="Preferences are stored locally in your browser and work offline."
      />

      <Card className="py-5">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Schema Studio looks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 px-4 sm:grid-cols-3 sm:px-6">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-4 text-start outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                mode === option.value && 'border-primary bg-accent',
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <option.icon aria-hidden="true" className="size-4" />
                {option.label}
              </span>
              <span className="text-muted-foreground text-xs">
                {option.description}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>More settings coming soon</CardTitle>
          <CardDescription>
            Editor defaults, data import/export, keyboard shortcuts, language and
            direction, and your offline profile will live here (F-16).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Button variant="outline" disabled>
            Import / export
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
