import { type ReactNode, useCallback, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { BarChart3, BookOpen, Bot, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsButton } from '@/components/settings/SettingsDialog'
import { useNotebookStore } from '@/stores/notebook-store'
import { useAgentStore } from '@/stores/agent-store'
import { useTranslation } from '@/i18n'
import { cn, APP_HEADER_BAR } from '@/lib/utils'

interface AppLayoutProps {
  children: ReactNode
}

const SIDEBAR_COLLAPSED_KEY = 'tick-note-sidebar-collapsed'

function isAgentMode(path: string) {
  return path.startsWith('/agent')
}

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AppLayout({ children }: AppLayoutProps) {
  const { notebooks, createNotebook } = useNotebookStore()
  const sessions = useAgentStore((s) => s.sessions)
  const createSession = useAgentStore((s) => s.createSession)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const agentMode = isAgentMode(currentPath)
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  const handleNewNotebook = () => {
    const nb = createNotebook()
    window.location.href = `/nb/${nb.id}`
  }

  const handleNewAgent = () => {
    const session = createSession()
    window.location.href = `/agent/${session.id}`
  }

  return (
    <div className="flex h-screen">
      <aside
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        <div className={cn(APP_HEADER_BAR, collapsed ? 'justify-center px-2' : 'gap-2')}>
          {collapsed ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleCollapsed}
              title={t('nav.expandSidebar')}
              aria-label={t('nav.expandSidebar')}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
              <span className="truncate font-semibold">{t('app.name')}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 w-8 p-0"
                onClick={toggleCollapsed}
                title={t('nav.collapseSidebar')}
                aria-label={t('nav.collapseSidebar')}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className={cn('p-2', collapsed ? 'flex flex-col gap-1' : 'grid grid-cols-2 gap-1')}>
          <Link
            to="/agent"
            title={t('nav.agent')}
            aria-label={t('nav.agent')}
            className={cn(
              'rounded-md text-xs font-medium hover:bg-accent',
              collapsed ? 'flex justify-center p-2' : 'px-2 py-1.5 text-center',
              agentMode && 'bg-accent text-accent-foreground',
            )}
          >
            <Bot className={cn('h-4 w-4', !collapsed && 'mx-auto mb-0.5')} />
            {!collapsed && t('nav.agent')}
          </Link>
          <Link
            to="/"
            title={t('nav.notebook')}
            aria-label={t('nav.notebook')}
            className={cn(
              'rounded-md text-xs font-medium hover:bg-accent',
              collapsed ? 'flex justify-center p-2' : 'px-2 py-1.5 text-center',
              !agentMode && 'bg-accent text-accent-foreground',
            )}
          >
            <BookOpen className={cn('h-4 w-4', !collapsed && 'mx-auto mb-0.5')} />
            {!collapsed && t('nav.notebook')}
          </Link>
        </div>

        <div className="p-2">
          {agentMode ? (
            <Button
              variant="outline"
              size="sm"
              className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-start gap-2')}
              onClick={handleNewAgent}
              title={t('agent.newConversation')}
              aria-label={t('agent.newConversation')}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!collapsed && t('agent.newConversation')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-start gap-2')}
              onClick={handleNewNotebook}
              title={t('nav.newNotebook')}
              aria-label={t('nav.newNotebook')}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!collapsed && t('nav.newNotebook')}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {agentMode ? (
            <>
              {!collapsed && (
                <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  {t('agent.sessions')}
                </div>
              )}
              {sessions.length === 0 ? (
                !collapsed && (
                  <div className="px-2 text-xs text-muted-foreground">{t('agent.noSessions')}</div>
                )
              ) : (
                sessions.map((session) => (
                  <Link
                    key={session.id}
                    to="/agent/$id"
                    params={{ id: session.id }}
                    title={session.title}
                    aria-label={session.title}
                    className={cn(
                      'flex items-center rounded-md text-sm hover:bg-accent',
                      collapsed ? 'justify-center p-2' : 'gap-2 px-2 py-1.5',
                      currentPath === `/agent/${session.id}` && 'bg-accent',
                    )}
                  >
                    <Bot className="h-3.5 w-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{session.title}</span>}
                  </Link>
                ))
              )}
            </>
          ) : (
            <>
              {!collapsed && (
                <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  {t('nav.notebooks')}
                </div>
              )}
              {notebooks.length === 0 ? (
                !collapsed && (
                  <div className="px-2 text-xs text-muted-foreground">{t('nav.noNotebooks')}</div>
                )
              ) : (
                notebooks.map((nb) => (
                  <Link
                    key={nb.id}
                    to="/nb/$id"
                    params={{ id: nb.id }}
                    title={nb.title}
                    aria-label={nb.title}
                    className={cn(
                      'flex items-center rounded-md text-sm hover:bg-accent',
                      collapsed ? 'justify-center p-2' : 'gap-2 px-2 py-1.5',
                      currentPath === `/nb/${nb.id}` && 'bg-accent',
                    )}
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{nb.title}</span>}
                  </Link>
                ))
              )}
            </>
          )}
        </div>
        <SettingsButton collapsed={collapsed} />
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}

if (typeof window !== 'undefined') {
  useNotebookStore.getState().loadNotebooks()
}
