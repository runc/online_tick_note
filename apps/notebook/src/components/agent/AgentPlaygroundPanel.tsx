import type { CSSProperties } from 'react'
import { PanelRightClose, PanelRightOpen, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArtifactPanel } from '@/components/agent/ChatMessage'
import type { AgentArtifact } from '@/agent/types'
import { useTranslation } from '@/i18n'
import { APP_HEADER_BAR, cn } from '@/lib/utils'

interface AgentPlaygroundPanelProps {
  artifacts: AgentArtifact[]
  emptyLabel: string
  collapsed: boolean
  onToggleCollapsed: () => void
  panelStyle?: React.CSSProperties
}

export function AgentPlaygroundPanel({
  artifacts,
  emptyLabel,
  collapsed,
  onToggleCollapsed,
  panelStyle,
}: AgentPlaygroundPanelProps) {
  const { t } = useTranslation()

  return (
    <aside
      style={collapsed ? undefined : panelStyle}
      className={cn(
        'hidden shrink-0 flex-col overflow-hidden border-l border-border bg-card transition-[width] duration-200 ease-in-out lg:flex',
        collapsed ? 'w-10' : 'min-w-[280px]',
      )}
    >
      {collapsed ? (
        <div className={cn(APP_HEADER_BAR, 'justify-center px-0')}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggleCollapsed}
            title={t('agent.expandPlayground')}
            aria-label={t('agent.expandPlayground')}
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className={cn(APP_HEADER_BAR, 'gap-2')}>
            <Presentation className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">{t('agent.playground')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 w-8 p-0"
              onClick={onToggleCollapsed}
              title={t('agent.collapsePlayground')}
              aria-label={t('agent.collapsePlayground')}
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <ArtifactPanel artifacts={artifacts} emptyLabel={emptyLabel} />
          </div>
        </>
      )}
    </aside>
  )
}
