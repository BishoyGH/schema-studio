import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, type FieldValues, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
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
  describeRecordFields,
  recordDefaults,
  type RecordFieldDescriptor,
} from '@/lib/records/fields'
import { recordZodSchema } from '@/lib/records/validation'

interface RecordFormProps {
  jsonSchema: Record<string, unknown>
  defaultValues?: Record<string, unknown>
  submitLabel: string
  isSubmitting?: boolean
  errorMessage?: string | null
  onSubmit: (data: Record<string, unknown>) => void
  onCancel?: () => void
}

function fieldValueToText(value: unknown): string {
  if (value === undefined) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

/**
 * A JSON editor control for object/array fields. It keeps the text the user is
 * typing locally so a half-typed value never blows away the form state; only a
 * successfully parsed value is pushed into react-hook-form.
 */
function JsonField({
  id,
  value,
  invalid,
  onChange,
  onBlur,
}: {
  id: string
  value: unknown
  invalid?: boolean
  onChange: (value: unknown) => void
  onBlur: () => void
}) {
  const [text, setText] = useState(() => fieldValueToText(value))
  const [parseError, setParseError] = useState<string | null>(null)
  const textRef = useRef(text)

  useEffect(() => {
    textRef.current = text
  })

  useEffect(() => {
    let parsed: unknown
    try {
      parsed = textRef.current.trim() === '' ? undefined : JSON.parse(textRef.current)
    } catch {
      parsed = Symbol('unparseable')
    }
    if (JSON.stringify(parsed) !== JSON.stringify(value)) {
      setText(fieldValueToText(value))
    }
  }, [value])

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={id}
        spellCheck={false}
        className="min-h-24 font-mono text-sm"
        value={text}
        aria-invalid={invalid || parseError ? true : undefined}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          if (next.trim() === '') {
            setParseError(null)
            onChange(undefined)
            return
          }
          try {
            const parsed = JSON.parse(next)
            setParseError(null)
            onChange(parsed)
          } catch (error) {
            setParseError(
              error instanceof Error ? error.message : 'Invalid JSON',
            )
          }
        }}
        onBlur={onBlur}
      />
      {parseError && (
        <p className="text-destructive text-sm" role="alert">
          Invalid JSON: {parseError}
        </p>
      )}
    </div>
  )
}

interface FieldProps {
  field: RecordFieldDescriptor
  register: UseFormRegister<Record<string, unknown>>
  control: ReturnType<typeof useForm<Record<string, unknown>>>['control']
  error?: string
}

function RecordField({ field, register, control, error }: FieldProps) {
  const id = `record-field-${field.name}`
  const label = (
    <Label htmlFor={id}>
      {field.name}
      {field.required && (
        <span className="text-destructive" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </Label>
  )
  const describedBy = field.description ? `${id}-help` : undefined

  return (
    <div className="flex flex-col gap-2">
      {label}
      {field.description && (
        <p id={`${id}-help`} className="text-muted-foreground text-xs">
          {field.description}
        </p>
      )}

      {field.kind === 'boolean' ? (
        <Controller
          name={field.name}
          control={control}
          render={({ field: controlled }) => (
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
              <input
                id={id}
                type="checkbox"
                className="size-4"
                checked={Boolean(controlled.value)}
                aria-invalid={error ? true : undefined}
                onChange={(event) => controlled.onChange(event.target.checked)}
                onBlur={controlled.onBlur}
              />
              {field.description ? 'Enabled' : 'Yes'}
            </label>
          )}
        />
      ) : field.kind === 'enum' ? (
        <Controller
          name={field.name}
          control={control}
          render={({ field: controlled }) => {
            const options = field.enumValues ?? []
            const current =
              controlled.value === undefined
                ? ''
                : JSON.stringify(controlled.value)
            return (
              <Select
                value={current}
                onValueChange={(next) => {
                  const match = options.find(
                    (option) => JSON.stringify(option) === next,
                  )
                  controlled.onChange(match)
                }}
              >
                <SelectTrigger
                  id={id}
                  className="w-full"
                  aria-invalid={error ? true : undefined}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem
                      key={JSON.stringify(option)}
                      value={JSON.stringify(option)}
                    >
                      {typeof option === 'string'
                        ? option
                        : JSON.stringify(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }}
        />
      ) : field.kind === 'json' ? (
        <Controller
          name={field.name}
          control={control}
          render={({ field: controlled }) => (
            <JsonField
              id={id}
              value={controlled.value}
              invalid={Boolean(error)}
              onChange={controlled.onChange}
              onBlur={controlled.onBlur}
            />
          )}
        />
      ) : field.kind === 'null' ? (
        <Controller
          name={field.name}
          control={control}
          render={({ field: controlled }) => (
            <Input
              id={id}
              value="null"
              readOnly
              aria-describedby={describedBy}
              onChange={() => controlled.onChange(null)}
            />
          )}
        />
      ) : field.kind === 'number' || field.kind === 'integer' ? (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          step={field.kind === 'integer' ? 1 : 'any'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...register(field.name, {
            setValueAs: (value) => {
              if (value === '' || value === null || value === undefined) {
                return undefined
              }
              const numeric = Number(value)
              return Number.isNaN(numeric) ? value : numeric
            },
          })}
        />
      ) : (
        <Input
          id={id}
          type={field.format === 'date' ? 'date' : 'text'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...register(field.name)}
        />
      )}

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function RecordForm({
  jsonSchema,
  defaultValues,
  submitLabel,
  isSubmitting = false,
  errorMessage,
  onSubmit,
  onCancel,
}: RecordFormProps) {
  const { schema } = useMemo(() => recordZodSchema(jsonSchema), [jsonSchema])
  const fields = useMemo(() => describeRecordFields(jsonSchema), [jsonSchema])

  const values = useMemo(
    () => ({ ...recordDefaults(jsonSchema), ...(defaultValues ?? {}) }),
    [jsonSchema, defaultValues],
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(
      schema as z.ZodType<Record<string, unknown>, FieldValues>,
    ),
    defaultValues: values,
    mode: 'onChange',
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((data) => onSubmit(data))}
      className="flex flex-col gap-5"
    >
      {fields.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="note">
          This schema has no editable fields. Add properties to the schema to
          capture record data.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {fields.map((field) => (
            <RecordField
              key={field.name}
              field={field}
              register={register}
              control={control}
              error={
                (errors[field.name] as { message?: string } | undefined)?.message
              }
            />
          ))}
        </div>
      )}

      {errorMessage && (
        <p className="text-destructive text-sm" role="alert">
          {errorMessage}
        </p>
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
