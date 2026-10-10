import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Eye } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { SchemaBuilder } from '@/components/schemas/schema-builder'
import { SchemaDiff } from '@/components/schemas/schema-diff'
import { SchemaPreview } from '@/components/schemas/schema-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useSchemaEditorTab,
  useSetSchemaEditorTab,
  type SchemaEditorTab,
} from '@/lib/settings/queries'
import {
  parseJsonSchema,
  SCHEMA_DRAFTS,
  schemaFormSchema,
  type SchemaFormValues,
} from '@/lib/schemas/validation'

function applyDraftMeta(text: string, uri: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const next = JSON.stringify({ ...parsed, $schema: uri }, null, 2)
  return next === text ? null : next
}

interface SchemaFormProps {
  defaultValues: SchemaFormValues
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: SchemaFormValues) => void
  onCancel?: () => void
}

export function SchemaForm({
  defaultValues,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: SchemaFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const draft = watch('draft')
  const jsonSchemaText = watch('jsonSchema')

  const tabPreference = useSchemaEditorTab()
  const setTabPreference = useSetSchemaEditorTab()
  const [selectedTab, setSelectedTab] = useState<SchemaEditorTab | null>(null)
  const activeTab: SchemaEditorTab =
    selectedTab ?? tabPreference.data ?? 'builder'

  const handleTabChange = useCallback(
    (next: string) => {
      const tab = next as SchemaEditorTab
      setSelectedTab(tab)
      setTabPreference.mutate(tab)
    },
    [setTabPreference],
  )

  useEffect(() => {
    const option = SCHEMA_DRAFTS.find((entry) => entry.value === draft)
    if (!option) return
    const next = applyDraftMeta(getValues('jsonSchema'), option.uri)
    if (next) setValue('jsonSchema', next)
  }, [draft, getValues, setValue])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.altKey && (event.ctrlKey || event.metaKey))) return
      if (event.key === '1') {
        event.preventDefault()
        handleTabChange('builder')
      } else if (event.key === '2') {
        event.preventDefault()
        handleTabChange('raw')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleTabChange])

  const setJsonSchemaText = (next: string) => {
    setValue('jsonSchema', next, { shouldDirty: true })
  }

  const liveJsonError = useMemo(() => {
    const result = parseJsonSchema(jsonSchemaText)
    return result.ok ? null : result.error
  }, [jsonSchemaText])

  const jsonErrorMessage = liveJsonError ?? errors.jsonSchema?.message

  const [showDiff, setShowDiff] = useState(false)
  const [showFormPreview, setShowFormPreview] = useState(false)
  const initialJson = defaultValues.jsonSchema

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="schema-name">Name</Label>
        <Input
          id="schema-name"
          placeholder="e.g. Person"
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-sm" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="schema-description">Description</Label>
        <Textarea
          id="schema-description"
          placeholder="Optional summary of what this schema describes"
          aria-invalid={errors.description ? true : undefined}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-destructive text-sm" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="schema-draft">JSON Schema draft</Label>
        <Select
          value={draft}
          onValueChange={(value) =>
            setValue('draft', value as SchemaFormValues['draft'], {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger id="schema-draft" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHEMA_DRAFTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Both tabs edit the same schema. The draft keeps the <code>$schema</code>{' '}
          keyword in sync.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList aria-label="Schema editor mode">
          <TabsTrigger
            value="builder"
            aria-keyshortcuts="Control+Alt+1 Meta+Alt+1"
          >
            Builder
          </TabsTrigger>
          <TabsTrigger value="raw" aria-keyshortcuts="Control+Alt+2 Meta+Alt+2">
            Raw JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" forceMount>
          <SchemaBuilder value={jsonSchemaText} onChange={setJsonSchemaText} />
        </TabsContent>

        <TabsContent value="raw" forceMount>
          <div className="flex flex-col gap-2">
            <Label htmlFor="schema-json">Schema JSON</Label>
            <Textarea
              id="schema-json"
              spellCheck={false}
              className="min-h-56 font-mono text-sm"
              value={jsonSchemaText}
              aria-invalid={jsonErrorMessage ? true : undefined}
              onChange={(event) => setJsonSchemaText(event.target.value)}
              onBlur={() => {
                void trigger('jsonSchema')
              }}
            />
            {jsonErrorMessage && (
              <p className="text-destructive text-sm" role="alert">
                {jsonErrorMessage}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 self-start"
          aria-expanded={showFormPreview}
          aria-controls="schema-preview-panel"
          onClick={() => setShowFormPreview((open) => !open)}
        >
          <Eye aria-hidden="true" className="size-4" />
          Preview form
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 self-start"
          aria-expanded={showDiff}
          aria-controls="schema-diff-panel"
          onClick={() => setShowDiff((open) => !open)}
        >
          <ChevronDown
            aria-hidden="true"
            className={showDiff ? 'rotate-180 transition-transform' : 'transition-transform'}
          />
          Preview changes
        </Button>
      </div>
      {showFormPreview && (
        <div id="schema-preview-panel">
          <SchemaPreview jsonSchemaText={jsonSchemaText} />
        </div>
      )}
      {showDiff && (
        <div id="schema-diff-panel">
          <SchemaDiff oldText={initialJson} newText={jsonSchemaText} />
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
