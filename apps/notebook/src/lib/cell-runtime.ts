import type { Cell, CellOutputItem, DataFrame } from '@/types'
import { getJsKernel } from '@/kernel/js-kernel'
import { getPyKernel } from '@/kernel/py-kernel'
import { runBacktest } from '@/lib/backtest'
import type { BacktestConfig } from '@/types'

export async function runCell(
  cell: Cell,
  df: DataFrame,
  kernelLang: 'js' | 'py',
  onPyProgress?: (pct: number) => void,
): Promise<{ outputs: CellOutputItem[]; error?: string }> {
  if (cell.type === 'markdown') {
    return { outputs: [{ type: 'text', content: cell.source }] }
  }

  if (cell.type === 'backtest') {
    return runBacktestCell(cell, df)
  }

  if (cell.type === 'chart') {
    return runChartCell(cell, df)
  }

  const kernel = kernelLang === 'js' ? getJsKernel() : getPyKernel(onPyProgress)
  await kernel.ready
  if (kernel.setDataFrame) await kernel.setDataFrame(df)

  const log = (...args: unknown[]) => console.log(...args)
  return kernel.eval(cell.source, { df, log })
}

async function runChartCell(cell: Cell, df: DataFrame) {
  try {
    const config = JSON.parse(cell.source) as {
      candlestick?: boolean
      series: { name: string; column: string; pane?: string; style?: string; color?: string }[]
    }
    const series = config.series.map((s) => ({
      name: s.name,
      data: df.t.map((t, i) => ({ time: t, value: df.column(s.column)[i] ?? 0 })),
      pane: (s.pane as 'main' | 'sub') ?? 'main',
      style: (s.style as 'line' | 'histogram' | 'area') ?? 'line',
      color: s.color,
    }))
    return { outputs: [{ type: 'chart' as const, candlestick: config.candlestick ?? true, series }] }
  } catch (err) {
    return { outputs: [{ type: 'error' as const, content: String(err) }], error: String(err) }
  }
}

async function runBacktestCell(cell: Cell, df: DataFrame) {
  try {
    const config: BacktestConfig = JSON.parse(cell.source)
    const signals = df.column(config.signalColumn)
    const result = runBacktest(df.bars, signals, config)
    return {
      outputs: [
        { type: 'metrics' as const, items: result.metrics },
        { type: 'chart' as const, candlestick: false, series: [
          { name: 'Equity', data: result.equity, style: 'line' as const, pane: 'main' as const, color: '#22c55e' },
          { name: 'Benchmark', data: result.benchmark, style: 'line' as const, pane: 'main' as const, color: '#6b7280' },
        ]},
        { type: 'table' as const, columns: ['Entry', 'Exit', 'Side', 'PnL', 'PnL%'],
          rows: result.trades.slice(0, 50).map((t) => [
            new Date(t.entryTime * 1000).toLocaleDateString(),
            new Date(t.exitTime * 1000).toLocaleDateString(),
            t.side, t.pnl.toFixed(2), `${t.pnlPct.toFixed(2)}%`,
          ]),
        },
      ],
    }
  } catch (err) {
    return { outputs: [{ type: 'error' as const, content: String(err) }], error: String(err) }
  }
}

export async function runAllCells(
  cells: Cell[],
  df: DataFrame,
  kernelLang: 'js' | 'py',
  onCellUpdate: (id: string, outputs: CellOutputItem[], status: Cell['status'], error?: string) => void,
  untilId?: string,
): Promise<void> {
  const kernel = kernelLang === 'js' ? getJsKernel() : getPyKernel()
  kernel.reset?.()
  if (kernel.setDataFrame) await kernel.setDataFrame(df)

  for (const cell of cells) {
    onCellUpdate(cell.id, [], 'running')
    const result = await runCell(cell, df, kernelLang)
    onCellUpdate(cell.id, result.outputs, result.error ? 'error' : 'done', result.error)
    if (untilId && cell.id === untilId) break
  }
}
