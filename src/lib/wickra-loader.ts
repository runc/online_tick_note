import type { CellOutputItem, ChartSeries } from '@/types'

let wickraModule: typeof import('wickra-wasm') | null = null
let wickraReady: Promise<typeof import('wickra-wasm')> | null = null

export async function loadWickra(): Promise<typeof import('wickra-wasm')> {
  if (wickraModule) return wickraModule
  if (!wickraReady) {
    wickraReady = import('wickra-wasm').then((mod) => {
      wickraModule = mod
      return mod
    })
  }
  return wickraReady
}

type IndicatorClass = new (...args: number[]) => {
  batch: (data: Float64Array) => Float64Array
  update: (v: number) => number | null | undefined
  reset: () => void
}

export function createWickraAPI(mod: typeof import('wickra-wasm')) {
  const indicators = mod as unknown as Record<string, IndicatorClass>

  function runIndicator(name: string, prices: number[] | Float64Array, ...params: number[]): number[] {
    const Cls = indicators[name]
    if (!Cls) throw new Error(`Unknown indicator: ${name}`)
    const arr = prices instanceof Float64Array ? prices : new Float64Array(prices)
    const inst = new Cls(...params)
    const result = inst.batch(arr)
    return Array.from(result)
  }

  return {
    rsi: (prices: number[], period = 14) => runIndicator('RSI', prices, period),
    ema: (prices: number[], period = 20) => runIndicator('EMA', prices, period),
    sma: (prices: number[], period = 20) => runIndicator('SMA', prices, period),
    macd: (prices: number[], fast = 12, slow = 26, signal = 9) => {
      const flat = runIndicator('MACD', prices, fast, slow, signal)
      const n = prices.length
      const macdLine: number[] = []
      const signalLine: number[] = []
      const histogram: number[] = []
      for (let i = 0; i < n; i++) {
        macdLine.push(flat[i * 3] ?? NaN)
        signalLine.push(flat[i * 3 + 1] ?? NaN)
        histogram.push(flat[i * 3 + 2] ?? NaN)
      }
      return { macd: macdLine, signal: signalLine, histogram }
    },
    bollinger: (prices: number[], period = 20, stddev = 2) => {
      const flat = runIndicator('BollingerBands', prices, period, stddev)
      const n = prices.length
      const upper: number[] = []
      const middle: number[] = []
      const lower: number[] = []
      for (let i = 0; i < n; i++) {
        upper.push(flat[i * 4] ?? NaN)
        middle.push(flat[i * 4 + 1] ?? NaN)
        lower.push(flat[i * 4 + 2] ?? NaN)
      }
      return { upper, middle, lower }
    },
    atr: (high: number[], low: number[], close: number[], period = 14) => {
      const n = close.length
      const tr = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        const hl = high[i] - low[i]
        const hc = i > 0 ? Math.abs(high[i] - close[i - 1]) : hl
        const lc = i > 0 ? Math.abs(low[i] - close[i - 1]) : hl
        tr[i] = Math.max(hl, hc, lc)
      }
      return runIndicator('ATR', tr, period)
    },
    run: runIndicator,
    indicators: Object.keys(indicators).filter(
      (k) => k[0] === k[0].toUpperCase() && !['installPanicHook', 'version'].includes(k),
    ),
  }
}

export function createChartAPI(outputs: CellOutputItem[]) {
  const series: ChartSeries[] = []
  let candlestick = false

  return {
    line(name: string, data: number[] | { time: number; value: number }[], opts?: Partial<ChartSeries>) {
      const normalized = normalizeSeriesData(data)
      series.push({ name, data: normalized, style: 'line', pane: 'main', ...opts })
      return normalized
    },
    histogram(name: string, data: number[] | { time: number; value: number }[], opts?: Partial<ChartSeries>) {
      const normalized = normalizeSeriesData(data)
      series.push({ name, data: normalized, style: 'histogram', pane: 'sub', ...opts })
      return normalized
    },
    area(name: string, data: number[] | { time: number; value: number }[], opts?: Partial<ChartSeries>) {
      const normalized = normalizeSeriesData(data)
      series.push({ name, data: normalized, style: 'area', pane: 'main', ...opts })
      return normalized
    },
    candlestick(enable = true) {
      candlestick = enable
    },
    render() {
      outputs.push({ type: 'chart', candlestick, series: [...series] })
      series.length = 0
    },
    _getSeries: () => series,
    _getCandlestick: () => candlestick,
  }
}

function normalizeSeriesData(data: number[] | { time: number; value: number }[]): { time: number; value: number }[] {
  if (data.length === 0) return []
  if (typeof data[0] === 'object' && 'time' in (data[0] as object)) {
    return (data as { time: number; value: number }[]).filter((d) => Number.isFinite(d.value))
  }
  const now = Math.floor(Date.now() / 1000)
  return (data as number[])
    .map((value, i) => ({
      time: now - (data.length - i) * 86400,
      value,
    }))
    .filter((d) => Number.isFinite(d.value))
}

export function createTableAPI(outputs: CellOutputItem[]) {
  return (columns: string[], rows: (string | number | null)[][]) => {
    outputs.push({ type: 'table', columns, rows })
  }
}
