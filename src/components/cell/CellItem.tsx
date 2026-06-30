import { useState } from 'react'
import {
  Play, Trash2, ChevronUp, ChevronDown, ChevronRight, Plus,
  MoreVertical, GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { OutputRenderer } from '@/components/output/OutputRenderer'
import { useCellStore } from '@/stores/notebook-store'
import { useTranslation, type I18nKey } from '@/i18n'
import type { Cell, Bar } from '@/types'
import { cn } from '@/lib/utils'

interface CellItemProps {
  cell: Cell
  index: number
  bars?: Bar[]
  onRun: (id: string) => void
  isRunning: boolean
}

export function CellItem({ cell, index, bars, onRun, isRunning }: CellItemProps) {
  const { updateCell, removeCell, moveCell, toggleCollapse, addCell } = useCellStore()
  const [showMenu, setShowMenu] = useState(false)
  const { t } = useTranslation()

  const statusColor = {
    idle: 'bg-muted-foreground/30',
    running: 'bg-yellow-500 animate-pulse',
    error: 'bg-destructive',
    done: 'bg-primary',
  }[cell.status]

  const cellTypeLabel = t(`cell.types.${cell.type}` as I18nKey)

  return (
    <div className="group rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground">[{index + 1}]</span>
        <span className={cn('h-2 w-2 rounded-full', statusColor)} />
        <span className="text-xs text-muted-foreground">{cellTypeLabel}</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleCollapse(cell.id)}>
          <ChevronRight className={cn('h-4 w-4 transition-transform', !cell.collapsed && 'rotate-90')} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRun(cell.id)} disabled={isRunning}>
          <Play className="h-3.5 w-3.5" />
        </Button>
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-card py-1 shadow-lg">
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { addCell(cell.id); setShowMenu(false) }}>
                <Plus className="h-3.5 w-3.5" /> {t('cell.insertBelow')}
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { moveCell(cell.id, 'up'); setShowMenu(false) }}>
                <ChevronUp className="h-3.5 w-3.5" /> {t('cell.moveUp')}
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { moveCell(cell.id, 'down'); setShowMenu(false) }}>
                <ChevronDown className="h-3.5 w-3.5" /> {t('cell.moveDown')}
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-accent" onClick={() => { removeCell(cell.id); setShowMenu(false) }}>
                <Trash2 className="h-3.5 w-3.5" /> {t('cell.delete')}
              </button>
            </div>
          )}
        </div>
      </div>

      {!cell.collapsed && (
        <>
          <div className="overflow-hidden">
            <CodeEditor
              value={cell.source}
              onChange={(source) => updateCell(cell.id, { source })}
              lang={cell.type === 'markdown' ? 'markdown' : cell.lang}
              onRun={() => onRun(cell.id)}
            />
          </div>
          {cell.output && <OutputRenderer items={cell.output.items} bars={bars} />}
        </>
      )}
    </div>
  )
}
