import { ToolLoopAgent, isStepCount } from 'ai'
import { resolveModel } from './resolve-model'
import { SYSTEM_PROMPT } from './system-prompt'
import { createTradingTools } from './tools'
import type { ResolvedSkill } from './skills/types'
import type { AgentArtifact, AgentLLMConfig } from './types'

export function createTradingAgent(
  config: AgentLLMConfig,
  options: {
    skill?: ResolvedSkill
    onArtifact: (artifact: Omit<AgentArtifact, 'id' | 'messageId'>) => void
  },
) {
  const tools = createTradingTools(options.onArtifact)
  const instructions = options.skill
    ? `${SYSTEM_PROMPT}\n\n## Active Skill: ${options.skill.name}\n${options.skill.instructions}`
    : SYSTEM_PROMPT

  return new ToolLoopAgent({
    model: resolveModel(config),
    instructions,
    tools,
    activeTools: options.skill?.activeTools,
    stopWhen: isStepCount(12),
  })
}

export async function testAgentConnection(config: AgentLLMConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const agent = new ToolLoopAgent({
      model: resolveModel(config),
      instructions: 'Reply with exactly: OK',
      tools: {},
      stopWhen: isStepCount(1),
    })
    const result = await agent.generate({ prompt: 'ping' })
    return { ok: Boolean(result.text?.trim()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
