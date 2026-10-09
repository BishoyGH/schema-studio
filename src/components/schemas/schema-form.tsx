import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import {
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
    formState: { errors },
  } = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const draft = watch('draft')

  useEffect(() => {
    const option = SCHEMA_DRAFTS.find((entry) => entry.value === draft)
    if (!option) return
    const next = applyDraftMeta(getValues('jsonSchema'), option.uri)
    if (next) setValue('jsonSchema', next)
  }, [draft, getValues, setValue])

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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="schema-json">Schema JSON</Label>
        <Textarea
          id="schema-json"
          spellCheck={false}
          className="min-h-56 font-mono text-sm"
          aria-invalid={errors.jsonSchema ? true : undefined}
          {...register('jsonSchema')}
        />
        {errors.jsonSchema && (
          <p className="text-destructive text-sm" role="alert">
            {errors.jsonSchema.message}
          </p>
        )}
      </div>

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
