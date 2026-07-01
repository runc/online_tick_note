import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Cell, CellLang, DataSourceKind, Notebook } from '@/types'
import { saveNotebook, loadAllNotebooks, deleteNotebook as dbDelete } from '@/lib/db'
import { createTranslator } from '@/i18n'
import { useSettingsStore } from '@/stores/settings-store'
import { getDefaultDataSource, getDefaultSymbol, getEnabledDataSources, getTimeframesForSource, resolveNotebookDataSource } from '@/lib/data-sources'

function getDefaultTexts() {
  const locale = useSettingsStore.getState().locale
  const t = createTranslator(locale)
  return {
    title: t('editor.untitled'),
    js: t('defaultCell.js'),
    py: t('defaultCell.py'),
    markdown: t('defaultCell.markdown'),
    copySuffix: t('list.copySuffix'),
  }
}

function createDefaultCell(lang: CellLang = 'js'): Cell {
  const texts = getDefaultTexts()
  return {
    id: uuid(),
    type: 'code',
    lang,
    source: lang === 'js' ? texts.js : texts.py,
    status: 'idle',
  }
}

function createDefaultNotebook(): Notebook {
  const now = Date.now()
  const texts = getDefaultTexts()
  const dataSource = getDefaultDataSource()
  const symbol = getDefaultSymbol(dataSource)
  const timeframe = getTimeframesForSource(dataSource)[0] ?? '1d'
  return {
    id: uuid(),
    title: texts.title,
    dataSource,
    symbol,
    timeframe,
    kernelLang: 'js',
    cells: [createDefaultCell('js')],
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeNotebook(nb: Notebook & { dataSource?: DataSourceKind }): Notebook {
  let dataSource = resolveNotebookDataSource(nb.dataSource, nb.symbol, nb.timeframe)
  if (!getEnabledDataSources().includes(dataSource)) {
    dataSource = getDefaultDataSource()
  }
  const symbol = nb.symbol || getDefaultSymbol(dataSource)
  const timeframe = nb.timeframe || (getTimeframesForSource(dataSource)[0] ?? '1d')
  return { ...nb, dataSource, symbol, timeframe }
}

interface NotebookStore {
  notebooks: Notebook[]
  currentNotebook: Notebook | null
  lastSavedAt: number | null
  isLoading: boolean
  loadNotebooks: () => Promise<void>
  createNotebook: () => Notebook
  setCurrentNotebook: (nb: Notebook | null) => void
  updateNotebook: (updates: Partial<Notebook>) => void
  saveCurrentNotebook: () => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  duplicateNotebook: (id: string) => Notebook | null
  importNotebook: (data: Notebook) => void
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  notebooks: [],
  currentNotebook: null,
  lastSavedAt: null,
  isLoading: false,

  loadNotebooks: async () => {
    set({ isLoading: true })
    const notebooks = (await loadAllNotebooks()).map(normalizeNotebook)
    set({ notebooks, isLoading: false })
  },

  createNotebook: () => {
    const nb = createDefaultNotebook()
    set((s) => ({ notebooks: [nb, ...s.notebooks] }))
    saveNotebook(nb)
    return nb
  },

  setCurrentNotebook: (nb) => set({ currentNotebook: nb }),

  updateNotebook: (updates) => {
    const { currentNotebook } = get()
    if (!currentNotebook) return
    const updated = { ...currentNotebook, ...updates, updatedAt: Date.now() }
    set({ currentNotebook: updated })
    set((s) => ({
      notebooks: s.notebooks.map((n) => (n.id === updated.id ? updated : n)),
    }))
  },

  saveCurrentNotebook: async () => {
    const { currentNotebook } = get()
    if (!currentNotebook) return
    await saveNotebook(currentNotebook)
    set({ lastSavedAt: Date.now() })
  },

  deleteNotebook: async (id) => {
    await dbDelete(id)
    set((s) => ({
      notebooks: s.notebooks.filter((n) => n.id !== id),
      currentNotebook: s.currentNotebook?.id === id ? null : s.currentNotebook,
    }))
  },

  duplicateNotebook: (id) => {
    const original = get().notebooks.find((n) => n.id === id)
    if (!original) return null
    const now = Date.now()
    const texts = getDefaultTexts()
    const copy: Notebook = {
      ...structuredClone(original),
      id: uuid(),
      title: `${original.title} ${texts.copySuffix}`,
      createdAt: now,
      updatedAt: now,
    }
    set((s) => ({ notebooks: [copy, ...s.notebooks] }))
    saveNotebook(copy)
    return copy
  },

  importNotebook: (data) => {
    const now = Date.now()
    const nb: Notebook = normalizeNotebook({ ...data, id: uuid(), createdAt: now, updatedAt: now })
    set((s) => ({ notebooks: [nb, ...s.notebooks] }))
    saveNotebook(nb)
  },
}))

interface CellStore {
  addCell: (afterId?: string, type?: Cell['type']) => void
  removeCell: (id: string) => void
  moveCell: (id: string, direction: 'up' | 'down') => void
  updateCell: (id: string, updates: Partial<Cell>) => void
  toggleCollapse: (id: string) => void
}

export const useCellStore = create<CellStore>(() => ({
  addCell: (afterId, type = 'code') => {
    const store = useNotebookStore.getState()
    const nb = store.currentNotebook
    if (!nb) return

    const texts = getDefaultTexts()
    const newCell: Cell = {
      id: uuid(),
      type,
      lang: nb.kernelLang,
      source: type === 'markdown' ? texts.markdown : type === 'chart'
        ? JSON.stringify({ candlestick: true, series: [{ name: 'close', column: 'c', pane: 'main', style: 'line' }] }, null, 2)
        : type === 'backtest'
          ? JSON.stringify({ signalColumn: 'signal', feeRate: 0.001, slippage: 0.0005, initialCapital: 100000 }, null, 2)
          : nb.kernelLang === 'js' ? '' : '',
      status: 'idle',
    }

    let cells: Cell[]
    if (afterId) {
      const idx = nb.cells.findIndex((c) => c.id === afterId)
      cells = [...nb.cells]
      cells.splice(idx + 1, 0, newCell)
    } else {
      cells = [...nb.cells, newCell]
    }

    store.updateNotebook({ cells })
  },

  removeCell: (id) => {
    const store = useNotebookStore.getState()
    const nb = store.currentNotebook
    if (!nb || nb.cells.length <= 1) return
    store.updateNotebook({ cells: nb.cells.filter((c) => c.id !== id) })
  },

  moveCell: (id, direction) => {
    const store = useNotebookStore.getState()
    const nb = store.currentNotebook
    if (!nb) return
    const idx = nb.cells.findIndex((c) => c.id === id)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= nb.cells.length) return
    const cells = [...nb.cells]
    ;[cells[idx], cells[newIdx]] = [cells[newIdx], cells[idx]]
    store.updateNotebook({ cells })
  },

  updateCell: (id, updates) => {
    const store = useNotebookStore.getState()
    const nb = store.currentNotebook
    if (!nb) return
    store.updateNotebook({
      cells: nb.cells.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })
  },

  toggleCollapse: (id) => {
    const store = useNotebookStore.getState()
    const nb = store.currentNotebook
    if (!nb) return
    store.updateNotebook({
      cells: nb.cells.map((c) =>
        c.id === id ? { ...c, collapsed: !c.collapsed } : c,
      ),
    })
  },
}))

export { createDefaultCell, createDefaultNotebook }
