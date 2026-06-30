import { useQuery } from '@tanstack/react-query'
import { datasetRegistry } from '@/lib/dataset-registry'
import { barsToDataFrame } from '@/lib/dataframe'

export function useDataset(symbol: string, timeframe: string) {
  return useQuery({
    queryKey: ['dataset', symbol, timeframe],
    queryFn: async () => {
      const dataset = await datasetRegistry.loadDataset(symbol, timeframe)
      return {
        ...dataset,
        df: barsToDataFrame(dataset.bars),
      }
    },
    enabled: !!symbol && !!timeframe,
  })
}

export function useSymbolList() {
  return useQuery({
    queryKey: ['symbols'],
    queryFn: () => datasetRegistry.listAllSymbols(),
  })
}
