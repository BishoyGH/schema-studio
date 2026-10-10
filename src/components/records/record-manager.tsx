import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RecordForm } from '@/components/records/record-form'
import { describeRecordFields } from '@/lib/records/fields'
import {
  useCreateRecord,
  useDeleteRecord,
  useRecords,
  useUpdateRecord,
} from '@/lib/records/queries'
import type { RecordEntity, SchemaEntity } from '@/lib/storage'

function describeRecordValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

/** A human label for a record: the first scalar property value, else its id. */
function recordLabel(
  schema: SchemaEntity,
  record: RecordEntity,
): string | undefined {
  for (const field of describeRecordFields(schema.jsonSchema)) {
    const value = record.data[field.name]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
  }
  return undefined
}

function recordSummary(record: RecordEntity): string {
  const entries = Object.entries(record.data)
  if (entries.length === 0) return 'Empty record'
  return entries
    .map(([key, value]) => `${key}: ${describeRecordValue(value)}`)
    .join('  ·  ')
}

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

interface RecordManagerProps {
  schema: SchemaEntity
  onBack: () => void
}

export function RecordManager({ schema, onBack }: RecordManagerProps) {
  const { data: records, isLoading, isError } = useRecords(schema.id)
  const createRecord = useCreateRecord(schema.id)
  const updateRecord = useUpdateRecord(schema.id)
  const deleteRecord = useDeleteRecord(schema.id)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<RecordEntity | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RecordEntity | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const openCreate = () => {
    setEditing(null)
    setSubmitError(null)
    setEditorOpen(true)
  }

  const openEdit = (record: RecordEntity) => {
    setEditing(record)
    setSubmitError(null)
    setEditorOpen(true)
  }

  const closeEditor = () => setEditorOpen(false)

  const handleSubmit = (data: Record<string, unknown>) => {
    setSubmitError(null)
    if (editing) {
      updateRecord.mutate(
        { id: editing.id, data },
        {
          onSuccess: closeEditor,
          onError: (error) => setSubmitError(error.message),
        },
      )
    } else {
      createRecord.mutate(data, {
        onSuccess: closeEditor,
        onError: (error) => setSubmitError(error.message),
      })
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteRecord.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    })
  }

  const isSubmitting = createRecord.isPending || updateRecord.isPending

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" />
            Back to schemas
          </Button>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {schema.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {schema.description || 'Records validated against this schema.'}
            </p>
          </div>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New record
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm" role="status">
          Loading records…
        </p>
      )}

      {isError && (
        <p className="text-destructive text-sm" role="alert">
          Could not load records. Please try again.
        </p>
      )}

      {!isLoading && !isError && records && records.length === 0 && (
        <Card className="items-center py-12 text-center">
          <CardContent className="flex flex-col items-center gap-2">
            <CardTitle>No records yet</CardTitle>
            <CardDescription>
              Create your first record for “{schema.name}”.
            </CardDescription>
            <Button type="button" className="mt-2" onClick={openCreate}>
              <Plus aria-hidden="true" />
              New record
            </Button>
          </CardContent>
        </Card>
      )}

      {records && records.length > 0 && (
        <ul className="flex flex-col gap-3">
          {records.map((record) => (
            <li key={record.id}>
              <Card className="gap-4 py-4">
                <CardHeader className="flex-row items-start justify-between gap-4 px-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle className="truncate">
                      {recordLabel(schema, record) ?? 'Record'}
                    </CardTitle>
                    <CardDescription className="truncate font-mono text-xs">
                      {recordSummary(record)}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Edit record"
                      onClick={() => openEdit(record)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete record"
                      onClick={() => setPendingDelete(record)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 text-xs">
                  <span className="text-muted-foreground">
                    Updated {formatUpdatedAt(record.updatedAt)}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit record' : 'New record'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update this record for “${schema.name}”.`
                : `Fill in the fields defined by “${schema.name}”.`}
            </DialogDescription>
          </DialogHeader>
          <RecordForm
            key={editing?.id ?? 'new'}
            jsonSchema={schema.jsonSchema}
            defaultValues={editing?.data}
            submitLabel={editing ? 'Save changes' : 'Create record'}
            isSubmitting={isSubmitting}
            errorMessage={submitError}
            onSubmit={handleSubmit}
            onCancel={closeEditor}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete record?</DialogTitle>
            <DialogDescription>
              This record will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteRecord.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
