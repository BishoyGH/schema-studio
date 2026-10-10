import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import { AppShell } from '@/components/app/app-shell'
import { DashboardPage } from '@/pages/dashboard'
import { NotFoundPage } from '@/pages/not-found'
import { RecordEditorPage } from '@/pages/record-editor'
import { RecordListPage } from '@/pages/record-list'
import { SchemaEditorStudioPage } from '@/pages/schema-editor-studio'
import { SchemaListPage } from '@/pages/schema-list'
import { SettingsPage } from '@/pages/settings'
import { WorkspaceEditorPage } from '@/pages/workspace-editor'
import { getStorage } from '@/lib/storage'
import { resolveActiveWorkspaceId } from '@/lib/workspaces/active'

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const workspaceId = await resolveActiveWorkspaceId()
    throw redirect({ to: '/w/$workspaceId', params: { workspaceId } })
  },
})

/**
 * All workspace-scoped routes hang off this layout. It validates the
 * `$workspaceId` before rendering and falls back to the default workspace when
 * the id is unknown (extends canon STO-10 to the URL).
 */
const workspaceLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/w/$workspaceId',
  beforeLoad: async ({ params }) => {
    const workspace = await getStorage().getWorkspace(params.workspaceId)
    if (!workspace) {
      const fallback = await resolveActiveWorkspaceId()
      if (fallback !== params.workspaceId) {
        throw redirect({
          to: '/w/$workspaceId',
          params: { workspaceId: fallback },
        })
      }
    }
  },
  component: () => <Outlet />,
})

const dashboardRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: '/',
  component: DashboardPage,
})

const schemaListRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'schemas',
  component: SchemaListPage,
})

const schemaCreateRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'schemas/new',
  component: SchemaEditorStudioPage,
})

const schemaEditRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'schemas/$schemaId/edit',
  component: SchemaEditorStudioPage,
})

const recordListRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'schemas/$schemaId/records',
  component: RecordListPage,
})

const recordCreateRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'schemas/$schemaId/records/new',
  component: RecordEditorPage,
})

const recordEditRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'schemas/$schemaId/records/$recordId/edit',
  component: RecordEditorPage,
})

const workspaceCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/new',
  component: WorkspaceEditorPage,
})

const workspaceEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/edit',
  component: WorkspaceEditorPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  workspaceLayoutRoute.addChildren([
    dashboardRoute,
    schemaListRoute,
    schemaCreateRoute,
    schemaEditRoute,
    recordListRoute,
    recordCreateRoute,
    recordEditRoute,
  ]),
  workspaceCreateRoute,
  workspaceEditRoute,
  settingsRoute,
])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
