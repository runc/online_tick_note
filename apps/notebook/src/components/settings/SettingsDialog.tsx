import { useEffect, useState, type ReactNode } from 'react'
import {
  Bot, Database, FlaskConical, Languages, Monitor, Moon, Settings, Sparkles, Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { testAgentConnection } from '@/agent/create-agent'
import {
  DEEPSEEK_DEPRECATED_MODELS,
  PROVIDER_DEFAULT_BASE_URLS,
  PROVIDER_MODEL_OPTIONS,
} from '@/agent/providers'
import type { AgentProvider } from '@/agent/types'
import { useApiStatus } from '@/hooks/useDataset'
import { useTranslation } from '@/i18n'
import { getEnabledDataSources, sourceLabelKey } from '@/lib/data-sources'
import { cn } from '@/lib/utils'
import { useSettingsStore, type Theme } from '@/stores/settings-store'
import { SkillsMarketTab } from '@/components/settings/SkillsMarketTab'
import type { DataSourceKind } from '@/types'

type SettingsTab = 'general' | 'data' | 'llm' | 'skills'

const THEME_OPTIONS: {
  value: Theme
  icon: typeof Sun
  labelKey: 'settings.themeDark' | 'settings.themeLight' | 'settings.themeSystem'
}[] = [
  { value: 'dark', icon: Moon, labelKey: 'settings.themeDark' },
  { value: 'light', icon: Sun, labelKey: 'settings.themeLight' },
  { value: 'system', icon: Monitor, labelKey: 'settings.themeSystem' },
]

const AGENT_PROVIDERS: AgentProvider[] = [
  'deepseek', 'openai', 'anthropic', 'google', 'openrouter', 'custom',
]

const TAB_ITEMS: {
  id: SettingsTab
  labelKey: 'settings.tabGeneral' | 'settings.tabData' | 'settings.tabLlm' | 'settings.tabSkills'
  icon: typeof Sun
}[] = [
  { id: 'general', labelKey: 'settings.tabGeneral', icon: Sun },
  { id: 'data', labelKey: 'settings.tabData', icon: Database },
  { id: 'llm', labelKey: 'settings.tabLlm', icon: Bot },
  { id: 'skills', labelKey: 'settings.tabSkills', icon: Sparkles },
]

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-sm font-medium text-foreground', className)}>{children}</div>
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<SettingsTab>('general')

  useEffect(() => {
    if (!open) setTab('general')
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('settings.title')}
      className="h-[min(640px,85vh)] max-w-2xl"
      bodyClassName="flex min-h-0 flex-1"
    >
      <div className="flex h-full min-h-0 w-full">
        <nav className="flex w-36 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/30 p-2">
          {TAB_ITEMS.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                tab === id
                  ? 'bg-background font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === 'general' && <GeneralTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'llm' && <LLMTab />}
          {tab === 'skills' && <SkillsMarketTab />}
        </div>
      </div>
    </Dialog>
  )
}

export function SettingsButton({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-muted-foreground',
            collapsed ? 'justify-center px-0' : 'justify-start gap-2',
          )}
          onClick={() => setOpen(true)}
          title={t('settings.open')}
          aria-label={t('settings.open')}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && t('settings.open')}
        </Button>
      </div>
      <SettingsDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function GeneralTab() {
  const { theme, locale, setTheme, setLocale } = useSettingsStore()
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <FieldLabel>{t('settings.theme')}</FieldLabel>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <Button
              key={value}
              variant={theme === value ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => setTheme(value)}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <FieldLabel className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          {t('settings.language')}
        </FieldLabel>
        <Select
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
          className="h-9"
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </Select>
      </section>
    </div>
  )
}

function DataTab() {
  const {
    easyTdxEnabled, easyTdxBaseUrl, builtinSamplesEnabled, defaultDataSource,
    setEasyTdxEnabled, setEasyTdxBaseUrl, setBuiltinSamplesEnabled, setDefaultDataSource,
  } = useSettingsStore()
  const { t } = useTranslation()
  const { data: apiOnline } = useApiStatus()
  const enabledSources = getEnabledDataSources()

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <FieldLabel className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            {t('settings.easyTdx')}
          </FieldLabel>
          <label className="flex items-center gap-2 text-sm">
            {easyTdxEnabled && (
              <span className={cn(
                'rounded px-1.5 py-0.5 text-xs',
                apiOnline ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground',
              )}>
                {apiOnline ? t('dataSource.online') : t('dataSource.offline')}
              </span>
            )}
            <input
              type="checkbox"
              checked={easyTdxEnabled}
              onChange={(e) => setEasyTdxEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
          </label>
        </div>
        <Input
          value={easyTdxBaseUrl}
          onChange={(e) => setEasyTdxBaseUrl(e.target.value)}
          placeholder={t('settings.easyTdxUrlPlaceholder')}
          disabled={!easyTdxEnabled}
          className="font-mono text-sm"
        />
        <FieldHint>{t('settings.easyTdxHint')}</FieldHint>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <FieldLabel className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            {t('settings.builtinSamples')}
          </FieldLabel>
          <input
            type="checkbox"
            checked={builtinSamplesEnabled}
            onChange={(e) => setBuiltinSamplesEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
        </div>
        <FieldHint>{t('settings.builtinSamplesHint')}</FieldHint>
      </section>

      <section className="space-y-3">
        <FieldLabel>{t('settings.defaultDataSource')}</FieldLabel>
        <Select
          value={defaultDataSource}
          onChange={(e) => setDefaultDataSource(e.target.value as DataSourceKind)}
          className="h-9"
        >
          {enabledSources.map((src) => (
            <option key={src} value={src}>{t(sourceLabelKey(src))}</option>
          ))}
        </Select>
      </section>
    </div>
  )
}

function LLMTab() {
  const {
    agentProvider, agentModel, agentApiKey, agentBaseURL,
    setAgentProvider, setAgentModel, setAgentApiKey, setAgentBaseURL,
    getAgentLLMConfig,
  } = useSettingsStore()
  const { t } = useTranslation()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const modelOptions = PROVIDER_MODEL_OPTIONS[agentProvider]
  const defaultBaseURL = PROVIDER_DEFAULT_BASE_URLS[agentProvider]

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestError(null)
    const result = await testAgentConnection(getAgentLLMConfig())
    if (result.ok) {
      setTestStatus('ok')
    } else {
      setTestStatus('fail')
      setTestError(result.error ?? null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <FieldLabel>{t('settings.llmProvider')}</FieldLabel>
        <Select
          value={agentProvider}
          onChange={(e) => setAgentProvider(e.target.value as AgentProvider)}
          className="h-9"
        >
          {AGENT_PROVIDERS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </section>

      <section className="space-y-2">
        <FieldLabel>{t('settings.llmModel')}</FieldLabel>
        {modelOptions.length > 0 ? (
          <Select
            value={agentModel}
            onChange={(e) => setAgentModel(e.target.value)}
            className="h-9 font-mono text-sm"
          >
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
                {agentProvider === 'deepseek' && DEEPSEEK_DEPRECATED_MODELS.has(m)
                  ? ` (${t('settings.llmModelDeprecated')})`
                  : ''}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            value={agentModel}
            onChange={(e) => setAgentModel(e.target.value)}
            className="font-mono text-sm"
          />
        )}
      </section>

      <section className="space-y-2">
        <FieldLabel>{t('settings.llmApiKey')}</FieldLabel>
        <Input
          type="password"
          value={agentApiKey}
          onChange={(e) => setAgentApiKey(e.target.value)}
          className="font-mono text-sm"
          autoComplete="off"
        />
        <FieldHint>{t('settings.llmApiKeyHint')}</FieldHint>
      </section>

      <section className="space-y-2">
        <FieldLabel>{t('settings.llmBaseURL')}</FieldLabel>
        <Input
          value={agentBaseURL}
          onChange={(e) => setAgentBaseURL(e.target.value)}
          placeholder={defaultBaseURL ?? 'https://...'}
          className="font-mono text-sm"
        />
        <FieldHint>{t('settings.llmBaseURLHint')}</FieldHint>
      </section>

      <Button
        variant="outline"
        size="sm"
        disabled={!agentApiKey.trim() || testStatus === 'testing'}
        onClick={() => void handleTestConnection()}
      >
        {testStatus === 'testing' ? t('settings.llmTesting') : t('settings.llmTest')}
      </Button>
      {testStatus === 'ok' && (
        <p className="text-xs text-emerald-600">{t('settings.llmTestOk')}</p>
      )}
      {testStatus === 'fail' && (
        <p className="text-xs text-destructive">
          {t('settings.llmTestFail')}{testError ? `: ${testError}` : ''}
        </p>
      )}
    </div>
  )
}
