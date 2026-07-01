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
import { translateChartSeriesLabel, useTranslation } from '@/i18n'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'
import type { Bar, ChartOutput as ChartOutputType } from '@/types'

export interface ChartRendererProps {
  output: ChartOutputType
  bars?: Bar[]
  /** Fixed pixel height. Omit to fill the parent container height. */
  height?: number
  className?: string
}

function resolveChartHeight(fixedHeight: number | undefined, containerHeight: number): number {
  if (fixedHeight != null) return fixedHeight
  return containerHeight > 0 ? containerHeight : 400
}

export function ChartRenderer({
  output,
  bars,
  height,
  className,
}: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { chart: chartColors } = useThemeColors()
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme)
  const { t, locale } = useTranslation()
  const seriesLabel = (name: string) => translateChartSeriesLabel(name, t)
  const resolveHeight = (containerEl: HTMLElement) => height ?? (containerEl.clientHeight || 400)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height: resolveHeight(container),
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      localization: {
        locale: locale === 'zh' ? 'zh-CN' : 'en-US',
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    })

    if (output.candlestick && bars && bars.length > 0) {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        title: t('chart.candlestick'),
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

      const title = seriesLabel(s.name)
      if (s.style === 'histogram') {
        chart.addSeries(HistogramSeries, { color, title }).setData(data)
      } else if (s.style === 'area') {
        chart.addSeries(AreaSeries, { lineColor: color, topColor: color + '40', bottomColor: color + '00', title }).setData(data)
      } else {
        chart.addSeries(LineSeries, { color, lineWidth: 2, title }).setData(data)
      }
    }

    chart.timeScale().fitContent()

    const resize = () => {
      if (!containerRef.current) return
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: resolveHeight(containerRef.current),
      })
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener('resize', resize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
      chart.remove()
    }
  }, [output, bars, chartColors, resolvedTheme, locale, t, height])

  return (
    <div
      ref={containerRef}
      className={cn('w-full rounded-md border border-border', height == null && 'h-full', className)}
      style={height != null ? { height } : undefined}
    />
  )
}
