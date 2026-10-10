import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { cn } from '@/lib/utils'
import {
  isRichTextField,
  richTextFieldSchema,
  SCHEMA_STUDIO_KEY,
} from '@/lib/schemas/extension'
import { parseJsonSchema } from '@/lib/schemas/validation'

const BUILDER_FIELD_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'null',
  'object',
  'array',
  'richText',
] as const

type BuilderFieldType = (typeof BUILDER_FIELD_TYPES)[number]

/** One-line explanation of what each field type captures, shown next to the picker. */
const FIELD_TYPE_HELP: Record<BuilderFieldType, string> = {
  string: 'Text value.',
  number: 'Decimal number.',
  integer: 'Whole number.',
  boolean: 'True/false toggle.',
  null: 'Always empty (null).',
  object: 'Nested group of named fields (a sub-record).',
  array: 'Ordered list of values.',
  richText: 'Rich text / block content edited with the block editor.',
}

/**
 * What `object`/`array` mean beyond the label. Until nested editing ships in
 * F-12, the builder can only set the type; deeper setup lives in the Raw tab.
 */
const NESTED_TYPE_HINT =
  'Detailed setup (nested fields / item type) is available in the Raw JSON tab.'

const MANAGED_ROOT_KEYS = new Set([
  '$schema',
  'type',
  'properties',
  'required',
  'additionalProperties',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFieldType(value: unknown): value is BuilderFieldType {
  return (
    typeof value === 'string' &&
    (BUILDER_FIELD_TYPES as readonly string[]).includes(value)
  )
}

/**
 * Write a picked builder type back into a field schema. Most types map 1:1 onto
 * the JSON Schema `type` keyword; `richText` is the F-07b `x-schema-studio`
 * field type, stored as an array of blocks.
 */
function applyBuilderType(
  schema: Record<string, unknown>,
  type: BuilderFieldType,
): void {
  if (type === 'richText') {
    Object.assign(schema, richTextFieldSchema())
    return
  }
  schema.type = type
  if (isRichTextField(schema)) delete schema[SCHEMA_STUDIO_KEY]
}

function toDocument(text: string): Record<string, unknown> {
  const result = parseJsonSchema(text)
  return result.ok ? result.value : {}
}

interface BuilderField {
  key: string
  schema: Record<string, unknown>
  booleanSchema: boolean
  type: BuilderFieldType | null
  required: boolean
  hasAdvancedKeywords: boolean
}

interface SchemaBuilderProps {
  value: string
  onChange: (next: string) => void
}

export function SchemaBuilder({ value, onChange }: SchemaBuilderProps) {
  const parsed = parseJsonSchema(value)
  const invalid = !parsed.ok

  // Remember the last successfully parsed document so an invalid Raw JSON edit
  // never corrupts what the Builder is showing.
  const [lastValidDoc, setLastValidDoc] = useState<Record<string, unknown>>(() =>
    toDocument(value),
  )

  useEffect(() => {
    const result = parseJsonSchema(value)
    if (result.ok) setLastValidDoc(result.value)
  }, [value])

  const doc = parsed.ok ? parsed.value : lastValidDoc

  const properties = isPlainObject(doc.properties) ? doc.properties : {}
  const required = Array.isArray(doc.required)
    ? doc.required.filter((entry): entry is string => typeof entry === 'string')
    : []

  // Whether the *document* is one the builder can render field rows for. This
  // is intentionally independent of raw-JSON validity so the last valid schema
  // keeps showing (read-only) while the Raw JSON tab has errors.
  const docEditable =
    (doc.type === undefined || doc.type === 'object') &&
    (doc.properties === undefined || isPlainObject(doc.properties))

  const advancedRootKeys = Object.keys(doc).filter(
    (key) => !MANAGED_ROOT_KEYS.has(key),
  )
  const advancedAdditionalProperties =
    doc.additionalProperties !== undefined &&
    typeof doc.additionalProperties !== 'boolean'
  const hasAdvanced = advancedRootKeys.length > 0 || advancedAdditionalProperties

  const fields: BuilderField[] = docEditable
    ? Object.entries(properties).map(([key, rawSchema]) => {
        const schema = isPlainObject(rawSchema) ? rawSchema : {}
        const richText = isRichTextField(schema)
        const advancedKeys = Object.keys(schema).filter((entry) => {
          if (entry === 'type' || entry === 'description') return false
          if (entry === SCHEMA_STUDIO_KEY && richText) return false
          return true
        })
        const type: BuilderFieldType | null = richText
          ? 'richText'
          : isFieldType(schema.type)
            ? schema.type
            : null
        return {
          key,
          schema,
          booleanSchema: typeof rawSchema === 'boolean',
          type,
          required: required.includes(key),
          hasAdvancedKeywords:
            typeof rawSchema === 'boolean' || advancedKeys.length > 0,
        }
      })
    : []

  const emit = (nextDoc: Record<string, unknown>) => {
    onChange(JSON.stringify(nextDoc, null, 2))
  }

  const setPropertySchema = (
    key: string,
    mutate: (schema: Record<string, unknown>) => void,
  ) => {
    const nextProperties = { ...properties }
    const schema = isPlainObject(nextProperties[key])
      ? { ...nextProperties[key] }
      : {}
    mutate(schema)
    nextProperties[key] = schema
    emit({ ...doc, properties: nextProperties })
  }

  const addField = () => {
    const nextProperties = { ...properties }
    let name = 'field'
    let counter = 1
    while (name in nextProperties) {
      counter += 1
      name = `field${counter}`
    }
    nextProperties[name] = { type: 'string' }
    emit({ ...doc, properties: nextProperties })
  }

  const removeField = (key: string) => {
    const nextProperties = { ...properties }
    delete nextProperties[key]
    const nextDoc: Record<string, unknown> = { ...doc, properties: nextProperties }
    if (Array.isArray(doc.required)) {
      nextDoc.required = required.filter((entry) => entry !== key)
    }
    emit(nextDoc)
  }

  const renameField = (oldKey: string, newKey: string) => {
    const nextProperties: Record<string, unknown> = {}
    for (const [key, schema] of Object.entries(properties)) {
      nextProperties[key === oldKey ? newKey : key] = schema
    }
    const nextDoc: Record<string, unknown> = { ...doc, properties: nextProperties }
    if (required.includes(oldKey)) {
      nextDoc.required = required.map((entry) => (entry === oldKey ? newKey : entry))
    }
    emit(nextDoc)
  }

  const moveField = (key: string, delta: number) => {
    const entries = Object.entries(properties)
    const index = entries.findIndex(([entryKey]) => entryKey === key)
    const target = index + delta
    if (index < 0 || target < 0 || target >= entries.length) return
    const reordered = [...entries]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    emit({ ...doc, properties: Object.fromEntries(reordered) })
  }

  const toggleRequired = (key: string) => {
    const nextRequired = required.includes(key)
      ? required.filter((entry) => entry !== key)
      : [...required, key]
    emit({ ...doc, required: nextRequired })
  }

  const setAdditionalProperties = (allowed: boolean) => {
    emit({ ...doc, additionalProperties: allowed })
  }

  return (
    <div className="flex flex-col gap-4">
      {invalid && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex-1">
            The Raw JSON has errors, so the Builder is showing your last valid
            schema. Fix the JSON in the Raw JSON tab to keep editing.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => emit(lastValidDoc)}
          >
            Restore last valid
          </Button>
        </div>
      )}

      {!invalid && hasAdvanced && (
        <div className="bg-muted/50 text-muted-foreground flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs">
          <span className="bg-background rounded-full border px-2 py-0.5 font-medium">
            advanced
          </span>
          <span className="flex-1">
            {advancedRootKeys.length > 0 && (
              <>
                {advancedRootKeys.length} advanced setting
                {advancedRootKeys.length === 1 ? '' : 's'} (
                {advancedRootKeys.join(', ')}){' '}
              </>
            )}
            {advancedAdditionalProperties && 'additionalProperties '}
            preserved — edit in the Raw JSON tab.
          </span>
        </div>
      )}

      {!docEditable ? (
        <p className="text-muted-foreground text-sm" role="note">
          This schema uses a structure the Builder does not support yet (for
          example a non-object root or a custom type). Switch to the Raw JSON tab
          to edit it — nothing here will be modified.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {fields.length === 0 && !invalid && (
              <p className="text-muted-foreground text-sm" role="note">
                No fields yet. Add one to start building your schema.
              </p>
            )}

            {fields.map((field, index) => (
              <div
                key={field.key}
                className="flex flex-col gap-3 rounded-md border p-3"
              >
                <div className="flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label>Field name</Label>
                    <FieldNameInput
                      value={field.key}
                      existingKeys={fields.map((entry) => entry.key)}
                      disabled={invalid}
                      onRename={(next) => renameField(field.key, next)}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${field.key} up`}
                      disabled={invalid || index === 0}
                      onClick={() => moveField(field.key, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${field.key} down`}
                      disabled={invalid || index === fields.length - 1}
                      onClick={() => moveField(field.key, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${field.key}`}
                      disabled={invalid}
                      onClick={() => removeField(field.key)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-40 flex-col gap-1">
                    <Label>Type</Label>
                    <Select
                      value={field.type ?? ''}
                      disabled={invalid || field.booleanSchema}
                      onValueChange={(next) =>
                        setPropertySchema(field.key, (schema) => {
                          applyBuilderType(schema, next as BuilderFieldType)
                        })
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={`Type for ${field.key}`}
                        aria-describedby={
                          field.type ? `field-type-help-${field.key}` : undefined
                        }
                      >
                        <SelectValue placeholder="Custom" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUILDER_FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.type && (
                      <p
                        id={`field-type-help-${field.key}`}
                        className="text-muted-foreground text-xs"
                      >
                        {FIELD_TYPE_HELP[field.type]}
                        {(field.type === 'object' || field.type === 'array') && (
                          <> {NESTED_TYPE_HINT}</>
                        )}
                      </p>
                    )}
                  </div>

                  <label className="flex min-h-9 max-md:min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={field.required}
                      disabled={invalid}
                      aria-label={`Required ${field.key}`}
                      onChange={() => toggleRequired(field.key)}
                    />
                    Required
                  </label>

                  {field.hasAdvancedKeywords && (
                    <span className="bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
                      advanced keywords
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Description</Label>
                  <Input
                    value={
                      typeof field.schema.description === 'string'
                        ? field.schema.description
                        : ''
                    }
                    disabled={invalid}
                    placeholder="Optional help text for this field"
                    aria-label={`Description for ${field.key}`}
                    onChange={(event) =>
                      setPropertySchema(field.key, (schema) => {
                        if (event.target.value) {
                          schema.description = event.target.value
                        } else {
                          delete schema.description
                        }
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={invalid}
              onClick={addField}
            >
              <Plus aria-hidden="true" />
              Add field
            </Button>

            <label
              className={cn(
                'flex min-h-9 max-md:min-h-11 items-center gap-2 text-sm',
                invalid ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                className="size-4"
                checked={
                  doc.additionalProperties === true ||
                  doc.additionalProperties === undefined
                }
                disabled={invalid || advancedAdditionalProperties}
                aria-label="Allow additional properties"
                onChange={(event) => setAdditionalProperties(event.target.checked)}
              />
              Allow additional properties
            </label>
          </div>
        </>
      )}
    </div>
  )
}

interface FieldNameInputProps {
  value: string
  existingKeys: string[]
  disabled?: boolean
  onRename: (next: string) => void
}

function FieldNameInput({
  value,
  existingKeys,
  disabled = false,
  onRename,
}: FieldNameInputProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const trimmed = draft.trim()
  const duplicate =
    trimmed !== value && existingKeys.includes(trimmed) && trimmed.length > 0
  const invalid = trimmed.length === 0 || duplicate

  const commit = () => {
    if (invalid) {
      setDraft(value)
      return
    }
    if (trimmed !== value) onRename(trimmed)
  }

  return (
    <Input
      value={draft}
      disabled={disabled}
      aria-label={`Field name ${value}`}
      aria-invalid={invalid || undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
        if (event.key === 'Escape') {
          setDraft(value)
        }
      }}
    />
  )
}
