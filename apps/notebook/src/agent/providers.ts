import type { AgentLLMConfig, AgentProvider } from './types'

/** @see https://api-docs.deepseek.com/ */
export const DEEPSEEK_DEPRECATED_MODELS = new Set(['deepseek-chat', 'deepseek-reasoner'])

export const PROVIDER_DEFAULT_MODELS: Record<AgentProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  deepseek: 'deepseek-v4-flash',
  google: 'gemini-2.0-flash',
  openrouter: 'deepseek/deepseek-chat',
  custom: 'gpt-4o',
}

export const PROVIDER_MODEL_OPTIONS: Record<AgentProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
  deepseek: [
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  google: ['gemini-2.0-flash', 'gemini-2.5-pro-preview-03-25'],
  openrouter: ['deepseek/deepseek-chat', 'openai/gpt-4o', 'anthropic/claude-sonnet-4'],
  custom: [],
}

export const PROVIDER_DEFAULT_BASE_URLS: Partial<Record<AgentProvider, string>> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
}

/** Anthropic-compatible endpoint when using @ai-sdk/anthropic with DeepSeek */
export const DEEPSEEK_ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic'

export function getDefaultAgentLLMConfig(): AgentLLMConfig {
  return {
    provider: 'deepseek',
    model: PROVIDER_DEFAULT_MODELS.deepseek,
    apiKey: '',
    baseURL: '',
  }
}

export function resolveProviderBaseURL(config: AgentLLMConfig): string | undefined {
  if (config.baseURL.trim()) return config.baseURL.trim()
  return PROVIDER_DEFAULT_BASE_URLS[config.provider]
}

export function isOpenAICompatibleProvider(provider: AgentProvider): boolean {
  return provider === 'openai'
    || provider === 'deepseek'
    || provider === 'openrouter'
    || provider === 'custom'
}
