import { useCallback, useRef, useState } from 'react'
import type { ModelMessage } from 'ai'
import { v4 as uuid } from 'uuid'
import { createTradingAgent } from '@/agent/create-agent'
import { resolveSkillOrDefault } from '@/agent/skills/registry'
import { deriveSessionTitleFromMessage, isDefaultAgentSessionTitle } from '@/agent/utils/session-title'
import { extractPrimarySymbol, extractSymbols } from '@/agent/utils/symbols'
import type { AgentArtifact, AgentMessage, AgentToolCall } from '@/agent/types'
import { createTranslator } from '@/i18n'
import { useAgentStore } from '@/stores/agent-store'
import { useSettingsStore } from '@/stores/settings-store'

export function useAgentChat(sessionId: string) {
  const currentSession = useAgentStore((s) =>
    s.currentSession?.id === sessionId ? s.currentSession : null,
  )
  const updateCurrentSession = useAgentStore((s) => s.updateCurrentSession)
  const saveCurrentSession = useAgentStore((s) => s.saveCurrentSession)
  const getAgentLLMConfig = useSettingsStore((s) => s.getAgentLLMConfig)
  const locale = useSettingsStore((s) => s.locale)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const syncRafRef = useRef<number | null>(null)
  const pendingContentRef = useRef('')

  const sendMessage = useCallback(async (text: string) => {
    const session = useAgentStore.getState().currentSession
    if (!session || session.id !== sessionId || !text.trim()) return

    setStreamError(null)
    setIsStreaming(true)
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const userMessage: AgentMessage = {
      id: uuid(),
      role: 'user',
      content: text.trim(),
      createdAt: Date.now(),
    }

    const assistantId = uuid()
    const assistantMessage: AgentMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      createdAt: Date.now(),
    }

    const pendingArtifacts: AgentArtifact[] = []
    const modelHistory = (session.modelHistory ?? []) as ModelMessage[]
    const nextModelHistory: ModelMessage[] = [
      ...modelHistory,
      { role: 'user', content: text.trim() },
    ]

    const symbols = extractSymbols(text)
    const skillId = session.skillId
    const isFirstMessage = session.messages.length === 0
    const autoTitle = isFirstMessage && isDefaultAgentSessionTitle(session.title, locale)
      ? deriveSessionTitleFromMessage(text.trim())
      : undefined

    updateCurrentSession({
      messages: [...session.messages, userMessage, assistantMessage],
      symbol: extractPrimarySymbol(text) ?? session.symbol,
      symbols: symbols.length > 0 ? symbols : session.symbols,
      ...(autoTitle ? { title: autoTitle } : {}),
    })

    const toolCallsMap = new Map<string, AgentToolCall>()

    const flushAssistant = (content: string) => {
      const liveSession = useAgentStore.getState().currentSession
      if (!liveSession) return
      updateCurrentSession({
        messages: liveSession.messages.map((m) =>
          m.id === assistantId
            ? { ...m, content, toolCalls: Array.from(toolCallsMap.values()) }
            : m,
        ),
      })
    }

    const syncAssistant = (content: string) => {
      pendingContentRef.current = content
      if (syncRafRef.current !== null) return
      syncRafRef.current = requestAnimationFrame(() => {
        syncRafRef.current = null
        flushAssistant(pendingContentRef.current)
      })
    }

    try {
      const t = createTranslator(locale)
      const skill = await resolveSkillOrDefault(skillId, t)

      const agent = createTradingAgent(getAgentLLMConfig(), {
        skill,
        onArtifact: (artifact) => {
          pendingArtifacts.push({
            id: uuid(),
            messageId: assistantId,
            output: artifact.output,
            bars: artifact.bars,
          })
        },
      })

      const result = await agent.stream({
        messages: nextModelHistory,
        abortSignal: abortRef.current.signal,
        onToolExecutionStart: ({ toolCall }) => {
          toolCallsMap.set(toolCall.toolCallId, {
            id: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.input,
            status: 'running',
          })
          syncAssistant(
            useAgentStore.getState().currentSession?.messages.find((m) => m.id === assistantId)?.content ?? '',
          )
        },
        onToolExecutionEnd: ({ toolCall, toolOutput }) => {
          const existing = toolCallsMap.get(toolCall.toolCallId)
          if (existing) {
            if (toolOutput.type === 'tool-error') {
              existing.status = 'error'
              existing.error = String(toolOutput.error)
            } else {
              existing.status = 'done'
              existing.output = toolOutput.output
            }
          }
          syncAssistant(
            useAgentStore.getState().currentSession?.messages.find((m) => m.id === assistantId)?.content ?? '',
          )
        },
      })

      let assistantText = ''
      for await (const chunk of result.textStream) {
        assistantText += chunk
        syncAssistant(assistantText)
      }

      if (syncRafRef.current !== null) {
        cancelAnimationFrame(syncRafRef.current)
        syncRafRef.current = null
      }
      flushAssistant(assistantText)

      const responseMessages = await result.responseMessages
      const liveSession = useAgentStore.getState().currentSession

      updateCurrentSession({
        messages: (liveSession?.messages ?? []).map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: assistantText || m.content,
                toolCalls: Array.from(toolCallsMap.values()),
              }
            : m,
        ),
        artifacts: [...(liveSession?.artifacts ?? []), ...pendingArtifacts],
        modelHistory: [...nextModelHistory, ...responseMessages],
      })
      await saveCurrentSession()
    } catch (e) {
      if (abortRef.current?.signal.aborted) return
      const message = e instanceof Error ? e.message : String(e)
      setStreamError(message)
      if (syncRafRef.current !== null) {
        cancelAnimationFrame(syncRafRef.current)
        syncRafRef.current = null
      }
      flushAssistant(`Error: ${message}`)
      await saveCurrentSession()
    } finally {
      setIsStreaming(false)
    }
  }, [sessionId, getAgentLLMConfig, locale, updateCurrentSession, saveCurrentSession])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  return {
    session: currentSession,
    isStreaming,
    streamError,
    sendMessage,
    stop,
  }
}
