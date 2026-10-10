import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

const rawSources = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/
const PALETTE_COLOR =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|accent|caret|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?\b/
const PHYSICAL_SPACING = /(?<![\w-])(?:ml|mr|pl|pr)-\d/
const PHYSICAL_POSITION = /(?<![\w-])(?:left|right)-\d/

function scannedSources() {
  return Object.entries(rawSources).filter(
    ([file]) =>
      !file.includes('.test.') &&
      !file.includes('.spec.') &&
      !file.startsWith('/src/test/'),
  )
}

describe('Design system tokens (F-53)', () => {
  describe('compact primitive density', () => {
    it('renders buttons at the compact default with a mobile touch bump', () => {
      render(<Button>Save</Button>)
      const button = screen.getByRole('button', { name: 'Save' })
      expect(button).toHaveClass('h-8')
      expect(button).toHaveClass('max-md:h-11')
    })

    it('renders the large and icon button sizes compactly', () => {
      const { rerender } = render(<Button size="lg">Prominent</Button>)
      expect(screen.getByRole('button', { name: 'Prominent' })).toHaveClass(
        'h-9',
      )

      rerender(<Button size="icon" aria-label="Icon action" />)
      const icon = screen.getByRole('button', { name: 'Icon action' })
      expect(icon).toHaveClass('size-8')
      expect(icon).toHaveClass('max-md:size-11')
    })

    it('renders inputs and textareas at the compact height', () => {
      render(
        <>
          <Input aria-label="Text input" />
          <Textarea aria-label="Long text" />
        </>,
      )
      const input = screen.getByRole('textbox', { name: 'Text input' })
      expect(input).toHaveClass('h-8')
      expect(input).toHaveClass('max-md:h-11')

      const textarea = screen.getByRole('textbox', { name: 'Long text' })
      expect(textarea).toHaveClass('min-h-16')
    })

    it('renders tab lists at the compact height', () => {
      render(
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">First</TabsTrigger>
            <TabsTrigger value="b">Second</TabsTrigger>
          </TabsList>
        </Tabs>,
      )
      expect(screen.getByRole('tablist')).toHaveClass('h-9')
      expect(screen.getByRole('tablist')).toHaveClass('max-md:h-11')
    })
  })

  describe('status badge variants', () => {
    it('exposes success, warning, and info token variants', () => {
      render(
        <>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
        </>,
      )
      expect(screen.getByText('Success')).toHaveClass('bg-success')
      expect(screen.getByText('Warning')).toHaveClass('bg-warning')
      expect(screen.getByText('Info')).toHaveClass('bg-info')
    })
  })

  describe('token-only static scan', () => {
    const sources = scannedSources()

    it('scans the app surface', () => {
      expect(sources.length).toBeGreaterThan(20)
    })

    it('contains no hardcoded hex colors', () => {
      const offenders = sources.filter(([, code]) => HEX_COLOR.test(code))
      expect(offenders.map(([file]) => file)).toEqual([])
    })

    it('contains no raw Tailwind palette color utilities', () => {
      const offenders = sources.filter(([, code]) => PALETTE_COLOR.test(code))
      expect(offenders.map(([file]) => file)).toEqual([])
    })

    it('uses logical spacing and positioning properties', () => {
      const offenders = sources.filter(
        ([, code]) =>
          PHYSICAL_SPACING.test(code) || PHYSICAL_POSITION.test(code),
      )
      expect(offenders.map(([file]) => file)).toEqual([])
    })
  })

  describe('mobile density regression', () => {
    it('keeps every interactive primitive at >=44px below the md breakpoint', () => {
      const required: Array<[string, string]> = [
        ['/src/components/ui/button.tsx', 'max-md:h-11'],
        ['/src/components/ui/button.tsx', 'max-md:size-11'],
        ['/src/components/ui/input.tsx', 'max-md:h-11'],
        ['/src/components/ui/select.tsx', 'max-md:h-11'],
        ['/src/components/ui/tabs.tsx', 'max-md:h-11'],
        ['/src/components/ui/dropdown-menu.tsx', 'max-md:min-h-11'],
      ]
      for (const [file, token] of required) {
        expect(rawSources[file], `${file} should be scanned`).toContain(token)
      }
    })
  })
})
