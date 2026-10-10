import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageContainer, PageHeader } from '@/components/app/page'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { recordLabel, recordSummary } from '@/lib/records/label'
import { useDeleteRecord, useRecords } from '@/lib/records/queries'
import { useSchema } from '@/lib/schemas/queries'
import type { RecordEntity } from '@/lib/storage'

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function RecordListPage() {
  const { workspaceId, schemaId } = useParams({
    from: '/w/$workspaceId/schemas/$schemaId/records',
  })
  const schemaQuery = useSchema(schemaId)
  const { data: records, isLoading, isError } = useRecords(schemaId)
  const deleteRecord = useDeleteRecord(schemaId)
  const [pendingDelete, setPendingDelete] = useState<RecordEntity | null>(null)

  const schema = schemaQuery.data
  const backToList = { to: '/w/$workspaceId/schemas' as const, params: { workspaceId } }
  const newRecordTo = {
    to: '/w/$workspaceId/schemas/$schemaId/records/new' as const,
    params: { workspaceId, schemaId },
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteRecord.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    })
  }

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link to={backToList.to} params={backToList.params}>
          <ArrowLeft aria-hidden="true" />
          Back to schemas
        </Link>
      </Button>

      <PageHeader
        title={schema?.name ?? 'Records'}
        description={
          schema?.description || 'Records validated against this schema.'
        }
        actions={
          <Button asChild>
            <Link to={newRecordTo.to} params={newRecordTo.params}>
              <Plus aria-hidden="true" />
              New record
            </Link>
          </Button>
        }
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-12 rounded-md" />
          ))}
        </div>
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
              Create your first record for “{schema?.name ?? 'this schema'}”.
            </CardDescription>
            <Button asChild className="mt-2">
              <Link to={newRecordTo.to} params={newRecordTo.params}>
                <Plus aria-hidden="true" />
                New record
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {records && records.length > 0 && schema && (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead className="hidden md:table-cell">Summary</TableHead>
                <TableHead className="hidden sm:table-cell">Updated</TableHead>
                <TableHead className="w-24 text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="max-w-[16rem] truncate font-medium">
                    {recordLabel(schema, record) ?? 'Record'}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[24rem] truncate md:table-cell">
                    {recordSummary(schema, record)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {formatUpdatedAt(record.updatedAt)}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit record"
                        asChild
                      >
                        <Link
                          to="/w/$workspaceId/schemas/$schemaId/records/$recordId/edit"
                          params={{ workspaceId, schemaId, recordId: record.id }}
                        >
                          <Pencil aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete record"
                        onClick={() => setPendingDelete(record)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
    </PageContainer>
  )
}
