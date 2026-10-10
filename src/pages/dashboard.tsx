import { Link, useParams } from '@tanstack/react-router'
import {
  FileJson2,
  FolderOpen,
  Plus,
  Rows3,
  Table2,
  Upload,
} from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { describeRecordFields } from '@/lib/records/fields'
import { useWorkspaceRecords } from '@/lib/records/queries'
import { useSchemas } from '@/lib/schemas/queries'
import { useWorkspace } from '@/lib/workspaces/queries'
import type { SchemaEntity } from '@/lib/storage'

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

interface StatCardProps {
  label: string
  value: number
  icon: typeof Table2
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center justify-between px-4">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {value.toLocaleString()}
          </span>
        </div>
        <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}

function RecentSchemaRow({
  schema,
  workspaceId,
  recordCount,
}: {
  schema: SchemaEntity
  workspaceId: string
  recordCount: number
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <Link
          to="/w/$workspaceId/schemas/$schemaId/records"
          params={{ workspaceId, schemaId: schema.id }}
          className="truncate font-medium hover:underline"
        >
          {schema.name}
        </Link>
        <span className="text-muted-foreground truncate text-xs">
          Updated {formatUpdatedAt(schema.updatedAt)}
        </span>
      </div>
      <Badge variant="secondary" className="shrink-0">
        {recordCount} {recordCount === 1 ? 'record' : 'records'}
      </Badge>
    </li>
  )
}

export function DashboardPage() {
  const { workspaceId } = useParams({ strict: false }) as {
    workspaceId: string
  }
  const workspace = useWorkspace(workspaceId)
  const schemasQuery = useSchemas(workspaceId)
  const recordsQuery = useWorkspaceRecords(workspaceId)

  const schemas = schemasQuery.data ?? []
  const records = recordsQuery.data ?? []
  const isLoading = schemasQuery.isLoading || recordsQuery.isLoading

  const fieldCount = schemas.reduce(
    (total, schema) => total + describeRecordFields(schema.jsonSchema).length,
    0,
  )

  const countBySchema = new Map<string, number>()
  for (const record of records) {
    countBySchema.set(
      record.schemaId,
      (countBySchema.get(record.schemaId) ?? 0) + 1,
    )
  }

  const recentSchemas = [...schemas]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)

  const workspaceName = workspace.data?.name ?? 'Workspace'

  return (
    <PageContainer>
      <PageHeader
        title={workspaceName}
        description="Overview of the schemas and records in this workspace."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/w/$workspaceId/schemas" params={{ workspaceId }}>
                <Table2 aria-hidden="true" />
                Browse schemas
              </Link>
            </Button>
            <Button asChild>
              <Link to="/w/$workspaceId/schemas/new" params={{ workspaceId }}>
                <Plus aria-hidden="true" />
                New schema
              </Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Schemas" value={schemas.length} icon={Table2} />
          <StatCard label="Records" value={records.length} icon={Rows3} />
          <StatCard label="Fields" value={fieldCount} icon={FileJson2} />
        </div>
      )}

      {!isLoading && schemas.length === 0 && (
        <Card className="items-center py-16 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
              <FolderOpen aria-hidden="true" className="size-6" />
            </span>
            <CardTitle>Start with a schema</CardTitle>
            <CardDescription className="max-w-sm">
              A schema defines the shape of your records and the form used to
              create them. Create one to get going.
            </CardDescription>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link to="/w/$workspaceId/schemas/new" params={{ workspaceId }}>
                  <Plus aria-hidden="true" />
                  New schema
                </Link>
              </Button>
              <Button variant="outline" disabled>
                <Upload aria-hidden="true" />
                Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && recentSchemas.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle>Recent schemas</CardTitle>
            <CardDescription>
              Jump back into the schemas you touched last.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <ul className="flex flex-col gap-2">
              {recentSchemas.map((schema) => (
                <RecentSchemaRow
                  key={schema.id}
                  schema={schema}
                  workspaceId={workspaceId}
                  recordCount={countBySchema.get(schema.id) ?? 0}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
