import { createIndexedDbStorage } from './indexeddb'
import type { StorageAdapter } from './types'

export * from './types'
export { createIndexedDbStorage, DB_VERSION } from './indexeddb'

let current: StorageAdapter = createIndexedDbStorage()

export function getStorage(): StorageAdapter {
  return current
}

/**
 * Swap the active storage engine (e.g. a mock in tests). The rest of the app
 * must only ever reach storage through `getStorage()`.
 */
export function setStorage(adapter: StorageAdapter): void {
  current = adapter
}
