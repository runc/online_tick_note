import type { Bar, DataSource, DataSourceKind, Dataset, SymbolInfo } from '@/types'
import { EasyTdxDataSource } from '@/lib/easy-tdx-datasource'
import { getEasyTdxConfig, useSettingsStore } from '@/stores/settings-store'

const BUILTIN_MANIFEST: SymbolInfo[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', timeframe: '1d', source: 'builtin' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', timeframe: '1d', source: 'builtin' },
  { symbol: 'AAPL', name: 'Apple Inc.', timeframe: '1d', source: 'builtin' },
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', timeframe: '1h', source: 'builtin' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', timeframe: '1h', source: 'builtin' },
]

const csvDatasets = new Map<string, Bar[]>()

export class BuiltinDataSource implements DataSource {
  async listSymbols(): Promise<SymbolInfo[]> {
    if (!useSettingsStore.getState().builtinSamplesEnabled) return []
    return [...BUILTIN_MANIFEST]
  }

  async fetchBars(symbol: string, timeframe: string): Promise<Bar[]> {
    if (!useSettingsStore.getState().builtinSamplesEnabled) {
      throw new Error('Sample datasets are disabled in settings')
    }

    const key = `${symbol}_${timeframe}`
    const csvKey = `csv_${symbol}_${timeframe}`
    if (csvDatasets.has(csvKey)) {
      return csvDatasets.get(csvKey)!
    }

    const res = await fetch(`/datasets/${key}.json`)
    if (!res.ok) throw new Error(`Dataset not found: ${key}`)
    const data = await res.json()
    return data.bars as Bar[]
  }
}

export class CsvDataSource implements DataSource {
  async listSymbols(): Promise<SymbolInfo[]> {
    const symbols: SymbolInfo[] = []
    for (const key of csvDatasets.keys()) {
      const [, symbol, timeframe] = key.split('_')
      symbols.push({ symbol, name: `${symbol} (CSV)`, timeframe, source: 'csv' })
    }
    return symbols
  }

  async fetchBars(symbol: string, timeframe: string): Promise<Bar[]> {
    const key = `csv_${symbol}_${timeframe}`
    const bars = csvDatasets.get(key)
    if (!bars) throw new Error(`CSV dataset not found: ${symbol} ${timeframe}`)
    return bars
  }
}

export function registerCsvDataset(symbol: string, timeframe: string, bars: Bar[]): void {
  csvDatasets.set(`csv_${symbol}_${timeframe}`, bars)
}

function createEasyTdxSource(): EasyTdxDataSource {
  const { enabled, baseUrl } = getEasyTdxConfig()
  return new EasyTdxDataSource(baseUrl, enabled)
}

export class DatasetRegistry {
  private builtin = new BuiltinDataSource()
  private csv = new CsvDataSource()

  async listSymbols(source?: DataSourceKind): Promise<SymbolInfo[]> {
    const easyTdx = createEasyTdxSource()
    const all = await Promise.all([
      easyTdx.listSymbols(),
      this.builtin.listSymbols(),
      this.csv.listSymbols(),
    ])
    const merged = all.flat()
    if (source) return merged.filter((s) => s.source === source)
    return merged
  }

  async listAllSymbols(): Promise<SymbolInfo[]> {
    return this.listSymbols()
  }

  async loadDataset(symbol: string, timeframe: string, source: DataSourceKind): Promise<Dataset> {
    let bars: Bar[]

    switch (source) {
      case 'api': {
        const easyTdx = createEasyTdxSource()
        bars = await easyTdx.fetchBars(symbol, timeframe)
        break
      }
      case 'builtin':
        bars = await this.builtin.fetchBars(symbol, timeframe)
        break
      case 'csv':
        bars = await this.csv.fetchBars(symbol, timeframe)
        break
      default:
        throw new Error(`Unknown data source: ${String(source)}`)
    }

    return this.buildDataset(symbol, timeframe, bars, source)
  }

  async checkApiAvailable(): Promise<boolean> {
    const easyTdx = createEasyTdxSource()
    return easyTdx.isAvailable()
  }

  private buildDataset(
    symbol: string,
    timeframe: string,
    bars: Bar[],
    source: DataSourceKind,
  ): Dataset {
    return {
      symbol,
      timeframe,
      bars,
      meta: {
        source,
        barCount: bars.length,
        startDate: bars.length > 0 ? new Date(bars[0].t * 1000).toISOString() : undefined,
        endDate: bars.length > 0 ? new Date(bars[bars.length - 1].t * 1000).toISOString() : undefined,
      },
    }
  }
}

export const datasetRegistry = new DatasetRegistry()
