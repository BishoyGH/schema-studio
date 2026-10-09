import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { SchemaForm } from '@/components/schemas/schema-form'
import {
  useCreateSchema,
  useDeleteSchema,
  useSchemas,
  useUpdateSchema,
} from '@/lib/schemas/queries'
import {
  SCHEMA_DRAFTS,
  emptySchemaFormValues,
  parseJsonSchema,
  type SchemaFormValues,
} from '@/lib/schemas/validation'
import type { CreateSchemaInput, SchemaEntity } from '@/lib/storage'

function toFormValues(schema: SchemaEntity): SchemaFormValues {
  return {
    name: schema.name,
    description: schema.description,
    draft: schema.draft,
    jsonSchema: JSON.stringify(schema.jsonSchema, null, 2),
  }
}

function toInput(values: SchemaFormValues): CreateSchemaInput {
  const parsed = parseJsonSchema(values.jsonSchema)
  return {
    name: values.name,
    description: values.description,
    draft: values.draft,
    jsonSchema: parsed.ok ? parsed.value : {},
  }
}

function draftLabel(draft: SchemaEntity['draft']): string {
  return SCHEMA_DRAFTS.find((option) => option.value === draft)?.label ?? draft
}

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function SchemaManager() {
  const { data: schemas, isLoading, isError } = useSchemas()
  const createSchema = useCreateSchema()
  const updateSchema = useUpdateSchema()
  const deleteSchema = useDeleteSchema()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<SchemaEntity | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SchemaEntity | null>(null)

  const openCreate = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const openEdit = (schema: SchemaEntity) => {
    setEditing(schema)
    setEditorOpen(true)
  }

  const closeEditor = () => setEditorOpen(false)

  const handleSubmit = (values: SchemaFormValues) => {
    const input = toInput(values)
    if (editing) {
      updateSchema.mutate({ id: editing.id, input }, { onSuccess: closeEditor })
    } else {
      createSchema.mutate(input, { onSuccess: closeEditor })
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteSchema.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    })
  }

  const isSubmitting = createSchema.isPending || updateSchema.isPending

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Schemas</h1>
          <p className="text-muted-foreground text-sm">
            Define and manage the JSON Schemas your records are validated against.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New schema
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm" role="status">
          Loading schemas…
        </p>
      )}

      {isError && (
        <p className="text-destructive text-sm" role="alert">
          Could not load schemas. Please try again.
        </p>
      )}

      {!isLoading && !isError && schemas && schemas.length === 0 && (
        <Card className="items-center py-12 text-center">
          <CardContent className="flex flex-col items-center gap-2">
            <CardTitle>No schemas yet</CardTitle>
            <CardDescription>
              Create your first schema to start adding records.
            </CardDescription>
            <Button type="button" className="mt-2" onClick={openCreate}>
              <Plus aria-hidden="true" />
              New schema
            </Button>
          </CardContent>
        </Card>
      )}

      {schemas && schemas.length > 0 && (
        <ul className="flex flex-col gap-3">
          {schemas.map((schema) => (
            <li key={schema.id}>
              <Card className="gap-4 py-4">
                <CardHeader className="flex-row items-start justify-between gap-4 px-4">
                  <div className="flex flex-col gap-1">
                    <CardTitle>{schema.name}</CardTitle>
                    <CardDescription>
                      {schema.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${schema.name}`}
                      onClick={() => openEdit(schema)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${schema.name}`}
                      onClick={() => setPendingDelete(schema)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 text-xs">
                  <span className="text-foreground font-medium">
                    {draftLabel(schema.draft)}
                  </span>
                  <span className="text-muted-foreground">
                    Updated {formatUpdatedAt(schema.updatedAt)}
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
            <DialogTitle>{editing ? 'Edit schema' : 'New schema'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the schema definition and metadata using the Builder or Raw JSON.'
                : 'Give your schema a name, then build it visually or edit the JSON directly.'}
            </DialogDescription>
          </DialogHeader>
          <SchemaForm
            key={editing?.id ?? 'new'}
            defaultValues={editing ? toFormValues(editing) : emptySchemaFormValues()}
            submitLabel={editing ? 'Save changes' : 'Create schema'}
            isSubmitting={isSubmitting}
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
            <DialogTitle>Delete schema?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `“${pendingDelete.name}” and all of its records will be permanently deleted. This cannot be undone.`
                : ''}
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
              disabled={deleteSchema.isPending}
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
