import type { Locale } from '@/stores/settings-store'

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  return navigator.language.startsWith('zh') ? 'zh' : 'en'
}
