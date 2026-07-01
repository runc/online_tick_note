import { useState } from 'react'
import { INDICATORS, INDICATOR_CATEGORIES } from '@/lib/indicators'
import { useCellStore } from '@/stores/notebook-store'
import { useNotebookStore } from '@/stores/notebook-store'
import { Button } from '@/components/ui/button'
import { ChevronRight, BarChart3 } from 'lucide-react'
import { useTranslation, type I18nKey } from '@/i18n'
import { cn } from '@/lib/utils'

export function IndicatorSidebar() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('oscillator')
  const { addCell } = useCellStore()
  const kernelLang = useNotebookStore((s) => s.currentNotebook?.kernelLang ?? 'js')
  const { t } = useTranslation()

  const insertIndicator = (indicatorId: string) => {
    const indicator = INDICATORS.find((i) => i.id === indicatorId)
    if (!indicator) return
    const params = Object.fromEntries(indicator.params.map((p) => [p.name, p.default]))
    const source = kernelLang === 'js' ? indicator.jsTemplate(params) : indicator.pyTemplate(params)
    const cells = useNotebookStore.getState().currentNotebook?.cells ?? []
    const lastId = cells[cells.length - 1]?.id
    addCell(lastId)
    setTimeout(() => {
      const updated = useNotebookStore.getState().currentNotebook?.cells ?? []
      const newCell = updated[updated.length - 1]
      if (newCell) {
        useCellStore.getState().updateCell(newCell.id, { source, type: 'code' })
      }
    }, 0)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t('indicators.title')}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {INDICATOR_CATEGORIES.map((cat) => (
          <div key={cat.id} className="mb-1">
            <button
              className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent"
              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
            >
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expandedCategory === cat.id && 'rotate-90')} />
              {t(`indicators.categories.${cat.id}` as I18nKey)}
            </button>
            {expandedCategory === cat.id && (
              <div className="ml-3 space-y-1">
                {INDICATORS.filter((i) => i.category === cat.id).map((ind) => (
                  <div key={ind.id} className="rounded-md border border-border/50 p-2">
                    <div className="text-sm font-medium">{t(`indicators.${ind.id}.name` as I18nKey)}</div>
                    <div className="mb-2 text-xs text-muted-foreground">{t(`indicators.${ind.id}.description` as I18nKey)}</div>
                    <Button size="sm" variant="outline" className="h-7 w-full text-xs" onClick={() => insertIndicator(ind.id)}>
                      {t('indicators.insertCell')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
