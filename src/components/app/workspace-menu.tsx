import { useNavigate, useParams } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActiveWorkspace, useDeleteWorkspace } from '@/lib/workspaces/queries'
import { DEFAULT_WORKSPACE_ID, type WorkspaceEntity } from '@/lib/storage'

function WorkspaceDot({ color }: { color?: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-3 shrink-0 rounded-full border"
      style={{ backgroundColor: color ?? 'var(--muted-foreground)' }}
    />
  )
}

/**
 * The tenant/workspace switcher in the top bar. Selecting a workspace navigates
 * to that workspace's dashboard; create/rename open dedicated pages (F-52);
 * delete stays a confirmation dialog.
 */
export function WorkspaceMenu() {
  const { workspaces, activeWorkspace, setActiveWorkspace } =
    useActiveWorkspace()
  const deleteWorkspace = useDeleteWorkspace()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { workspaceId?: string }

  const currentId = params.workspaceId ?? activeWorkspace?.id
  const current =
    workspaces.find((workspace) => workspace.id === currentId) ??
    activeWorkspace

  const [pendingDelete, setPendingDelete] = useState<WorkspaceEntity | null>(
    null,
  )

  const selectWorkspace = (id: string) => {
    setActiveWorkspace(id)
    void navigate({ to: '/w/$workspaceId', params: { workspaceId: id } })
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const fallback = DEFAULT_WORKSPACE_ID
    deleteWorkspace.mutate(pendingDelete.id, {
      onSuccess: () => {
        setPendingDelete(null)
        setActiveWorkspace(fallback)
        void navigate({
          to: '/w/$workspaceId',
          params: { workspaceId: fallback },
        })
      },
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="max-w-[12rem] justify-between gap-2 sm:max-w-56"
            aria-label={
              current ? `Active workspace: ${current.name}` : 'Active workspace'
            }
            data-testid="workspace-menu"
          >
            <span className="flex min-w-0 items-center gap-2">
              <WorkspaceDot color={current?.color} />
              <span className="truncate">{current?.name ?? 'Select workspace'}</span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => selectWorkspace(workspace.id)}
              className="justify-between"
            >
              <span className="flex min-w-0 items-center gap-2">
                <WorkspaceDot color={workspace.color} />
                <span className="truncate">{workspace.name}</span>
              </span>
              {workspace.id === current?.id && (
                <Check aria-hidden="true" className="size-4" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void navigate({ to: '/workspaces/new' })}
          >
            <Plus aria-hidden="true" className="size-4" />
            New workspace
          </DropdownMenuItem>
          {current && (
            <DropdownMenuItem
              onSelect={() =>
                void navigate({
                  to: '/workspaces/$workspaceId/edit',
                  params: { workspaceId: current.id },
                })
              }
            >
              <Pencil aria-hidden="true" className="size-4" />
              Rename workspace
            </DropdownMenuItem>
          )}
          {current && current.id !== DEFAULT_WORKSPACE_ID && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setPendingDelete(current)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete workspace
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  )
}
