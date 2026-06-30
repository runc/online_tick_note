import type { CellOutputItem } from '@/types'
import { ChartRenderer } from './ChartRenderer'
import { useTranslation, METRIC_LABEL_KEYS } from '@/i18n'
import type { Bar } from '@/types'

interface OutputRendererProps {
  items: CellOutputItem[]
  bars?: Bar[]
}

export function OutputRenderer({ items, bars }: OutputRendererProps) {
  const { t } = useTranslation()
  if (!items || items.length === 0) return null

  const translateLabel = (label: string) => {
    const key = METRIC_LABEL_KEYS[label]
    return key ? t(key) : label
  }

  return (
    <div className="space-y-3 border-t border-border px-4 py-3">
      {items.map((item, i) => (
        <OutputItem key={i} item={item} bars={bars} translateLabel={translateLabel} />
      ))}
    </div>
  )
}

function OutputItem({
  item,
  bars,
  translateLabel,
}: {
  item: CellOutputItem
  bars?: Bar[]
  translateLabel: (label: string) => string
}) {
  switch (item.type) {
    case 'text':
      return (
        <pre className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">{item.content}</pre>
      )
    case 'error':
      return (
        <pre className="whitespace-pre-wrap rounded-md bg-destructive/10 p-3 font-mono text-sm text-destructive">
          {item.content}
        </pre>
      )
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {item.columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground">{translateLabel(col)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 font-mono">{typeof cell === 'string' ? translateLabel(cell) : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'chart':
      return <ChartRenderer output={item} bars={bars} />
    case 'image':
      return <img src={item.src} alt="output" className="max-w-full rounded-md" />
    case 'metrics':
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {item.items.map((m) => (
            <div key={m.label} className="rounded-md border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground">{translateLabel(m.label)}</div>
              <div className="text-lg font-semibold">{m.value}</div>
            </div>
          ))}
        </div>
      )
    default:
      return null
  }
}
