import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStorage } from '@/lib/storage'

export const SCHEMA_EDITOR_TAB_SETTING = 'schemaEditor.defaultTab'
export const ACTIVE_WORKSPACE_SETTING = 'workspace.activeId'

export type SchemaEditorTab = 'builder' | 'raw'

export const settingKeys = {
  all: ['settings'] as const,
  one: (key: string) => ['settings', key] as const,
}

/**
 * Read a single persisted setting. Settings live in the same swappable storage
 * adapter as schemas/records (IndexedDB today) so they stay offline-first.
 */
export function useSetting<T = unknown>(key: string) {
  return useQuery({
    queryKey: settingKeys.one(key),
    // `null` (not `undefined`) distinguishes "not set" from "still loading":
    // TanStack Query rejects `undefined` as query data.
    queryFn: async () => (await getStorage().getSetting<T>(key)) ?? null,
  })
}

export function useSetSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      getStorage().setSetting(key, value),
    onSuccess: (_result, { key, value }) => {
      queryClient.setQueryData(settingKeys.one(key), value)
    },
  })
}

/** The schema editor tab (Builder or Raw JSON) the user last used. */
export function useSchemaEditorTab() {
  return useSetting<SchemaEditorTab>(SCHEMA_EDITOR_TAB_SETTING)
}

export function useSetSchemaEditorTab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tab: SchemaEditorTab) =>
      getStorage().setSetting(SCHEMA_EDITOR_TAB_SETTING, tab),
    onSuccess: (_result, tab) => {
      queryClient.setQueryData(settingKeys.one(SCHEMA_EDITOR_TAB_SETTING), tab)
    },
  })
}

/** The id of the workspace the user is currently working in. */
export function useActiveWorkspaceId() {
  return useSetting<string>(ACTIVE_WORKSPACE_SETTING)
}

export function useSetActiveWorkspaceId() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workspaceId: string) =>
      getStorage().setSetting(ACTIVE_WORKSPACE_SETTING, workspaceId),
    onSuccess: (_result, workspaceId) => {
      queryClient.setQueryData(
        settingKeys.one(ACTIVE_WORKSPACE_SETTING),
        workspaceId,
      )
    },
  })
}
