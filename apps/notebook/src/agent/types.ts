import type { CellOutputItem } from '@/types'
import type { I18nKey } from '@/i18n'

export type AgentProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'google'
  | 'openrouter'
  | 'custom'

export interface AgentLLMConfig {
  provider: AgentProvider
  model: string
  apiKey: string
  baseURL: string
}

export interface AgentToolCall {
  id: string
  toolName: string
  input: unknown
  status: 'running' | 'done' | 'error'
  output?: unknown
  error?: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: AgentToolCall[]
  createdAt: number
}

export interface AgentArtifact {
  id: string
  messageId: string
  output: CellOutputItem
  bars?: import('@/types').Bar[]
}

export interface AgentSession {
  id: string
  title: string
  symbol?: string
  symbols?: string[]
  skillId?: string
  messages: AgentMessage[]
  artifacts: AgentArtifact[]
  /** Serialized ModelMessage history for multi-turn tool context */
  modelHistory?: unknown[]
  createdAt: number
  updatedAt: number
}

/** @deprecated Use agent/skills/types ResolvedSkill */
export interface SkillConfig {
  id: string
  nameKey: string
  descriptionKey: string
  instructions: string
  activeTools?: string[]
  starterPromptKeys: I18nKey[]
}

/** Tool results may include UI artifacts — stripped before sending back to LLM. */
export interface ToolResultPayload {
  summary: unknown
  _artifact?: {
    output: CellOutputItem
    bars?: import('@/types').Bar[]
  }
}
