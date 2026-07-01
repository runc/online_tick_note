import { describe, expect, it } from 'vitest'
import {
  buildEasyTdxApiUrl,
  isAshareSymbol,
  mapTimeframeToCategory,
  parseAshareSymbol,
  recordToBar,
  resolveEasyTdxApiRoot,
} from './easy-tdx-client'

describe('easy-tdx-client', () => {
  it('parses A-share symbols', () => {
    expect(parseAshareSymbol('SH600519')).toEqual({
      market: 'SH',
      code: '600519',
      symbol: 'SH600519',
    })
    expect(parseAshareSymbol('sz000001')).toEqual({
      market: 'SZ',
      code: '000001',
      symbol: 'SZ000001',
    })
    expect(isAshareSymbol('BTCUSDT')).toBe(false)
  })

  it('maps notebook timeframes to easy-tdx categories', () => {
    expect(mapTimeframeToCategory('1d')).toBe('DAY')
    expect(mapTimeframeToCategory('1h')).toBe('MIN_60')
    expect(mapTimeframeToCategory('5m')).toBe('MIN_5')
    expect(mapTimeframeToCategory('4h')).toBeNull()
  })

  it('converts API records to bars', () => {
    const bar = recordToBar({
      datetime: '2024-01-15T09:35:00',
      open: 10,
      high: 11,
      low: 9.5,
      close: 10.5,
      vol: 1000,
    })
    expect(bar).toMatchObject({ o: 10, h: 11, l: 9.5, c: 10.5, v: 1000 })
    expect(bar?.t).toBeGreaterThan(0)
  })

  it('normalizes easy-tdx API root without double /api/v1', () => {
    expect(resolveEasyTdxApiRoot('')).toBe('')
    expect(resolveEasyTdxApiRoot('http://127.0.0.1:8000')).toBe('http://127.0.0.1:8000')
    expect(resolveEasyTdxApiRoot('http://127.0.0.1:8000/')).toBe('http://127.0.0.1:8000')
    expect(resolveEasyTdxApiRoot('http://127.0.0.1:8000/api/v1')).toBe('http://127.0.0.1:8000')
    expect(resolveEasyTdxApiRoot('http://127.0.0.1:8000/API/V1/')).toBe('http://127.0.0.1:8000')
    expect(resolveEasyTdxApiRoot('api/v1')).toBe('')
    expect(resolveEasyTdxApiRoot('/api/v1')).toBe('')
  })

  it('builds origin-absolute API URLs for SPA deep routes', () => {
    const origin = 'http://localhost:5173'
    expect(buildEasyTdxApiUrl('', '/api/v1/quotes', undefined, origin))
      .toBe('http://localhost:5173/api/v1/quotes')
    expect(buildEasyTdxApiUrl('api/v1', '/api/v1/quotes', undefined, origin))
      .toBe('http://localhost:5173/api/v1/quotes')
    expect(buildEasyTdxApiUrl('http://127.0.0.1:8000/api/v1', '/api/v1/quotes', undefined, origin))
      .toBe('http://127.0.0.1:8000/api/v1/quotes')
    expect(buildEasyTdxApiUrl('', 'api/v1/quotes', undefined, origin))
      .toBe('http://localhost:5173/api/v1/quotes')
  })
})
