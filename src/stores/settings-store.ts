import { create } from 'zustand'
import { detectLocale } from '@/i18n/detect'

export type Theme = 'dark' | 'light' | 'system'
export type Locale = 'en' | 'zh'

const STORAGE_KEY = 'tick-note-settings'

interface SettingsState {
  theme: Theme
  locale: Locale
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  setLocale: (locale: Locale) => void
  toggleTheme: () => void
  toggleLocale: () => void
}

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme
}

export function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(resolved)
}

function persist(theme: Theme, locale: Locale) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, locale }))
}

function loadStored(): { theme: Theme; locale: Locale } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark',
  locale: detectLocale(),
  resolvedTheme: 'dark',

  setTheme: (theme) => {
    const resolved = resolveTheme(theme)
    applyTheme(resolved)
    persist(theme, get().locale)
    set({ theme, resolvedTheme: resolved })
  },

  setLocale: (locale) => {
    persist(get().theme, locale)
    set({ locale })
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  },

  toggleTheme: () => {
    const { resolvedTheme } = get()
    get().setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  },

  toggleLocale: () => {
    const next = get().locale === 'en' ? 'zh' : 'en'
    get().setLocale(next)
  },
}))

export function initSettings() {
  const stored = loadStored()
  const theme: Theme = stored?.theme ?? 'dark'
  const locale: Locale = stored?.locale ?? detectLocale()
  const resolved = resolveTheme(theme)
  applyTheme(resolved)
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  useSettingsStore.setState({ theme, locale, resolvedTheme: resolved })

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme: current } = useSettingsStore.getState()
    if (current === 'system') {
      const resolved = getSystemTheme()
      applyTheme(resolved)
      useSettingsStore.setState({ resolvedTheme: resolved })
    }
  })
}
