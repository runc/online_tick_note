import type { Bar } from '@/types'
import {
  EasyTdxClient,
  buildEasyTdxApiUrl,
  mapTimeframeToCategory,
  parseAshareSymbol,
  recordToBar,
  type EasyTdxBarRecord,
} from '@/lib/easy-tdx-client'
import { getEasyTdxConfig } from '@/stores/settings-store'

function getClient(): EasyTdxClient {
  const { enabled, baseUrl } = getEasyTdxConfig()
  if (!enabled) {
    throw new Error('easy-tdx API is disabled. Enable it in Settings.')
  }
  return new EasyTdxClient(baseUrl)
}

function apiUrl(path: string, params?: Record<string, string | number>): string {
  const { baseUrl } = getEasyTdxConfig()
  return buildEasyTdxApiUrl(baseUrl, path, params)
}

async function readApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; detail?: string }
    if (body.detail) return body.detail
    if (body.error) return body.error
  } catch {
    // ignore non-json body
  }
  return `${res.status} ${res.statusText}`
}

export async function fetchAgentBars(
  symbol: string,
  timeframe: string,
  maxBars = 240,
): Promise<Bar[]> {
  const parsed = parseAshareSymbol(symbol)
  if (!parsed) throw new Error(`Invalid A-share symbol: ${symbol}`)
  const category = mapTimeframeToCategory(timeframe)
  if (!category) throw new Error(`Unsupported timeframe: ${timeframe}`)
  const client = getClient()
  return client.fetchBars(parsed.market, parsed.code, category, maxBars)
}

function quoteFromBars(symbol: string, bars: Bar[]): Record<string, unknown>[] {
  if (bars.length === 0) return []
  const last = bars[bars.length - 1]
  const prev = bars.length > 1 ? bars[bars.length - 2] : last
  const change = last.c - prev.c
  const changePct = prev.c ? (change / prev.c) * 100 : 0
  return [{
    symbol,
    price: last.c,
    open: last.o,
    high: last.h,
    low: last.l,
    vol: last.v,
    change,
    change_pct: Number(changePct.toFixed(2)),
    source: 'kline_fallback',
  }]
}

export async function fetchAgentQuote(symbol: string): Promise<Record<string, unknown>[]> {
  const parsed = parseAshareSymbol(symbol)
  if (!parsed) throw new Error(`Invalid A-share symbol: ${symbol}`)

  const url = apiUrl('/api/v1/quotes')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stocks: [{ market: parsed.market, code: parsed.code }] }),
    signal: AbortSignal.timeout(15000),
  })

  if (res.ok) {
    const body = (await res.json()) as { data: Record<string, unknown>[] }
    return body.data ?? []
  }

  if (res.status === 404 || res.status === 503 || res.status === 502) {
    const bars = await fetchAgentBars(symbol, '1d', 2)
    const fallback = quoteFromBars(parsed.symbol, bars)
    if (fallback.length > 0) return fallback
  }

  const detail = await readApiError(res)
  throw new Error(
    `Quote API error: ${detail}. Check easy-tdx URL in Settings (use http://127.0.0.1:8000, not .../api/v1) and run npm run dev:api.`,
  )
}

export async function fetchAgentFinance(symbol: string): Promise<Record<string, unknown>[]> {
  const parsed = parseAshareSymbol(symbol)
  if (!parsed) throw new Error(`Invalid A-share symbol: ${symbol}`)
  const res = await fetch(apiUrl('/api/v1/finance', { market: parsed.market, code: parsed.code }), {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Finance API error: ${res.status}`)
  const body = (await res.json()) as { data: Record<string, unknown>[] }
  return body.data ?? []
}

export function barsToOhlcvRecords(bars: Bar[]): EasyTdxBarRecord[] {
  return bars.map((b) => ({
    datetime: new Date(b.t * 1000).toISOString(),
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    vol: b.v,
  }))
}

export async function computeAgentIndicators(
  bars: Bar[],
  indicators: string[],
): Promise<Record<string, unknown>[]> {
  const res = await fetch(apiUrl('/api/v1/indicator/compute'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: barsToOhlcvRecords(bars),
      indicators,
      keep_ohlcv: true,
      tail: 30,
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`Indicator API error: ${res.status}`)
  const body = (await res.json()) as { data: Record<string, unknown>[] }
  return body.data ?? []
}

export function summarizeBars(bars: Bar[]) {
  if (bars.length === 0) return { barCount: 0 }
  const first = bars[0]
  const last = bars[bars.length - 1]
  const changePct = first.c ? ((last.c - first.c) / first.c) * 100 : 0
  return {
    barCount: bars.length,
    periodStart: new Date(first.t * 1000).toISOString().slice(0, 10),
    periodEnd: new Date(last.t * 1000).toISOString().slice(0, 10),
    latestClose: last.c,
    changePct: Number(changePct.toFixed(2)),
    high: Math.max(...bars.map((b) => b.h)),
    low: Math.min(...bars.map((b) => b.l)),
  }
}

export function summarizeIndicatorRows(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return {}
  const last = rows[rows.length - 1]
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(last)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = Number(value.toFixed(4))
    }
  }
  return out
}

export function recordsToBars(records: EasyTdxBarRecord[]): Bar[] {
  const bars: Bar[] = []
  for (const record of records) {
    const bar = recordToBar(record)
    if (bar) bars.push(bar)
  }
  return bars.sort((a, b) => a.t - b.t)
}

function tableFromRows(rows: Record<string, unknown>[], maxRows = 15, maxCols = 10) {
  if (rows.length === 0) return null
  const columns = Object.keys(rows[0]).slice(0, maxCols)
  return {
    columns,
    rows: rows.slice(0, maxRows).map((row) => columns.map((c) => {
      const v = row[c]
      return typeof v === 'number' || typeof v === 'string' || v === null ? v : String(v)
    })),
  }
}

export async function fetchBoardRanking(
  boardType: 'HY' | 'GN' | 'HY2' | 'FG' | 'DQ' = 'HY',
  topN = 15,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(apiUrl('/api/v1/board-mac/ranking', {
    board_type: boardType,
    top_n: topN,
    sort_by: 'change_pct',
    ascending: 'false',
  }), { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`Board ranking API error: ${res.status}`)
  const body = (await res.json()) as { data: Record<string, unknown>[] }
  return body.data ?? []
}

export async function fetchChanlunAnalyze(
  symbol: string,
  timeframe = '1d',
  count = 240,
): Promise<Record<string, unknown>> {
  const parsed = parseAshareSymbol(symbol)
  if (!parsed) throw new Error(`Invalid A-share symbol: ${symbol}`)
  const category = mapTimeframeToCategory(timeframe)
  if (!category) throw new Error(`Unsupported timeframe: ${timeframe}`)
  const res = await fetch(apiUrl('/api/v1/chanlun/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      market: parsed.market,
      code: parsed.code,
      category,
      count,
      start: 0,
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Chanlun API error: ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

export async function compareAgentSymbols(symbols: string[]) {
  const results: Record<string, unknown>[] = []
  for (const symbol of symbols.slice(0, 5)) {
    const parsed = parseAshareSymbol(symbol)
    if (!parsed) continue
    let quote: Record<string, unknown> = {}
    let finance: Record<string, unknown> = {}
    try {
      const quotes = await fetchAgentQuote(symbol)
      quote = quotes[0] ?? {}
    } catch { /* ignore */ }
    try {
      const finances = await fetchAgentFinance(symbol)
      finance = finances[0] ?? {}
    } catch { /* ignore */ }
    results.push({ symbol, ...quote, ...finance })
  }
  return results
}

export { tableFromRows }
