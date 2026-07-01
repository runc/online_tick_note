import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { AgentChatPage } from '@/pages/AgentChatPage'
import { AgentListPage } from '@/pages/AgentListPage'
import { NotebookListPage } from '@/pages/NotebookListPage'
import { NotebookEditorPage } from '@/pages/NotebookEditorPage'

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: NotebookListPage,
})

const notebookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nb/$id',
  component: NotebookEditorPage,
})

const agentListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent',
  component: AgentListPage,
})

const agentChatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent/$id',
  component: AgentChatPage,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  notebookRoute,
  agentListRoute,
  agentChatRoute,
])
