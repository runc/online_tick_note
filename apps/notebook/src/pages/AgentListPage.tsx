import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAgentStore } from '@/stores/agent-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTranslation } from '@/i18n'
import { APP_HEADER_BAR } from '@/lib/utils'

export function AgentListPage() {
  const { sessions, loadSessions, createSession, deleteSession } = useAgentStore()
  const agentApiKey = useSettingsStore((s) => s.agentApiKey)
  const navigate = useNavigate()
  const { t, locale } = useTranslation()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleNew = () => {
    const session = createSession()
    navigate({ to: '/agent/$id', params: { id: session.id } })
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')

  return (
    <div className="flex h-full flex-col">
      <div className={APP_HEADER_BAR}>
        <h1 className="text-sm font-semibold">{t('agent.title')}</h1>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-muted-foreground">{t('agent.subtitle')}</p>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" /> {t('agent.newConversation')}
          </Button>
        </div>

        {!agentApiKey.trim() && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            {t('agent.noApiKey')} {t('agent.noApiKeyHint')}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <Bot className="h-16 w-16 opacity-30" />
            <p>{t('agent.empty')}</p>
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" /> {t('agent.newConversation')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="group cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => navigate({ to: '/agent/$id', params: { id: session.id } })}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bot className="h-4 w-4 text-primary" />
                    {session.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {session.messages.length} {t('agent.messages')}
                    {session.symbol ? ` · ${session.symbol}` : ''}
                  </span>
                  <span>{formatDate(session.updatedAt)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteSession(session.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
