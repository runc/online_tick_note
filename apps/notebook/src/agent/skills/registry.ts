import { z } from 'zod'
import type { I18nKey } from '@/i18n'
import { AGENT_TOOL_NAMES } from './types'
import { BUILTIN_SKILLS, DEFAULT_SKILL_ID } from './builtin'
import type {
  BuiltinSkillTemplate,
  CustomSkill,
  CustomSkillFile,
  ResolvedSkill,
  SkillTemplate,
} from './types'
import {
  deleteCustomSkill as dbDeleteCustomSkill,
  loadAllCustomSkills,
  saveCustomSkill,
} from '@/lib/db'

const customSkillFileSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1).max(80),
  description: z.string().max(300).default(''),
  instructions: z.string().min(10).max(8000),
  activeTools: z.array(z.string()).optional(),
  starterPrompts: z.array(z.string()).max(8).optional(),
})

type SkillTranslator = (key: I18nKey) => string

function filterTools(tools?: string[]) {
  if (!tools?.length) return undefined
  const allowed = new Set(AGENT_TOOL_NAMES)
  const filtered = tools.filter((t): t is typeof AGENT_TOOL_NAMES[number] =>
    allowed.has(t as typeof AGENT_TOOL_NAMES[number]),
  )
  return filtered.length > 0 ? filtered : undefined
}

export function resolveBuiltinSkill(skill: BuiltinSkillTemplate, t: SkillTranslator): ResolvedSkill {
  return {
    id: skill.id,
    source: 'builtin',
    name: t(skill.nameKey),
    description: t(skill.descriptionKey),
    instructions: skill.instructions,
    activeTools: skill.activeTools,
    starterPrompts: skill.starterPromptKeys.map((key) => t(key)),
  }
}

export function resolveCustomSkill(skill: CustomSkill): ResolvedSkill {
  return {
    id: skill.id,
    source: 'custom',
    name: skill.name,
    description: skill.description,
    instructions: skill.instructions,
    activeTools: skill.activeTools,
    starterPrompts: skill.starterPrompts,
  }
}

export function getBuiltinSkill(id: string): BuiltinSkillTemplate | undefined {
  return BUILTIN_SKILLS.find((s) => s.id === id)
}

export async function getCustomSkill(id: string): Promise<CustomSkill | undefined> {
  const all = await loadAllCustomSkills()
  return all.find((s) => s.id === id)
}

export async function listCustomSkills(): Promise<CustomSkill[]> {
  return loadAllCustomSkills()
}

export async function listAllSkillTemplates(): Promise<SkillTemplate[]> {
  const custom = await loadAllCustomSkills()
  return [...BUILTIN_SKILLS, ...custom]
}

export async function resolveSkillById(id: string, t: SkillTranslator): Promise<ResolvedSkill | undefined> {
  const builtin = getBuiltinSkill(id)
  if (builtin) return resolveBuiltinSkill(builtin, t)
  const custom = await getCustomSkill(id)
  if (custom) return resolveCustomSkill(custom)
  return undefined
}

export async function resolveSkillOrDefault(id: string | undefined, t: SkillTranslator): Promise<ResolvedSkill> {
  const skillId = id || DEFAULT_SKILL_ID
  const resolved = await resolveSkillById(skillId, t)
  if (resolved) return resolved
  return resolveBuiltinSkill(getBuiltinSkill(DEFAULT_SKILL_ID)!, t)
}

export function parseCustomSkillFile(raw: unknown): CustomSkillFile & { activeTools?: import('./types').AgentToolName[] } {
  const parsed = customSkillFileSchema.parse(raw)
  const builtinIds = new Set(BUILTIN_SKILLS.map((s) => s.id))
  if (builtinIds.has(parsed.id)) {
    throw new Error(`Skill id "${parsed.id}" conflicts with a built-in skill`)
  }
  return {
    ...parsed,
    activeTools: filterTools(parsed.activeTools),
    starterPrompts: parsed.starterPrompts ?? [],
  }
}

export async function importCustomSkillFromFile(raw: unknown): Promise<CustomSkill> {
  const file = parseCustomSkillFile(raw)
  const now = Date.now()
  const skill: CustomSkill = {
    id: file.id,
    source: 'custom',
    name: file.name,
    description: file.description,
    instructions: file.instructions,
    activeTools: file.activeTools as CustomSkill['activeTools'],
    starterPrompts: file.starterPrompts ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await saveCustomSkill(skill)
  return skill
}

export async function removeCustomSkill(id: string): Promise<void> {
  await dbDeleteCustomSkill(id)
}

export function exportCustomSkillJson(skill: CustomSkill): string {
  const payload: CustomSkillFile = {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    instructions: skill.instructions,
    activeTools: skill.activeTools,
    starterPrompts: skill.starterPrompts,
  }
  return JSON.stringify(payload, null, 2)
}

export { DEFAULT_SKILL_ID, BUILTIN_SKILLS }
