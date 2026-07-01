import type { Bar, DataSource, SymbolInfo } from '@/types'
import {
  EasyTdxClient,
  isAshareSymbol,
  mapCategoryToTimeframe,
  mapTimeframeToCategory,
  parseAshareSymbol,
} from '@/lib/easy-tdx-client'

/** Popular A-share presets — available even when API is offline */
export const EASY_TDX_PRESETS: { symbol: string; name: string; timeframes: string[] }[] = [
  { symbol: 'SH600519', name: '贵州茅台', timeframes: ['1d', '1h', '5m'] },
  { symbol: 'SZ000001', name: '平安银行', timeframes: ['1d', '1h', '5m'] },
  { symbol: 'SH600036', name: '招商银行', timeframes: ['1d', '1h'] },
  { symbol: 'SZ300750', name: '宁德时代', timeframes: ['1d', '1h'] },
  { symbol: 'SH601318', name: '中国平安', timeframes: ['1d'] },
  { symbol: 'SZ002594', name: '比亚迪', timeframes: ['1d'] },
]

function presetSymbols(): SymbolInfo[] {
  const symbols: SymbolInfo[] = []
  for (const preset of EASY_TDX_PRESETS) {
    for (const timeframe of preset.timeframes) {
      symbols.push({
        symbol: preset.symbol,
        name: `${preset.name} (${preset.symbol})`,
        timeframe,
        source: 'api',
      })
    }
  }
  return symbols
}

let securityListCache: SymbolInfo[] | null = null

export function invalidateEasyTdxListCache(): void {
  securityListCache = null
}

export class EasyTdxDataSource implements DataSource {
  private client: EasyTdxClient
  private readonly enabled: boolean

  constructor(baseUrl: string, enabled: boolean) {
    this.enabled = enabled
    this.client = new EasyTdxClient(baseUrl)
  }

  isEnabled(): boolean {
    return this.enabled
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false
    return this.client.ping()
  }

  async listSymbols(): Promise<SymbolInfo[]> {
    if (!this.enabled) return []

    const presets = presetSymbols()
    if (securityListCache) return [...presets, ...securityListCache]

    const available = await this.isAvailable()
    if (!available) return presets

    try {
      const securities = await this.client.fetchSecurityList(1)
      const fromApi: SymbolInfo[] = []
      const seen = new Set(presets.map((s) => `${s.symbol}:${s.timeframe}`))

      for (const sec of securities.slice(0, 200)) {
        for (const timeframe of ['1d', '1h', '5m'] as const) {
          const key = `${sec.symbol}:${timeframe}`
          if (seen.has(key)) continue
          seen.add(key)
          fromApi.push({
            symbol: sec.symbol,
            name: sec.name,
            timeframe,
            source: 'api',
          })
        }
      }

      securityListCache = fromApi
      return [...presets, ...fromApi]
    } catch {
      return presets
    }
  }

  canFetch(symbol: string, timeframe: string): boolean {
    if (!this.enabled || !isAshareSymbol(symbol)) return false
    return mapTimeframeToCategory(timeframe) !== null
  }

  async fetchBars(symbol: string, timeframe: string): Promise<Bar[]> {
    if (!this.enabled) {
      throw new Error('easy-tdx data source is disabled')
    }

    const parsed = parseAshareSymbol(symbol)
    if (!parsed) {
      throw new Error(`Invalid A-share symbol: ${symbol}`)
    }

    const category = mapTimeframeToCategory(timeframe)
    if (!category) {
      throw new Error(`Unsupported timeframe for easy-tdx: ${timeframe}`)
    }

    const available = await this.isAvailable()
    if (!available) {
      throw new Error('easy-tdx API is not reachable. Run: npm run dev:api')
    }

    return this.client.fetchBars(parsed.market, parsed.code, category)
  }
}

export function symbolSupportsEasyTdx(symbol: string, timeframe: string): boolean {
  return isAshareSymbol(symbol) && mapTimeframeToCategory(timeframe) !== null
}

export { mapCategoryToTimeframe }
