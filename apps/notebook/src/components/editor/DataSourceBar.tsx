import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Loader2, Upload, XCircle } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { useSymbolList, useApiStatus } from '@/hooks/useDataset'
import { useTranslation } from '@/i18n'
import { useSettingsStore } from '@/stores/settings-store'
import {
  getDefaultSymbol,
  getEnabledDataSources,
  getTimeframesForSource,
  groupSymbolsBySource,
  sourceShortLabelKey,
} from '@/lib/data-sources'
import { cn } from '@/lib/utils'
import type { DataSourceKind, SymbolInfo } from '@/types'

interface DataSourceBarProps {
  dataSource: DataSourceKind
  symbol: string
  timeframe: string
  dataLoading: boolean
  dataError: string | null
  barCount?: number
  onDataSourceChange: (source: DataSourceKind) => void
  onSymbolChange: (symbol: string, timeframe: string) => void
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function uniqueSymbols(list: SymbolInfo[]): { symbol: string; name: string }[] {
  const seen = new Set<string>()
  const out: { symbol: string; name: string }[] = []
  for (const item of list) {
    if (seen.has(item.symbol)) continue
    seen.add(item.symbol)
    out.push({ symbol: item.symbol, name: item.name })
  }
  return out
}

export function DataSourceBar({
  dataSource,
  symbol,
  timeframe,
  dataLoading,
  dataError,
  barCount,
  onDataSourceChange,
  onSymbolChange,
  onCsvUpload,
}: DataSourceBarProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const easyTdxEnabled = useSettingsStore((s) => s.easyTdxEnabled)
  const builtinSamplesEnabled = useSettingsStore((s) => s.builtinSamplesEnabled)
  const { data: apiOnline } = useApiStatus()
  const { data: symbols } = useSymbolList(dataSource)

  const enabledSources = useMemo(
    () => getEnabledDataSources(),
    [easyTdxEnabled, builtinSamplesEnabled],
  )
  const timeframes = getTimeframesForSource(dataSource)
  const currentList = groupSymbolsBySource(symbols ?? []).get(dataSource) ?? []

  const apiSymbols = useMemo(() => {
    const opts = uniqueSymbols(currentList)
    if (symbol && !opts.some((o) => o.symbol === symbol)) {
      return [{ symbol, name: symbol }, ...opts]
    }
    return opts
  }, [currentList, symbol])

  const builtinSelectValue = currentList.some((s) => s.symbol === symbol && s.timeframe === timeframe)
    ? `${symbol}:${timeframe}`
    : ''

  const handleSourceChange = (next: DataSourceKind) => {
    const nextSymbol = getDefaultSymbol(next) || symbol
    const nextTf = getTimeframesForSource(next)[0] ?? '1d'
    onDataSourceChange(next)
    onSymbolChange(nextSymbol, nextTf)
    void queryClient.invalidateQueries({ queryKey: ['symbols'] })
  }

  return (
    <div
      className={cn(
        'flex h-8 max-w-full shrink-0 items-center gap-1.5 overflow-hidden',
        'rounded-md border bg-muted/40 px-1.5',
        dataError ? 'border-destructive/40' : 'border-border',
      )}
    >
        <Select
          compact
          value={dataSource}
          onChange={(e) => handleSourceChange(e.target.value as DataSourceKind)}
          className="w-[4.25rem] shrink-0 border-0 bg-transparent shadow-none focus-visible:ring-0"
          title={t('dataSource.label')}
          aria-label={t('dataSource.label')}
        >
          {enabledSources.map((src) => (
            <option key={src} value={src}>{t(sourceShortLabelKey(src))}</option>
          ))}
        </Select>

        <span className="h-4 w-px shrink-0 bg-border" aria-hidden />

        {dataSource === 'api' && (
          <>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium leading-none',
                apiOnline === undefined && 'text-muted-foreground',
                apiOnline === true && 'text-emerald-600 dark:text-emerald-400',
                apiOnline === false && 'text-destructive',
              )}
              title={t('dataSource.apiStatus')}
            >
              {apiOnline === undefined && <Loader2 className="h-3 w-3 animate-spin" />}
              {apiOnline === true && <CheckCircle2 className="h-3 w-3" />}
              {apiOnline === false && <XCircle className="h-3 w-3" />}
            </span>

            <Select
              compact
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value, timeframe)}
              className="min-w-[5.5rem] max-w-[9rem] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label={t('dataSource.pickSymbol')}
            >
              {apiSymbols.length === 0 ? (
                <option value={symbol || ''}>{symbol || t('dataSource.pickSymbol')}</option>
              ) : (
                apiSymbols.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.name}
                  </option>
                ))
              )}
            </Select>

            <Select
              compact
              value={timeframe}
              onChange={(e) => onSymbolChange(symbol, e.target.value)}
              className="w-[3.25rem] shrink-0 border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="Timeframe"
            >
              {timeframes.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </Select>
          </>
        )}

        {dataSource === 'builtin' && (
          <Select
            compact
            value={builtinSelectValue}
            onChange={(e) => {
              const [s, tf] = e.target.value.split(':')
              if (s && tf) onSymbolChange(s, tf)
            }}
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            aria-label={t('dataSource.pickSymbol')}
          >
            {currentList.length === 0 ? (
              <option value="">{t('dataSource.pickSymbol')}</option>
            ) : (
              <>
                {!builtinSelectValue && (
                  <option value="" disabled>{t('dataSource.pickSymbol')}</option>
                )}
                {currentList.map((s) => (
                <option key={`${s.symbol}:${s.timeframe}`} value={`${s.symbol}:${s.timeframe}`}>
                  {s.symbol} · {s.timeframe}
                </option>
                ))}
              </>
            )}
          </Select>
        )}

        {dataSource === 'csv' && (
          <label className="flex min-w-0 flex-1 cursor-pointer items-center">
            <input type="file" accept=".csv" className="hidden" onChange={onCsvUpload} />
            <span className="inline-flex h-7 min-w-0 flex-1 items-center gap-1 truncate px-1 text-xs hover:text-foreground">
              <Upload className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {symbol ? `${symbol} (${timeframe})` : t('dataSource.uploadCsv')}
              </span>
            </span>
          </label>
        )}

        {!dataLoading && barCount != null && (
          <>
            <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
              {barCount} {t('editor.bars')}
            </span>
          </>
        )}

        {dataLoading && (
          <>
            <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('editor.loadingData')}
            </span>
          </>
        )}

        {dataError && (
          <>
            <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <span
              className="inline-flex shrink-0 items-center text-destructive"
              title={dataError}
              aria-label={dataError}
            >
              <AlertCircle className="h-3.5 w-3.5" />
            </span>
          </>
        )}
    </div>
  )
}
