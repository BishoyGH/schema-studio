import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Info } from 'lucide-react'
import { useState } from 'react'
import { PageContainer, PageHeader } from '@/components/app/page'
import { RecordForm } from '@/components/records/record-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { describeRecordFields } from '@/lib/records/fields'
import {
  useCreateRecord,
  useRecord,
  useUpdateRecord,
} from '@/lib/records/queries'
import { useSchema } from '@/lib/schemas/queries'

/**
 * Full-page record editor (F-52). Create and edit share this component; the
 * presence of a `recordId` param decides which mode is active.
 */
export function RecordEditorPage() {
  const params = useParams({ strict: false }) as {
    workspaceId: string
    schemaId: string
    recordId?: string
  }
  const { workspaceId, schemaId, recordId } = params
  const navigate = useNavigate()
  const schemaQuery = useSchema(schemaId)
  const existing = useRecord(recordId)
  const createRecord = useCreateRecord(schemaId)
  const updateRecord = useUpdateRecord(schemaId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isEditing = Boolean(recordId)
  const schema = schemaQuery.data
  const isSubmitting = createRecord.isPending || updateRecord.isPending

  const goToList = () => {
    void navigate({
      to: '/w/$workspaceId/schemas/$schemaId/records',
      params: { workspaceId, schemaId },
    })
  }

  const handleSubmit = (data: Record<string, unknown>) => {
    setSubmitError(null)
    if (isEditing && recordId) {
      updateRecord.mutate(
        { id: recordId, data },
        { onSuccess: goToList, onError: (error) => setSubmitError(error.message) },
      )
    } else {
      createRecord.mutate(data, {
        onSuccess: goToList,
        onError: (error) => setSubmitError(error.message),
      })
    }
  }

  const isLoading =
    schemaQuery.isLoading || (isEditing && existing.isLoading)

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageContainer>
    )
  }

  if (!schema) {
    return (
      <PageContainer>
        <PageHeader
          title="Schema not found"
          description="This schema may have been deleted."
          actions={
            <Button
              type="button"
              onClick={() =>
                void navigate({
                  to: '/w/$workspaceId/schemas',
                  params: { workspaceId },
                })
              }
            >
              Back to schemas
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (isEditing && !existing.data) {
    return (
      <PageContainer>
        <PageHeader
          title="Record not found"
          description="This record may have been deleted."
          actions={
            <Button type="button" onClick={goToList}>
              Back to records
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const fieldCount = describeRecordFields(schema.jsonSchema).length

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link
          to="/w/$workspaceId/schemas/$schemaId/records"
          params={{ workspaceId, schemaId }}
        >
          <ArrowLeft aria-hidden="true" />
          Back to records
        </Link>
      </Button>

      <PageHeader
        title={isEditing ? 'Edit record' : 'New record'}
        description={
          isEditing
            ? `Update this record for “${schema.name}”.`
            : `Fill in the fields defined by “${schema.name}”.`
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="py-5">
          <CardContent className="px-4 sm:px-6">
            <RecordForm
              key={recordId ?? 'new'}
              jsonSchema={schema.jsonSchema}
              defaultValues={existing.data?.data}
              submitLabel={isEditing ? 'Save changes' : 'Create record'}
              isSubmitting={isSubmitting}
              errorMessage={submitError}
              onSubmit={handleSubmit}
              onCancel={goToList}
            />
          </CardContent>
        </Card>

        <Card className="hidden gap-3 py-5 lg:flex">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info aria-hidden="true" className="size-4" />
              About this schema
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fields</span>
              <span className="font-medium tabular-nums">{fieldCount}</span>
            </div>
            <Separator />
            <CardDescription>
              {schema.description ||
                'Values are validated against this schema as you type, and again at the storage boundary before saving.'}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
