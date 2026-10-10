import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import {
  useActiveWorkspaceId,
  useSetActiveWorkspaceId,
} from '@/lib/settings/queries'
import { getStorage } from '@/lib/storage'
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceEntity,
} from '@/lib/storage'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => ['workspaces', 'list'] as const,
  detail: (id: string) => ['workspaces', 'detail', id] as const,
  default: () => ['workspaces', 'default'] as const,
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => getStorage().listWorkspaces(),
  })
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.detail(id ?? ''),
    queryFn: () => getStorage().getWorkspace(id as string),
    enabled: Boolean(id),
  })
}

/** The default workspace, created on demand if it does not exist yet. */
export function useDefaultWorkspace() {
  return useQuery({
    queryKey: workspaceKeys.default(),
    queryFn: () => getStorage().getDefaultWorkspace(),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) =>
      getStorage().createWorkspace(input),
    onSuccess: (workspace: WorkspaceEntity) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace)
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateWorkspaceInput
    }) => getStorage().updateWorkspace(id, input),
    onSuccess: (workspace: WorkspaceEntity) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace)
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getStorage().deleteWorkspace(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(id) })
    },
  })
}

/**
 * Resolve the workspace the app should be showing right now: the persisted
 * active workspace when it still exists, otherwise the default workspace. Also
 * keeps the persisted selection valid (first run, or after the active workspace
 * was deleted) so a stale id can never leave the app with nothing selected.
 */
export function useActiveWorkspace() {
  const workspacesQuery = useWorkspaces()
  const defaultQuery = useDefaultWorkspace()
  const activeIdQuery = useActiveWorkspaceId()
  const { mutate: setActiveWorkspaceId } = useSetActiveWorkspaceId()

  const workspaces = useMemo(() => workspacesQuery.data ?? [], [
    workspacesQuery.data,
  ])
  const activeId = activeIdQuery.data

  const activeWorkspace = useMemo(() => {
    if (activeId) {
      const found = workspaces.find((workspace) => workspace.id === activeId)
      if (found) return found
    }
    return defaultQuery.data ?? undefined
  }, [activeId, workspaces, defaultQuery.data])

  useEffect(() => {
    if (!activeWorkspace) return
    if (activeId !== activeWorkspace.id) {
      setActiveWorkspaceId(activeWorkspace.id)
    }
  }, [activeWorkspace, activeId, setActiveWorkspaceId])

  return {
    workspaces,
    activeWorkspace,
    isLoading:
      workspacesQuery.isLoading ||
      defaultQuery.isLoading ||
      activeIdQuery.isLoading,
    isError:
      workspacesQuery.isError || defaultQuery.isError || activeIdQuery.isError,
    setActiveWorkspace: setActiveWorkspaceId,
  }
}
