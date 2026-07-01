import { useQuery } from '@tanstack/react-query'
import { datasetRegistry } from '@/lib/dataset-registry'
import { barsToDataFrame } from '@/lib/dataframe'
import { useSettingsStore } from '@/stores/settings-store'
import type { DataSourceKind } from '@/types'

export function useDataset(symbol: string, timeframe: string, dataSource: DataSourceKind) {
  const easyTdxEnabled = useSettingsStore((s) => s.easyTdxEnabled)
  const easyTdxBaseUrl = useSettingsStore((s) => s.easyTdxBaseUrl)
  const builtinSamplesEnabled = useSettingsStore((s) => s.builtinSamplesEnabled)

  return useQuery({
    queryKey: ['dataset', dataSource, symbol, timeframe, easyTdxEnabled, easyTdxBaseUrl, builtinSamplesEnabled],
    queryFn: async () => {
      const dataset = await datasetRegistry.loadDataset(symbol, timeframe, dataSource)
      return {
        ...dataset,
        df: barsToDataFrame(dataset.bars),
      }
    },
    enabled: !!symbol && !!timeframe && (dataSource !== 'csv' || !!symbol),
    retry: dataSource === 'api' ? 1 : 0,
  })
}

export function useSymbolList(source?: DataSourceKind) {
  const easyTdxEnabled = useSettingsStore((s) => s.easyTdxEnabled)
  const easyTdxBaseUrl = useSettingsStore((s) => s.easyTdxBaseUrl)
  const builtinSamplesEnabled = useSettingsStore((s) => s.builtinSamplesEnabled)

  return useQuery({
    queryKey: ['symbols', source, easyTdxEnabled, easyTdxBaseUrl, builtinSamplesEnabled],
    queryFn: () => datasetRegistry.listSymbols(source),
  })
}

export function useApiStatus() {
  const easyTdxEnabled = useSettingsStore((s) => s.easyTdxEnabled)
  const easyTdxBaseUrl = useSettingsStore((s) => s.easyTdxBaseUrl)

  return useQuery({
    queryKey: ['api-status', easyTdxEnabled, easyTdxBaseUrl],
    queryFn: () => datasetRegistry.checkApiAvailable(),
    enabled: easyTdxEnabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}
