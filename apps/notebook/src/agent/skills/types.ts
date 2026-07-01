import type { I18nKey } from '@/i18n'

export type AgentToolName =
  | 'fetch_klines'
  | 'get_quote'
  | 'compute_indicators'
  | 'get_finance'
  | 'render_chart'
  | 'render_table'
  | 'board_ranking'
  | 'chanlun_analyze'
  | 'compare_symbols'

export const AGENT_TOOL_NAMES: AgentToolName[] = [
  'fetch_klines',
  'get_quote',
  'compute_indicators',
  'get_finance',
  'render_chart',
  'render_table',
  'board_ranking',
  'chanlun_analyze',
  'compare_symbols',
]

/** Built-in skill template — labels resolved via i18n */
export interface BuiltinSkillTemplate {
  id: string
  source: 'builtin'
  nameKey: I18nKey
  descriptionKey: I18nKey
  instructions: string
  activeTools?: AgentToolName[]
  starterPromptKeys: I18nKey[]
}

/** User-uploaded skill — stored in IndexedDB */
export interface CustomSkill {
  id: string
  source: 'custom'
  name: string
  description: string
  instructions: string
  activeTools?: AgentToolName[]
  starterPrompts: string[]
  createdAt: number
  updatedAt: number
}

export type SkillTemplate = BuiltinSkillTemplate | CustomSkill

/** Resolved skill ready for agent runtime */
export interface ResolvedSkill {
  id: string
  source: 'builtin' | 'custom'
  name: string
  description: string
  instructions: string
  activeTools?: AgentToolName[]
  starterPrompts: string[]
}

export interface CustomSkillFile {
  id: string
  name: string
  description: string
  instructions: string
  activeTools?: string[]
  starterPrompts?: string[]
}
