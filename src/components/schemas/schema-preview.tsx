import { Eye, FileInput, Sparkles, TriangleAlert, WandSparkles } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RecordForm } from '@/components/records/record-form'
import { recordDefaults } from '@/lib/records/fields'
import { validateRecordData } from '@/lib/records/validation'
import {
  fieldAdvancedNotes,
  schemaUnsupportedNotes,
} from '@/lib/schemas/preview'
import {
  generateInvalidSampleData,
  generateSampleData,
} from '@/lib/schemas/sample-data'
import { parseJsonSchema } from '@/lib/schemas/validation'

type PreviewMode = 'normal' | 'sample' | 'invalid' | 'pasted'

interface SchemaPreviewProps {
  jsonSchemaText: string
}

/**
 * The F-07a live preview: renders the record form the current schema produces
 * (the same F-07 engine + F-04 bridge), with auto-fill of valid/invalid sample
 * data, pasted-data validation, advanced-keyword warnings, and a read-only JSON
 * Schema mirror. It never saves — it only shows what records will look like.
 */
export function SchemaPreview({ jsonSchemaText }: SchemaPreviewProps) {
  const deferredText = useDeferredValue(jsonSchemaText)
  const parsed = useMemo(
    () => parseJsonSchema(deferredText),
    [deferredText],
  )

  const [seed, setSeed] = useState<{ data: Record<string, unknown> } | null>(null)
  const [mode, setMode] = useState<PreviewMode>('normal')
  const [seedVersion, setSeedVersion] = useState(0)
  const [pastedText, setPastedText] = useState('')
  const [pastedError, setPastedError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  if (!parsed.ok) {
    return (
      <div
        role="alert"
        data-testid="schema-preview"
        className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
      >
        Preview is temporarily unavailable while the schema has errors:{' '}
        {parsed.error}
      </div>
    )
  }

  const doc = parsed.value
  const unsupported = schemaUnsupportedNotes(doc)
  const advancedFields = fieldAdvancedNotes(doc)

  const previewValues =
    seed?.data ?? recordDefaults(doc)

  const applySeed = (data: Record<string, unknown>) => {
    setSeed({ data })
    setSeedVersion((version) => version + 1)
    setSummary(null)
  }

  const applyPaste = () => {
    if (pastedText.trim() === '') return
    let data: unknown
    try {
      data = JSON.parse(pastedText)
    } catch (error) {
      setPastedError(
        error instanceof Error ? error.message : 'Invalid JSON input',
      )
      setSummary(null)
      return
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      setPastedError('Pasted data must be a JSON object (a record)')
      setSummary(null)
      return
    }
    setPastedError(null)
    setMode('pasted')
    applySeed(data as Record<string, unknown>)
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border p-3" data-testid="schema-preview">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Eye aria-hidden="true" className="size-4" />
          Form preview
        </p>
        <p className="text-muted-foreground text-xs">
          Read-only mirror: this shows what records will look like and never
          saves anything.
        </p>
      </div>

      {unsupported.length > 0 && (
        <ul
          className="text-muted-foreground border bg-muted/50 rounded-md px-3 py-2 text-xs"
          data-testid="preview-unsupported"
        >
          {unsupported.map((note) => (
            <li key={note} className="flex gap-1">
              <span aria-hidden="true">•</span>
              <span>
                {note} — <strong>advanced — not validated</strong>
              </span>
            </li>
          ))}
        </ul>
      )}

      {advancedFields.length > 0 && (
        <ul
          className="text-muted-foreground border bg-muted/50 rounded-md px-3 py-2 text-xs"
          data-testid="preview-advanced-fields"
        >
          <li className="font-medium">Advanced fields (generic input, not validated):</li>
          {advancedFields.map(({ name }) => (
            <li key={name}>
              {name} — <strong>advanced — not validated</strong>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => {
            setMode('sample')
            applySeed(generateSampleData(doc))
          }}
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Fill sample data
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => {
            setMode('invalid')
            applySeed(generateInvalidSampleData(doc))
          }}
        >
          <WandSparkles aria-hidden="true" className="size-4" />
          Fill invalid sample
        </Button>
      </div>

      <RecordForm
        key={`${seedVersion}-${deferredText}`}
        jsonSchema={doc}
        defaultValues={previewValues}
        submitLabel="Check validity"
        bare
        validateOnMount={mode !== 'normal'}
        onSubmit={(data) => {
          const result = validateRecordData(doc, data)
          setSummary(result.success
            ? 'Valid — this data matches the schema.'
            : `${result.fieldErrors.length} field${
                result.fieldErrors.length === 1 ? '' : 's'
              } with errors.`,
          )
        }}
        onInvalid={(errors) => {
          setSummary(
            `${errors.length} field${errors.length === 1 ? '' : 's'} with errors.`,
          )
        }}
      />

      {summary && (
        <p
          className="text-sm font-medium"
          role="status"
          data-testid="preview-result"
        >
          {summary}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="preview-paste-data">Validate pasted data</Label>
        <Textarea
          id="preview-paste-data"
          spellCheck={false}
          className="min-h-20 font-mono text-xs"
          placeholder='Paste a record JSON blob, e.g. {"name": "Ada"}'
          value={pastedText}
          aria-invalid={pastedError ? true : undefined}
          onChange={(event) => setPastedText(event.target.value)}
        />
        {pastedError && (
          <p className="text-destructive text-sm" role="alert">
            {pastedError}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11 self-start"
          onClick={applyPaste}
        >
          <FileInput aria-hidden="true" className="size-4" />
          Validate pasted data
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium">Live generated JSON Schema (read-only)</p>
        <pre
          className="bg-muted/50 max-h-48 overflow-auto rounded-md border p-3 font-mono text-xs"
          data-testid="schema-mirror"
        >
          {JSON.stringify(doc, null, 2)}
        </pre>
      </div>

      {mode !== 'normal' && (
        <p className="text-muted-foreground text-xs" role="note">
          {mode === 'sample'
            ? 'Showing a valid sample record for this schema.'
            : mode === 'invalid'
              ? 'Showing a deliberately invalid record so errors light up.'
              : 'Showing the data you pasted, validated against the schema.'}
        </p>
      )}

      <p className="text-muted-foreground flex items-center gap-1 text-xs">
        <TriangleAlert aria-hidden="true" className="size-3.5 text-amber-500" />
        This preview never persists — records are only saved from the Records
        screen.
      </p>
    </div>
  )
}