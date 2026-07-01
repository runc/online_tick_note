import type { Bar, BacktestConfig, BacktestResult } from '@/types'

export function runBacktest(bars: Bar[], signals: number[], config: BacktestConfig): BacktestResult {
  const { feeRate, slippage, initialCapital } = config
  const n = bars.length
  const equity: { time: number; value: number }[] = []
  const benchmark: { time: number; value: number }[] = []
  const trades: BacktestResult['trades'] = []

  let cash = initialCapital
  let position = 0
  let entryPrice = 0
  let entryTime = 0
  const initialPrice = bars[0]?.c ?? 1
  const benchmarkShares = initialCapital / initialPrice

  for (let i = 0; i < n; i++) {
    const bar = bars[i]
    const signal = signals[i] ?? 0
    const price = bar.c

    if (signal === 1 && position <= 0) {
      if (position < 0) {
        const pnl = (entryPrice - price) * Math.abs(position) - Math.abs(position) * price * (feeRate + slippage)
        cash += Math.abs(position) * entryPrice + pnl
        trades.push({ entryTime, exitTime: bar.t, side: 'short', entryPrice, exitPrice: price, pnl, pnlPct: (pnl / (Math.abs(position) * entryPrice)) * 100 })
        position = 0
      }
      const buyPrice = price * (1 + slippage)
      const shares = Math.floor(cash / (buyPrice * (1 + feeRate)))
      if (shares > 0) { cash -= shares * buyPrice * (1 + feeRate); position = shares; entryPrice = buyPrice; entryTime = bar.t }
    } else if (signal === -1 && position >= 0) {
      if (position > 0) {
        const sellPrice = price * (1 - slippage)
        const pnl = position * (sellPrice - entryPrice) - position * sellPrice * feeRate
        cash += position * sellPrice * (1 - feeRate)
        trades.push({ entryTime, exitTime: bar.t, side: 'long', entryPrice, exitPrice: sellPrice, pnl, pnlPct: (pnl / (position * entryPrice)) * 100 })
        position = 0
      }
    }

    equity.push({ time: bar.t, value: cash + position * price })
    benchmark.push({ time: bar.t, value: benchmarkShares * price })
  }

  const finalValue = equity[equity.length - 1]?.value ?? initialCapital
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100
  const benchFinal = benchmark[benchmark.length - 1]?.value ?? initialCapital
  const benchReturn = ((benchFinal - initialCapital) / initialCapital) * 100

  const returns: number[] = []
  for (let i = 1; i < equity.length; i++) returns.push((equity[i].value - equity[i - 1].value) / equity[i - 1].value)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1)
  const stdReturn = Math.sqrt(returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / (returns.length || 1))
  const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0

  let maxEquity = initialCapital
  let maxDrawdown = 0
  for (const e of equity) {
    if (e.value > maxEquity) maxEquity = e.value
    const dd = (maxEquity - e.value) / maxEquity
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  const winningTrades = trades.filter((t) => t.pnl > 0)
  const losingTrades = trades.filter((t) => t.pnl <= 0)
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((a, t) => a + t.pnl, 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((a, t) => a + t.pnl, 0) / losingTrades.length) : 0

  return {
    equity, benchmark, trades,
    metrics: [
      { label: 'Total Return', value: `${totalReturn.toFixed(2)}%` },
      { label: 'Benchmark Return', value: `${benchReturn.toFixed(2)}%` },
      { label: 'Sharpe Ratio', value: sharpe.toFixed(2) },
      { label: 'Max Drawdown', value: `${(maxDrawdown * 100).toFixed(2)}%` },
      { label: 'Win Rate', value: `${winRate.toFixed(1)}%` },
      { label: 'Profit Factor', value: avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : avgWin > 0 ? '∞' : '0' },
      { label: 'Total Trades', value: trades.length },
      { label: 'Final Value', value: `$${finalValue.toFixed(2)}` },
    ],
  }
}
