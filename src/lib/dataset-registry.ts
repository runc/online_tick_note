import type { Bar, DataSource, Dataset, SymbolInfo } from '@/types'

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
    return [...BUILTIN_MANIFEST]
  }

  async fetchBars(symbol: string, timeframe: string): Promise<Bar[]> {
    const key = `${symbol}_${timeframe}`
    const csvKey = `csv_${symbol}_${timeframe}`
    if (csvDatasets.has(csvKey)) {
      return csvDatasets.get(csvKey)!
    }

    try {
      const res = await fetch(`/datasets/${key}.json`)
      if (!res.ok) throw new Error(`Dataset not found: ${key}`)
      const data = await res.json()
      return data.bars as Bar[]
    } catch {
      throw new Error(`Failed to load dataset: ${symbol} ${timeframe}`)
    }
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

export class DatasetRegistry {
  private builtin = new BuiltinDataSource()
  private csv = new CsvDataSource()

  async listAllSymbols(): Promise<SymbolInfo[]> {
    const [builtin, csv] = await Promise.all([
      this.builtin.listSymbols(),
      this.csv.listSymbols(),
    ])
    return [...builtin, ...csv]
  }

  async loadDataset(symbol: string, timeframe: string): Promise<Dataset> {
    let bars: Bar[]
    let source: 'builtin' | 'csv' = 'builtin'

    try {
      bars = await this.builtin.fetchBars(symbol, timeframe)
    } catch {
      bars = await this.csv.fetchBars(symbol, timeframe)
      source = 'csv'
    }

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
