export type DataSourceKind = 'api' | 'builtin' | 'csv'

export interface Bar {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface DatasetMeta {
  source: DataSourceKind
  startDate?: string
  endDate?: string
  barCount: number
}

export interface Dataset {
  symbol: string
  timeframe: string
  bars: Bar[]
  meta: DatasetMeta
}

export interface SymbolInfo {
  symbol: string
  name: string
  timeframe: string
  source: DataSourceKind
}

export type CellType = 'code' | 'markdown' | 'chart' | 'backtest'
export type CellLang = 'js' | 'py'
export type CellStatus = 'idle' | 'running' | 'error' | 'done'

export interface TextOutput {
  type: 'text'
  content: string
}

export interface ErrorOutput {
  type: 'error'
  content: string
  line?: number
}

export interface TableOutput {
  type: 'table'
  columns: string[]
  rows: (string | number | null)[][]
}

export interface ChartSeries {
  name: string
  data: { time: number; value: number }[]
  color?: string
  pane?: 'main' | 'sub'
  style?: 'line' | 'histogram' | 'area'
}

export interface ChartOutput {
  type: 'chart'
  candlestick?: boolean
  series: ChartSeries[]
}

export interface ImageOutput {
  type: 'image'
  src: string
}

export interface MetricsOutput {
  type: 'metrics'
  items: { label: string; value: string | number }[]
}

export type CellOutputItem =
  | TextOutput
  | ErrorOutput
  | TableOutput
  | ChartOutput
  | ImageOutput
  | MetricsOutput

export interface CellOutput {
  items: CellOutputItem[]
}

export interface Cell {
  id: string
  type: CellType
  lang: CellLang
  source: string
  output?: CellOutput
  status: CellStatus
  collapsed?: boolean
}

export interface Notebook {
  id: string
  title: string
  dataSource: DataSourceKind
  symbol: string
  timeframe: string
  kernelLang: CellLang
  cells: Cell[]
  createdAt: number
  updatedAt: number
}

export interface KernelContext {
  df: DataFrame
  log: (...args: unknown[]) => void
}

export interface KernelResult {
  outputs: CellOutputItem[]
  error?: string
}

export interface Kernel {
  lang: CellLang
  ready: Promise<void>
  eval(code: string, ctx: KernelContext): Promise<KernelResult>
  setVar(name: string, value: unknown): Promise<void>
  getVar(name: string): Promise<unknown>
  reset?(): void
  setDataFrame?(df: DataFrame): Promise<void>
}

export interface DataFrame {
  length: number
  t: number[]
  o: number[]
  h: number[]
  l: number[]
  c: number[]
  v: number[]
  bars: Bar[]
  toArray: () => Record<string, number>[]
  column: (name: string) => number[]
}

export interface DataSource {
  listSymbols(): Promise<SymbolInfo[]>
  fetchBars(symbol: string, timeframe: string): Promise<Bar[]>
}

/** Reserved for future streaming kernel — not implemented in MVP */
export interface StreamingKernel {
  onTick(bar: Bar): void
  subscribe(indicator: string, params: number[]): void
  unsubscribe(indicator: string): void
}

export interface Snippet {
  id: string
  title: string
  lang: CellLang
  source: string
  category: string
  createdAt: number
}

export interface BacktestConfig {
  signalColumn: string
  feeRate: number
  slippage: number
  initialCapital: number
}

export interface BacktestResult {
  equity: { time: number; value: number }[]
  benchmark: { time: number; value: number }[]
  metrics: { label: string; value: string | number }[]
  trades: {
    entryTime: number
    exitTime: number
    side: 'long' | 'short'
    pnl: number
    pnlPct: number
    entryPrice: number
    exitPrice: number
  }[]
}
