import { TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  FIELD_TYPES,
  fieldOptionsFor,
  getFieldType,
  type OptionDescriptor,
  type OptionValue,
} from '@/lib/schemas/field-types'
import type { FieldEntry, FieldTypeId } from '@/lib/schemas/builder-doc'

interface FieldDetailProps {
  field: FieldEntry | null
  rootTitle: string
  additionalProperties: boolean
  advancedRootKeys: string[]
  onRename: (oldKey: string, newKey: string) => void
  onTypeChange: (type: FieldTypeId) => void
  onRequiredChange: (required: boolean) => void
  onDescriptionChange: (description: string) => void
  onOptionChange: (option: OptionDescriptor, value: OptionValue | undefined) => void
  onTitleChange: (title: string) => void
  onAdditionalPropertiesChange: (allowed: boolean) => void
  onAddField: (type: FieldTypeId) => void
  readOnly?: boolean
}

/**
 * The center pane of the F-54 studio. For the pinned schema-settings row it
 * shows root options; for a selected field it shows collapsible
 * Basics / Validation / Advanced groups. The Validation and Advanced groups are
 * rendered generically from the field-type registry's `OptionDescriptor`s, so a
 * new option never needs a layout change.
 */
export function SchemaFieldDetail({
  field,
  rootTitle,
  additionalProperties,
  advancedRootKeys,
  onRename,
  onTypeChange,
  onRequiredChange,
  onDescriptionChange,
  onOptionChange,
  onTitleChange,
  onAdditionalPropertiesChange,
  onAddField,
  readOnly = false,
}: FieldDetailProps) {
  if (!field) {
    return (
      <div className="flex flex-col gap-4 p-4" data-testid="schema-detail">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Schema settings</h2>
          <p className="text-muted-foreground text-xs">
            Options that apply to the whole object.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="root-title">Title</Label>
          <Input
            id="root-title"
            value={rootTitle}
            placeholder="Optional document title"
            readOnly={readOnly}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </div>

        <Separator />

        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={additionalProperties}
            disabled={readOnly}
            aria-label="Allow additional properties"
            onChange={(event) =>
              onAdditionalPropertiesChange(event.target.checked)
            }
          />
          Allow additional properties
        </label>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label>Add a field</Label>
          <div
            role="group"
            aria-label="Add a field"
            className="flex flex-wrap gap-2"
          >
            {FIELD_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <Button
                  key={type.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnly}
                  onClick={() => onAddField(type.id)}
                >
                  <Icon aria-hidden="true" />
                  {type.label}
                </Button>
              )
            })}
          </div>
        </div>

        {advancedRootKeys.length > 0 && (
          <AdvancedNotice>
            {advancedRootKeys.length} advanced setting
            {advancedRootKeys.length === 1 ? '' : 's'} (
            {advancedRootKeys.join(', ')}) preserved — edit in the Raw JSON tab.
          </AdvancedNotice>
        )}
      </div>
    )
  }

  const options = fieldOptionsFor(field.type ?? 'string')
  const validationOptions = options.filter(
    (option) => option.group === 'validation',
  )
  const advancedOptions = options.filter((option) => option.group === 'advanced')
  const description = typeof field.schema.description === 'string'
    ? field.schema.description
    : ''

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="schema-detail">
      <div className="flex flex-col gap-1">
        <nav aria-label="Field path" className="text-muted-foreground text-xs">
          Schema <span aria-hidden="true">/</span>{' '}
          <span className="text-foreground font-medium">{field.key}</span>
        </nav>
        <h2 className="text-sm font-semibold">Field details</h2>
      </div>

      {field.hasAdvancedKeywords && (
        <AdvancedNotice>
          This field uses advanced keywords the builder does not manage. They are
          preserved untouched — edit them in the Raw JSON tab.
        </AdvancedNotice>
      )}

      <DetailGroup title="Basics" defaultOpen>
        <div className="flex flex-col gap-2">
          <Label htmlFor="field-name">Name</Label>
          <FieldNameInput
            value={field.key}
            readOnly={readOnly}
            onRename={(next) => onRename(field.key, next)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="field-type">Type</Label>
          <Select
            value={field.type ?? undefined}
            disabled={readOnly || field.booleanSchema}
            onValueChange={(next) => onTypeChange(next as FieldTypeId)}
          >
            <SelectTrigger id="field-type" className="w-full" aria-label="Field type">
              <SelectValue placeholder="Custom" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.type && (
            <p className="text-muted-foreground text-xs">
              {getFieldType(field.type).help}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="field-description">Description</Label>
          <Input
            id="field-description"
            value={description}
            readOnly={readOnly}
            placeholder="Optional help text"
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
        </div>

        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={field.required}
            disabled={readOnly}
            aria-label={`Required ${field.key}`}
            onChange={(event) => onRequiredChange(event.target.checked)}
          />
          Required
        </label>
      </DetailGroup>

      <DetailGroup title="Validation">
        {validationOptions.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No additional validation for this field type.
          </p>
        ) : (
          validationOptions.map((option) => (
            <OptionField
              key={option.key}
              option={option}
              schema={field.schema}
              disabled={readOnly}
              onChange={(value) => onOptionChange(option, value)}
            />
          ))
        )}
      </DetailGroup>

      <DetailGroup title="Advanced">
        {advancedOptions.map((option) => (
          <OptionField
            key={option.key}
            option={option}
            schema={field.schema}
            disabled={readOnly}
            onChange={(value) => onOptionChange(option, value)}
          />
        ))}
      </DetailGroup>
    </div>
  )
}

interface DetailGroupProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

function DetailGroup({ title, defaultOpen, children }: DetailGroupProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-md border px-3 py-2 [&_summary]:cursor-pointer"
    >
      <summary className="text-sm font-medium select-none">{title}</summary>
      <div className="flex flex-col gap-3 pt-3">{children}</div>
    </details>
  )
}

interface OptionFieldProps {
  option: OptionDescriptor
  schema: Record<string, unknown>
  disabled?: boolean
  onChange: (value: OptionValue | undefined) => void
}

function OptionField({ option, schema, disabled, onChange }: OptionFieldProps) {
  const value = option.read(schema)
  const controlId = `field-option-${option.key}`

  if (option.control === 'checkbox') {
    return (
      <label className="flex min-h-9 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={value === true}
          disabled={disabled}
          aria-label={option.label}
          onChange={(event) => onChange(event.target.checked)}
        />
        {option.label}
      </label>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={controlId}>{option.label}</Label>
      <Input
        id={controlId}
        type={option.control === 'number' ? 'number' : 'text'}
        value={value === undefined ? '' : String(value)}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value
          if (raw === '') {
            onChange(undefined)
          } else if (option.control === 'number') {
            const parsed = Number(raw)
            onChange(Number.isNaN(parsed) ? undefined : parsed)
          } else {
            onChange(raw)
          }
        }}
      />
      {option.help && (
        <p className="text-muted-foreground text-xs">{option.help}</p>
      )}
    </div>
  )
}

function AdvancedNotice({ children }: { children: ReactNode }) {
  return (
    <p
      className={cn(
        'text-muted-foreground flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs',
      )}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

interface FieldNameInputProps {
  value: string
  readOnly?: boolean
  onRename: (next: string) => void
}

function FieldNameInput({ value, readOnly, onRename }: FieldNameInputProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed === '' || trimmed === value) {
      setDraft(value)
      return
    }
    onRename(trimmed)
  }

  return (
    <Input
      id="field-name"
      value={draft}
      readOnly={readOnly}
      aria-label="Field name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          setDraft(value)
        }
      }}
    />
  )
}
