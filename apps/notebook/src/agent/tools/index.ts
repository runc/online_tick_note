import { tool } from 'ai'
import { z } from 'zod'
import type { AgentArtifact } from '../types'
import {
  compareAgentSymbols,
  computeAgentIndicators,
  fetchAgentBars,
  fetchAgentFinance,
  fetchAgentQuote,
  fetchBoardRanking,
  fetchChanlunAnalyze,
  summarizeBars,
  summarizeIndicatorRows,
  tableFromRows,
} from '../agent-api'
import type { Bar, ChartOutput, TableOutput } from '@/types'

const symbolSchema = z.string().describe('A-share symbol, e.g. SH600519, SZ000001')
const timeframeSchema = z.enum(['1d', '1h', '5m', '15m', '30m']).default('1d')

function stripArtifact(result: { summary: unknown; _artifact?: AgentArtifact['output'] & { bars?: Bar[] } }) {
  return result.summary
}

export function createTradingTools(onArtifact: (artifact: Omit<AgentArtifact, 'id' | 'messageId'>) => void) {
  const fetch_klines = tool({
    description: 'Fetch OHLCV kline bars for an A-share symbol',
    inputSchema: z.object({
      symbol: symbolSchema,
      timeframe: timeframeSchema,
      count: z.number().min(30).max(800).default(120),
    }),
    execute: async ({ symbol, timeframe, count }) => {
      const bars = await fetchAgentBars(symbol, timeframe, count)
      const summary = { symbol, timeframe, ...summarizeBars(bars) }
      if (bars.length > 0) {
        onArtifact({
          output: {
            type: 'chart',
            candlestick: true,
            series: [],
          } satisfies ChartOutput,
          bars,
        })
      }
      return summary
    },
  })

  const get_quote = tool({
    description: 'Get real-time quote for an A-share symbol',
    inputSchema: z.object({ symbol: symbolSchema }),
    execute: async ({ symbol }) => {
      const rows = await fetchAgentQuote(symbol)
      const summary = rows.slice(0, 3)
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).slice(0, 8)
        onArtifact({
          output: {
            type: 'table',
            columns,
            rows: rows.slice(0, 5).map((row) => columns.map((c) => {
              const v = row[c]
              return typeof v === 'number' || typeof v === 'string' || v === null ? v : String(v)
            })),
          } satisfies TableOutput,
        })
      }
      return { symbol, quotes: summary }
    },
  })

  const compute_indicators = tool({
    description: 'Compute technical indicators (MACD, RSI, KDJ, BOLL, etc.) on klines',
    inputSchema: z.object({
      symbol: symbolSchema,
      timeframe: timeframeSchema,
      count: z.number().min(30).max(800).default(120),
      indicators: z.array(z.string()).min(1).describe('e.g. MACD, RSI, KDJ, BOLL'),
    }),
    execute: async ({ symbol, timeframe, count, indicators }) => {
      const bars = await fetchAgentBars(symbol, timeframe, count)
      const rows = await computeAgentIndicators(bars, indicators)
      const latest = summarizeIndicatorRows(rows)
      onArtifact({
        output: {
          type: 'metrics',
          items: Object.entries(latest).slice(0, 12).map(([label, value]) => ({
            label,
            value: value as string | number,
          })),
        },
      })
      return { symbol, timeframe, indicators, latest, rowCount: rows.length }
    },
  })

  const get_finance = tool({
    description: 'Get latest financial data (PE, PB, ROE, etc.) for an A-share symbol',
    inputSchema: z.object({ symbol: symbolSchema }),
    execute: async ({ symbol }) => {
      const rows = await fetchAgentFinance(symbol)
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).slice(0, 10)
        onArtifact({
          output: {
            type: 'table',
            columns,
            rows: rows.slice(0, 3).map((row) => columns.map((c) => {
              const v = row[c]
              return typeof v === 'number' || typeof v === 'string' || v === null ? v : String(v)
            })),
          } satisfies TableOutput,
        })
      }
      return { symbol, finance: rows.slice(0, 2) }
    },
  })

  const render_chart = tool({
    description: 'Render a candlestick chart with optional indicator overlay series',
    inputSchema: z.object({
      symbol: symbolSchema,
      timeframe: timeframeSchema,
      count: z.number().min(30).max(800).default(120),
      indicators: z.array(z.string()).optional(),
    }),
    execute: async ({ symbol, timeframe, count, indicators }) => {
      const bars = await fetchAgentBars(symbol, timeframe, count)
      const series: ChartOutput['series'] = []

      if (indicators?.length) {
        const rows = await computeAgentIndicators(bars, indicators)
        const times = bars.map((b) => b.t)
        for (const ind of indicators) {
          const colKeys = Object.keys(rows[0] ?? {}).filter((k) =>
            k.toUpperCase().includes(ind.toUpperCase()) || k === ind,
          )
          for (const key of colKeys.slice(0, 2)) {
            series.push({
              name: key,
              pane: key.toUpperCase().includes('MACD') || key.toUpperCase().includes('RSI') ? 'sub' : 'main',
              style: key.toUpperCase().includes('HIST') ? 'histogram' : 'line',
              data: rows.map((row, i) => ({
                time: times[Math.min(i, times.length - 1)] ?? 0,
                value: Number(row[key]) || 0,
              })).filter((d) => Number.isFinite(d.value)),
            })
          }
        }
      }

      onArtifact({
        output: { type: 'chart', candlestick: true, series },
        bars,
      })
      return stripArtifact({
        summary: { symbol, timeframe, barCount: bars.length, seriesCount: series.length },
      })
    },
  })

  const render_table = tool({
    description: 'Render a data table from rows',
    inputSchema: z.object({
      title: z.string().optional(),
      columns: z.array(z.string()),
      rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
    }),
    execute: async ({ title, columns, rows }) => {
      onArtifact({
        output: { type: 'table', columns, rows },
      })
      return { title, rowCount: rows.length }
    },
  })

  const board_ranking = tool({
    description: 'Get sector/board ranking by change percent (HY=industry, GN=concept)',
    inputSchema: z.object({
      board_type: z.enum(['HY', 'GN', 'HY2', 'FG', 'DQ']).default('HY'),
      top_n: z.number().min(5).max(30).default(15),
    }),
    execute: async ({ board_type, top_n }) => {
      const rows = await fetchBoardRanking(board_type, top_n)
      const table = tableFromRows(rows)
      if (table) {
        onArtifact({ output: { type: 'table', ...table } })
      }
      return { board_type, top_n, count: rows.length, top: rows.slice(0, 5) }
    },
  })

  const chanlun_analyze = tool({
    description: 'Run Chanlun (缠论) analysis: pens, pivots, buy/sell signals',
    inputSchema: z.object({
      symbol: symbolSchema,
      timeframe: timeframeSchema,
      count: z.number().min(60).max(800).default(240),
    }),
    execute: async ({ symbol, timeframe, count }) => {
      const result = await fetchChanlunAnalyze(symbol, timeframe, count)
      const summary = {
        symbol,
        signals: result.signals ?? result.buy_sell_points ?? result.summary,
        pivots: result.pivots ?? result.zhongshu,
      }
      return { symbol, timeframe, summary }
    },
  })

  const compare_symbols = tool({
    description: 'Compare 2-5 A-share symbols side by side (quote + finance)',
    inputSchema: z.object({
      symbols: z.array(symbolSchema).min(2).max(5),
    }),
    execute: async ({ symbols }) => {
      const rows = await compareAgentSymbols(symbols)
      const table = tableFromRows(rows, 5, 12)
      if (table) {
        onArtifact({ output: { type: 'table', ...table } })
      }
      return { symbols, compared: rows.length, rows: rows.slice(0, 3) }
    },
  })

  return {
    fetch_klines,
    get_quote,
    compute_indicators,
    get_finance,
    render_chart,
    render_table,
    board_ranking,
    chanlun_analyze,
    compare_symbols,
  }
}

export type TradingTools = ReturnType<typeof createTradingTools>
