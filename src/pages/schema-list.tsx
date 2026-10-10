import { Link, useParams } from '@tanstack/react-router'
import { List, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageContainer, PageHeader } from '@/components/app/page'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspaceRecords } from '@/lib/records/queries'
import { useDeleteSchema, useSchemas } from '@/lib/schemas/queries'
import { SCHEMA_DRAFTS } from '@/lib/schemas/validation'
import type { SchemaEntity } from '@/lib/storage'

function draftLabel(draft: SchemaEntity['draft']): string {
  return SCHEMA_DRAFTS.find((option) => option.value === draft)?.label ?? draft
}

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function SchemaListPage() {
  const { workspaceId } = useParams({ from: '/w/$workspaceId/schemas' })
  const { data: schemas, isLoading, isError } = useSchemas(workspaceId)
  const recordsQuery = useWorkspaceRecords(workspaceId)
  const deleteSchema = useDeleteSchema()
  const [pendingDelete, setPendingDelete] = useState<SchemaEntity | null>(null)

  const countBySchema = new Map<string, number>()
  for (const record of recordsQuery.data ?? []) {
    countBySchema.set(
      record.schemaId,
      (countBySchema.get(record.schemaId) ?? 0) + 1,
    )
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteSchema.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Schemas"
        description="Define and manage the JSON Schemas your records are validated against."
        actions={
          <Button asChild>
            <Link to="/w/$workspaceId/schemas/new" params={{ workspaceId }}>
              <Plus aria-hidden="true" />
              New schema
            </Link>
          </Button>
        }
      />

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-36 rounded-xl" />
          ))}
        </div>
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
            <Button asChild className="mt-2">
              <Link to="/w/$workspaceId/schemas/new" params={{ workspaceId }}>
                <Plus aria-hidden="true" />
                New schema
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {schemas && schemas.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {schemas.map((schema) => (
            <li key={schema.id}>
              <Card className="h-full gap-4 py-4">
                <CardHeader className="flex-row items-start justify-between gap-3 px-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle className="truncate">{schema.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {schema.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${schema.name}`}
                      asChild
                    >
                      <Link
                        to="/w/$workspaceId/schemas/$schemaId/edit"
                        params={{ workspaceId, schemaId: schema.id }}
                      >
                        <Pencil aria-hidden="true" />
                      </Link>
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
                <CardContent className="flex flex-wrap items-center gap-2 px-4 text-xs">
                  <Badge variant="secondary">{draftLabel(schema.draft)}</Badge>
                  <Badge variant="outline">
                    {countBySchema.get(schema.id) ?? 0}{' '}
                    {(countBySchema.get(schema.id) ?? 0) === 1
                      ? 'record'
                      : 'records'}
                  </Badge>
                  <span className="text-muted-foreground">
                    Updated {formatUpdatedAt(schema.updatedAt)}
                  </span>
                  <span className="flex-1" />
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to="/w/$workspaceId/schemas/$schemaId/records"
                      params={{ workspaceId, schemaId: schema.id }}
                    >
                      <List aria-hidden="true" />
                      Records
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

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
    </PageContainer>
  )
}
