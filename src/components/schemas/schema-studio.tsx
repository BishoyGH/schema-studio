import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { SchemaDiff } from '@/components/schemas/schema-diff'
import {
  SchemaFieldDetail,
} from '@/components/schemas/schema-field-detail'
import { SchemaFieldOutline } from '@/components/schemas/schema-field-outline'
import { SchemaInspector } from '@/components/schemas/schema-inspector'
import { cn } from '@/lib/utils'
import {
  addField,
  advancedRootKeys as readAdvancedRootKeys,
  applyFieldType,
  hasAdvancedAdditionalProperties,
  moveField,
  readFields,
  removeField,
  removeFields,
  renameField,
  reorderField,
  setAdditionalProperties,
  setFieldRequired,
  setRootTitle,
  toDocument,
  updateFieldSchema,
  type FieldTypeId,
} from '@/lib/schemas/builder-doc'
import type { OptionDescriptor, OptionValue } from '@/lib/schemas/field-types'
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

interface SchemaStudioProps {
  defaultValues: SchemaFormValues
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: SchemaFormValues) => void
  onCancel?: () => void
}

/**
 * The F-54 three-pane Schema Editor Studio.
 *
 * A single shared document (the Raw JSON text on the form state) drives three
 * coordinated panes — a fields **outline** on the left, a **detail** inspector
 * in the center, and a `Preview / JSON / Notes` **inspector** on the right —
 * plus a first-class **Builder | Raw** toggle. A sticky header carries the
 * entity name/description/draft and the save actions.
 */
export function SchemaStudio({
  defaultValues,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: SchemaStudioProps) {
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

  // Remember the last valid document so an invalid Raw edit never corrupts the
  // builder panes (mirrors the F-05 builder behavior).
  const [lastValidDoc, setLastValidDoc] = useState<Record<string, unknown>>(() =>
    toDocument(defaultValues.jsonSchema),
  )
  useEffect(() => {
    const result = parseJsonSchema(jsonSchemaText)
    if (result.ok) setLastValidDoc(result.value)
  }, [jsonSchemaText])

  const parsed = useMemo(
    () => parseJsonSchema(jsonSchemaText),
    [jsonSchemaText],
  )
  const doc = parsed.ok ? parsed.value : lastValidDoc
  const fields = useMemo(() => readFields(doc), [doc])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selectedField = selectedKey
    ? fields.find((field) => field.key === selectedKey) ?? null
    : null

  const liveJsonError = parsed.ok ? null : parsed.error
  const jsonErrorMessage = liveJsonError ?? errors.jsonSchema?.message

  const [showDiff, setShowDiff] = useState(false)
  const [showInspector, setShowInspector] = useState(true)

  const emit = useCallback(
    (nextDoc: Record<string, unknown>) => {
      setValue('jsonSchema', JSON.stringify(nextDoc, null, 2), {
        shouldDirty: true,
      })
    },
    [setValue],
  )

  const handleAddField = (type: FieldTypeId = 'string') => {
    const { doc: nextDoc, key } = addField(doc, undefined, type)
    emit(nextDoc)
    setSelectedKey(key)
  }

  const handleRemoveField = (key: string) => {
    emit(removeField(doc, key))
    if (selectedKey === key) setSelectedKey(null)
  }

  const handleRemoveFields = (keys: string[]) => {
    emit(removeFields(doc, keys))
    if (selectedKey && keys.includes(selectedKey)) setSelectedKey(null)
  }

  const handleMoveField = (key: string, delta: number) => {
    emit(moveField(doc, key, delta))
  }

  const handleReorderField = (fromKey: string, toKey: string) => {
    const index = fields.findIndex((entry) => entry.key === toKey)
    if (index < 0) return
    emit(reorderField(doc, fromKey, index))
  }

  const handleRename = (oldKey: string, newKey: string) => {
    emit(renameField(doc, oldKey, newKey))
    if (selectedKey === oldKey) setSelectedKey(newKey)
  }

  const handleTypeChange = (type: FieldTypeId) => {
    if (!selectedKey) return
    emit(
      updateFieldSchema(doc, selectedKey, (schema) =>
        applyFieldType(schema, type),
      ),
    )
  }

  const handleRequiredChange = (required: boolean) => {
    if (!selectedKey) return
    emit(setFieldRequired(doc, selectedKey, required))
  }

  const handleDescriptionChange = (description: string) => {
    if (!selectedKey) return
    emit(
      updateFieldSchema(doc, selectedKey, (schema) => {
        if (description === '') delete schema.description
        else schema.description = description
      }),
    )
  }

  const handleOptionChange = (
    option: OptionDescriptor,
    value: OptionValue | undefined,
  ) => {
    if (!selectedKey) return
    emit(
      updateFieldSchema(doc, selectedKey, (schema) =>
        option.write(schema, value),
      ),
    )
  }

  const rootTitle = typeof doc.title === 'string' ? doc.title : ''
  const additionalProperties =
    doc.additionalProperties === undefined || doc.additionalProperties === true
  const advancedRootKeys = readAdvancedRootKeys(doc)
  const advancedAdditionalProperties = hasAdvancedAdditionalProperties(doc)
  const showBuilder = activeTab === 'builder'

  const gridTemplate = !showInspector
    ? 'lg:grid-cols-1'
    : showBuilder
      ? 'lg:grid-cols-[minmax(0,264px)_minmax(0,1fr)_minmax(0,360px)]'
      : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]'

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="sticky top-0 z-20 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList aria-label="Schema editor mode" className="w-auto">
              <TabsTrigger
                value="builder"
                aria-keyshortcuts="Control+Alt+1 Meta+Alt+1"
              >
                Builder
              </TabsTrigger>
              <TabsTrigger
                value="raw"
                aria-keyshortcuts="Control+Alt+2 Meta+Alt+2"
              >
                Raw JSON
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-haspopup="dialog"
              onClick={() => setShowDiff(true)}
            >
              Review changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={showInspector}
              onClick={() => setShowInspector((open) => !open)}
            >
              {showInspector ? 'Hide inspector' : 'Show inspector'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <Label htmlFor="schema-name">Name</Label>
            <Input
              id="schema-name"
              placeholder="e.g. Person"
              aria-invalid={errors.name ? true : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-destructive text-xs" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <Label htmlFor="schema-description">Description</Label>
            <Input
              id="schema-description"
              placeholder="Optional summary of what this schema describes"
              {...register('description')}
            />
          </div>

          <div className="flex w-full flex-col gap-1 sm:w-44">
            <Label htmlFor="schema-draft">Draft</Label>
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
          </div>
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 overflow-hidden rounded-lg border',
          gridTemplate,
        )}
      >
        {showBuilder ? (
          <>
            <aside className="min-h-64 border-b lg:min-h-[32rem] lg:border-b-0 lg:border-e">
              <SchemaFieldOutline
                fields={fields}
                selectedKey={selectedKey}
                readOnly={!parsed.ok}
                onSelectSettings={() => setSelectedKey(null)}
                onSelect={setSelectedKey}
                onAdd={handleAddField}
                onMove={handleMoveField}
                onReorder={handleReorderField}
                onRemove={handleRemoveField}
                onRemoveMany={handleRemoveFields}
                onRename={handleRename}
              />
            </aside>
            <main className="min-h-64 border-b lg:min-h-[32rem] lg:border-b-0">
              {!parsed.ok ? (
                <div
                  role="alert"
                  className="border-destructive/40 bg-destructive/5 text-destructive m-4 rounded-md border px-3 py-2 text-sm"
                >
                  The Raw JSON has errors, so the builder is showing your last
                  valid schema. Fix the JSON in the Raw JSON tab to keep editing.
                </div>
              ) : (
                <SchemaFieldDetail
                  field={selectedField}
                  rootTitle={rootTitle}
                  additionalProperties={additionalProperties}
                  advancedRootKeys={advancedRootKeys}
                  onRename={handleRename}
                  onTypeChange={handleTypeChange}
                  onRequiredChange={handleRequiredChange}
                  onDescriptionChange={handleDescriptionChange}
                  onOptionChange={handleOptionChange}
                  onTitleChange={(title) => emit(setRootTitle(doc, title))}
                  onAdditionalPropertiesChange={(allowed) => {
                    if (advancedAdditionalProperties) return
                    emit(setAdditionalProperties(doc, allowed))
                  }}
                  onAddField={handleAddField}
                />
              )}
            </main>
          </>
        ) : (
          <main className="min-h-64 p-4 lg:min-h-[32rem]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="schema-json">Schema JSON</Label>
              <Textarea
                id="schema-json"
                spellCheck={false}
                className="min-h-80 font-mono text-sm"
                value={jsonSchemaText}
                aria-invalid={jsonErrorMessage ? true : undefined}
                onChange={(event) =>
                  setValue('jsonSchema', event.target.value, {
                    shouldDirty: true,
                  })
                }
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
          </main>
        )}

        {showInspector && (
          <aside className="min-h-64 lg:min-h-[32rem] lg:border-s">
            <SchemaInspector
              jsonSchemaText={jsonSchemaText}
              storageKey="schemaStudio.inspectorTab"
            />
          </aside>
        )}
      </div>

      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review changes</DialogTitle>
            <DialogDescription>
              Compare the saved schema with your current edits before saving.
            </DialogDescription>
          </DialogHeader>
          <SchemaDiff
            oldText={defaultValues.jsonSchema}
            newText={jsonSchemaText}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
