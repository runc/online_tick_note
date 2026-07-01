import { create } from 'zustand'
import { detectLocale } from '@/i18n/detect'
import { invalidateEasyTdxListCache } from '@/lib/easy-tdx-datasource'
import {
  getDefaultAgentLLMConfig,
  PROVIDER_DEFAULT_MODELS,
} from '@/agent/providers'
import { DEFAULT_SKILL_ID } from '@/agent/skills/registry'
import type { AgentLLMConfig, AgentProvider } from '@/agent/types'
import type { DataSourceKind } from '@/types'

export type Theme = 'dark' | 'light' | 'system'
export type Locale = 'en' | 'zh'

const STORAGE_KEY = 'tick-note-settings'

export interface EasyTdxConfig {
  enabled: boolean
  baseUrl: string
}

interface StoredSettings {
  theme?: Theme
  locale?: Locale
  easyTdx?: EasyTdxConfig
  builtinSamplesEnabled?: boolean
  defaultDataSource?: DataSourceKind
  agent?: AgentLLMConfig & { defaultSkillId?: string }
}

interface SettingsState {
  theme: Theme
  locale: Locale
  resolvedTheme: 'dark' | 'light'
  easyTdxEnabled: boolean
  easyTdxBaseUrl: string
  builtinSamplesEnabled: boolean
  defaultDataSource: DataSourceKind
  agentProvider: AgentProvider
  agentModel: string
  agentApiKey: string
  agentBaseURL: string
  defaultAgentSkillId: string
  setTheme: (theme: Theme) => void
  setLocale: (locale: Locale) => void
  setEasyTdxEnabled: (enabled: boolean) => void
  setEasyTdxBaseUrl: (baseUrl: string) => void
  setBuiltinSamplesEnabled: (enabled: boolean) => void
  setDefaultDataSource: (source: DataSourceKind) => void
  setAgentProvider: (provider: AgentProvider) => void
  setAgentModel: (model: string) => void
  setAgentApiKey: (apiKey: string) => void
  setAgentBaseURL: (baseURL: string) => void
  setDefaultAgentSkillId: (skillId: string) => void
  getAgentLLMConfig: () => AgentLLMConfig
  toggleTheme: () => void
  toggleLocale: () => void
}

const DEFAULT_EASY_TDX_BASE_URL = ''

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

function persist(state: Pick<
  SettingsState,
  | 'theme' | 'locale' | 'easyTdxEnabled' | 'easyTdxBaseUrl' | 'builtinSamplesEnabled' | 'defaultDataSource'
  | 'agentProvider' | 'agentModel' | 'agentApiKey' | 'agentBaseURL' | 'defaultAgentSkillId'
>) {
  const payload: StoredSettings = {
    theme: state.theme,
    locale: state.locale,
    easyTdx: {
      enabled: state.easyTdxEnabled,
      baseUrl: state.easyTdxBaseUrl,
    },
    builtinSamplesEnabled: state.builtinSamplesEnabled,
    defaultDataSource: state.defaultDataSource,
    agent: {
      provider: state.agentProvider,
      model: state.agentModel,
      apiKey: state.agentApiKey,
      baseURL: state.agentBaseURL,
      defaultSkillId: state.defaultAgentSkillId,
    },
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function loadStored(): StoredSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSettings
  } catch {
    return null
  }
}

export function getEasyTdxConfig(): EasyTdxConfig {
  const { easyTdxEnabled, easyTdxBaseUrl } = useSettingsStore.getState()
  return { enabled: easyTdxEnabled, baseUrl: easyTdxBaseUrl }
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const defaultAgent = getDefaultAgentLLMConfig()
  return {
  theme: 'dark',
  locale: detectLocale(),
  resolvedTheme: 'dark',
  easyTdxEnabled: true,
  easyTdxBaseUrl: DEFAULT_EASY_TDX_BASE_URL,
  builtinSamplesEnabled: false,
  defaultDataSource: 'api',
  agentProvider: defaultAgent.provider,
  agentModel: defaultAgent.model,
  agentApiKey: defaultAgent.apiKey,
  agentBaseURL: defaultAgent.baseURL,
  defaultAgentSkillId: DEFAULT_SKILL_ID,

  getAgentLLMConfig: () => ({
    provider: get().agentProvider,
    model: get().agentModel,
    apiKey: get().agentApiKey,
    baseURL: get().agentBaseURL,
  }),

  setAgentProvider: (agentProvider) => {
    const agentModel = PROVIDER_DEFAULT_MODELS[agentProvider]
    set({ agentProvider, agentModel })
    persist({ ...get(), agentProvider, agentModel })
  },

  setAgentModel: (agentModel) => {
    set({ agentModel })
    persist({ ...get(), agentModel })
  },

  setAgentApiKey: (agentApiKey) => {
    set({ agentApiKey })
    persist({ ...get(), agentApiKey })
  },

  setAgentBaseURL: (agentBaseURL) => {
    set({ agentBaseURL })
    persist({ ...get(), agentBaseURL })
  },

  setDefaultAgentSkillId: (defaultAgentSkillId) => {
    set({ defaultAgentSkillId })
    persist({ ...get(), defaultAgentSkillId })
  },

  setTheme: (theme) => {
    const resolved = resolveTheme(theme)
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })
    persist({ ...get(), theme })
  },

  setLocale: (locale) => {
    set({ locale })
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    persist({ ...get(), locale })
  },

  setEasyTdxEnabled: (easyTdxEnabled) => {
    set({ easyTdxEnabled })
    persist({ ...get(), easyTdxEnabled })
    invalidateEasyTdxListCache()
  },

  setEasyTdxBaseUrl: (easyTdxBaseUrl) => {
    set({ easyTdxBaseUrl })
    persist({ ...get(), easyTdxBaseUrl })
    invalidateEasyTdxListCache()
  },

  setBuiltinSamplesEnabled: (builtinSamplesEnabled) => {
    set({ builtinSamplesEnabled })
    persist({ ...get(), builtinSamplesEnabled })
  },

  setDefaultDataSource: (defaultDataSource) => {
    set({ defaultDataSource })
    persist({ ...get(), defaultDataSource })
  },

  toggleTheme: () => {
    const { resolvedTheme } = get()
    get().setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  },

  toggleLocale: () => {
    const next = get().locale === 'en' ? 'zh' : 'en'
    get().setLocale(next)
  },
}})

export function initSettings() {
  const stored = loadStored()
  const theme: Theme = stored?.theme ?? 'dark'
  const locale: Locale = stored?.locale ?? detectLocale()
  const resolved = resolveTheme(theme)
  const easyTdxEnabled = stored?.easyTdx?.enabled ?? true
  const easyTdxBaseUrl = stored?.easyTdx?.baseUrl ?? DEFAULT_EASY_TDX_BASE_URL
  const builtinSamplesEnabled = stored?.builtinSamplesEnabled ?? false
  const defaultDataSource: DataSourceKind = stored?.defaultDataSource ?? 'api'
  const agentDefaults = getDefaultAgentLLMConfig()
  const storedAgent = stored?.agent

  applyTheme(resolved)
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  useSettingsStore.setState({
    theme,
    locale,
    resolvedTheme: resolved,
    easyTdxEnabled,
    easyTdxBaseUrl,
    builtinSamplesEnabled,
    defaultDataSource,
    agentProvider: storedAgent?.provider ?? agentDefaults.provider,
    agentModel: storedAgent?.model ?? agentDefaults.model,
    agentApiKey: storedAgent?.apiKey ?? agentDefaults.apiKey,
    agentBaseURL: storedAgent?.baseURL ?? agentDefaults.baseURL,
    defaultAgentSkillId: storedAgent?.defaultSkillId ?? DEFAULT_SKILL_ID,
  })

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme: current } = useSettingsStore.getState()
    if (current === 'system') {
      const resolved = getSystemTheme()
      applyTheme(resolved)
      useSettingsStore.setState({ resolvedTheme: resolved })
    }
  })
}
