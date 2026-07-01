import type { Bar, DataFrame } from '@/types'

export function barsToDataFrame(bars: Bar[]): DataFrame {
  const t = bars.map((b) => b.t)
  const o = bars.map((b) => b.o)
  const h = bars.map((b) => b.h)
  const l = bars.map((b) => b.l)
  const c = bars.map((b) => b.c)
  const v = bars.map((b) => b.v)

  const extraColumns: Record<string, number[]> = {}

  return {
    length: bars.length,
    t,
    o,
    h,
    l,
    c,
    v,
    bars,
    toArray: () =>
      bars.map((b) => ({
        t: b.t,
        o: b.o,
        h: b.h,
        l: b.l,
        c: b.c,
        v: b.v,
        ...Object.fromEntries(
          Object.entries(extraColumns).map(([k, arr]) => [k, arr[bars.indexOf(b)]]),
        ),
      })),
    column: (name: string) => {
      const map: Record<string, number[]> = { t, o, h, l, c, v, open: o, high: h, low: l, close: c, volume: v }
      if (map[name]) return map[name]
      if (extraColumns[name]) return extraColumns[name]
      throw new Error(`Column "${name}" not found in DataFrame`)
    },
  }
}

export function addColumn(df: DataFrame, name: string, values: number[]): DataFrame {
  const bars = df.bars.map((b) => ({ ...b }))
  const df2 = barsToDataFrame(bars)
  const origColumn = df.column.bind(df)
  df2.column = (col: string) => {
    if (col === name) return values
    return origColumn(col)
  }
  return df2
}

export function parseCsvToBars(csv: string): Bar[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV must have header and at least one row')

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const colMap: Record<string, number> = {}
  header.forEach((h, i) => {
    colMap[h] = i
  })

  const findCol = (...names: string[]): number => {
    for (const n of names) {
      if (colMap[n] !== undefined) return colMap[n]
    }
    throw new Error(`Missing column: ${names.join(' or ')}`)
  }

  const tIdx = findCol('t', 'timestamp', 'date', 'time', 'datetime')
  const oIdx = findCol('o', 'open')
  const hIdx = findCol('h', 'high')
  const lIdx = findCol('l', 'low')
  const cIdx = findCol('c', 'close')
  const vIdx = colMap['v'] ?? colMap['volume'] ?? -1

  const bars: Bar[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim())
    if (cols.length < 5) continue

    let timestamp = parseFloat(cols[tIdx])
    if (isNaN(timestamp)) {
      timestamp = new Date(cols[tIdx]).getTime() / 1000
    }
    if (timestamp > 1e12) timestamp = timestamp / 1000

    bars.push({
      t: Math.floor(timestamp),
      o: parseFloat(cols[oIdx]),
      h: parseFloat(cols[hIdx]),
      l: parseFloat(cols[lIdx]),
      c: parseFloat(cols[cIdx]),
      v: vIdx >= 0 ? parseFloat(cols[vIdx]) || 0 : 0,
    })
  }

  bars.sort((a, b) => a.t - b.t)
  return bars
}
