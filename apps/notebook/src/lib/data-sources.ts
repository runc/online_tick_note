import type { DataSourceKind, SymbolInfo } from '@/types'
import { symbolSupportsEasyTdx } from '@/lib/easy-tdx-datasource'
import { useSettingsStore } from '@/stores/settings-store'

export const API_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '1d', '1w', '1M'] as const
export const BUILTIN_TIMEFRAMES = ['1d', '1h'] as const
export const CSV_TIMEFRAMES = ['1d'] as const

export const DEFAULT_API_SYMBOL = 'SH600519'
export const DEFAULT_BUILTIN_SYMBOL = 'BTCUSDT'
export const DEFAULT_TIMEFRAME = '1d'

export function getEnabledDataSources(): DataSourceKind[] {
  const { easyTdxEnabled, builtinSamplesEnabled } = useSettingsStore.getState()
  const sources: DataSourceKind[] = []
  if (easyTdxEnabled) sources.push('api')
  if (builtinSamplesEnabled) sources.push('builtin')
  sources.push('csv')
  return sources
}

export function getDefaultDataSource(): DataSourceKind {
  const enabled = getEnabledDataSources()
  const { defaultDataSource } = useSettingsStore.getState()
  if (enabled.includes(defaultDataSource)) return defaultDataSource
  return enabled[0] ?? 'api'
}

export function getDefaultSymbol(source: DataSourceKind): string {
  switch (source) {
    case 'api':
      return DEFAULT_API_SYMBOL
    case 'builtin':
      return DEFAULT_BUILTIN_SYMBOL
    case 'csv':
      return ''
  }
}

export function getTimeframesForSource(source: DataSourceKind): readonly string[] {
  switch (source) {
    case 'api':
      return API_TIMEFRAMES
    case 'builtin':
      return BUILTIN_TIMEFRAMES
    case 'csv':
      return CSV_TIMEFRAMES
  }
}

export function resolveNotebookDataSource(
  dataSource: DataSourceKind | undefined,
  symbol: string,
  timeframe: string,
): DataSourceKind {
  if (dataSource) return dataSource
  const { easyTdxEnabled, builtinSamplesEnabled } = useSettingsStore.getState()
  if (easyTdxEnabled && symbolSupportsEasyTdx(symbol, timeframe)) return 'api'
  if (builtinSamplesEnabled) return 'builtin'
  return easyTdxEnabled ? 'api' : 'csv'
}

export function sourceLabelKey(source: DataSourceKind): 'dataSource.api' | 'dataSource.builtin' | 'dataSource.csv' {
  return `dataSource.${source}` as const
}

export function sourceShortLabelKey(source: DataSourceKind): 'dataSource.apiShort' | 'dataSource.builtinShort' | 'dataSource.csvShort' {
  return `dataSource.${source}Short` as const
}

export function groupSymbolsBySource(symbols: SymbolInfo[]): Map<DataSourceKind, SymbolInfo[]> {
  const groups = new Map<DataSourceKind, SymbolInfo[]>()
  for (const s of symbols) {
    const list = groups.get(s.source) ?? []
    list.push(s)
    groups.set(s.source, list)
  }
  return groups
}
