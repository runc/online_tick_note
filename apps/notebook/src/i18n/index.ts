import { useMemo } from 'react'
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
  const t = useMemo(() => createTranslator(locale), [locale])
  return { t, locale }
}

const CHART_SERIES_KEYS = [
  'MACD_DIF', 'MACD_DEA', 'MACD_HIST', 'RSI', 'BOLL_UPPER', 'BOLL_MID', 'BOLL_LOWER',
  'BIAS1', 'BIAS2', 'BIAS3', 'PSY', 'PSY_MA', 'TRIX', 'TRIX_MA', 'DPO', 'DPO_MA',
  'MTM', 'MTM_MA', 'ROC', 'ROC_MA', 'EXPMA_12', 'EXPMA_50', 'BBI', 'DFMA_DIF', 'DFMA_DMA',
  'KDJ_K', 'KDJ_D', 'KDJ_J', 'DMI_PDI', 'DMI_MDI', 'DMI_ADX', 'DMI_ADXR', 'ATR', 'WR1', 'WR2',
  'CCI', 'CR', 'KTN_UPPER', 'KTN_MID', 'KTN_LOWER', 'XSII_TD1', 'XSII_TD2', 'XSII_TD3', 'XSII_TD4',
  'OBV', 'VR', 'EMV', 'EMV_MA', 'MASS', 'MASS_MA', 'MFI', 'AR', 'BR', 'ASI', 'ASI_MA',
  'ZY_LONG', 'ZY_MID', 'ZY_SHORT', 'ZY_TREND', 'BS_X', 'BS_SMA', 'BS_LMA',
  'TAQ_UP', 'TAQ_MID', 'TAQ_DOWN', 'SAR', 'VWAP', 'AROON_UP', 'AROON_DOWN', 'AROON_OSC', 'FK',
] as const

/** Map indicator column keys to chart series i18n keys */
export const CHART_SERIES_LABEL_KEYS: Record<string, I18nKey> = Object.fromEntries(
  CHART_SERIES_KEYS.map((key) => [key, `chart.series.${key}` as I18nKey]),
)

export function translateChartSeriesLabel(
  label: string,
  t: ReturnType<typeof createTranslator>,
): string {
  const key = CHART_SERIES_LABEL_KEYS[label]
  return key ? t(key) : label
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
