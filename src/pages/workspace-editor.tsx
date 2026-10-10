import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/app/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useActiveWorkspace,
  useCreateWorkspace,
  useUpdateWorkspace,
  useWorkspace,
} from '@/lib/workspaces/queries'

const WORKSPACE_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
] as const

/** Full-page workspace create/edit (F-52). */
export function WorkspaceEditorPage() {
  const params = useParams({ strict: false }) as { workspaceId?: string }
  const workspaceId = params.workspaceId
  const isEditing = Boolean(workspaceId)
  const navigate = useNavigate()
  const { setActiveWorkspace } = useActiveWorkspace()
  const existing = useWorkspace(workspaceId)
  const createWorkspace = useCreateWorkspace()
  const updateWorkspace = useUpdateWorkspace()

  const [name, setName] = useState('')
  const [color, setColor] = useState<string | undefined>(undefined)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (existing.data) {
      setName(existing.data.name)
      setColor(existing.data.color)
    }
  }, [existing.data])

  const isSubmitting = createWorkspace.isPending || updateWorkspace.isPending

  const goToWorkspace = (id: string) => {
    void navigate({ to: '/w/$workspaceId', params: { workspaceId: id } })
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Name is required')
      return
    }
    if (trimmed.length > 64) {
      setNameError('Name must be 64 characters or fewer')
      return
    }
    setNameError(null)

    if (isEditing && workspaceId) {
      updateWorkspace.mutate(
        { id: workspaceId, input: { name: trimmed, color } },
        { onSuccess: () => goToWorkspace(workspaceId) },
      )
    } else {
      createWorkspace.mutate(
        { name: trimmed, color },
        {
          onSuccess: (workspace) => {
            setActiveWorkspace(workspace.id)
            goToWorkspace(workspace.id)
          },
        },
      )
    }
  }

  if (isEditing && existing.isLoading) {
    return (
      <PageContainer className="max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </PageContainer>
    )
  }

  if (isEditing && !existing.isLoading && !existing.data) {
    return (
      <PageContainer className="max-w-2xl">
        <PageHeader
          title="Workspace not found"
          description="This workspace may have been deleted."
          actions={
            <Button
              type="button"
              onClick={() => {
                void navigate({ to: '/' })
              }}
            >
              Go home
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="max-w-2xl">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => {
          void navigate({ to: '/' })
        }}
      >
        <ArrowLeft aria-hidden="true" />
        Back
      </Button>

      <PageHeader
        title={isEditing ? 'Rename workspace' : 'New workspace'}
        description="Workspaces group related schemas and records together."
      />

      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-4 sm:px-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              placeholder="e.g. Personal"
              aria-invalid={nameError ? true : undefined}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
            />
            {nameError && (
              <p className="text-destructive text-sm" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {WORKSPACE_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Color ${option}`}
                  aria-pressed={color === option}
                  className={cn(
                    'size-11 rounded-full border-2 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring',
                    color === option && 'ring-2 ring-ring ring-offset-2',
                  )}
                  style={{ backgroundColor: option }}
                  onClick={() => setColor(option)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigate({ to: '/' })
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting
                ? 'Saving…'
                : isEditing
                  ? 'Save changes'
                  : 'Create workspace'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
