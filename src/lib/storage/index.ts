import { createIndexedDbStorage } from './indexeddb'
import type { StorageAdapter } from './types'
import { withRecordValidation } from './validated'

export * from './types'
export { createIndexedDbStorage, DB_VERSION } from './indexeddb'
export { withRecordValidation } from './validated'

// Every adapter is wrapped with write-path record validation, so no caller
// (UI or raw import) can persist data that does not match its schema.
let current: StorageAdapter = withRecordValidation(createIndexedDbStorage())

export function getStorage(): StorageAdapter {
  return current
}

/**
 * Swap the active storage engine (e.g. a mock in tests). The rest of the app
 * must only ever reach storage through `getStorage()`.
 */
export function setStorage(adapter: StorageAdapter): void {
  current = withRecordValidation(adapter)
}
