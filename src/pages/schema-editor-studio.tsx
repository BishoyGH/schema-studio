import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/app/page'
import { SchemaStudio } from '@/components/schemas/schema-studio'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCreateSchema,
  useSchema,
  useUpdateSchema,
} from '@/lib/schemas/queries'
import {
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

function toInput(
  values: SchemaFormValues,
): Omit<CreateSchemaInput, 'workspaceId'> {
  const parsed = parseJsonSchema(values.jsonSchema)
  return {
    name: values.name,
    description: values.description,
    draft: values.draft,
    jsonSchema: parsed.ok ? parsed.value : {},
  }
}

/**
 * Full-page schema editor (F-54): a three-pane studio (outline + detail +
 * inspector) over a single shared document. Create and edit share this
 * component; the presence of a `schemaId` param decides which mode is active.
 */
export function SchemaEditorStudioPage() {
  const params = useParams({ strict: false }) as {
    workspaceId: string
    schemaId?: string
  }
  const { workspaceId, schemaId } = params
  const navigate = useNavigate()
  const existing = useSchema(schemaId)
  const createSchema = useCreateSchema()
  const updateSchema = useUpdateSchema()

  const isEditing = Boolean(schemaId)
  const isSubmitting = createSchema.isPending || updateSchema.isPending

  const goToList = () => {
    void navigate({
      to: '/w/$workspaceId/schemas',
      params: { workspaceId },
    })
  }

  const handleSubmit = (values: SchemaFormValues) => {
    const input = toInput(values)
    if (isEditing && schemaId) {
      updateSchema.mutate({ id: schemaId, input }, { onSuccess: goToList })
    } else {
      createSchema.mutate({ workspaceId, ...input }, { onSuccess: goToList })
    }
  }

  if (isEditing && existing.isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[32rem] rounded-lg" />
      </PageContainer>
    )
  }

  if (isEditing && !existing.isLoading && !existing.data) {
    return (
      <PageContainer>
        <PageHeader
          title="Schema not found"
          description="This schema may have been deleted."
          actions={
            <Button type="button" onClick={goToList}>
              Back to schemas
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const defaultValues =
    isEditing && existing.data
      ? toFormValues(existing.data)
      : emptySchemaFormValues()

  return (
    <PageContainer>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={goToList}
      >
        <ArrowLeft aria-hidden="true" />
        Back to schemas
      </Button>

      <PageHeader
        title={isEditing ? 'Edit schema' : 'New schema'}
        description={
          isEditing
            ? 'Update the schema using the outline and detail panes, or switch to Raw JSON. The preview updates live.'
            : 'Name your schema, then add fields from the outline. Switch to Raw JSON any time.'
        }
      />

      <SchemaStudio
        key={schemaId ?? 'new'}
        defaultValues={defaultValues}
        submitLabel={isEditing ? 'Save changes' : 'Create schema'}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={goToList}
      />
    </PageContainer>
  )
}
