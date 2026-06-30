import { type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { BarChart3, BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppSettings } from '@/components/layout/AppSettings'
import { useNotebookStore } from '@/stores/notebook-store'
import { useTranslation } from '@/i18n'
import { cn, APP_HEADER_BAR } from '@/lib/utils'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { notebooks, createNotebook } = useNotebookStore()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { t } = useTranslation()

  const handleNew = () => {
    const nb = createNotebook()
    window.location.href = `/nb/${nb.id}`
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        <div className={cn(APP_HEADER_BAR, 'gap-2')}>
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-semibold">{t('app.name')}</span>
        </div>
        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleNew}>
            <Plus className="h-4 w-4" /> {t('nav.newNotebook')}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">{t('nav.notebooks')}</div>
          {notebooks.length === 0 ? (
            <div className="px-2 text-xs text-muted-foreground">{t('nav.noNotebooks')}</div>
          ) : (
            notebooks.map((nb) => (
              <Link
                key={nb.id}
                to="/nb/$id"
                params={{ id: nb.id }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                  currentPath === `/nb/${nb.id}` && 'bg-accent',
                )}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{nb.title}</span>
              </Link>
            ))
          )}
        </div>
        <AppSettings />
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}

if (typeof window !== 'undefined') {
  useNotebookStore.getState().loadNotebooks()
}
