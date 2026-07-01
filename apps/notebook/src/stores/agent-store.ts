import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { AgentSession } from '@/agent/types'
import {
  deleteAgentSession as dbDelete,
  loadAgentSession,
  loadAllAgentSessions,
  saveAgentSession,
} from '@/lib/db'
import { createTranslator } from '@/i18n'
import { useSettingsStore } from '@/stores/settings-store'
import { DEFAULT_SKILL_ID } from '@/agent/skills/registry'

function newSessionTitle(): string {
  const locale = useSettingsStore.getState().locale
  return createTranslator(locale)('agent.newConversation')
}

function createDefaultSession(): AgentSession {
  const now = Date.now()
  const defaultSkillId = useSettingsStore.getState().defaultAgentSkillId || DEFAULT_SKILL_ID
  return {
    id: uuid(),
    title: newSessionTitle(),
    skillId: defaultSkillId,
    messages: [],
    artifacts: [],
    modelHistory: [],
    createdAt: now,
    updatedAt: now,
  }
}

interface AgentStore {
  sessions: AgentSession[]
  currentSession: AgentSession | null
  isLoading: boolean
  loadSessions: () => Promise<void>
  createSession: () => AgentSession
  setCurrentSession: (session: AgentSession | null) => void
  loadSessionById: (id: string) => Promise<AgentSession | null>
  updateCurrentSession: (updates: Partial<AgentSession>) => void
  saveCurrentSession: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  renameSession: (title: string) => void
  setSessionSkill: (skillId: string) => void
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true })
    const sessions = await loadAllAgentSessions()
    set({ sessions, isLoading: false })
  },

  createSession: () => {
    const session = createDefaultSession()
    set((s) => ({ sessions: [session, ...s.sessions], currentSession: session }))
    void saveAgentSession(session)
    return session
  },

  setCurrentSession: (session) => set({ currentSession: session }),

  loadSessionById: async (id) => {
    const session = await loadAgentSession(id)
    if (session) {
      set((s) => ({
        currentSession: session,
        sessions: s.sessions.some((item) => item.id === session.id)
          ? s.sessions.map((item) => (item.id === session.id ? session : item))
          : [session, ...s.sessions],
      }))
    }
    return session ?? null
  },

  updateCurrentSession: (updates) => {
    const { currentSession } = get()
    if (!currentSession) return
    const next = { ...currentSession, ...updates, updatedAt: Date.now() }
    set({ currentSession: next })

    const listFields = ['title', 'skillId', 'symbol', 'symbols'] as const
    const shouldSyncList = listFields.some((field) => field in updates)
    if (!shouldSyncList) return

    set((s) => ({
      sessions: s.sessions.map((item) =>
        item.id === next.id
          ? {
              ...item,
              title: next.title,
              skillId: next.skillId,
              symbol: next.symbol,
              symbols: next.symbols,
              updatedAt: next.updatedAt,
            }
          : item,
      ),
    }))
  },

  saveCurrentSession: async () => {
    const { currentSession } = get()
    if (!currentSession) return
    await saveAgentSession(currentSession)
    set((s) => ({
      sessions: s.sessions.map((item) => (item.id === currentSession.id ? currentSession : item)),
    }))
  },

  deleteSession: async (id) => {
    await dbDelete(id)
    set((s) => ({
      sessions: s.sessions.filter((item) => item.id !== id),
      currentSession: s.currentSession?.id === id ? null : s.currentSession,
    }))
  },

  renameSession: (title) => {
    get().updateCurrentSession({ title: title.trim() || newSessionTitle() })
    void get().saveCurrentSession()
  },

  setSessionSkill: (skillId) => {
    get().updateCurrentSession({ skillId })
    void get().saveCurrentSession()
  },
}))

if (typeof window !== 'undefined') {
  useAgentStore.getState().loadSessions()
}
