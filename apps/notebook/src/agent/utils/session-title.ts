import type { Locale } from '@/i18n'
import { createTranslator } from '@/i18n'

const DEFAULT_TITLE_MAX = 48

export function deriveSessionTitleFromMessage(text: string, maxLength = DEFAULT_TITLE_MAX): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function isDefaultAgentSessionTitle(title: string, locale?: Locale): boolean {
  const locales: Locale[] = locale ? [locale] : ['zh', 'en']
  return locales.some((loc) => title === createTranslator(loc)('agent.newConversation'))
}
