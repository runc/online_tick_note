import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  Play, Plus, Save, Upload, Download, Trash2, Code2, FileText, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CellItem } from '@/components/cell/CellItem'
import { IndicatorSidebar } from '@/components/sidebar/IndicatorSidebar'
import { useNotebookStore, useCellStore } from '@/stores/notebook-store'
import { useDataset, useSymbolList } from '@/hooks/useDataset'
import { runCell, runAllCells } from '@/lib/cell-runtime'
import { getJsKernel } from '@/kernel/js-kernel'
import { getPyKernel, resetPyKernel } from '@/kernel/py-kernel'
import { loadNotebook } from '@/lib/db'
import { parseCsvToBars } from '@/lib/dataframe'
import { registerCsvDataset } from '@/lib/dataset-registry'
import { useTranslation } from '@/i18n'
import { APP_HEADER_BAR, cn } from '@/lib/utils'
import type { SymbolInfo } from '@/types'

export function NotebookEditorPage() {
  const { id } = useParams({ from: '/nb/$id' })
  const navigate = useNavigate()
  const {
    currentNotebook, setCurrentNotebook, updateNotebook,
    saveCurrentNotebook, lastSavedAt, deleteNotebook,
  } = useNotebookStore()
  const { addCell } = useCellStore()
  const { t, locale } = useTranslation()
  const [running, setRunning] = useState(false)
  const [pyLoading, setPyLoading] = useState(false)
  const [pyProgress, setPyProgress] = useState(0)
  const [showIndicators, setShowIndicators] = useState(true)

  const symbol = currentNotebook?.symbol ?? 'BTCUSDT'
  const timeframe = currentNotebook?.timeframe ?? '1d'
  const { data: dataset, isLoading: dataLoading } = useDataset(symbol, timeframe)
  const { data: symbols } = useSymbolList()

  useEffect(() => {
    loadNotebook(id).then((nb) => {
      if (nb) setCurrentNotebook(nb)
      else navigate({ to: '/' })
    })
    return () => setCurrentNotebook(null)
  }, [id, setCurrentNotebook, navigate])

  useEffect(() => {
    if (!currentNotebook) return
    const timer = setTimeout(() => saveCurrentNotebook(), 500)
    return () => clearTimeout(timer)
  }, [currentNotebook, saveCurrentNotebook])

  const handleRunCell = useCallback(async (cellId: string) => {
    if (!currentNotebook || !dataset) return
    setRunning(true)
    const cell = currentNotebook.cells.find((c) => c.id === cellId)
    if (!cell) { setRunning(false); return }

    useCellStore.getState().updateCell(cellId, { status: 'running', output: undefined })
    const result = await runCell(cell, dataset.df, currentNotebook.kernelLang, (pct) => setPyProgress(pct))
    useCellStore.getState().updateCell(cellId, {
      status: result.error ? 'error' : 'done',
      output: { items: result.outputs },
    })
    setRunning(false)
  }, [currentNotebook, dataset])

  const handleRunAll = useCallback(async () => {
    if (!currentNotebook || !dataset) return
    setRunning(true)
    const kernel = currentNotebook.kernelLang === 'js' ? getJsKernel() : getPyKernel()
    kernel.reset?.()
    await runAllCells(
      currentNotebook.cells, dataset.df, currentNotebook.kernelLang,
      (cellId, outputs, status) => {
        useCellStore.getState().updateCell(cellId, {
          status,
          output: outputs.length > 0 ? { items: outputs } : undefined,
        })
      },
    )
    setRunning(false)
  }, [currentNotebook, dataset])

  const handleKernelSwitch = async (lang: 'js' | 'py') => {
    if (lang === 'py' && currentNotebook?.kernelLang !== 'py') {
      setPyLoading(true)
      resetPyKernel()
      await getPyKernel((pct) => setPyProgress(pct)).ready
      setPyLoading(false)
    }
    const kernel = lang === 'js' ? getJsKernel() : getPyKernel()
    kernel.reset?.()
    updateNotebook({
      kernelLang: lang,
      cells: currentNotebook?.cells.map((c) => ({ ...c, lang, status: 'idle' as const, output: undefined })) ?? [],
    })
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const bars = parseCsvToBars(ev.target?.result as string)
        const sym = file.name.replace(/\.csv$/i, '').toUpperCase()
        registerCsvDataset(sym, '1d', bars)
        updateNotebook({ symbol: sym, timeframe: '1d' })
      } catch (err) {
        alert(`${t('editor.csvParseError')}: ${err}`)
      }
    }
    reader.readAsText(file)
  }

  const handleExport = () => {
    if (!currentNotebook) return
    const blob = new Blob([JSON.stringify(currentNotebook, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${currentNotebook.title}.json`
    a.click()
  }

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US')

  if (!currentNotebook) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">{t('editor.loading')}</div>
  }

  return (
    <div className="flex h-full flex-col">
      <header className={cn(APP_HEADER_BAR, 'min-w-0 gap-2 overflow-x-auto')}>
        <Input
          value={currentNotebook.title}
          onChange={(e) => updateNotebook({ title: e.target.value })}
          className="h-8 w-36 shrink-0 border-none bg-transparent text-sm font-medium focus-visible:ring-0"
        />
        <div className="h-4 w-px shrink-0 bg-border" />
        <Select
          value={`${symbol}:${timeframe}`}
          onChange={(e) => {
            const [s, tf] = e.target.value.split(':')
            updateNotebook({ symbol: s, timeframe: tf })
          }}
          className="h-8 w-36 shrink-0"
        >
          {(symbols ?? []).map((s: SymbolInfo) => (
            <option key={`${s.symbol}:${s.timeframe}`} value={`${s.symbol}:${s.timeframe}`}>
              {s.symbol} ({s.timeframe})
            </option>
          ))}
        </Select>
        {dataLoading && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{t('editor.loadingData')}</span>}
        {dataset && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{dataset.meta.barCount} {t('editor.bars')}</span>}
        <label className="shrink-0 cursor-pointer">
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <span className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm hover:bg-accent">
            <Upload className="h-3.5 w-3.5" /> {t('editor.csv')}
          </span>
        </label>
        <div className="h-4 w-px shrink-0 bg-border" />
        <TabsList className="shrink-0">
          <TabsTrigger value="js" activeValue={currentNotebook.kernelLang} onClick={(v) => handleKernelSwitch(v as 'js' | 'py')}>JS</TabsTrigger>
          <TabsTrigger value="py" activeValue={currentNotebook.kernelLang} onClick={(v) => handleKernelSwitch(v as 'js' | 'py')}>Python</TabsTrigger>
        </TabsList>
        {pyLoading && (
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${pyProgress}%` }} />
            </div>
          </div>
        )}
        <div className="min-w-4 flex-1 shrink" />
        {lastSavedAt && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{t('editor.saved')} {formatTime(lastSavedAt)}</span>}
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => saveCurrentNotebook()}><Save className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleExport}><Download className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => { deleteNotebook(currentNotebook.id); navigate({ to: '/' }) }}><Trash2 className="h-3.5 w-3.5" /></Button>
        <Button size="sm" className="h-8 shrink-0 gap-1" onClick={handleRunAll} disabled={running || !dataset}>
          <Play className="h-3.5 w-3.5" /> {t('editor.runAll')}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {showIndicators && (
          <aside className="w-56 shrink-0 border-r border-border">
            <IndicatorSidebar />
          </aside>
        )}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-1.5">
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => addCell()}><Plus className="h-3.5 w-3.5" /> {t('editor.code')}</Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => addCell(undefined, 'markdown')}><FileText className="h-3.5 w-3.5" /> {t('editor.markdown')}</Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => addCell(undefined, 'chart')}><BarChart3 className="h-3.5 w-3.5" /> {t('editor.chart')}</Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => addCell(undefined, 'backtest')}><Code2 className="h-3.5 w-3.5" /> {t('editor.backtest')}</Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowIndicators(!showIndicators)}>
              {showIndicators ? t('editor.hideIndicators') : t('editor.showIndicators')}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentNotebook.cells.map((cell, i) => (
              <CellItem key={cell.id} cell={cell} index={i} bars={dataset?.bars} onRun={handleRunCell} isRunning={running} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
