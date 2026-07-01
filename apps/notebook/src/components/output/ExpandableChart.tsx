import { useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChartRenderer, type ChartRendererProps } from './ChartRenderer'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

export function ExpandableChart({ output, bars, height = 400 }: ChartRendererProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="group relative" onDoubleClick={() => setOpen(true)}>
        <ChartRenderer output={output} bars={bars} height={height} />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn(
            'absolute right-2 top-2 h-8 w-8 shadow-sm',
            'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
          )}
          onClick={(event) => {
            event.stopPropagation()
            setOpen(true)
          }}
          title={t('chart.expand')}
          aria-label={t('chart.expand')}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('chart.expandTitle')}
        className="max-w-6xl"
        bodyClassName="p-4"
      >
        <div className="h-[min(75vh,720px)]">
          <ChartRenderer output={output} bars={bars} className="h-full border-0" />
        </div>
      </Dialog>
    </>
  )
}
