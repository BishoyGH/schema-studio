import { ACTIVE_WORKSPACE_SETTING } from '@/lib/settings/queries'
import { getStorage } from '@/lib/storage'

/**
 * Resolve the workspace the app should open: the persisted active workspace
 * when it still exists, otherwise the default workspace (created on demand).
 * Used by route guards/redirects that cannot use React hooks.
 */
export async function resolveActiveWorkspaceId(): Promise<string> {
  const storage = getStorage()
  const activeId = await storage.getSetting<string>(ACTIVE_WORKSPACE_SETTING)
  if (activeId) {
    const found = await storage.getWorkspace(activeId)
    if (found) return found.id
  }
  const fallback = await storage.getDefaultWorkspace()
  return fallback.id
}
