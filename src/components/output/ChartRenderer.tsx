import { useEffect, useRef } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  AreaSeries,
  type Time,
} from 'lightweight-charts'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useSettingsStore } from '@/stores/settings-store'
import type { Bar, ChartOutput as ChartOutputType } from '@/types'

interface ChartRendererProps {
  output: ChartOutputType
  bars?: Bar[]
}

export function ChartRenderer({ output, bars }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { chart: chartColors } = useThemeColors()
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    })

    if (output.candlestick && bars && bars.length > 0) {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      })
      candleSeries.setData(
        bars.map((b) => ({ time: b.t as Time, open: b.o, high: b.h, low: b.l, close: b.c })),
      )
    }

    for (const s of output.series) {
      const color = s.color ?? '#3b82f6'
      const data = s.data
        .filter((d) => Number.isFinite(d.value))
        .map((d) => ({ time: d.time as Time, value: d.value }))

      if (s.style === 'histogram') {
        chart.addSeries(HistogramSeries, { color }).setData(data)
      } else if (s.style === 'area') {
        chart.addSeries(AreaSeries, { lineColor: color, topColor: color + '40', bottomColor: color + '00' }).setData(data)
      } else {
        chart.addSeries(LineSeries, { color, lineWidth: 2 }).setData(data)
      }
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [output, bars, chartColors, resolvedTheme])

  return <div ref={containerRef} className="w-full rounded-md border border-border" />
}
