import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
} from '@/lib/workspaces/queries'
import { DEFAULT_WORKSPACE_ID, type WorkspaceEntity } from '@/lib/storage'

const WORKSPACE_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
] as const

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceEntity[]
  activeWorkspace: WorkspaceEntity | undefined
  onChange: (id: string) => void
}

type EditorMode = 'create' | 'rename'

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onChange,
}: WorkspaceSwitcherProps) {
  const createWorkspace = useCreateWorkspace()
  const updateWorkspace = useUpdateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const [editorMode, setEditorMode] = useState<EditorMode | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string | undefined>(undefined)
  const [nameError, setNameError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<WorkspaceEntity | null>(null)

  const isDefault = activeWorkspace?.id === DEFAULT_WORKSPACE_ID

  const openCreate = () => {
    setName('')
    setColor(undefined)
    setNameError(null)
    setEditorMode('create')
  }

  const openRename = () => {
    if (!activeWorkspace) return
    setName(activeWorkspace.name)
    setColor(activeWorkspace.color)
    setNameError(null)
    setEditorMode('rename')
  }

  const closeEditor = () => setEditorMode(null)

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

    if (editorMode === 'create') {
      createWorkspace.mutate(
        { name: trimmed, color },
        {
          onSuccess: (workspace) => {
            closeEditor()
            onChange(workspace.id)
          },
        },
      )
    } else if (editorMode === 'rename' && activeWorkspace) {
      updateWorkspace.mutate(
        { id: activeWorkspace.id, input: { name: trimmed, color } },
        { onSuccess: closeEditor },
      )
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteWorkspace.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    })
  }

  const isSubmitting = createWorkspace.isPending || updateWorkspace.isPending

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeWorkspace?.id ?? ''}
        onValueChange={onChange}
        disabled={workspaces.length === 0}
      >
        <SelectTrigger
          aria-label={
            activeWorkspace
              ? `Active workspace: ${activeWorkspace.name}`
              : 'Active workspace'
          }
          className="w-40 sm:w-52"
          data-testid="workspace-switcher"
        >
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="New workspace"
        onClick={openCreate}
      >
        <Plus aria-hidden="true" />
      </Button>

      {activeWorkspace && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Rename workspace"
          onClick={openRename}
        >
          <Pencil aria-hidden="true" />
        </Button>
      )}

      {activeWorkspace && !isDefault && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete workspace"
          onClick={() => setPendingDelete(activeWorkspace)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}

      <Dialog
        open={editorMode !== null}
        onOpenChange={(open) => {
          if (!open) closeEditor()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editorMode === 'create' ? 'New workspace' : 'Rename workspace'}
            </DialogTitle>
            <DialogDescription>
              Workspaces group related schemas and records together.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={name}
                placeholder="e.g. Personal"
                aria-invalid={nameError ? true : undefined}
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
                    className="size-9 rounded-full border-2 data-[selected=true]:ring-2 data-[selected=true]:ring-offset-2"
                    data-selected={color === option}
                    style={{ backgroundColor: option }}
                    onClick={() => setColor(option)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {editorMode === 'create' ? 'Create workspace' : 'Save changes'}
            </Button>
          </div>
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
            <DialogTitle>Delete workspace?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `“${pendingDelete.name}” and all of its schemas and records will be permanently deleted. This cannot be undone.`
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
              disabled={deleteWorkspace.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
