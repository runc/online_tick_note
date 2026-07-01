import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { AgentLLMConfig } from './types'
import { isOpenAICompatibleProvider, resolveProviderBaseURL } from './providers'

export function resolveModel(config: AgentLLMConfig) {
  if (!config.apiKey.trim()) {
    throw new Error('LLM API Key is not configured. Open Settings to add your key.')
  }

  switch (config.provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: config.apiKey })
      return anthropic(config.model)
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey })
      return google(config.model)
    }
    case 'openai':
    case 'deepseek':
    case 'openrouter':
    case 'custom': {
      if (!isOpenAICompatibleProvider(config.provider)) {
        throw new Error(`Unsupported provider: ${config.provider}`)
      }
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: resolveProviderBaseURL(config),
      })
      return openai.chat(config.model)
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider satisfies never}`)
  }
}
