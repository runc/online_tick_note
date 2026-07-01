import type { Bar } from '@/types'

export type EasyTdxMarket = 'SZ' | 'SH' | 'BJ'

export type EasyTdxCategory =
  | 'MIN_1'
  | 'MIN_5'
  | 'MIN_15'
  | 'MIN_30'
  | 'MIN_60'
  | 'DAY'
  | 'WEEK'
  | 'MONTH'

export interface EasyTdxBarRecord {
  datetime?: string
  date?: string
  open: number
  high: number
  low: number
  close: number
  vol: number
}

export interface EasyTdxDataFrameResponse {
  data: EasyTdxBarRecord[]
  count: number
}

export interface ParsedAshareSymbol {
  market: EasyTdxMarket
  code: string
  symbol: string
}

const MARKET_PREFIX: Record<EasyTdxMarket, string> = {
  SZ: 'SZ',
  SH: 'SH',
  BJ: 'BJ',
}

const MARKET_FROM_INT: Record<number, EasyTdxMarket> = {
  0: 'SZ',
  1: 'SH',
  2: 'BJ',
}

const TIMEFRAME_TO_CATEGORY: Record<string, EasyTdxCategory> = {
  '1m': 'MIN_1',
  '5m': 'MIN_5',
  '15m': 'MIN_15',
  '30m': 'MIN_30',
  '1h': 'MIN_60',
  '1d': 'DAY',
  '1w': 'WEEK',
  '1M': 'MONTH',
}

const CATEGORY_TIMEFRAMES: Record<EasyTdxCategory, string> = {
  MIN_1: '1m',
  MIN_5: '5m',
  MIN_15: '15m',
  MIN_30: '30m',
  MIN_60: '1h',
  DAY: '1d',
  WEEK: '1w',
  MONTH: '1M',
}

const ASHARE_SYMBOL_RE = /^(SZ|SH|BJ)(\d{6})$/i

export function isAshareSymbol(symbol: string): boolean {
  return ASHARE_SYMBOL_RE.test(symbol.trim())
}

export function parseAshareSymbol(symbol: string): ParsedAshareSymbol | null {
  const match = symbol.trim().toUpperCase().match(ASHARE_SYMBOL_RE)
  if (!match) return null
  const market = match[1] as EasyTdxMarket
  const code = match[2]
  return { market, code, symbol: `${market}${code}` }
}

export function mapTimeframeToCategory(timeframe: string): EasyTdxCategory | null {
  return TIMEFRAME_TO_CATEGORY[timeframe] ?? null
}

export function mapCategoryToTimeframe(category: EasyTdxCategory): string {
  return CATEGORY_TIMEFRAMES[category]
}

export function marketFromInt(value: number): EasyTdxMarket | null {
  return MARKET_FROM_INT[value] ?? null
}

export function recordToBar(record: EasyTdxBarRecord): Bar | null {
  const timeStr = record.datetime ?? record.date
  if (!timeStr) return null
  const ts = Math.floor(new Date(timeStr).getTime() / 1000)
  if (!Number.isFinite(ts)) return null
  return {
    t: ts,
    o: record.open,
    h: record.high,
    l: record.low,
    c: record.close,
    v: record.vol,
  }
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

/** Strip optional `/api/v1` suffix. Non-absolute values fall back to site origin. */
export function resolveEasyTdxApiRoot(baseUrl: string): string {
  const trimmed = normalizeBaseUrl(baseUrl)
  if (!trimmed) return ''
  if (!/^https?:\/\//i.test(trimmed)) return ''
  return trimmed.replace(/\/api\/v1$/i, '')
}

/** Build an absolute API URL so deep SPA routes never break relative fetch paths. */
export function buildEasyTdxApiUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>,
  origin = typeof globalThis.location !== 'undefined'
    ? globalThis.location.origin
    : 'http://localhost',
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const qs = params
    ? `?${new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString()}`
    : ''

  const root = resolveEasyTdxApiRoot(baseUrl)
  if (root) {
    const base = root.endsWith('/') ? root : `${root}/`
    return new URL(`${normalizedPath}${qs}`, base).href
  }

  return new URL(`${normalizedPath}${qs}`, origin).href
}

export class EasyTdxClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private url(path: string, params?: Record<string, string | number>): string {
    return buildEasyTdxApiUrl(this.baseUrl, path, params)
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(this.url('/api/v1/security/count', { market: 'SZ' }), {
        signal: AbortSignal.timeout(3000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  private async readApiError(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as { error?: string; detail?: string }
      if (body.detail) return body.detail
      if (body.error) return body.error
    } catch {
      // ignore non-json body
    }
    return `easy-tdx API error: ${res.status} ${res.statusText}`
  }

  async fetchBarsPage(
    market: EasyTdxMarket,
    code: string,
    category: EasyTdxCategory,
    start: number,
    count = 800,
  ): Promise<EasyTdxBarRecord[]> {
    const res = await fetch(
      this.url('/api/v1/bars', { market, code, category, start, count }),
      { signal: AbortSignal.timeout(15000) },
    )
    if (!res.ok) {
      throw new Error(await this.readApiError(res))
    }
    const body = (await res.json()) as EasyTdxDataFrameResponse
    return body.data ?? []
  }

  async fetchBars(
    market: EasyTdxMarket,
    code: string,
    category: EasyTdxCategory,
    maxBars = 2400,
  ): Promise<Bar[]> {
    const pageSize = 800
    const bars: Bar[] = []
    let start = 0

    while (bars.length < maxBars) {
      const records = await this.fetchBarsPage(market, code, category, start, pageSize)
      if (records.length === 0) break

      for (const record of records) {
        const bar = recordToBar(record)
        if (bar) bars.push(bar)
      }

      if (records.length < pageSize) break
      start += pageSize
    }

    bars.sort((a, b) => a.t - b.t)
    return bars.slice(-maxBars)
  }

  async fetchSecurityList(pages = 1): Promise<{ symbol: string; name: string; market: EasyTdxMarket }[]> {
    const res = await fetch(this.url('/api/v1/security/list-all', { pages }), {
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      throw new Error(`easy-tdx security list error: ${res.status}`)
    }
    const body = (await res.json()) as {
      data: { code: string; name: string; market: number }[]
    }
    const out: { symbol: string; name: string; market: EasyTdxMarket }[] = []
    for (const row of body.data ?? []) {
      const market = marketFromInt(row.market)
      if (!market || !row.code) continue
      out.push({
        market,
        symbol: `${MARKET_PREFIX[market]}${row.code}`,
        name: row.name,
      })
    }
    return out
  }
}
