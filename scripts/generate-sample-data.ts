// Generate synthetic OHLCV sample data for built-in datasets
function generateBars(
  symbol: string,
  timeframe: string,
  count: number,
  startPrice: number,
  startTime: number,
  intervalSec: number,
): { symbol: string; timeframe: string; bars: { t: number; o: number; h: number; l: number; c: number; v: number }[] } {
  const bars = []
  let price = startPrice
  let t = startTime

  const drift = symbol.includes('BTC') ? 0.0003 : symbol.includes('ETH') ? 0.0002 : 0.0001
  const vol = symbol.includes('BTC') ? 0.025 : symbol.includes('ETH') ? 0.03 : 0.015

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * vol + drift
    const o = price
    const c = price * (1 + change)
    const h = Math.max(o, c) * (1 + Math.random() * vol * 0.5)
    const l = Math.min(o, c) * (1 - Math.random() * vol * 0.5)
    const v = Math.random() * 1000000 + 100000

    bars.push({ t, o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2), v: Math.floor(v) })
    price = c
    t += intervalSec
  }

  return { symbol, timeframe, bars }
}

const datasets = [
  generateBars('BTCUSDT', '1d', 365, 42000, 1704067200, 86400),
  generateBars('ETHUSDT', '1d', 365, 2200, 1704067200, 86400),
  generateBars('AAPL', '1d', 252, 185, 1704067200, 86400),
  generateBars('BTCUSDT', '1h', 720, 42000, 1735689600, 3600),
  generateBars('ETHUSDT', '1h', 720, 2200, 1735689600, 3600),
]

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'datasets')
mkdirSync(outDir, { recursive: true })

for (const ds of datasets) {
  const filename = `${ds.symbol}_${ds.timeframe}.json`
  writeFileSync(join(outDir, filename), JSON.stringify(ds, null, 2))
  console.log(`Generated ${filename} (${ds.bars.length} bars)`)
}
