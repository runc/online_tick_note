import { useSettingsStore } from '@/stores/settings-store'
import { en, type TranslationKey } from './locales/en'
import { zh } from './locales/zh'

export type Locale = 'en' | 'zh'

const locales: Record<Locale, TranslationKey> = { en, zh }

export function getTranslations(locale: Locale): TranslationKey {
  return locales[locale]
}

type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`
    }[keyof T & string]
  : never

export type I18nKey = NestedKeyOf<TranslationKey>

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : path
}

export function createTranslator(locale: Locale) {
  const dict = getTranslations(locale)
  return (key: I18nKey, params?: Record<string, string | number>) => {
    let text = getNestedValue(dict as unknown as Record<string, unknown>, key)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }
}

export function useTranslation() {
  const locale = useSettingsStore((s) => s.locale)
  const t = createTranslator(locale)
  return { t, locale }
}

/** Map backtest metric English labels to i18n keys */
export const METRIC_LABEL_KEYS: Record<string, I18nKey> = {
  'Total Return': 'metrics.totalReturn',
  'Benchmark Return': 'metrics.benchmarkReturn',
  'Sharpe Ratio': 'metrics.sharpeRatio',
  'Max Drawdown': 'metrics.maxDrawdown',
  'Win Rate': 'metrics.winRate',
  'Profit Factor': 'metrics.profitFactor',
  'Total Trades': 'metrics.totalTrades',
  'Final Value': 'metrics.finalValue',
  'Entry': 'metrics.entry',
  'Exit': 'metrics.exit',
  'Side': 'metrics.side',
  'PnL': 'metrics.pnl',
  'PnL%': 'metrics.pnlPct',
}
