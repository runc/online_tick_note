import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, PanelRightOpen, Pencil, Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgentSkillPicker } from '@/components/agent/AgentSkillPicker'
import { AgentPlaygroundPanel } from '@/components/agent/AgentPlaygroundPanel'
import { ChatMessage } from '@/components/agent/ChatMessage'
import { ResizeHandle } from '@/components/ui/resize-handle'
import { resolveSkillOrDefault } from '@/agent/skills/registry'
import type { ResolvedSkill } from '@/agent/skills/types'
import { useAgentChat } from '@/hooks/useAgentChat'
import { useHorizontalPaneResize } from '@/hooks/useHorizontalPaneResize'
import { useAgentStore } from '@/stores/agent-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTranslation } from '@/i18n'
import { APP_HEADER_BAR, cn } from '@/lib/utils'

const PLAYGROUND_COLLAPSED_KEY = 'tick-note-agent-panel-collapsed'
const PLAYGROUND_WIDTH_KEY = 'tick-note-agent-panel-width'
const DEFAULT_PLAYGROUND_RATIO = 0.42

function readPlaygroundCollapsed(): boolean {
  try {
    return localStorage.getItem(PLAYGROUND_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AgentChatPage() {
  const { id } = useParams({ from: '/agent/$id' })
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { loadSessionById, renameSession, setSessionSkill } = useAgentStore()
  const agentApiKey = useSettingsStore((s) => s.agentApiKey)
  const { session, isStreaming, streamError, sendMessage, stop } = useAgentChat(id)
  const [input, setInput] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [activeSkill, setActiveSkill] = useState<ResolvedSkill | null>(null)
  const [playgroundCollapsed, setPlaygroundCollapsed] = useState(readPlaygroundCollapsed)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const {
    containerRef: splitRef,
    trailingStyle: playgroundStyle,
    isDragging: isResizingPlayground,
    handleProps: playgroundResizeHandleProps,
  } = useHorizontalPaneResize({
    storageKey: PLAYGROUND_WIDTH_KEY,
    defaultRatio: DEFAULT_PLAYGROUND_RATIO,
    minTrailingPx: 280,
    minLeadingPx: 320,
    maxTrailingRatio: 0.65,
    enabled: !playgroundCollapsed,
  })

  const togglePlayground = useCallback(() => {
    setPlaygroundCollapsed((value) => {
      const next = !value
      try {
        localStorage.setItem(PLAYGROUND_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  useEffect(() => {
    loadSessionById(id).then((loaded) => {
      if (!loaded) navigate({ to: '/agent' })
    })
  }, [id, loadSessionById, navigate])

  useEffect(() => {
    if (!session?.skillId) return
    void resolveSkillOrDefault(session.skillId, t).then(setActiveSkill)
  }, [session?.skillId, locale])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const onScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight
      stickToBottomRef.current = distance < 96
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => container.removeEventListener('scroll', onScroll)
  }, [session?.id])

  const lastMessage = session?.messages[session.messages.length - 1]
  const lastMessageContent = lastMessage?.content ?? ''

  useEffect(() => {
    if (!stickToBottomRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth', block: 'end' })
  }, [
    session?.messages.length,
    session?.artifacts.length,
    lastMessageContent,
    isStreaming,
  ])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    await sendMessage(text)
  }

  if (!session) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">{t('agent.loading')}</div>
  }

  const needsApiKey = !agentApiKey.trim()
  const symbolLabel = session.symbols?.length
    ? session.symbols.join(', ')
    : session.symbol

  return (
    <div className="flex h-full flex-col">
      <div className={cn(APP_HEADER_BAR, 'gap-3')}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/agent' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {editingTitle ? (
          <Input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              renameSession(titleDraft)
              setEditingTitle(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                renameSession(titleDraft)
                setEditingTitle(false)
              }
            }}
            className="h-8 max-w-xs text-sm"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
            onClick={() => {
              setTitleDraft(session.title)
              setEditingTitle(true)
            }}
          >
            {session.title}
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <AgentSkillPicker
          value={session.skillId}
          onChange={(skillId) => {
            setSessionSkill(skillId)
            void resolveSkillOrDefault(skillId, t).then(setActiveSkill)
          }}
          disabled={isStreaming}
        />
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {playgroundCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-8 shrink-0 gap-1.5 lg:flex"
              onClick={togglePlayground}
              title={t('agent.expandPlayground')}
              aria-label={t('agent.expandPlayground')}
            >
              <PanelRightOpen className="h-4 w-4" />
              <span className="text-xs">{t('agent.playground')}</span>
            </Button>
          )}
          {symbolLabel && (
            <span className="max-w-[40%] truncate font-mono text-xs text-muted-foreground">
              {symbolLabel}
            </span>
          )}
        </div>
      </div>

      {needsApiKey ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-muted-foreground">{t('agent.noApiKey')}</p>
          <p className="text-xs text-muted-foreground">{t('agent.noApiKeyHint')}</p>
        </div>
      ) : (
        <div ref={splitRef} className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {session.messages.length === 0 && activeSkill && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">{activeSkill.name}</p>
                    <p className="text-xs text-muted-foreground">{activeSkill.description}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('agent.starterHint')}</p>
                  <div className="flex flex-wrap gap-2">
                    {activeSkill.starterPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={isStreaming}
                        onClick={() => void sendMessage(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {session.messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isAnimating={
                    isStreaming
                    && msg.role === 'assistant'
                    && index === session.messages.length - 1
                  }
                />
              ))}
              {streamError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{streamError}</div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('agent.inputPlaceholder')}
                  disabled={isStreaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                />
                {isStreaming ? (
                  <Button variant="outline" onClick={stop}>
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => void handleSend()} disabled={!input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {!playgroundCollapsed && (
            <ResizeHandle active={isResizingPlayground} {...playgroundResizeHandleProps} />
          )}

          <AgentPlaygroundPanel
            artifacts={session.artifacts}
            emptyLabel={t('agent.artifactEmpty')}
            collapsed={playgroundCollapsed}
            onToggleCollapsed={togglePlayground}
            panelStyle={playgroundCollapsed ? undefined : playgroundStyle}
            isResizing={isResizingPlayground}
          />
        </div>
      )}
    </div>
  )
}
