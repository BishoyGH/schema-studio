import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getStorage, type RecordEntity } from '@/lib/storage'

export const recordKeys = {
  all: ['records'] as const,
  list: (schemaId: string) => ['records', 'list', schemaId] as const,
  detail: (id: string) => ['records', 'detail', id] as const,
  workspace: (workspaceId: string) =>
    ['records', 'workspace', workspaceId] as const,
}

export function useRecords(schemaId: string) {
  return useQuery({
    queryKey: recordKeys.list(schemaId),
    queryFn: () => getStorage().listRecords(schemaId),
    enabled: Boolean(schemaId),
  })
}

/** Every record in a workspace, across all of its schemas (F-08 global index seed). */
export function useWorkspaceRecords(workspaceId: string) {
  return useQuery({
    queryKey: recordKeys.workspace(workspaceId),
    queryFn: () => getStorage().listAllRecords(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useRecord(id: string | undefined) {
  return useQuery({
    queryKey: recordKeys.detail(id ?? ''),
    queryFn: () => getStorage().getRecord(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateRecord(schemaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getStorage().createRecord({ schemaId, data }),
    onSuccess: (record: RecordEntity) => {
      queryClient.invalidateQueries({ queryKey: recordKeys.list(schemaId) })
      queryClient.setQueryData(recordKeys.detail(record.id), record)
    },
  })
}

export function useUpdateRecord(schemaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Record<string, unknown>
    }) => getStorage().updateRecord(id, { data }),
    onSuccess: (record: RecordEntity) => {
      queryClient.invalidateQueries({ queryKey: recordKeys.list(schemaId) })
      queryClient.setQueryData(recordKeys.detail(record.id), record)
    },
  })
}

export function useDeleteRecord(schemaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getStorage().deleteRecord(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: recordKeys.list(schemaId) })
      queryClient.removeQueries({ queryKey: recordKeys.detail(id) })
    },
  })
}
