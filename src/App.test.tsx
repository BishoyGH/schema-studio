import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createIndexedDbStorage,
  setStorage,
  type StorageAdapter,
} from '@/lib/storage'
import { renderApp } from '@/test/render-app'

describe('App', () => {
  let dbName: string
  const storages: StorageAdapter[] = []

  beforeEach(() => {
    dbName = `schema-studio-app-test-${crypto.randomUUID()}`
    const storage = createIndexedDbStorage({ name: dbName })
    storages.push(storage)
    setStorage(storage)
  })

  afterEach(async () => {
    await Promise.all(storages.map((storage) => storage.destroy()))
    storages.length = 0
  })

  it('renders the app shell brand', async () => {
    renderApp()

    expect(await screen.findByText('Schema Studio')).toBeInTheDocument()
  })

  it('offers a way to create a schema once a workspace is ready', async () => {
    renderApp()

    expect(
      (await screen.findAllByRole('link', { name: /new schema/i })).length,
    ).toBeGreaterThan(0)
  })
})
